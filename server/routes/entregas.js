import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

function transformEntrega(row) {
    if (!row) return null
    const c = toCamelCase(row)
    return {
        ...c,
        customer: {
            name: c.customerName,
            phone: c.customerPhone,
            address: c.customerAddress,
            cep: c.customerCep,
            city: c.customerCity,
            state: c.customerState
        },
        items: typeof c.items === 'string' ? JSON.parse(c.items || '[]') : (c.items || []),
        subtotal: parseFloat(c.subtotal) || 0,
        shippingCost: parseFloat(c.shippingCost) || 0,
        discount: parseFloat(c.discount) || 0,
        total: parseFloat(c.total) || 0,
        tiktokMetadata: typeof c.tiktokMetadata === 'string' ? JSON.parse(c.tiktokMetadata || '{}') : (c.tiktokMetadata || {})
    }
}

// GET /api/entregas - List deliveries
router.get('/', async (req, res) => {
    const { page = 1, pageSize = 20, search = '', status = 'all' } = req.query
    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    try {
        let whereConditions = []
        let params = []
        let paramIndex = 1

        if (status && status !== 'all') {
            whereConditions.push(`status = $${paramIndex++}`)
            params.push(status)
        }

        if (search) {
            whereConditions.push(`(customer_name ILIKE $${paramIndex} OR tracking_code ILIKE $${paramIndex} OR order_id::text ILIKE $${paramIndex})`)
            params.push(`%${search}%`)
            paramIndex++
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

        const { rows } = await pool.query(`
            SELECT COUNT(*) OVER() as total_count, *
            FROM entregas
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        res.json({
            items: rows.map(r => { const { total_count, ...row } = r; return transformEntrega(row) }),
            total,
            page: Number(page),
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        })
    } catch (error) {
        console.error("❌ Erro na API de Entregas:", error)
        res.status(500).json({ message: 'Erro interno do servidor' })
    }
})

// GET /api/entregas/metrics - Get metrics
router.get('/metrics', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'processing') as processing,
                COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
                COALESCE(SUM(total), 0) as total_value
            FROM entregas
        `)

        const r = rows[0]
        res.json({
            total: parseInt(r.total) || 0,
            pending: parseInt(r.pending) || 0,
            processing: parseInt(r.processing) || 0,
            shipped: parseInt(r.shipped) || 0,
            delivered: parseInt(r.delivered) || 0,
            cancelled: parseInt(r.cancelled) || 0,
            totalValue: parseFloat(r.total_value) || 0
        })
    } catch (error) {
        console.error("❌ Erro ao buscar métricas de entregas:", error)
        res.status(500).json({ error: 'Erro ao buscar métricas' })
    }
})

// GET /api/entregas/:id - Get delivery by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { rows } = await pool.query('SELECT * FROM entregas WHERE id = $1', [id])
        if (rows.length === 0) return res.status(404).json({ error: 'Entrega não encontrada' })
        res.json(transformEntrega(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao buscar entrega ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar entrega' })
    }
})

// POST /api/entregas - Create delivery
router.post('/', async (req, res) => {
    const {
        orderId, platform, tiktokOrderId, customerId,
        customerName, customerPhone, customerAddress, customerCep, customerCity, customerState,
        items, subtotal, shippingCost, discount, total,
        status, trackingCode, trackingUrl, carrier, vendaId, notes, tiktokMetadata
    } = req.body

    try {
        const { rows } = await pool.query(`
            INSERT INTO entregas (
                order_id, platform, tiktok_order_id, customer_id,
                customer_name, customer_phone, customer_address, customer_cep, customer_city, customer_state,
                items, subtotal, shipping_cost, discount, total,
                status, tracking_code, tracking_url, carrier, venda_id, notes, tiktok_metadata
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
            RETURNING *
        `, [
            orderId || null, platform || 'manual', tiktokOrderId || null, customerId || null,
            customerName || null, customerPhone || null, customerAddress || null, customerCep || null, customerCity || null, customerState || null,
            JSON.stringify(items || []),
            parseFloat(subtotal) || 0, parseFloat(shippingCost) || 0, parseFloat(discount) || 0, parseFloat(total) || 0,
            status || 'pending', trackingCode || null, trackingUrl || null, carrier || null, vendaId || null, notes || null,
            JSON.stringify(tiktokMetadata || {})
        ])

        res.status(201).json(transformEntrega(rows[0]))
    } catch (error) {
        console.error("❌ Erro ao criar entrega:", error)
        res.status(500).json({ error: 'Erro ao criar entrega' })
    }
})

// PUT /api/entregas/:id - Update delivery
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const { status, trackingCode, trackingUrl, carrier, notes, vendaId } = req.body

    try {
        // Auto set shipped_at / delivered_at
        let shippedAt = req.body.shippedAt
        let deliveredAt = req.body.deliveredAt
        if (status === 'shipped' && !shippedAt) shippedAt = new Date().toISOString()
        if (status === 'delivered' && !deliveredAt) deliveredAt = new Date().toISOString()

        const { rows } = await pool.query(`
            UPDATE entregas SET
                status = COALESCE($1, status),
                tracking_code = COALESCE($2, tracking_code),
                tracking_url = COALESCE($3, tracking_url),
                carrier = COALESCE($4, carrier),
                notes = COALESCE($5, notes),
                venda_id = COALESCE($6, venda_id),
                shipped_at = COALESCE($7, shipped_at),
                delivered_at = COALESCE($8, delivered_at),
                updated_at = NOW()
            WHERE id = $9
            RETURNING *
        `, [status, trackingCode, trackingUrl, carrier, notes, vendaId, shippedAt, deliveredAt, id])

        if (rows.length === 0) return res.status(404).json({ error: 'Entrega não encontrada' })
        res.json(transformEntrega(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar entrega ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar entrega' })
    }
})

// DELETE /api/entregas/:id - Delete delivery
router.delete('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { rowCount } = await pool.query('DELETE FROM entregas WHERE id = $1', [id])
        if (rowCount === 0) return res.status(404).json({ error: 'Entrega não encontrada' })
        res.json({ success: true })
    } catch (error) {
        console.error(`❌ Erro ao deletar entrega ${id}:`, error)
        res.status(500).json({ error: 'Erro ao deletar entrega' })
    }
})

export default router
