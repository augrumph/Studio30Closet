import express from 'express'
import { pool } from '../db.js'

const router = express.Router()

// GET /api/entregas - List deliveries  
router.get('/', async (req, res) => {
    const { page = 1, pageSize = 20, search = '', status = 'all' } = req.query
    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    try {
        let whereConditions = []
        let params = []
        let paramIndex = 1

        if (status && status !== 'all') {
            whereConditions.push(`status = $${paramIndex++}`)
            params.push(status)
        }

        if (search) {
            whereConditions.push(`(customer_name ILIKE $${paramIndex} OR tracking_code ILIKE $${paramIndex})`)
            params.push(`%${search}%`)
            paramIndex++
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

        const { rows } = await pool.query(`
            SELECT COUNT(*) OVER() as total_count, *
            FROM entregas
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex+1}
        `, [...params, limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        res.json({
            items: rows,
            total,
            page: Number(page),
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        })
    } catch (error) {
        console.error("❌ Erro na API de Entregas:", error)
        res.status(500).json({ message: 'Erro interno do servidor' })
    }
})

export default router
