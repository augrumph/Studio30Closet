import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'
import { cacheMiddleware } from '../cache.js'

const router = express.Router()

/**
 * GET /api/analytics/summary
 * Resumo de analytics (stats)
 * OPTIMIZED: Uses database aggregation instead of fetching all events
 * Cache: 5 minutes
 */
router.get('/summary', cacheMiddleware(300), async (req, res) => {
    const { dateRange = 'today' } = req.query

    try {
        let startDate = new Date()

        switch (dateRange) {
            case 'today':
                startDate.setHours(0, 0, 0, 0)
                break
            case '7days':
                startDate.setDate(startDate.getDate() - 7)
                break
            case '30days':
                startDate.setDate(startDate.getDate() - 30)
                break
            case 'all':
                startDate = new Date('2020-01-01')
                break
        }

        const startDateStr = startDate.toISOString()

        // OPTIMIZATION: Use database function for aggregation
        const { data, error } = await supabase.rpc('get_analytics_summary', {
            start_date: startDateStr
        })

        if (error) {
            console.error('Error calling get_analytics_summary:', error)
            // Fallback to simple counts if RPC not available
            const { count: pageViews } = await supabase
                .from('analytics_events')
                .select('*', { count: 'exact', head: true })
                .eq('event_type', 'page_view')
                .gte('created_at', startDateStr)

            return res.json({
                pageViews: pageViews || 0,
                catalogViews: 0,
                productViews: 0,
                addToCart: 0,
                checkoutsStarted: 0,
                checkoutsCompleted: 0,
                uniqueSessions: 0,
                conversionRate: 0,
                addToCartRate: 0,
                trafficSources: { google: 0, social: 0, direct: 0, other: 0 },
                deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
                whatsappClicks: 0,
                instagramClicks: 0,
                _fallback: true
            })
        }

        res.json(data)

    } catch (error) {
        console.error("Erro na API de Analytics Summary:", error)
        res.status(500).json({ message: 'Erro ao gerar resumo de analytics' })
    }
})

/**
 * GET /api/analytics/products/viewed
 * Produtos mais visualizados
 * OPTIMIZED: Uses database aggregation
 * Cache: 10 minutes
 */
router.get('/products/viewed', cacheMiddleware(600), async (req, res) => {
    const { limit = 10, days = 30 } = req.query

    try {
        // Use optimized RPC function
        const { data, error } = await supabase.rpc('get_top_viewed_products', {
            days_back: parseInt(days),
            top_limit: parseInt(limit)
        })

        if (error) {
            console.error('Error calling get_top_viewed_products:', error)
            // Fallback to basic query
            return res.json([])
        }

        res.json(data || [])
    } catch (error) {
        console.error("Erro na API de Top Viewed:", error)
        res.status(500).json({ message: 'Erro ao buscar top produtos' })
    }
})

/**
 * GET /api/analytics/products/added-to-cart
 * Produtos mais adicionados
 * OPTIMIZED: Uses database aggregation
 * Cache: 10 minutes
 */
router.get('/products/added-to-cart', cacheMiddleware(600), async (req, res) => {
    const { limit = 10, days = 30 } = req.query

    try {
        // Use optimized RPC function
        const { data, error } = await supabase.rpc('get_top_added_to_cart', {
            days_back: parseInt(days),
            top_limit: parseInt(limit)
        })

        if (error) {
            console.error('Error calling get_top_added_to_cart:', error)
            return res.json([])
        }

        res.json(data || [])
    } catch (error) {
        console.error("Erro na API de Top Cart:", error)
        res.status(500).json({ message: 'Erro ao buscar top carrinho' })
    }
})

/**
 * GET /api/analytics/carts/abandoned
 * Carrinhos abandonados
 * Cache: 5 minutes
 */
router.get('/carts/abandoned', cacheMiddleware(300), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('abandoned_carts')
            .select('*')
            .eq('checkout_completed', false)
            .order('last_activity_at', { ascending: false })
            .limit(20)

        if (error) throw error

        res.json(data || [])
    } catch (error) {
        console.error("Erro na API de Abandoned Carts:", error)
        res.status(500).json({ message: 'Erro ao buscar carrinhos abandonados' })
    }
})

/**
 * GET /api/analytics/events/recent
 * Eventos recentes
 */
router.get('/events/recent', async (req, res) => {
    const { limit = 20 } = req.query
    try {
        const { data, error } = await supabase
            .from('analytics_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(Number(limit))

        if (error) throw error

        res.json(data || [])
    } catch (error) {
        console.error("Erro na API de Recent Events:", error)
        res.status(500).json({ message: 'Erro ao buscar eventos recentes' })
    }
})

export default router
