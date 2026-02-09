import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'
import { cacheMiddleware } from '../cache.js'

const router = express.Router()

/**
 * GET /api/stock/kpis
 * KPIs de estoque para o dashboard (headline)
 * Cache: 5 minutes
 */
router.get('/kpis', cacheMiddleware(300), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, stock, price, cost_price, stock_status')
            .eq('active', true)

        if (error) throw error

        let totalValue = 0
        let totalCost = 0
        let totalItems = 0
        let productsCount = data.length
        let lowStockCount = 0

        data.forEach(p => {
            const stock = p.stock || 0
            totalItems += stock
            totalValue += (p.price || 0) * stock
            totalCost += (p.cost_price || 0) * stock
            if (stock <= 2) lowStockCount++
        })

        res.json({
            totalValue,
            totalCost,
            totalItems,
            productsCount,
            lowStockCount
        })

    } catch (error) {
        console.error('❌ Erro na API de Stock KPIs:', error)
        res.status(500).json({ message: 'Erro ao buscar KPIs de estoque' })
    }
})

/**
 * GET /api/stock/ranking
 * Ranking de vendas por categoria, cor, tamanho, etc.
 * OPTIMIZED: Uses database aggregation instead of fetching all products
 * Cache: 10 minutes
 */
router.get('/ranking', cacheMiddleware(600), async (req, res) => {
    try {
        let { startDate, endDate } = req.query

        // Default to last 30 days if not specified
        if (!startDate) {
            const date = new Date()
            date.setDate(date.getDate() - 30)
            startDate = date.toISOString()
        }
        if (!endDate) {
            endDate = new Date().toISOString()
        }

        // Use optimized RPC function
        const { data, error } = await supabase.rpc('get_stock_ranking', {
            start_date: startDate,
            end_date: endDate
        })

        if (error) {
            console.error('Error calling get_stock_ranking:', error)
            // Fallback to empty data
            return res.json({
                byCategory: [],
                byColor: [],
                bySize: [],
                byProduct: [],
                byProfit: []
            })
        }

        // The SQL function returns a JSON object with all rankings
        const rankings = data || {}

        res.json({
            byCategory: rankings.byCategory || [],
            byColor: rankings.byColor || [],
            bySize: rankings.bySize || [],
            byProduct: rankings.byProduct || [],
            byProfit: (rankings.byProduct || []).sort((a, b) => b.margin - a.margin)
        })

    } catch (error) {
        console.error('❌ Erro na API de Stock Ranking:', error)
        res.status(500).json({ message: 'Erro ao buscar ranking de vendas' })
    }
})

/**
 * GET /api/stock/low
 * Alertas de estoque baixo
 * Cache: 5 minutes
 */
router.get('/low', cacheMiddleware(300), async (req, res) => {
    const { limit = 10 } = req.query
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, stock, images, category, suppliers(name)')
            .eq('active', true)
            .lte('stock', 2)
            .order('stock', { ascending: true })
            .limit(Number(limit))

        if (error) throw error
        res.json(toCamelCase(data))
    } catch (error) {
        console.error('❌ Erro na API de Low Stock:', error)
        res.status(500).json({ message: 'Erro ao buscar alertas de estoque' })
    }
})

/**
 * GET /api/stock/dead
 * Dead Stock
 * Cache: 15 minutes (rarely changes)
 */
router.get('/dead', cacheMiddleware(900), async (req, res) => {
    try {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - 90)
        const cutoffStr = cutoffDate.toISOString()

        const { data, error } = await supabase
            .from('products')
            .select('id, name, stock, cost_price, created_at, images')
            .eq('active', true)
            .gt('stock', 0)
            .lt('created_at', cutoffStr)
            .order('created_at', { ascending: true })
            .limit(20)

        if (error) throw error

        const totalDeadValue = data.reduce((acc, p) => acc + ((p.cost_price || 0) * (p.stock || 0)), 0)

        res.json({
            count: data.length,
            totalValue: totalDeadValue,
            items: toCamelCase(data)
        })
    } catch (error) {
        console.error('❌ Erro na API de Dead Stock:', error)
        res.status(500).json({ message: 'Erro ao buscar dead stock' })
    }
})

export default router
