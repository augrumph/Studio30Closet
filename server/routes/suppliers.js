import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// GET /api/suppliers - List suppliers with pagination
router.get('/', async (req, res) => {
    const { page = 1, pageSize = 20, search = '' } = req.query
    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

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

// POST /api/suppliers - Create supplier
router.post('/', async (req, res) => {
    const { name, cnpj, phone, email, address, city, state, zipCode, contactPerson, notes } = req.body

    if (!name) {
        return res.status(400).json({ error: 'name é obrigatório' })
    }

    try {
        const { rows } = await pool.query(`
            INSERT INTO suppliers (name, cnpj, phone, email, address, city, state, zip_code, contact_person, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [name, cnpj || null, phone || null, email || null, address || null, city || null, state || null, zipCode || null, contactPerson || null, notes || null])

        res.status(201).json(toCamelCase(rows[0]))
    } catch (error) {
        console.error("❌ Erro ao criar fornecedor:", error)
        res.status(500).json({ error: 'Erro ao criar fornecedor' })
    }
})

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const { name, cnpj, phone, email, address, city, state, zipCode, contactPerson, notes } = req.body

    try {
        const { rows } = await pool.query(`
            UPDATE suppliers SET
                name = COALESCE($1, name),
                cnpj = COALESCE($2, cnpj),
                phone = COALESCE($3, phone),
                email = COALESCE($4, email),
                address = COALESCE($5, address),
                city = COALESCE($6, city),
                state = COALESCE($7, state),
                zip_code = COALESCE($8, zip_code),
                contact_person = COALESCE($9, contact_person),
                notes = COALESCE($10, notes),
                updated_at = NOW()
            WHERE id = $11
            RETURNING *
        `, [name, cnpj, phone, email, address, city, state, zipCode, contactPerson, notes, id])

        if (rows.length === 0) return res.status(404).json({ error: 'Fornecedor não encontrado' })
        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar fornecedor ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar fornecedor' })
    }
})

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { rowCount } = await pool.query('DELETE FROM suppliers WHERE id = $1', [id])
        if (rowCount === 0) return res.status(404).json({ error: 'Fornecedor não encontrado' })
        res.json({ success: true })
    } catch (error) {
        console.error(`❌ Erro ao deletar fornecedor ${id}:`, error)
        res.status(500).json({ error: 'Erro ao deletar fornecedor' })
    }
})

export default router
