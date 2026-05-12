import express from 'express'
import { pool, getClient } from '../db.js'
import { toCamelCase } from '../utils.js'
import { extractKeyFromUrl, getPresignedUrl, enrichImages } from '../lib/s3.js'
import { sendNewMalinhaNotification } from '../email-service.js'
import { authenticateToken } from '../middleware/auth.js'
import { isValidCpf, normalizeCpf } from '../lib/cpf.js'
import { enqueueNfeForOrder } from '../services/nuvem-fiscal.js'
import { 
    createMelhorEnvioLabelDraft, 
    checkoutMelhorEnvio, 
    generateMelhorEnvioLabel, 
    getMelhorEnvioLabelPrintUrl 
} from '../services/melhor-envio.js'

const router = express.Router()

// Helper: Convert to snake_case
function toSnakeCase(obj) {
    if (typeof obj !== 'object' || obj === null) return obj
    if (Array.isArray(obj)) return obj.map(v => toSnakeCase(v))
    return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        acc[snakeKey] = toSnakeCase(obj[key])
        return acc
    }, {})
}

// Auxiliar para limpar campos (vazio -> null) e garantir tipos
function sanitizeOrderData(data) {
    const clean = { ...data }
    
    // Datas: string vazia ou "null" -> null
    if (clean.deliveryDate === '' || clean.deliveryDate === 'null') clean.deliveryDate = null
    if (clean.pickupDate === '' || clean.pickupDate === 'null') clean.pickupDate = null
    
    // Números: garantir que são números e não strings/NaN
    if (clean.totalValue !== undefined) clean.totalValue = Number(clean.totalValue) || 0
    if (clean.customerId !== undefined) clean.customerId = parseInt(clean.customerId) || null
    
    // Itens
    if (Array.isArray(clean.items)) {
        clean.items = clean.items.map(item => ({
            ...item,
            productId: parseInt(item.productId) || null,
            quantity: parseInt(item.quantity) || 1,
            price: Number(item.price) || 0,
            costPrice: Number(item.costPrice) || 0
        }))
    }
    
    return clean
}

// GET /api/orders - List Orders (Admin)
router.get('/', authenticateToken, async (req, res) => {
    const {
        page = 1,
        pageSize = 30,
        status = 'all',
        searchTerm = req.query.search || '',
        orderType = req.query.orderType || req.query.order_type || 'all'
    } = req.query

    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    try {
        let whereConditions = []
        let params = []
        let paramIndex = 1

        if (status === 'fraud_review') {
            whereConditions.push(`o.fraud_action = 'review'`)
        } else if (status && status !== 'all') {
            whereConditions.push(`o.status = $${paramIndex++}`)
            params.push(status)
        }

        if (orderType && orderType !== 'all') {
            whereConditions.push(`COALESCE(o.order_type, 'malinha') = $${paramIndex++}`)
            params.push(orderType)
        }

        if (searchTerm) {
            whereConditions.push(`(
                c.name ILIKE $${paramIndex}
                OR c.email ILIKE $${paramIndex}
                OR c.phone ILIKE $${paramIndex}
                OR o.id::text ILIKE $${paramIndex}
                OR o.order_number ILIKE $${paramIndex}
            )`)
            params.push(`%${searchTerm}%`)
            paramIndex++
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

        const { rows } = await pool.query(`
            SELECT
                COUNT(*) OVER() as total_count,
                o.*,
                c.name as customer_name,
                c.phone as customer_phone,
                c.email as customer_email,
                c.id as customer_id_joined,
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'phone', c.phone,
                    'email', c.email
                ) as customer
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            ${whereClause}
            ORDER BY o.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        const orders = rows.map(row => {
            const camelRow = toCamelCase(row)
            return {
                ...camelRow,
                orderNumber: row.order_number || `#${String(row.id).padStart(6, '0')}`,
                customer: camelRow.customer || { name: 'Cliente desconhecido' }
            }
        })

        res.json({
            orders: enrichImages(orders),
            total,
            page: Number(page),
            pageSize: limit,
            totalPages: Math.ceil(total / limit)
        })

    } catch (error) {
        console.error("❌ Erro ao listar orders:", error)
        res.status(500).json({ error: 'Erro ao buscar orders' })
    }
})

async function getAdminCommerceOrder(orderId) {
    const { rows } = await pool.query(`
        SELECT
            o.*,
            COALESCE(
                (
                    SELECT json_agg(json_build_object(
                        'id', oi.id,
                        'productId', oi.product_id,
                        'quantity', oi.quantity,
                        'selectedSize', oi.size_selected,
                        'selectedColor', oi.color_selected,
                        'unitPrice', COALESCE(oi.unit_price, oi.price_at_time),
                        'totalPrice', COALESCE(oi.total_price, oi.price_at_time * oi.quantity),
                        'product', oi.product_snapshot,
                        'ncm', oi.ncm,
                        'cfop', oi.cfop,
                        'cest', oi.cest
                    ))
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ),
                '[]'::json
            ) as items
        FROM orders o
        WHERE o.id = $1
    `, [orderId])

    return rows[0] || null
}

