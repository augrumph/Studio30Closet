import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// GET /api/materials - List all materials
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT * FROM materials_stock
            ORDER BY created_at DESC
        `)

        res.json(rows.map(toCamelCase))
    } catch (error) {
        console.error('❌ Erro ao listar materiais:', error)
        res.status(500).json({ error: 'Erro ao listar materiais' })
    }
})

// GET /api/materials/:id - Get material by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params

    try {
        const { rows } = await pool.query(
            'SELECT * FROM materials_stock WHERE id = $1',
            [id]
        )

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Material não encontrado' })
        }

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao buscar material ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar material' })
    }
})

// POST /api/materials - Create material
router.post('/', async (req, res) => {
    const {
        name,
        description,
        quantity,
        unitCost,
        category,
        supplierId,
        minStockLevel
    } = req.body

    if (!name) {
        return res.status(400).json({ error: 'Name é obrigatório' })
    }

    try {
        const { rows } = await pool.query(`
            INSERT INTO materials_stock (
                name, description, quantity, unit_cost,
                category, supplier_id, min_stock_level
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            name,
            description || null,
            quantity || 0,
            unitCost || 0,
            category || null,
            supplierId || null,
            minStockLevel || 0
        ])

        res.status(201).json(toCamelCase(rows[0]))
    } catch (error) {
        console.error('❌ Erro ao criar material:', error)
        res.status(500).json({ error: 'Erro ao criar material' })
    }
})

// PUT /api/materials/:id - Update material
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const {
        name,
        description,
        quantity,
        unitCost,
        category,
        supplierId,
        minStockLevel
    } = req.body

    try {
        const { rows } = await pool.query(`
            UPDATE materials_stock SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                quantity = COALESCE($3, quantity),
                unit_cost = COALESCE($4, unit_cost),
                category = COALESCE($5, category),
                supplier_id = COALESCE($6, supplier_id),
                min_stock_level = COALESCE($7, min_stock_level),
                updated_at = NOW()
            WHERE id = $8
            RETURNING *
        `, [
            name,
            description,
            quantity,
            unitCost,
            category,
            supplierId,
            minStockLevel,
            id
        ])

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Material não encontrado' })
        }

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar material ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar material' })
    }
})

// DELETE /api/materials/:id - Delete material
router.delete('/:id', async (req, res) => {
    const { id } = req.params

    try {
        const { rowCount } = await pool.query(
            'DELETE FROM materials_stock WHERE id = $1',
            [id]
        )

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Material não encontrado' })
        }

        res.json({ success: true })
    } catch (error) {
        console.error(`❌ Erro ao deletar material ${id}:`, error)
        res.status(500).json({ error: 'Erro ao deletar material' })
    }
})

export default router
