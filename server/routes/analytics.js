import express from 'express'
import { pool } from '../db.js'
import { cacheMiddleware } from '../cache.js'

const router = express.Router()

// GET /api/analytics/summary - Analytics summary (simplified)
router.get('/summary', cacheMiddleware(300), async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT COUNT(*) as total_events,
                   COUNT(DISTINCT session_id) as unique_sessions
            FROM analytics_events
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `)

        res.json({
            pageViews: rows[0]?.total_events || 0,
            uniqueSessions: rows[0]?.unique_sessions || 0,
            catalogViews: 0,
            productViews: 0,
            addToCart: 0,
            checkoutsStarted: 0,
            checkoutsCompleted: 0,
            conversionRate: 0,
            addToCartRate: 0
        })
    } catch (error) {
        console.error("❌ Erro em Analytics:", error)
        res.status(500).json({ message: 'Erro ao gerar resumo' })
    }
})

// POST /api/analytics/events - Track a new event
router.post('/events', async (req, res) => {
    try {
        const { session_id, event_type, event_data, page_path, referrer, user_agent, device_type } = req.body

        if (!session_id || !event_type) {
            return res.status(400).json({ error: 'session_id and event_type are required' })
        }

        await pool.query(`
            INSERT INTO analytics_events (
                session_id, event_type, event_data, page_path, referrer, user_agent, device_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [session_id, event_type, event_data, page_path, referrer, user_agent, device_type])

        res.status(201).json({ success: true })
    } catch (error) {
        console.error("❌ Erro ao salvar evento:", error)
        res.status(500).json({ error: 'Erro ao salvar evento' })
    }
})

// POST /api/analytics/sessions - Update or create session
router.post('/sessions', async (req, res) => {
    try {
        const { id, device_type, user_agent, referrer, is_converted } = req.body

        if (!id) return res.status(400).json({ error: 'Session ID is required' })

        // Check if exists
        const { rows } = await pool.query('SELECT id, page_views FROM analytics_sessions WHERE id = $1', [id])

        if (rows.length > 0) {
            // Update
            await pool.query(`
                UPDATE analytics_sessions 
                SET last_seen_at = NOW(),
                    page_views = page_views + 1,
                    is_converted = COALESCE($2, is_converted)
                WHERE id = $1
            `, [id, is_converted])
        } else {
            // Insert
            await pool.query(`
                INSERT INTO analytics_sessions (id, device_type, user_agent, referrer, page_views, is_converted)
                VALUES ($1, $2, $3, $4, 1, $5)
            `, [id, device_type, user_agent, referrer, is_converted || false])
        }

        res.json({ success: true })
    } catch (error) {
        console.error("❌ Erro ao atualizar sessão:", error)
        res.status(500).json({ error: 'Erro ao atualizar sessão' })
    }
})

// POST /api/analytics/abandoned-carts - Save cart snapshot
router.post('/abandoned-carts', async (req, res) => {
    try {
        const { session_id, items, total_items, customer_data, checkout_started, checkout_completed } = req.body

        if (!session_id) return res.status(400).json({ error: 'session_id is required' })

        // Find active abandoned cart for this session
        const { rows } = await pool.query(`
            SELECT id FROM abandoned_carts 
            WHERE session_id = $1 AND checkout_completed = false
            ORDER BY created_at DESC LIMIT 1
        `, [session_id])

        if (rows.length > 0) {
            // Update
            const updateParts = []
            const values = []
            let i = 1

            if (items !== undefined) {
                updateParts.push(`items = $${i++}`)
                values.push(JSON.stringify(items))
            }
            if (total_items !== undefined) {
                updateParts.push(`total_items = $${i++}`)
                values.push(total_items)
            }
            if (customer_data !== undefined) {
                updateParts.push(`customer_data = $${i++}`)
                values.push(JSON.stringify(customer_data))
            }
            if (checkout_started !== undefined) {
                updateParts.push(`checkout_started = $${i++}`)
                values.push(checkout_started)
            }
            if (checkout_completed !== undefined) {
                updateParts.push(`checkout_completed = $${i++}`)
                values.push(checkout_completed)
            }

            if (updateParts.length > 0) {
                updateParts.push(`last_activity_at = NOW()`)
                values.push(rows[0].id)
                await pool.query(`
                    UPDATE abandoned_carts SET ${updateParts.join(', ')}
                    WHERE id = $${i}
                `, values)
            }
        } else {
            // Insert
            await pool.query(`
                INSERT INTO abandoned_carts (
                    session_id, items, total_items, customer_data, checkout_started, checkout_completed
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                session_id,
                JSON.stringify(items || []),
                total_items || (items ? items.length : 0),
                JSON.stringify(customer_data || {}),
                checkout_started || false,
                checkout_completed || false
            ])
        }

        res.json({ success: true })
    } catch (error) {
        console.error("❌ Erro ao salvar carrinho abandonado:", error)
        res.status(500).json({ error: 'Erro ao salvar carrinho abandonado' })
    }
})

export default router
