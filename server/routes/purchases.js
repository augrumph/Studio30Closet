import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// GET /api/purchases - List purchases
router.get('/', async (req, res) => {
    const { page = 1, pageSize = 20 } = req.query
    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    try {
        const { rows } = await pool.query(`
            SELECT COUNT(*) OVER() as total_count, p.*, s.name as supplier_name
            FROM purchases p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            ORDER BY p.date DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        res.json({
            items: rows.map(toCamelCase),
            total,
            page: Number(page),
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        })
    } catch (error) {
        console.error("❌ Erro na API de Compras:", error)
        res.status(500).json({ message: 'Erro interno do servidor' })
    }
})

export default router
