import express from 'express'
import { pool, getClient } from '../db.js'
import { confirmOrderStock, releaseOrderStock, verifyHmacSignature } from '../lib/commerce-utils.js'
import { sendPaymentApprovedEmail, sendShippingTrackingEmail } from '../services/resend.js'
import { enqueueNfeForOrder } from '../services/nuvem-fiscal.js'

const router = express.Router()

function signatureIsValid(req, secret) {
    if (!secret && process.env.NODE_ENV !== 'production') {
        console.warn('[WEBHOOK] Secret ausente em desenvolvimento. Assinatura não validada.')
        return true
    }

    const signature = req.headers['x-webhook-signature'] || req.headers['x-abacate-signature']
    return verifyHmacSignature({
        rawBody: req.rawBody,
        signature,
        secret
    })
}

async function fetchOrderWithItems(client, orderId) {
    const { rows: orderRows } = await client.query(`
        SELECT o.*
        FROM orders o
        WHERE o.id = $1
        FOR UPDATE
    `, [orderId])

    const order = orderRows[0]
    if (!order) return null

    const { rows: itemRows } = await client.query(`
        SELECT
            oi.product_id as "productId",
            oi.quantity,
            oi.size_selected as "selectedSize",
            oi.color_selected as "selectedColor",
            COALESCE(oi.unit_price, oi.price_at_time) as price,
            COALESCE((oi.product_snapshot->>'costPrice')::numeric, 0) as "costPrice",
            oi.product_snapshot->>'name' as "productName"
        FROM order_items oi
        WHERE oi.order_id = $1
        ORDER BY oi.id
    `, [orderId])

    return { ...order, items: itemRows }
}

async function createVendaFromPaidOrder(client, order) {
    const { rows: existing } = await client.query(
        'SELECT id FROM vendas WHERE order_id = $1 LIMIT 1',
        [order.id]
    )
    if (existing.length > 0) return existing[0]

    const items = Array.isArray(order.items) ? order.items : []
    const costPrice = items.reduce((sum, item) => sum + Number(item.costPrice || 0) * Number(item.quantity || 1), 0)

    const { rows } = await client.query(`
        INSERT INTO vendas (
            customer_id, order_id, total_value, cost_price, items,
            payment_method, fee_percentage, fee_amount, net_amount,
            payment_status, is_installment, num_installments,
            discount_amount, original_total
        )
        VALUES ($1, $2, $3, $4, $5, 'abacate_pay', 0, 0, $3, 'paid', false, 1, $6, $7)
        RETURNING id
    `, [
        order.customer_id,
        order.id,
        Number(order.total_value || 0),
        costPrice,
        JSON.stringify(items),
        Number(order.discount_value || 0),
        Number(order.subtotal_value || order.total_value || 0)
    ])

    return rows[0]
}

router.post('/abacate-pay', async (req, res) => {
    if (!signatureIsValid(req, process.env.ABACATE_WEBHOOK_SECRET)) {
        return res.status(401).json({ error: 'Invalid signature' })
    }

    const event = req.body || {}
    const eventType = event.type || event.event || event.name
    const eventId = event.id || event.eventId || `${eventType}-${event.data?.id || event.data?.externalId || Date.now()}`
    const orderId = event.data?.metadata?.orderId || event.data?.externalId || event.metadata?.orderId

    if (!eventType || !orderId) {
        return res.status(400).json({ error: 'Webhook sem tipo ou orderId' })
    }

    const client = await getClient()
    try {
        await client.query('BEGIN')

        const insertEvent = await client.query(`
            INSERT INTO payment_events (provider, event_id, event_type, order_id, payload)
            VALUES ('abacate_pay', $1, $2, $3, $4)
            ON CONFLICT (provider, event_id) DO NOTHING
            RETURNING id
        `, [eventId, eventType, orderId, JSON.stringify(event)])

        if (insertEvent.rows.length === 0) {
            await client.query('COMMIT')
            return res.json({ received: true, duplicate: true })
        }

        const order = await fetchOrderWithItems(client, orderId)
        if (!order) throw new Error(`Pedido ${orderId} não encontrado`)

        if (eventType === 'checkout.completed') {
            if (order.payment_status !== 'approved') {
                await confirmOrderStock(client, { orderId: order.id })
                await createVendaFromPaidOrder(client, order)

                await client.query(`
                    UPDATE orders
                    SET payment_status = 'approved',
                        status = 'paid',
                        shipping_status = CASE WHEN shipping_status = 'not_started' THEN 'quoted' ELSE shipping_status END,
                        paid_at = COALESCE(paid_at, NOW())
                    WHERE id = $1
                `, [order.id])

                await client.query(`
                    INSERT INTO order_events (order_id, event_type, message, payload)
                    VALUES ($1, 'payment_approved', 'Pagamento aprovado pela Abacate Pay', $2)
                `, [order.id, JSON.stringify({ eventId })])
            }
        }

        if (eventType === 'checkout.refunded') {
            await client.query(`
                UPDATE orders
                SET payment_status = 'refunded',
                    status = 'cancelled',
                    cancelled_at = COALESCE(cancelled_at, NOW())
                WHERE id = $1
            `, [order.id])
        }

        if (eventType === 'checkout.disputed' || eventType === 'checkout.lost') {
            await client.query(`
                UPDATE orders
                SET payment_status = 'chargeback'
                WHERE id = $1
            `, [order.id])
        }

        await client.query('COMMIT')

        if (eventType === 'checkout.completed') {
            const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId])
            const paidOrder = rows[0]
            const snapshot = paidOrder.customer_snapshot || {}
            sendPaymentApprovedEmail({
                id: paidOrder.id,
                orderNumber: paidOrder.order_number,
                customerName: snapshot.name,
                customerEmail: snapshot.email
            }).catch(error => console.error('[Resend] Falha email pagamento:', error))

            enqueueNfeForOrder(paidOrder).catch(error => console.error('[Nuvem Fiscal] Falha ao enfileirar NF-e:', error))
        }

        res.json({ received: true })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Erro webhook Abacate:', error)
        res.status(500).json({ error: error.message })
    } finally {
        client.release()
    }
})

