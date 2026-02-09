import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

/**
 * GET /api/expenses
 * Listagem de despesas fixas com paginação e busca
 */
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        search = ''
    } = req.query

    const from = (page - 1) * pageSize
    const to = from + Number(pageSize) - 1

    console.log(`💸 Expenses API: Buscando página ${page} [Search: '${search}']`)

    try {
        let query = supabase
            .from('fixed_expenses')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to)

        if (search) {
            query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,notes.ilike.%${search}%`)
        }

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
        console.error("Erro na API de Despesas:", error)
        res.status(500).json({ message: 'Erro interno do servidor ao buscar despesas' })
    }
})

/**
 * GET /api/expenses/metrics
 * Métricas gerais (total mensal filtrado)
 */
router.get('/metrics', async (req, res) => {
    const { search = '' } = req.query

    try {
        let query = supabase
            .from('fixed_expenses')
            .select('value')

        if (search) {
            query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,notes.ilike.%${search}%`)
        }

        const { data, error } = await query

        if (error) throw error

        // Sum values
        const totalValue = data.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0)

        res.json({
            count: data.length,
            totalValue
        })

    } catch (error) {
        console.error("Erro na API de Métricas de Despesas:", error)
        res.status(500).json({ message: 'Erro ao buscar métricas de despesas' })
    }
})

/**
 * GET /api/expenses/:id
 * Detalhes da despesa
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params

    try {
        const { data, error } = await supabase
            .from('fixed_expenses')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        res.json(toCamelCase(data))

    } catch (error) {
        console.error(`Erro ao buscar despesa ${id}:`, error)
        res.status(500).json({ message: 'Erro ao buscar despesa' })
    }
})

export default router
