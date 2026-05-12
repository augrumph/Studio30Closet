import express from 'express'
import { pool, getClient } from '../db.js'
import { toCamelCase } from '../utils.js'
import { isValidCpf, normalizeCpf } from '../lib/cpf.js'
import { createAbacateCheckout } from '../services/abacate-pay.js'
import { quoteMelhorEnvio } from '../services/melhor-envio.js'
import { sendOrderCreatedEmail } from '../services/resend.js'
import {
    makeOrderNumber,
    moneyToCents,
    normalizeZipCode,
    normalizePhone,
    reserveOrderStock
} from '../lib/commerce-utils.js'
import { calculateFraudRisk, saveFraudAssessment, sendFraudAlert } from '../lib/fraud-engine.js'

const router = express.Router()

function publicOrder(row) {
    const order = toCamelCase(row)
    const customer = order.customerSnapshot || {}
    const isPending = order.paymentStatus === 'pending'
    return {
        id: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        shippingStatus: order.shippingStatus,
        fiscalStatus: order.fiscalStatus,
        totalValue: Number(order.totalValue || 0),
        subtotalValue: Number(order.subtotalValue || 0),
        shippingValue: Number(order.shippingValue || 0),
        customerName: customer.name,
        customerEmail: customer.email,
        items: order.items || [],
        shippingAddress: order.shippingAddress || {},
        shippingQuote: order.shippingQuote || {},
        melhorEnvioTrackingCode: order.melhorEnvioTrackingCode,
        abacatePaymentUrl: isPending ? order.abacatePaymentUrl : null,
        reservationExpiresAt: isPending ? order.reservationExpiresAt : null,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
    }
}

async function getProductsForCart(items, client = pool) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Carrinho vazio')
    }

    const normalizedItems = items.map(item => ({
        productId: Number(item.productId || item.id),
        selectedSize: item.selectedSize || item.size || 'Único',
        selectedColor: item.selectedColor || item.color || 'Padrão',
        quantity: Number(item.quantity || item.count || 1)
    }))

    if (normalizedItems.some(item => !item.productId || item.quantity <= 0)) {
        throw new Error('Itens inválidos no carrinho')
    }

    const productIds = [...new Set(normalizedItems.map(item => item.productId))]
    const { rows: products } = await client.query(`
        SELECT id, name, price, cost_price, images, category, variants, stock,
               active, weight_kg, height_cm, width_cm, length_cm, ncm, cfop, cest
        FROM products
        WHERE id = ANY($1)
    `, [productIds])

    const productMap = new Map(products.map(product => [Number(product.id), product]))

    return normalizedItems.map(item => {
        const product = productMap.get(item.productId)
        if (!product) throw new Error(`Produto ${item.productId} não encontrado`)
        if (product.active === false) throw new Error(`${product.name} não está disponível`)

        return {
            ...item,
            name: product.name,
            price: Number(product.price || 0),
            costPrice: Number(product.cost_price || 0),
            images: product.images || [],
            category: product.category,
            variants: product.variants || [],
            stock: Number(product.stock || 0),
            weightKg: Number(product.weight_kg || 0.3),
            heightCm: Number(product.height_cm || 2),
            widthCm: Number(product.width_cm || 25),
            lengthCm: Number(product.length_cm || 35),
            ncm: product.ncm || null,
            cfop: product.cfop || null,
            cest: product.cest || null
        }
    })
}

async function upsertCustomer(client, customer) {
    const cpf = normalizeCpf(customer?.cpf)
    if (!isValidCpf(cpf)) {
        throw new Error('CPF inválido')
    }

    const phone = normalizePhone(customer.phone)
    if (!customer?.name?.trim()) throw new Error('Nome obrigatório')
    if (!customer?.email?.trim()) throw new Error('E-mail obrigatório')
    if (!phone) throw new Error('Telefone obrigatório')

    const { rows: existing } = await client.query(
        `SELECT id FROM customers WHERE regexp_replace(COALESCE(cpf, ''), '\\D', '', 'g') = $1`,
        [cpf]
    )

    if (existing.length > 0) {
        await client.query(`
            UPDATE customers
            SET name = COALESCE($2, name),
                phone = COALESCE($3, phone),
                email = COALESCE($4, email),
                birth_date = COALESCE($5, birth_date),
                updated_at = NOW()
            WHERE id = $1
        `, [existing[0].id, customer.name, phone, customer.email, customer.birthDate || customer.birth_date || null])
        return existing[0].id
    }

    const { rows } = await client.query(`
        INSERT INTO customers (name, cpf, phone, email, addresses, birth_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `, [customer.name, cpf, phone, customer.email, JSON.stringify([]), customer.birthDate || customer.birth_date || null])

    return rows[0].id
}