router.post('/melhor-envio', async (req, res) => {
    const event = req.body || {}
    const melhorEnvioOrderId = event.id || event.order_id || event.orderId

    if (!melhorEnvioOrderId) {
        return res.status(400).json({ error: 'Evento sem ID de etiqueta' })
    }

    try {
        const { rows } = await pool.query(
            'SELECT * FROM orders WHERE melhor_envio_order_id = $1 LIMIT 1',
            [String(melhorEnvioOrderId)]
        )

        if (rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado' })

        const status = event.status || event.tracking?.status || 'in_transit'
        const trackingCode = event.tracking || event.tracking_code || event.trackingCode || rows[0].melhor_envio_tracking_code

        await pool.query(`
            UPDATE orders
            SET shipping_status = $2,
                melhor_envio_tracking_code = COALESCE($3, melhor_envio_tracking_code)
            WHERE id = $1
        `, [rows[0].id, status, trackingCode || null])

        await pool.query(`
            INSERT INTO shipment_events (provider, provider_event_id, melhor_envio_order_id, order_id, payload)
            VALUES ('melhor_envio', $1, $2, $3, $4)
        `, [event.event_id || event.id || null, String(melhorEnvioOrderId), rows[0].id, JSON.stringify(event)])

        if (trackingCode) {
            const snapshot = rows[0].customer_snapshot || {}
            sendShippingTrackingEmail({
                id: rows[0].id,
                orderNumber: rows[0].order_number,
                customerEmail: snapshot.email,
                melhorEnvioTrackingCode: trackingCode
            }).catch(error => console.error('[Resend] Falha email rastreio:', error))
        }

        res.json({ received: true })
    } catch (error) {
        console.error('❌ Erro webhook Melhor Envio:', error)
        res.status(500).json({ error: error.message })
    }
})

router.post('/maintenance/release-expired-reservations', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!process.env.INTERNAL_JOB_TOKEN || token !== process.env.INTERNAL_JOB_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const client = await getClient()
    try {
        await client.query('BEGIN')

        const { rows: orders } = await client.query(`
            SELECT DISTINCT o.id
            FROM orders o
            JOIN stock_reservations sr ON sr.order_id = o.id
            WHERE o.order_type = 'ecommerce'
              AND o.payment_status = 'pending'
              AND sr.status = 'reserved'
              AND sr.expires_at < NOW()
            FOR UPDATE OF o
        `)

        for (const order of orders) {
            await releaseOrderStock(client, { orderId: order.id, reason: 'expired_payment' })
            await client.query(`
                UPDATE orders
                SET status = 'cancelled',
                    payment_status = 'cancelled',
                    cancelled_at = COALESCE(cancelled_at, NOW())
                WHERE id = $1
            `, [order.id])
        }

        await client.query('COMMIT')
        res.json({ released: orders.length })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Erro ao liberar reservas expiradas:', error)
        res.status(500).json({ error: error.message })
    } finally {
        client.release()
    }
})

export default router
