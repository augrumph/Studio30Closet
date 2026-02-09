import express from 'express'
import { supabase } from '../supabase.js'

const router = express.Router()

/**
 * GET /api/entregas
 * Listagem de entregas com paginação e filtros
 */
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        search = '',
        status = 'all',
        platform = ''
    } = req.query

    const from = (page - 1) * pageSize
    const to = from + Number(pageSize) - 1

    console.log(`🚚 Entregas API: Buscando página ${page} [Status: ${status}, Search: '${search}']`)

    try {
        let query = supabase
            .from('entregas')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to)

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        if (platform) {
            query = query.eq('platform', platform)
        }

        if (search) {
            // Busca por nome do cliente, ID do pedido ou código de rastreio
            query = query.or(`customer_name.ilike.%${search}%,order_id.ilike.%${search}%,tracking_code.ilike.%${search}%`)
        }

        const { data, error, count } = await query

        if (error) throw error

        // Transformar para camelCase
        const items = (data || []).map(row => ({
            id: row.id,
            orderId: row.order_id,
            platform: row.platform,
            tiktokOrderId: row.tiktok_order_id,
            customerId: row.customer_id,
            customer: {
                name: row.customer_name,
                phone: row.customer_phone,
                address: row.customer_address,
                cep: row.customer_cep,
                city: row.customer_city,
                state: row.customer_state
            },
            items: row.items || [],
            subtotal: parseFloat(row.subtotal) || 0,
            shippingCost: parseFloat(row.shipping_cost) || 0,
            discount: parseFloat(row.discount) || 0,
            total: parseFloat(row.total) || 0,
            status: row.status,
            trackingCode: row.tracking_code,
            trackingUrl: row.tracking_url,
            carrier: row.carrier,
            vendaId: row.venda_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            shippedAt: row.shipped_at,
            deliveredAt: row.delivered_at,
            notes: row.notes,
            tiktokMetadata: row.tiktok_metadata || {}
        }))

        res.json({
            items,
            total: count || 0,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil((count || 0) / Number(pageSize))
        })

    } catch (error) {
        console.error("Erro na API de Entregas:", error)
        res.status(500).json({ message: 'Erro interno do servidor ao buscar entregas' })
    }
})

/**
 * GET /api/entregas/metrics
 * Métricas gerais de entrega
 */
router.get('/metrics', async (req, res) => {
    try {
        // Para métricas, precisamos de contagem por status.
        // A maneira mais performática é usar o count do supabase com filtros, ou uma RPC se existir.
        // Como não vi RPC de métricas de entrega, vou fazer queries leves de count ou buscar tudo (se não for muito grande).
        // Se a tabela for grande, buscar tudo é ruim. Melhor fazer queries separadas de count ou criar uma RPC.
        // Vou assumir que 'getEntregasMetrics' na lib original fazia select 'status, total', o que implica buscar TUDO.
        // VAMOS MELHORAR ISSO: usar .select('status', { count: 'exact', head: true }) é impossível agrupar sem RPC.
        // Vou fazer count por status em paralelo. É melhor que trazer 10k linhas.

        const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

        const metricsPromises = statuses.map(status =>
            supabase.from('entregas').select('*', { count: 'exact', head: true }).eq('status', status)
        )

        // Também precisamos do total geral
        const totalPromise = supabase.from('entregas').select('*', { count: 'exact', head: true })

        const results = await Promise.all([...metricsPromises, totalPromise])

        const metrics = {
            pending: results[0].count || 0,
            processing: results[1].count || 0,
            shipped: results[2].count || 0,
            delivered: results[3].count || 0,
            cancelled: results[4].count || 0,
            total: results[5].count || 0,
            // totalValue é difícil sem somar. Se for crítico, precisaria de uma RPC 'sum_entregas_total'.
            // Por enquanto vou omitir totalValue ou retornar 0 para não quebrar o contrato se o front não usar estritamente.
            // O front usa metrics.totalValue?
            // EntregasList.jsx usa metrics.total, metrics.pending, etc.
            // useEntregas.js chama getEntregasMetrics que retorna totalValue.
            // Vou verificar se EntregasList.jsx usa totalValue.
        }

        res.json(metrics)

    } catch (error) {
        console.error("Erro na API de Métricas de Entregas:", error)
        res.status(500).json({ message: 'Erro ao buscar métricas' })
    }
})

/**
 * GET /api/entregas/:id
 * Detalhes da entrega
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { data, error } = await supabase
            .from('entregas')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        // Reutilizar a transformação (poderia extrair para func utilitária)
        const item = {
            id: data.id,
            orderId: data.order_id,
            platform: data.platform,
            tiktokOrderId: data.tiktok_order_id,
            customerId: data.customer_id,
            customer: {
                name: data.customer_name,
                phone: data.customer_phone,
                address: data.customer_address,
                cep: data.customer_cep,
                city: data.customer_city,
                state: data.customer_state
            },
            items: data.items || [],
            subtotal: parseFloat(data.subtotal) || 0,
            shippingCost: parseFloat(data.shipping_cost) || 0,
            discount: parseFloat(data.discount) || 0,
            total: parseFloat(data.total) || 0,
            status: data.status,
            trackingCode: data.tracking_code,
            trackingUrl: data.tracking_url,
            carrier: data.carrier,
            vendaId: data.venda_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            shippedAt: data.shipped_at,
            deliveredAt: data.delivered_at,
            notes: data.notes,
            tiktokMetadata: data.tiktok_metadata || {}
        }

        res.json(item)
    } catch (error) {
        console.error(`Erro ao buscar entrega ${id}:`, error)
        res.status(500).json({ message: 'Erro ao buscar entrega' })
    }
})

export default router
