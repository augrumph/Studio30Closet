import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// GET /api/purchases - List purchases
router.get('/', async (req, res) => {
    const { page = 1, pageSize = 20, search = '' } = req.query
    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    try {
        let whereClause = ''
        let params = []
        let paramIndex = 1

        if (search) {
            whereClause = `WHERE (s.name ILIKE $${paramIndex} OR p.notes ILIKE $${paramIndex})`
            params.push(`%${search}%`)
            paramIndex++
        }

        const { rows } = await pool.query(`
            SELECT COUNT(*) OVER() as total_count, p.*, s.name as supplier_name
            FROM purchases p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            ${whereClause}
            ORDER BY p.date DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        res.json({
            items: rows.map(r => { const { total_count, ...row } = r; return toCamelCase(row) }),
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

// GET /api/purchases/metrics - Get aggregate metrics
router.get('/metrics', async (req, res) => {
    const { search = '', period = 'all', startDate, endDate } = req.query

    try {
        let whereConditions = []
        let params = []
        let paramIndex = 1

        if (search) {
            whereConditions.push(`(s.name ILIKE $${paramIndex} OR p.notes ILIKE $${paramIndex})`)
            params.push(`%${search}%`)
            paramIndex++
        }

        if (period === 'month') {
            whereConditions.push(`DATE_TRUNC('month', p.date) = DATE_TRUNC('month', CURRENT_DATE)`)
        } else if (startDate && endDate) {
            whereConditions.push(`p.date >= $${paramIndex++}`)
            params.push(startDate)
            whereConditions.push(`p.date <= $${paramIndex++}`)
            params.push(endDate)
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

        const { rows } = await pool.query(`
            SELECT
                COUNT(p.id) as total_items,
                COALESCE(SUM(p.value), 0) as total_value,
                COALESCE(SUM(CASE WHEN p.spent_by = 'loja' THEN p.value ELSE 0 END), 0) as total_loja,
                COALESCE(SUM(CASE WHEN p.spent_by = 'augusto' THEN p.value ELSE 0 END), 0) as total_augusto,
                COALESCE(SUM(CASE WHEN p.spent_by = 'thais' THEN p.value ELSE 0 END), 0) as total_thais
            FROM purchases p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            ${whereClause}
        `, params)

        const r = rows[0]
        res.json({
            totalItems: parseInt(r.total_items) || 0,
            totalValue: parseFloat(r.total_value) || 0,
            totalLoja: parseFloat(r.total_loja) || 0,
            totalAugusto: parseFloat(r.total_augusto) || 0,
            totalThais: parseFloat(r.total_thais) || 0
        })
    } catch (error) {
        console.error("❌ Erro ao buscar métricas de compras:", error)
        res.status(500).json({ error: 'Erro ao buscar métricas' })
    }
})

// GET /api/purchases/:id - Get purchase by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { rows } = await pool.query(`
            SELECT p.*, s.name as supplier_name
            FROM purchases p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            WHERE p.id = $1
        `, [id])
        if (rows.length === 0) return res.status(404).json({ error: 'Compra não encontrada' })
        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao buscar compra ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar compra' })
    }
})

// POST /api/purchases - Create purchase
router.post('/', async (req, res) => {
    const { supplierId, paymentMethod, value, date, pieces, parcelas, notes, spentBy } = req.body

    if (!value || !date) {
        return res.status(400).json({ error: 'value e date são obrigatórios' })
    }

    try {
        const { rows } = await pool.query(`
            INSERT INTO purchases (supplier_id, payment_method, value, date, pieces, parcelas, notes, spent_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [supplierId || null, paymentMethod || null, parseFloat(value), date, pieces || null, parcelas || null, notes || null, spentBy || 'loja'])

        res.status(201).json(toCamelCase(rows[0]))
    } catch (error) {
        console.error("❌ Erro ao criar compra:", error)
        res.status(500).json({ error: 'Erro ao criar compra' })
    }
})

// PUT /api/purchases/:id - Update purchase
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const { supplierId, paymentMethod, value, date, pieces, parcelas, notes, spentBy } = req.body

    try {
        const { rows } = await pool.query(`
            UPDATE purchases SET
                supplier_id = COALESCE($1, supplier_id),
                payment_method = COALESCE($2, payment_method),
                value = COALESCE($3, value),
                date = COALESCE($4, date),
                pieces = COALESCE($5, pieces),
                parcelas = COALESCE($6, parcelas),
                notes = COALESCE($7, notes),
                spent_by = COALESCE($8, spent_by)
            WHERE id = $9
            RETURNING *
        `, [supplierId, paymentMethod, value !== undefined ? parseFloat(value) : null, date, pieces, parcelas, notes, spentBy, id])

        if (rows.length === 0) return res.status(404).json({ error: 'Compra não encontrada' })
        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar compra ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar compra' })
    }
})

// DELETE /api/purchases/:id - Delete purchase
router.delete('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { rowCount } = await pool.query('DELETE FROM purchases WHERE id = $1', [id])
        if (rowCount === 0) return res.status(404).json({ error: 'Compra não encontrada' })
        res.json({ success: true })
    } catch (error) {
        console.error(`❌ Erro ao deletar compra ${id}:`, error)
        res.status(500).json({ error: 'Erro ao deletar compra' })
    }
})

export default router
