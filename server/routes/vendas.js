import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// Listagem de Vendas com Paginação e Filtros
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        search = '',
        status = 'all',
        startDate,
        endDate
    } = req.query

    const from = (page - 1) * pageSize
    const to = from + Number(pageSize) - 1

    console.log(`📦 Vendas API: Buscando página ${page} [Tamanho: ${pageSize}]`)

    try {
        let query = supabase
            .from('vendas')
            .select(`
                *,
                customers(id, name)
            `, { count: 'exact' }) // Pegar o total real para paginação no front
            .order('created_at', { ascending: false })
            .range(from, to)

        // Filtros
        if (status !== 'all') {
            query = query.eq('payment_status', status)
        }

        if (startDate) {
            query = query.gte('created_at', startDate)
        }

        if (endDate) {
            query = query.lte('created_at', endDate)
        }

        if (search) {
            // No Supabase, para filtrar via join table e manter o tipo Venda,
            // podemos usar a sintaxe de filtro em colunas relacionadas
            query = query.or(`customer_name.ilike.%${search}%,customers.name.ilike.%${search}%`)
        }

        const { data, count, error } = await query

        if (error) throw error

        // Normalização para o Frontend usando toCamelCase
        const items = data.map(v => {
            const camelData = toCamelCase(v)
            // Adiciona o nome do cliente do relacionamento
            camelData.customerName = v.customers?.name || camelData.customerName
            return camelData
        })

        res.json({
            items,
            total: count,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(count / pageSize)
        })

    } catch (err) {
        console.error('❌ Erro na API de Vendas:', err)
        res.status(500).json({ error: 'Erro ao buscar vendas' })
    }
})

export default router
