import express from 'express'
import { pool } from '../db.js'

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

    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    console.log(`📦 Malinhas API: Buscando página ${page} [Filtros: ${status}, ${dateFilter}]`)

    try {
        let whereConditions = []
        let params = []
        let paramIndex = 1

        // Filtro de Status
        if (status !== 'all') {
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
                ) as customer
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
            createdAt: order.created_at
        }))

        res.json({
            items,
            total,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(total / pageSize)
        })

    } catch (error) {
        console.error("❌ Erro na API de Malinhas:", error)
        return res.status(500).json({ message: 'Erro interno do servidor' })
    }
})

export default router