router.post('/shipping/quote', async (req, res) => {
    try {
        const { zipCode, items } = req.body
        const destinationZipCode = normalizeZipCode(zipCode)
        if (destinationZipCode.length !== 8) {
            return res.status(400).json({ error: 'CEP inválido' })
        }

        const cartItems = await getProductsForCart(items)
        const options = await quoteMelhorEnvio({
            destinationZipCode,
            items: cartItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                unitPriceCents: moneyToCents(item.price),
                weightKg: item.weightKg,
                heightCm: item.heightCm,
                widthCm: item.widthCm,
                lengthCm: item.lengthCm
            }))
        })

        res.json({ options })
    } catch (error) {
        console.error('❌ Erro ao cotar frete:', error)
        res.status(500).json({ error: error.message })
    }
})

router.post('/checkout', async (req, res) => {
    const client = await getClient()

    try {
        const { customer, address, items, shipping } = req.body
        if (!shipping?.id && !shipping?.serviceId) throw new Error('Frete obrigatório')
        if (!address?.zipCode || !address?.street || !address?.number || !address?.city || !address?.state) {
            throw new Error('Endereço de entrega incompleto')
        }

        // ── Avaliação de risco ANTES de criar qualquer coisa ─────────────────
        const itemsPreview = await getProductsForCart(items)
        const subtotalEst = itemsPreview.reduce((s, i) => s + i.price * i.quantity, 0)

        const fraud = await calculateFraudRisk({
            customer,
            address,
            totalValue: subtotalEst,
            paymentMethod: 'card',
        })

        if (fraud.action === 'block') {
            console.warn(`[Fraud] BLOCK — CPF ${customer.cpf?.slice(-4)} score=${fraud.score} sinais=${fraud.reasons.join(', ')}`)
            return res.status(422).json({
                error: 'Não foi possível processar seu pedido. Entre em contato com o suporte.',
                code: 'FRAUD_BLOCKED',
            })
        }

        await client.query('BEGIN')

        const customerId = await upsertCustomer(client, customer)
        const cartItems = await getProductsForCart(items, client)
        const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

        const shippingOptions = await quoteMelhorEnvio({
            destinationZipCode: address.zipCode,
            items: cartItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                unitPriceCents: moneyToCents(item.price),
                weightKg: item.weightKg,
                heightCm: item.heightCm,
                widthCm: item.widthCm,
                lengthCm: item.lengthCm
            }))
        })

        const selectedShipping = shippingOptions.find(option => String(option.id) === String(shipping.id || shipping.serviceId))
        if (!selectedShipping) throw new Error('Frete selecionado não está mais disponível')

        const shippingValue = selectedShipping.priceCents / 100
        const totalValue = subtotal + shippingValue
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

        const { rows: orderRows } = await client.query(`
            INSERT INTO orders (
                customer_id, order_type, status, payment_status, shipping_status, fiscal_status,
                total_value, subtotal_value, shipping_value, discount_value,
                customer_snapshot, shipping_address, shipping_quote, reservation_expires_at
            )
            VALUES (
                $1, 'ecommerce', 'awaiting_payment', 'pending', 'quoted', 'not_issued',
                $2, $3, $4, 0,
                $5, $6, $7, $8
            )
            RETURNING *
        `, [
            customerId,
            totalValue,
            subtotal,
            shippingValue,
            JSON.stringify({ ...customer, phone: normalizePhone(customer.phone), cpf: normalizeCpf(customer.cpf) }),
            JSON.stringify({ ...address, zipCode: normalizeZipCode(address.zipCode) }),
            JSON.stringify(selectedShipping),
            expiresAt
        ])

        const order = orderRows[0]
        const orderNumber = makeOrderNumber(order.id)

        await client.query('UPDATE orders SET order_number = $1 WHERE id = $2', [orderNumber, order.id])

        for (const item of cartItems) {
            await client.query(`
                INSERT INTO order_items (
                    order_id, product_id, quantity, size_selected, color_selected,
                    price_at_time, unit_price, total_price, product_snapshot,
                    weight_kg, height_cm, width_cm, length_cm, sku, ncm, cfop, cest
                )
                VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [
                order.id,
                item.productId,
                item.quantity,
                item.selectedSize,
                item.selectedColor,
                item.price,
                item.price * item.quantity,
                JSON.stringify({
                    name: item.name,
                    images: item.images,
                    category: item.category,
                    costPrice: item.costPrice
                }),
                item.weightKg,
                item.heightCm,
                item.widthCm,
                item.lengthCm,
                `P${item.productId}-${item.selectedColor}-${item.selectedSize}`,
                item.ncm,
                item.cfop,
                item.cest
            ])
        }

        await reserveOrderStock(client, { orderId: order.id, items: cartItems, expiresAt })

        const publicBaseUrl = process.env.FRONTEND_URL || 'https://studio30closet.com.br'
        const checkout = await createAbacateCheckout({
            order: { ...order, orderNumber, totalValue },
            items: cartItems,
            successUrl: `${publicBaseUrl}/pedido/${order.id}?status=success`,
            cancelUrl: `${publicBaseUrl}/pedido/${order.id}?status=cancelled`
        })

        await client.query(`
            UPDATE orders
            SET abacate_checkout_id = $1,
                abacate_payment_url = $2
            WHERE id = $3
        `, [checkout.id, checkout.url, order.id])

        await client.query(`
            INSERT INTO order_events (order_id, event_type, message, payload)
            VALUES ($1, 'checkout_created', 'Checkout Abacate Pay criado', $2)
        `, [order.id, JSON.stringify({ checkoutId: checkout.id })])

        // ── Salvar assessment de fraude no pedido ────────────────────────────
        await saveFraudAssessment(client, {
            orderId: order.id,
            customerCpf: normalizeCpf(customer.cpf),
            customerEmail: customer.email,
            score: fraud.score,
            action: fraud.action,
            signals: fraud.signals,
        })

        await client.query('COMMIT')

        sendOrderCreatedEmail({
            id: order.id,
            orderNumber,
            customerName: customer.name,
            customerEmail: customer.email
        }).catch(error => console.error('[Resend] Falha ao enviar pedido criado:', error))

        // Alerta admin se pedido é suspeito
        if (fraud.action === 'review') {
            sendFraudAlert({
                order: { ...order, order_number: orderNumber, customer_snapshot: { ...customer } },
                score: fraud.score,
                reasons: fraud.reasons,
            }).catch(err => console.error('[Fraud] Falha no alerta:', err.message))
        }

        console.log(`[Checkout] Pedido ${orderNumber} criado — score=${fraud.score} ação=${fraud.action}`)

        res.status(201).json({
            orderId: order.id,
            orderNumber,
            paymentUrl: checkout.url,
            fraudAction: fraud.action,
        })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Erro no checkout ecommerce:', error)
        res.status(500).json({ error: error.message })
    } finally {
        client.release()
    }
})

router.get('/orders/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                o.*,
                COALESCE(
                    (
                        SELECT json_agg(json_build_object(
                            'productId', oi.product_id,
                            'quantity', oi.quantity,
                            'selectedSize', oi.size_selected,
                            'selectedColor', oi.color_selected,
                            'unitPrice', COALESCE(oi.unit_price, oi.price_at_time),
                            'totalPrice', COALESCE(oi.total_price, oi.price_at_time * oi.quantity),
                            'product', oi.product_snapshot
                        ))
                        FROM order_items oi
                        WHERE oi.order_id = o.id
                    ),
                    '[]'::json
                ) as items
            FROM orders o
            WHERE o.id = $1
              AND o.order_type = 'ecommerce'
        `, [req.params.id])

        if (rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado' })
        res.json(publicOrder(rows[0]))
    } catch (error) {
        console.error('❌ Erro ao consultar pedido público:', error)
        res.status(500).json({ error: 'Erro ao consultar pedido' })
    }
})

export default router
