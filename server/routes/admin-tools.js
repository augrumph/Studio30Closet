import express from 'express'
import { pool } from '../db.js'
import { blockEntity, unblockEntity } from '../lib/fraud-engine.js'
import { emitRealtimeEvent } from '../lib/realtime-events.js'

const router = express.Router()

// GET /api/admin-tools/products-without-cost - Products without cost price
router.get('/products-without-cost', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, name, price, cost_price
            FROM products
            WHERE cost_price IS NULL OR cost_price = 0
            ORDER BY id ASC
        `)

        res.json({
            total: rows.length,
            products: rows
        })
    } catch (error) {
        console.error("❌ Erro ao buscar produtos sem custo:", error)
        res.status(500).json({ error: 'Erro ao buscar produtos' })
    }
})

// PATCH /api/admin-tools/products/:id/cost-price - Update cost price
router.patch('/products/:id/cost-price', async (req, res) => {
    const { id } = req.params
    const { cost_price } = req.body

    if (!cost_price || cost_price < 0) {
        return res.status(400).json({ error: 'Preço de custo inválido' })
    }

    try {
        const { rows } = await pool.query(
            'UPDATE products SET cost_price = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [parseFloat(cost_price), id]
        )

        emitRealtimeEvent('products.updated', { id: Number(id), field: 'cost_price' })
        res.json({ success: true, product: rows[0] })
    } catch (error) {
        console.error(`❌ Erro ao atualizar custo do produto ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar produto' })
    }
})

// ── Fraud Management ─────────────────────────────────────────────────────────

// GET /api/admin-tools/fraud/log — últimas avaliações de risco
router.get('/fraud/log', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT frl.*, o.order_number
            FROM fraud_risk_log frl
            LEFT JOIN orders o ON o.id = frl.order_id
            ORDER BY frl.created_at DESC
            LIMIT 200
        `)
        res.json(rows)
    } catch (err) {
        console.error('❌ Erro ao buscar fraud log:', err)
        res.status(500).json({ error: err.message })
    }
})

// GET /api/admin-tools/fraud/blocked — entidades bloqueadas
router.get('/fraud/blocked', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM blocked_entities ORDER BY blocked_at DESC'
        )
        res.json(rows)
    } catch (err) {
        console.error('❌ Erro ao listar bloqueados:', err)
        res.status(500).json({ error: err.message })
    }
})

// POST /api/admin-tools/fraud/block — bloquear entidade
router.post('/fraud/block', async (req, res) => {
    const { entityType, entityValue, reason } = req.body
    if (!entityType || !entityValue) {
        return res.status(400).json({ error: 'entityType e entityValue são obrigatórios' })
    }
    try {
        await blockEntity({ entityType, entityValue, reason, blockedBy: 'manual' })
        emitRealtimeEvent('fraud.updated', { entityType, entityValue })
        res.json({ success: true })
    } catch (err) {
        console.error('❌ Erro ao bloquear entidade:', err)
        res.status(500).json({ error: err.message })
    }
})

// DELETE /api/admin-tools/fraud/block/:id — desbloquear entidade
router.delete('/fraud/block/:id', async (req, res) => {
    try {
        const removed = await unblockEntity(req.params.id)
        if (!removed) return res.status(404).json({ error: 'Não encontrado' })
        emitRealtimeEvent('fraud.updated', { id: Number(req.params.id), removed: true })
        res.json({ success: true, removed })
    } catch (err) {
        console.error('❌ Erro ao desbloquear:', err)
        res.status(500).json({ error: err.message })
    }
})

// GET /api/admin-tools/fraud/orders — pedidos em revisão
router.get('/fraud/orders', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, order_number, order_type, status, payment_status,
                   total_value, fraud_score, fraud_action, fraud_signals,
                   customer_snapshot, created_at
            FROM orders
            WHERE fraud_action = 'review'
              AND status NOT IN ('cancelled')
            ORDER BY created_at DESC
            LIMIT 100
        `)
        res.json(rows)
    } catch (err) {
        console.error('❌ Erro ao buscar pedidos em revisão:', err)
        res.status(500).json({ error: err.message })
    }
})

