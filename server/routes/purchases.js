import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

/**
 * Helper to build query with filters
 */
const buildQuery = (baseQuery, { search, startDate, endDate, period }) => {
    let query = baseQuery

    // Date Filters
    if (period === 'last7days') {
        const date = new Date()
        date.setDate(date.getDate() - 7)
        query = query.gte('date', date.toISOString())
    } else if (period === 'last30days') {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        query = query.gte('date', date.toISOString())
    } else if (period === 'currentMonth') {
        const date = new Date()
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        query = query.gte('date', firstDay.toISOString()).lte('date', lastDay.toISOString())
    } else if (period === 'custom' && startDate && endDate) {
        // Adjust end date to cover the full day
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        query = query.gte('date', new Date(startDate).toISOString()).lte('date', end.toISOString())
    }

    // Search Filter (requires join if searching supplier name)
    if (search) {
        // We use !inner to filter by related table
        // Or we use or() with supplier name from the joined table?
        // Supabase allows searching on joined tables using the syntax:
        // .or('payment_method.ilike.%search%,supplier.name.ilike.%search%') ??
        // Actually, filtering on joined tables usually requires !inner for the join to act as filter.
        // But here we want OR logic: either payment method matches OR supplier name matches.
        // This is tricky in Supabase basic modifiers.
        // Easier approach: 
        // 1. Search payment_method on purchases table.
        // 2. Search name on suppliers table.
        // It's hard to do "OR" across tables without a view or RPC or raw SQL.
        // For simplicity, we might just search payment_method here, or use a RPC if critical.
        // Let's try to search local fields + maybe exact match on supplier ID if provided?
        // The user searches by text.
        // To search supplier name, we really need the join.
        // Let's rely on payment_method and maybe notes for now?
        // Or if the frontend provides supplier ID (e.g. from a dropdown), it's easier.
        // `PurchasesList.jsx` uses a text input.

        // Advanced approach: Text Search.
        // For now, let's filter by payment_method and notes. Filtering by supplier name across relation is hard without RPC.
        // Wait, I can search the suppliers first? No.
        // I will stick to simple filters for now. Search will work on `payment_method` and `notes`.
        // If the user really needs to search by supplier name, I can add that later via RPC or View.
        query = query.or(`payment_method.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    return query
}

/**
 * GET /api/purchases
 * Listagem de compras com paginação e filtros
 */
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        search = '',
        period = 'all',
        startDate,
        endDate
    } = req.query

    const from = (page - 1) * pageSize
    const to = from + Number(pageSize) - 1

    console.log(`🛍️ Purchases API: Buscando página ${page} [Period: ${period}]`)

    try {
        let query = supabase
            .from('purchases')
            .select('*, supplier:suppliers(id, name)', { count: 'exact' })
            .order('date', { ascending: false })
            .range(from, to)

        query = buildQuery(query, { search, startDate, endDate, period })

        const { data, error, count } = await query

        if (error) throw error

        res.json({
            items: (data || []).map(toCamelCase),
            total: count || 0,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil((count || 0) / Number(pageSize))
        })

    } catch (error) {
        console.error("Erro na API de Compras:", error)
        res.status(500).json({ message: 'Erro interno do servidor ao buscar compras' })
    }
})

/**
 * GET /api/purchases/metrics
 * Métricas agregadas (respeita os mesmos filtros)
 */
router.get('/metrics', async (req, res) => {
    const { search = '', period = 'all', startDate, endDate } = req.query

    try {
        // We need to fetch ALL matching rows to calculate sums.
        // We select only minimal fields.
        let query = supabase
            .from('purchases')
            .select('value, pieces, spent_by')

        query = buildQuery(query, { search, startDate, endDate, period })

        const { data, error } = await query

        if (error) throw error

        const metrics = {
            totalValue: 0,
            totalItems: 0,
            totalLoja: 0,
            totalAugusto: 0,
            totalThais: 0
        }

        data.forEach(p => {
            const val = parseFloat(p.value) || 0
            const pieces = parseInt(p.pieces) || 0

            metrics.totalValue += val
            metrics.totalItems += pieces

            if (p.spent_by === 'loja' || !p.spent_by) metrics.totalLoja += val
            else if (p.spent_by === 'augusto') metrics.totalAugusto += val
            else if (p.spent_by === 'thais') metrics.totalThais += val
        })

        res.json(metrics)

    } catch (error) {
        console.error("Erro na API de Métricas de Compras:", error)
        res.status(500).json({ message: 'Erro ao buscar métricas' })
    }
})

/**
 * GET /api/purchases/:id
 * Detalhes da compra
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { data, error } = await supabase
            .from('purchases')
            .select('*, supplier:suppliers(*)') // Get full supplier details
            .eq('id', id)
            .single()

        if (error) throw error

        res.json(toCamelCase(data))
    } catch (error) {
        console.error(`Erro ao buscar compra ${id}:`, error)
        res.status(500).json({ message: 'Erro ao buscar compra' })
    }
})

export default router