// POST /api/orders/:id/invoice - Prepare/trigger NF-e flow
router.post('/:id/invoice', authenticateToken, async (req, res) => {
    const { id } = req.params

    try {
        const order = await getAdminCommerceOrder(id)
        if (!order) return res.status(404).json({ error: 'Order não encontrada' })
        if (order.order_type !== 'ecommerce') {
            return res.status(400).json({ error: 'NF-e automática só está habilitada para pedidos e-commerce' })
        }
        if (order.payment_status !== 'approved') {
            return res.status(409).json({ error: 'Não é possível emitir NF-e antes do pagamento aprovado' })
        }
        if (order.fiscal_status === 'issued') {
            return res.json({ success: true, status: 'issued', order: toCamelCase(order) })
        }

        await pool.query(`UPDATE orders SET fiscal_status = 'issuing', updated_at = NOW() WHERE id = $1`, [id])

        const result = await enqueueNfeForOrder(order)
        const nextStatus = result.status === 'issued' ? 'issued' : 'not_issued'

        await pool.query(`
            UPDATE orders
            SET fiscal_status = $2,
                nfe_id = COALESCE($3, nfe_id),
                nfe_access_key = COALESCE($4, nfe_access_key),
                nfe_xml_url = COALESCE($5, nfe_xml_url),
                nfe_pdf_url = COALESCE($6, nfe_pdf_url),
                status = CASE WHEN $2 = 'issued' THEN 'invoice_issued' ELSE status END,
                updated_at = NOW()
            WHERE id = $1
        `, [id, nextStatus, result.nfeId || null, result.accessKey || null, result.xmlUrl || null, result.pdfUrl || null])

        res.json({ success: true, result })
    } catch (error) {
        console.error('❌ Erro NF-e:', error)
        res.status(500).json({ error: error.message })
    }
})

// POST /api/orders/:id/shipping/label - Fluxo Automatizado Melhor Envio
router.post('/:id/shipping/label', authenticateToken, async (req, res) => {
    const { id } = req.params

    try {
        const order = await getAdminCommerceOrder(id)
        if (!order) return res.status(404).json({ error: 'Order não encontrada' })
        if (order.order_type !== 'ecommerce') {
            return res.status(400).json({ error: 'Etiqueta automática só está habilitada para pedidos e-commerce' })
        }
        if (order.payment_status !== 'approved') {
            return res.status(409).json({ error: 'Não é possível gerar etiqueta antes do pagamento aprovado' })
        }

        if (order.shipping_status === 'label_generated') {
            return res.json({ success: true, status: 'label_generated', order: toCamelCase(order) })
        }

        await pool.query(`UPDATE orders SET shipping_status = 'label_pending', updated_at = NOW() WHERE id = $1`, [id])

        // 1. Carrinho -> 2. Checkout -> 3. Gerar -> 4. Imprimir
        const cartResult = await createMelhorEnvioLabelDraft({ order })
        const melId = cartResult.melhorEnvioOrderId

        await checkoutMelhorEnvio(melId)
        await generateMelhorEnvioLabel(melId)
        const printUrl = await getMelhorEnvioLabelPrintUrl(melId)

        await pool.query(`
            UPDATE orders
            SET shipping_status = 'label_generated',
                melhor_envio_order_id = $2,
                melhor_envio_label_url = $3,
                status = 'label_generated',
                updated_at = NOW()
            WHERE id = $1
        `, [id, melId, printUrl])

        await pool.query(`
            INSERT INTO order_events (order_id, event_type, message, payload)
            VALUES ($1, 'shipping_label_generated', 'Etiqueta gerada e paga com sucesso', $2)
        `, [id, JSON.stringify({ melId, printUrl })])

        res.json({ success: true, printUrl, melhorEnvioOrderId: melId })
    } catch (error) {
        console.error('❌ Erro Etiqueta:', error)
        res.status(500).json({ error: error.message })
    }
})

