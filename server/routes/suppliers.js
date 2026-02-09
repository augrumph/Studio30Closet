import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

/**
 * GET /api/suppliers
 * Listagem de fornecedores com paginação e busca
 */
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        search = ''
    } = req.query

    const from = (page - 1) * pageSize
    const to = from + Number(pageSize) - 1

    console.log(`🏭 Suppliers API: Buscando página ${page} [Search: '${search}']`)

    try {
        let query = supabase
            .from('suppliers')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true })
            .range(from, to)

        if (search) {
            query = query.or(`name.ilike.%${search}%,cnpj.ilike.%${search}%,city.ilike.%${search}%`)
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
        console.error("Erro na API de Fornecedores:", error)
        res.status(500).json({ message: 'Erro interno do servidor ao buscar fornecedores' })
    }
})

/**
 * GET /api/suppliers/:id
 * Detalhes do fornecedor
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        res.json(toCamelCase(data))
    } catch (error) {
        console.error(`Erro ao buscar fornecedor ${id}:`, error)
        res.status(500).json({ message: 'Erro ao buscar fornecedor' })
    }
})

export default router