// PATCH /api/admin-tools/fraud/orders/:id/approve — aprovar envio após revisão
router.patch('/fraud/orders/:id/approve', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            UPDATE orders
            SET fraud_action = 'approved_manual',
                shipping_approved_at = NOW()
            WHERE id = $1
            RETURNING id, order_number, fraud_action
        `, [req.params.id])
        if (!rows[0]) return res.status(404).json({ error: 'Pedido não encontrado' })

        await pool.query(
            `INSERT INTO order_events (order_id, event_type, message) VALUES ($1, 'fraud_approved', 'Pedido aprovado manualmente após revisão de risco')`,
            [req.params.id]
        )
        emitRealtimeEvent('orders.updated', { id: Number(req.params.id), action: 'fraud_approved' })
        res.json({ success: true, order: rows[0] })
    } catch (err) {
        console.error('❌ Erro ao aprovar pedido:', err)
        res.status(500).json({ error: err.message })
    }
})

// PATCH /api/admin-tools/fraud/orders/:id/block — bloquear pedido suspeito
router.patch('/fraud/orders/:id/block', async (req, res) => {
    const { reason, blockCpf, blockEmail } = req.body
    try {
        const { rows } = await pool.query(`
            UPDATE orders
            SET fraud_action = 'blocked_manual',
                status = 'cancelled',
                payment_status = 'cancelled',
                cancelled_at = COALESCE(cancelled_at, NOW())
            WHERE id = $1
            RETURNING *, customer_snapshot
        `, [req.params.id])
        if (!rows[0]) return res.status(404).json({ error: 'Pedido não encontrado' })

        const snapshot = rows[0].customer_snapshot || {}
        const tasks = []

        if (blockCpf && snapshot.cpf) {
            tasks.push(blockEntity({ entityType: 'cpf', entityValue: snapshot.cpf, reason: reason || 'Bloqueado manualmente', blockedBy: 'manual' }))
        }
        if (blockEmail && snapshot.email) {
            tasks.push(blockEntity({ entityType: 'email', entityValue: snapshot.email, reason: reason || 'Bloqueado manualmente', blockedBy: 'manual' }))
        }
        await Promise.allSettled(tasks)

        await pool.query(
            `INSERT INTO order_events (order_id, event_type, message, payload) VALUES ($1, 'fraud_blocked', 'Pedido bloqueado manualmente', $2)`,
            [req.params.id, JSON.stringify({ reason, blockCpf, blockEmail })]
        )
        emitRealtimeEvent('orders.updated', { id: Number(req.params.id), action: 'fraud_blocked' })
        res.json({ success: true })
    } catch (err) {
        console.error('❌ Erro ao bloquear pedido:', err)
        res.status(500).json({ error: err.message })
    }
})

// ── Return / Devolução Management ─────────────────────────────────────────────

// PATCH /api/admin-tools/orders/:id/return — atualizar status de devolução
router.patch('/orders/:id/return', async (req, res) => {
    const { returnStatus, notes } = req.body
    const validStatuses = ['none', 'requested', 'approved', 'received', 'approved_refund', 'rejected']
    if (!validStatuses.includes(returnStatus)) {
        return res.status(400).json({ error: `Status inválido. Use: ${validStatuses.join(', ')}` })
    }

    const timestampField = {
        requested: 'return_requested_at',
        received:  'return_received_at',
        approved_refund: 'return_inspected_at',
        rejected:  'return_inspected_at',
    }[returnStatus]

    try {
        const { rows } = await pool.query(`
            UPDATE orders
            SET return_status = $1,
                return_notes = COALESCE($2, return_notes),
                ${timestampField ? `${timestampField} = COALESCE(${timestampField}, NOW()),` : ''}
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, order_number, return_status
        `, [returnStatus, notes || null, req.params.id])

        if (!rows[0]) return res.status(404).json({ error: 'Pedido não encontrado' })

        await pool.query(
            `INSERT INTO order_events (order_id, event_type, message, payload) VALUES ($1, 'return_status_changed', $2, $3)`,
            [req.params.id, `Devolução: ${returnStatus}`, JSON.stringify({ returnStatus, notes })]
        )
        emitRealtimeEvent('orders.updated', { id: Number(req.params.id), action: 'return_status_changed' })
        res.json({ success: true, order: rows[0] })
    } catch (err) {
        console.error('❌ Erro ao atualizar devolução:', err)
        res.status(500).json({ error: err.message })
    }
})

export default router
