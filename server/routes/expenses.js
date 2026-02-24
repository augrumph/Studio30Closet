import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// GET /api/expenses - List expenses
router.get('/', async (req, res) => {
    const { page = 1, pageSize = 20, search = '' } = req.query
    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    try {
        let whereClause = ''
        let params = []
        let paramIndex = 1

        if (search) {
            whereClause = `WHERE (name ILIKE $${paramIndex} OR category ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`
            params.push(`%${search}%`)
            paramIndex++
        }

        const { rows } = await pool.query(`
            SELECT COUNT(*) OVER() as total_count, *
            FROM fixed_expenses
            ${whereClause}
            ORDER BY created_at DESC
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
        console.error("❌ Erro na API de Despesas:", error)
        res.status(500).json({ message: 'Erro interno do servidor' })
    }
})

// GET /api/expenses/metrics - Get expenses metrics
router.get('/metrics', async (req, res) => {
    const { search = '' } = req.query

    try {
        let whereClause = ''
        let params = []

        if (search) {
            whereClause = 'WHERE (name ILIKE $1 OR category ILIKE $1 OR notes ILIKE $1)'
            params.push(`%${search}%`)
        }

        const { rows } = await pool.query(`
            SELECT
                COUNT(*) as count,
                COALESCE(SUM(value), 0) as total_value
            FROM fixed_expenses
            ${whereClause}
        `, params)

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error("❌ Erro ao buscar métricas de despesas:", error)
        res.status(500).json({ message: 'Erro ao buscar métricas' })
    }
})

// GET /api/expenses/:id - Get expense
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM fixed_expenses WHERE id = $1', [req.params.id])
        if (rows.length === 0) return res.status(404).json({ error: 'Despesa não encontrada' })
        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error("❌ Erro ao buscar despesa:", error)
        res.status(500).json({ message: 'Erro ao buscar despesa' })
    }
})

// POST /api/expenses - Create expense
router.post('/', async (req, res) => {
    const { name, category, value, recurrence, dueDay, notes } = req.body

    if (!name || value === undefined) {
        return res.status(400).json({ error: 'name e value são obrigatórios' })
    }

    try {
        const { rows } = await pool.query(`
            INSERT INTO fixed_expenses (name, category, value, recurrence, due_day, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, category || null, parseFloat(value), recurrence || 'monthly', dueDay || null, notes || null])

        res.status(201).json(toCamelCase(rows[0]))
    } catch (error) {
        console.error("❌ Erro ao criar despesa:", error)
        res.status(500).json({ error: 'Erro ao criar despesa' })
    }
})

// PUT /api/expenses/:id - Update expense
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const { name, category, value, recurrence, dueDay, paid, notes } = req.body

    try {
        const { rows } = await pool.query(`
            UPDATE fixed_expenses SET
                name = COALESCE($1, name),
                category = COALESCE($2, category),
                value = COALESCE($3, value),
                recurrence = COALESCE($4, recurrence),
                due_day = COALESCE($5, due_day),
                paid = COALESCE($6, paid),
                notes = COALESCE($7, notes),
                updated_at = NOW()
            WHERE id = $8
            RETURNING *
        `, [name, category, value !== undefined ? parseFloat(value) : null, recurrence, dueDay, paid, notes, id])

        if (rows.length === 0) return res.status(404).json({ error: 'Despesa não encontrada' })
        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar despesa ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar despesa' })
    }
})

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { rowCount } = await pool.query('DELETE FROM fixed_expenses WHERE id = $1', [id])
        if (rowCount === 0) return res.status(404).json({ error: 'Despesa não encontrada' })
        res.json({ success: true })
    } catch (error) {
        console.error(`❌ Erro ao deletar despesa ${id}:`, error)
        res.status(500).json({ error: 'Erro ao deletar despesa' })
    }
})

export default router
