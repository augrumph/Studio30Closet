import express from 'express'
import { pool } from '../db.js'

const router = express.Router()

/**
 * GET /api/health - Health check básico
 */
router.get('/', async (req, res) => {
    const startTime = Date.now()

    try {
        // Test database connection
        const dbStart = Date.now()
        await pool.query('SELECT 1')
        const dbTime = Date.now() - dbStart

        // Verificar tabelas críticas
        const { rows: tables } = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('orders', 'vendas', 'products', 'customers')
        `)

        const criticalTables = tables.map(t => t.table_name)

        const responseTime = Date.now() - startTime

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            responseTime: `${responseTime}ms`,
            database: {
                status: 'connected',
                responseTime: `${dbTime}ms`,
                criticalTables
            },
            memory: {
                used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
            }
        })
    } catch (error) {
        console.error('❌ Health check failed:', error)
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        })
    }
})

/**
 * GET /api/health/deep - Health check profundo
 */
router.get('/deep', async (req, res) => {
    try {
        // Test critical queries
        const [ordersCount, vendasCount, productsCount] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM orders'),
            pool.query('SELECT COUNT(*) as count FROM vendas'),
            pool.query('SELECT COUNT(*) as count FROM products WHERE active = true')
        ])

        // Verificar triggers
        const { rows: triggers } = await pool.query(`
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            AND trigger_name LIKE '%updated_at%'
        `)

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                orders: parseInt(ordersCount.rows[0].count),
                vendas: parseInt(vendasCount.rows[0].count),
                products: parseInt(productsCount.rows[0].count),
                triggers: triggers.map(t => ({ name: t.trigger_name, table: t.event_object_table }))
            }
        })
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        })
    }
})

export default router
