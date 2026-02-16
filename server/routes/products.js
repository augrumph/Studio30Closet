import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// Listagem de Produtos com Paginação e Busca
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        search = '',
        category = 'all',
        active = 'all'
    } = req.query

    const from = (page - 1) * pageSize
    const to = from + Number(pageSize) - 1

    console.log(`🏷️ Products API: Buscando página ${page} [Search: ${search}]`)

    try {
        const isFull = req.query.full === 'true'

        // Lite columns: Exclui colunas pesadas com Base64 (variants, description) se não for busca full
        // images é incluído porque são URLs (não pesado) e necessário para exibição
        const selectColumns = isFull
            ? '*'
            : 'id, name, price, original_price, cost_price, category, stock, active, collection_ids, created_at, supplier_id, images'

        let query = supabase
            .from('products')
            .select(selectColumns, { count: 'exact' })
            .order('name', { ascending: true })
            .range(from, to)

        if (category !== 'all') {
            query = query.eq('category', category)
        }

        if (active !== 'all') {
            query = query.eq('active', active === 'true')
        }

        if (search) {
            query = query.ilike('name', `%${search}%`)
        }

        const { data, count, error } = await query

        if (error) throw error

        res.json({
            items: toCamelCase(data),
            total: count,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(count / pageSize)
        })

    } catch (err) {
        console.error('❌ Erro na API de Produtos:', err)
        res.status(500).json({ error: 'Erro ao buscar produtos' })
    }
})

// Detalhes do Produto
router.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        res.json(toCamelCase(data))
    } catch (err) {
        console.error(`❌ Erro ao buscar produto ${id}:`, err)
        res.status(500).json({ error: 'Erro ao buscar produto' })
    }
})

export default router