// GET /api/orders/:id - Get Order Details (Admin)
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    try {
        const { rows } = await pool.query(`
            SELECT o.*, 
                   json_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'email', c.email, 'cpf', c.cpf, 'address', c.address) as customer,
                   (SELECT json_agg(json_build_object('id', oi.id, 'productId', oi.product_id, 'quantity', oi.quantity, 'selectedSize', oi.size_selected, 'selectedColor', oi.color_selected, 'priceAtTime', oi.price_at_time, 'productName', p.name, 'images', p.images, 'stock', p.stock))
                    FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id) as items
            FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE o.id = $1
        `, [id])

        if (rows.length === 0) return res.status(404).json({ error: 'Order não encontrada' })
        res.json(enrichImages(toCamelCase(rows[0])))
    } catch (error) {
        console.error(`❌ Erro buscar order ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar order' })
    }
})

// GET /api/orders/:id/full
router.get('/:id/full', authenticateToken, async (req, res) => {
    const { id } = req.params
    try {
        const [orderResult, eventsResult, fraudResult] = await Promise.all([
            pool.query(`
                SELECT o.*, json_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'email', c.email, 'cpf', c.cpf) as customer,
                       COALESCE((SELECT json_agg(json_build_object('id', oi.id, 'productId', oi.product_id, 'quantity', oi.quantity, 'selectedSize', oi.size_selected, 'selectedColor', oi.color_selected, 'unitPrice', COALESCE(oi.unit_price, oi.price_at_time), 'totalPrice', COALESCE(oi.total_price, oi.price_at_time * oi.quantity), 'product', oi.product_snapshot, 'images', p.images) ORDER BY oi.id)
                       FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id), '[]'::json) as items
                FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE o.id = $1
            `, [id]),
            pool.query(`SELECT id, event_type, message, payload, created_at FROM order_events WHERE order_id = $1 ORDER BY created_at ASC`, [id]),
            pool.query(`SELECT risk_score, risk_action, signals, created_at FROM fraud_risk_log WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]).catch(() => ({ rows: [] }))
        ])
        if (!orderResult.rows[0]) return res.status(404).json({ error: 'Pedido não encontrado' })
        const order = toCamelCase(enrichImages(orderResult.rows[0]))
        res.json({ ...order, events: eventsResult.rows.map(r => toCamelCase(r)), fraudLog: fraudResult.rows[0] ? toCamelCase(fraudResult.rows[0]) : null })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// POST /api/orders - Public checkout submission
router.post('/', async (req, res) => {
    try {
        const orderData = sanitizeOrderData(req.body)
        const { customer, items, ...orderFields } = orderData
        let customerId = orderFields.customerId

        if (!customerId && customer) {
            const cpf = normalizeCpf(customer.cpf)
            if (!isValidCpf(cpf)) return res.status(400).json({ error: 'CPF inválido' })
            const { rows: existing } = await pool.query(`SELECT id FROM customers WHERE regexp_replace(COALESCE(cpf, ''), '\\D', '', 'g') = $1`, [cpf])
            if (existing.length > 0) {
                customerId = existing[0].id
                await pool.query(`UPDATE customers SET phone = COALESCE($2, phone), email = COALESCE($3, email), updated_at = NOW() WHERE id = $1`, [customerId, customer.phone, customer.email])
            } else {
                const { rows: newCust } = await pool.query(`INSERT INTO customers (name, cpf, phone, email) VALUES ($1, $2, $3, $4) RETURNING id`, [customer.name, cpf, customer.phone, customer.email])
                customerId = newCust[0].id
            }
        }

        const client = await getClient()
        try {
            await client.query('BEGIN')
            const { rows: newOrder } = await client.query(`INSERT INTO orders (customer_id, status, total_value) VALUES ($1, $2, $3) RETURNING *`, [customerId, orderFields.status || 'pending', orderFields.totalValue || 0])
            if (items) {
                for (const item of items) {
                    await client.query(`INSERT INTO order_items (order_id, product_id, quantity, size_selected, color_selected, price_at_time) VALUES ($1, $2, $3, $4, $5, $6)`, [newOrder[0].id, item.productId, item.quantity, item.selectedSize, item.selectedColor, item.price])
                }
            }
            await client.query('COMMIT')
            sendNewMalinhaNotification({ customerName: customer?.name, orderId: newOrder[0].id, totalValue: orderFields.totalValue }).catch(e => console.error(e))
            res.json({ success: true, order: toCamelCase(newOrder[0]) })
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// PUT /api/orders/:id
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    const client = await getClient()
    try {
        const orderData = sanitizeOrderData(req.body)
        await client.query('BEGIN')
        const { items, ...fields } = orderData
        const snakeFields = toSnakeCase(fields)
        const updateParts = []
        const updateValues = []
        let idx = 1
        Object.keys(snakeFields).forEach(f => {
            if (['status', 'total_value', 'payment_status', 'customer_id'].includes(f)) {
                updateParts.push(`${f} = $${idx++}`)
                updateValues.push(snakeFields[f])
            }
        })
        if (updateParts.length > 0) {
            updateParts.push(`updated_at = NOW()`)
            updateValues.push(id)
            await client.query(`UPDATE orders SET ${updateParts.join(', ')} WHERE id = $${idx}`, updateValues)
        }
        if (items) {
            await client.query('DELETE FROM order_items WHERE order_id = $1', [id])
            for (const item of items) {
                await client.query(`INSERT INTO order_items (order_id, product_id, quantity, size_selected, color_selected, price_at_time) VALUES ($1, $2, $3, $4, $5, $6)`, [id, item.productId, item.quantity, item.selectedSize, item.selectedColor, item.price])
            }
        }
        await client.query('COMMIT')
        res.json({ success: true })
    } catch (error) {
        await client.query('ROLLBACK')
        res.status(500).json({ error: error.message })
    } finally {
        client.release()
    }
})

// DELETE /api/orders/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    try {
        await pool.query('DELETE FROM order_items WHERE order_id = $1', [id])
        await pool.query('DELETE FROM orders WHERE id = $1', [id])
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

export default router
