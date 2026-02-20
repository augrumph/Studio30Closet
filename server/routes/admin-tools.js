import express from 'express'
import { pool } from '../db.js'

const router = express.Router()

// GET /api/admin-tools/products-without-cost - Products without cost price
router.get('/products-without-cost', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, name, price, cost_price
            FROM products
            WHERE cost_price IS NULL OR cost_price = 0
            ORDER BY id ASC
        `)

        res.json({
            total: rows.length,
            products: rows
        })
    } catch (error) {
        console.error("❌ Erro ao buscar produtos sem custo:", error)
        res.status(500).json({ error: 'Erro ao buscar produtos' })
    }
})

// PATCH /api/admin-tools/products/:id/cost-price - Update cost price
router.patch('/products/:id/cost-price', async (req, res) => {
    const { id } = req.params
    const { cost_price } = req.body

    if (!cost_price || cost_price < 0) {
        return res.status(400).json({ error: 'Preço de custo inválido' })
    }

    try {
        const { rows } = await pool.query(
            'UPDATE products SET cost_price = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [parseFloat(cost_price), id]
        )

        res.json({ success: true, product: rows[0] })
    } catch (error) {
        console.error(`❌ Erro ao atualizar custo do produto ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar produto' })
    }
})

export default router
