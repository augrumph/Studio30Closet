import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// GET /api/suppliers - List suppliers with pagination
router.get('/', async (req, res) => {
    const { page = 1, pageSize = 20, search = '' } = req.query
    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    console.log(`🏭 Suppliers API: Buscando página ${page} [Search: '${search}']`)

    try {
        let whereClause = ''
        let params = []
        let paramIndex = 1

        if (search) {
            whereClause = `WHERE (name ILIKE $${paramIndex} OR cnpj ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`
            params.push(`%${search}%`)
            paramIndex++
        }

        const { rows } = await pool.query(`
            SELECT COUNT(*) OVER() as total_count, *
            FROM suppliers
            ${whereClause}
            ORDER BY name ASC
            LIMIT $${paramIndex} OFFSET $${paramIndex+1}
        `, [...params, limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        res.json({
            items: rows.map(toCamelCase),
            total,
            page: Number(page),
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        })
    } catch (error) {
        console.error("❌ Erro na API de Fornecedores:", error)
        res.status(500).json({ message: 'Erro interno do servidor' })
    }
})

// GET /api/suppliers/:id - Get supplier details
router.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { rows } = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id])
        if (rows.length === 0) return res.status(404).json({ error: 'Fornecedor não encontrado' })
        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao buscar fornecedor ${id}:`, error)
        res.status(500).json({ message: 'Erro ao buscar fornecedor' })
    }
})

export default router
