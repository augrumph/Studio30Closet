import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// GET /api/collections - List all collections
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT * FROM collections
            ORDER BY title ASC
        `)

        res.json(rows.map(toCamelCase))
    } catch (error) {
        console.error('❌ Erro ao listar coleções:', error)
        res.status(500).json({ error: 'Erro ao listar coleções' })
    }
})

// GET /api/collections/active - List active collections only
router.get('/active', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, title, slug
            FROM collections
            WHERE active = true
            ORDER BY title ASC
        `)

        res.json(rows.map(toCamelCase))
    } catch (error) {
        console.error('❌ Erro ao listar coleções ativas:', error)
        res.status(500).json({ error: 'Erro ao listar coleções ativas' })
    }
})

// GET /api/collections/:id - Get collection by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params

    try {
        const { rows } = await pool.query(
            'SELECT * FROM collections WHERE id = $1',
            [id]
        )

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Coleção não encontrada' })
        }

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao buscar coleção ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar coleção' })
    }
})

// POST /api/collections - Create collection (Admin)
router.post('/', authenticateToken, async (req, res) => {
    const { title } = req.body

    if (!title) {
        return res.status(400).json({ error: 'Title é obrigatório' })
    }

    try {
        // Generate slug
        const slug = title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        const { rows } = await pool.query(`
            INSERT INTO collections (title, slug, active)
            VALUES ($1, $2, true)
            RETURNING *
        `, [title, slug])

        res.status(201).json(toCamelCase(rows[0]))
    } catch (error) {
        console.error('❌ Erro ao criar coleção:', error)
        res.status(500).json({ error: 'Erro ao criar coleção' })
    }
})

// PUT /api/collections/:id - Update collection (Admin)
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    const { title, active } = req.body

    try {
        const updateParts = []
        const values = []
        let paramIndex = 1

        if (title !== undefined) {
            updateParts.push(`title = $${paramIndex}`)
            values.push(title)
            paramIndex++

            // Update slug if title changes
            const slug = title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')

            updateParts.push(`slug = $${paramIndex}`)
            values.push(slug)
            paramIndex++
        }

        if (active !== undefined) {
            updateParts.push(`active = $${paramIndex}`)
            values.push(active)
            paramIndex++
        }

        if (updateParts.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' })
        }

        values.push(id)

        const { rows } = await pool.query(`
            UPDATE collections
            SET ${updateParts.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, values)

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Coleção não encontrada' })
        }

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar coleção ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar coleção' })
    }
})

// DELETE /api/collections/:id - Delete collection (Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params

    try {
        const { rowCount } = await pool.query(
            'DELETE FROM collections WHERE id = $1',
            [id]
        )

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Coleção não encontrada' })
        }

        // Remover o ID deletado do array collection_ids de todos os produtos que o referenciam
        await pool.query(`
            UPDATE products
            SET collection_ids = array_remove(collection_ids, $1::bigint)
            WHERE collection_ids @> ARRAY[$1::bigint]
        `, [Number(id)])

        res.json({ success: true })
    } catch (error) {
        console.error(`❌ Erro ao deletar coleção ${id}:`, error)
        res.status(500).json({ error: 'Erro ao deletar coleção' })
    }
})

export default router
