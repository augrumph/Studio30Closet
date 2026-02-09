import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

/**
 * GET /api/customers
 * Listagem de clietnes com métricas (LTV, Última Compra, etc)
 * Usa RPC 'get_customers_with_metrics' para performance
 */
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 50,
        search = '',
        segment = 'all'
    } = req.query

    console.log(`👥 Customers API: Buscando página ${page} [Search: '${search}', Segment: '${segment}']`)

    try {
        // Tenta usar a RPC otimizada primeiro
        const { data, error } = await supabase.rpc('get_customers_with_metrics', {
            page_number: Number(page),
            page_size: Number(pageSize),
            search_term: search || null,
            segment_filter: segment
        })

        if (error) {
            console.error('❌ Erro na RPC get_customers_with_metrics:', error)
            // Fallback para query simples se a RPC falhar ou não existir
            throw error
        }

        const customers = data.map(c => {
            const camel = toCamelCase(c)
            // Garantir formatação de valores monetários se vierem como string/float
            return camel
        })

        const total = customers.length > 0 ? customers[0].totalCount : 0

        res.json({
            customers,
            total,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(total / Number(pageSize))
        })

    } catch (error) {
        console.error("Erro na API de Clientes:", error)
        // Fallback: Tentativa de busca simples (sem métricas avançadas)
        try {
            console.log("⚠️ Tentando fallback para busca simples...")
            const from = (Number(page) - 1) * Number(pageSize)
            const to = from + Number(pageSize) - 1

            let query = supabase
                .from('customers')
                .select('*', { count: 'exact' })
                .order('name', { ascending: true })
                .range(from, to)

            if (search) {
                query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
            }

            const { data: simpleData, count: simpleCount, error: simpleError } = await query

            if (simpleError) throw simpleError

            res.json({
                customers: simpleData.map(toCamelCase),
                total: simpleCount,
                page: Number(page),
                pageSize: Number(pageSize),
                totalPages: Math.ceil(simpleCount / Number(pageSize)),
                isFallback: true
            })
        } catch (fallbackError) {
            console.error("Erro fatal no fallback de Clientes:", fallbackError)
            res.status(500).json({ message: 'Erro interno do servidor ao buscar clientes' })
        }
    }
})

/**
 * GET /api/customers/:id
 * Detalhes do cliente
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        res.json(toCamelCase(data))
    } catch (error) {
        console.error(`Erro ao buscar cliente ${id}:`, error)
        res.status(500).json({ message: 'Erro ao buscar cliente' })
    }
})

export default router
