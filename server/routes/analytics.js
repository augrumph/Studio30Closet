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

export default router
