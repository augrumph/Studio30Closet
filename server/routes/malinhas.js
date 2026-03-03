import express from 'express'
import { pool } from '../db.js'
import { asyncHandler, AppError, ValidationError } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * GET /api/malinhas
 * Retorna lista de malinhas (pedidos) com paginação e filtros
 */
router.get('/', asyncHandler(async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        search = '',
        status = 'all',
        dateFilter = 'all'
    } = req.query

    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    let whereConditions = []
    let params = []
    let paramIndex = 1

    // Filtro de Status
    if (status !== 'all') {
        const validStatuses = ['pending', 'shipped', 'delivered', 'pickup_scheduled', 'returned', 'completed', 'cancelled']
        if (!validStatuses.includes(status)) {
            throw new ValidationError({ message: 'Status de malinha inválido', status })
        }
        whereConditions.push(`o.status = $${paramIndex++}`)
        params.push(status)
    }

    // Filtro de Data
    if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0]
        whereConditions.push(`o.created_at >= $${paramIndex++} AND o.created_at < $${paramIndex++}`)
        params.push(`${today}T00:00:00`, `${today}T23:59:59`)
    } else if (dateFilter === 'month') {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        whereConditions.push(`o.created_at >= $${paramIndex++} AND o.created_at <= $${paramIndex++}`)
        params.push(`${firstDay}T00:00:00`, `${lastDay}T23:59:59`)
    }

    // Filtro de Busca (cliente ou número do pedido)
    if (search) {
        const searchLower = search.toLowerCase()
        whereConditions.push(`(c.name ILIKE $${paramIndex} OR CAST(o.id AS TEXT) ILIKE $${paramIndex})`)
        params.push(`%${searchLower}%`)
        paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

    const { rows } = await pool.query(`
            SELECT
                COUNT(*) OVER() as total_count,
                o.*,
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'phone', c.phone
                ) as customer,
                (
                    SELECT COUNT(*)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ) as items_count
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            ${whereClause}
            ORDER BY o.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, limit, offset])

    const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

    // Mapear para camelCase
    const items = rows.map(order => ({
        ...order,
        orderNumber: `#${String(order.id).padStart(6, '0')}`,
        customerId: order.customer_id,
        totalValue: order.total_value,
        deliveryDate: order.delivery_date,
        pickupDate: order.pickup_date,
        convertedToSale: order.converted_to_sale,
        createdAt: order.created_at,
        itemsCount: parseInt(order.items_count) || 0
    }))

    res.json({
        items,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / pageSize)
    })

}))

/**
 * GET /api/malinhas/kpis
 * Retorna KPIs globais de malinhas (não paginados)
 */
router.get('/kpis', async (req, res) => {
    console.log('📊 Malinhas API: Calculando KPIs globais...')

    try {
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        console.log(`🔍 DEBUG: Buscando malinhas concluídas desde ${firstDayOfMonth}`)
        console.log(`🔍 DEBUG: Mês atual: ${now.getMonth() + 1}/${now.getFullYear()}`)

        // DEBUG: Buscar todas as orders completed para ver o updated_at
        const { rows: debugRows } = await pool.query(`
            SELECT id, status, created_at, updated_at
            FROM orders
            WHERE status = 'completed'
            ORDER BY id DESC
        `)

        console.log('🔍 DEBUG: Malinhas concluídas encontradas:')
        debugRows.forEach(row => {
            const updatedMonth = new Date(row.updated_at).getMonth() + 1
            const updatedYear = new Date(row.updated_at).getFullYear()
            console.log(`  - Order #${row.id}: status=${row.status}, updated_at=${row.updated_at} (${updatedMonth}/${updatedYear})`)
        })

        // Query otimizada para pegar todos os KPIs em uma única consulta
        const { rows } = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled')) as total_active,
                COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
                COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= $1) as completed_this_month,
                COALESCE(SUM(
                    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id)
                ) FILTER (WHERE status NOT IN ('completed', 'cancelled')), 0) as total_items_in_circulation
            FROM orders o
        `, [firstDayOfMonth])

        const kpis = rows[0]

        console.log(`📊 KPIs calculados:`, {
            totalActive: parseInt(kpis.total_active) || 0,
            pending: parseInt(kpis.total_pending) || 0,
            completedMonth: parseInt(kpis.completed_this_month) || 0,
            totalItems: parseInt(kpis.total_items_in_circulation) || 0
        })

        res.json({
            totalActive: parseInt(kpis.total_active) || 0,
            pending: parseInt(kpis.total_pending) || 0,
            completedMonth: parseInt(kpis.completed_this_month) || 0,
            totalItems: parseInt(kpis.total_items_in_circulation) || 0
        })

    } catch (error) {
        console.error("❌ Erro ao calcular KPIs de Malinhas:", error)
        return res.status(500).json({ message: 'Erro ao calcular KPIs' })
    }
})

/**
 * POST /api/malinhas/fix-updated-at
 * TEMPORARY: Fix updated_at for completed orders (one-time migration)
 */
router.post('/fix-updated-at', async (req, res) => {
    console.log('🔧 MIGRATION: Corrigindo updated_at de malinhas concluídas...')

    try {
        const result = await pool.query(`
            UPDATE orders
            SET updated_at = NOW()
            WHERE status = 'completed'
            AND updated_at < (NOW() - INTERVAL '1 day')
            RETURNING id, status, updated_at
        `)

        console.log(`✅ Atualizadas ${result.rowCount} malinhas:`)
        result.rows.forEach(row => {
            console.log(`  - Order #${row.id}: updated_at atualizado para ${row.updated_at}`)
        })

        res.json({
            success: true,
            updatedCount: result.rowCount,
            message: `${result.rowCount} malinhas concluídas tiveram updated_at corrigido`
        })
    } catch (error) {
        console.error('❌ Erro ao corrigir updated_at:', error)
        res.status(500).json({ error: 'Erro ao executar migração' })
    }
})

export default router
