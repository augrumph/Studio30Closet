import express from 'express'
import { supabase } from '../supabase.js'

const router = express.Router()

/**
 * GET /api/malinhas
 * Retorna lista de malinhas (pedidos) com paginação e filtros
 */
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        search = '',
        status = 'all',
        dateFilter = 'all'
    } = req.query

    const from = (page - 1) * pageSize
    const to = from + Number(pageSize) - 1

    console.log(`📦 Malinhas API: Bucando página ${page} [Filtros: ${status}, ${dateFilter}]`)

    try {
        let query = supabase
            .from('orders')
            .select(`
                *,
                customer:customers(id, name, phone)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to)

        // Filtro de Status
        if (status !== 'all') {
            query = query.eq('status', status)
        }

        // Filtro de Data
        if (dateFilter === 'today') {
            const today = new Date().toISOString().split('T')[0]
            query = query.gte('created_at', `${today}T00:00:00`)
        } else if (dateFilter === 'month') {
            const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
            query = query.gte('created_at', `${firstDay}T00:00:00`)
        }

        const { data, error, count } = await query

        if (error) throw error

        // Filtro de Busca (Cliente ou Número do Pedido) - Feito em JS se necessário, 
        // mas melhor tentar via query se possível. Como temos o join, o Supabase 
        // limita a busca no join. Vamos processar o search no Supabase se for número,
        // ou aceitar que o search de nome de cliente em tabelas relacionadas no Supabase é limitado sem RPC.

        let filteredData = data || []
        if (search) {
            const searchLower = search.toLowerCase()
            filteredData = filteredData.filter(order => {
                const orderNum = `#${String(order.id).padStart(6, '0')}`
                const customerName = order.customer?.name?.toLowerCase() || ''
                return orderNum.includes(searchLower) || customerName.includes(searchLower)
            })
        }

        // Mapeamento para CamelCase e formatações
        const items = filteredData.map(order => ({
            ...order,
            orderNumber: `#${String(order.id).padStart(6, '0')}`,
            // Garantir camelCase para o frontend que espera customerId etc
            customerId: order.customer_id,
            totalValue: order.total_value,
            deliveryDate: order.delivery_date,
            pickupDate: order.pickup_date,
            convertedToSale: order.converted_to_sale,
            createdAt: order.created_at
        }))

        res.json({
            items,
            total: count || items.length,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil((count || items.length) / pageSize)
        })

    } catch (error) {
        console.error("Erro na API de Malinhas:", error)
        return res.status(500).json({ message: 'Erro interno do servidor' })
    }
})

export default router
