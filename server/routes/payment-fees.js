import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// GET /api/payment-fees - List all payment fees
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT * FROM payment_fees
            ORDER BY created_at DESC
        `)

        res.json(rows.map(toCamelCase))
    } catch (error) {
        console.error('❌ Erro ao listar taxas:', error)
        res.status(500).json({ error: 'Erro ao listar taxas' })
    }
})

// GET /api/payment-fees/calculate - Calculate fee for specific payment
router.get('/calculate', async (req, res) => {
    const { paymentMethod, cardBrand, installments } = req.query

    if (!paymentMethod) {
        return res.status(400).json({ error: 'paymentMethod é obrigatório' })
    }

    try {
        // Build query dynamically
        let query = `
            SELECT * FROM payment_fees
            WHERE payment_method = $1
            AND is_active = true
        `
        const params = [paymentMethod]
        let paramIndex = 2

        // Filter by card brand
        if (cardBrand) {
            query += ` AND card_brand = $${paramIndex}`
            params.push(cardBrand)
            paramIndex++
        } else {
            query += ` AND card_brand IS NULL`
        }

        // Filter by installments
        if (installments) {
            query += ` AND installments = $${paramIndex}`
            params.push(parseInt(installments))
        } else {
            query += ` AND installments IS NULL`
        }

        const { rows } = await pool.query(query, params)

        if (rows.length === 0) {
            // Return null if no fee found (PIX usually has 0%)
            return res.json(null)
        }

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error('❌ Erro ao calcular taxa:', error)
        res.status(500).json({ error: 'Erro ao calcular taxa' })
    }
})

// GET /api/payment-fees/:id - Get payment fee by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params

    try {
        const { rows } = await pool.query(
            'SELECT * FROM payment_fees WHERE id = $1',
            [id]
        )

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Taxa não encontrada' })
        }

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao buscar taxa ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar taxa' })
    }
})

// POST /api/payment-fees - Create or upsert payment fee
router.post('/', async (req, res) => {
    const {
        paymentMethod,
        cardBrand,
        installments,
        feePercentage,
        description,
        isActive
    } = req.body

    if (!paymentMethod || feePercentage === undefined) {
        return res.status(400).json({ error: 'paymentMethod e feePercentage são obrigatórios' })
    }

    try {
        // Use UPSERT to handle unique constraint
        const { rows } = await pool.query(`
            INSERT INTO payment_fees (
                payment_method, card_brand, installments,
                fee_percentage, description, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (payment_method, COALESCE(card_brand, ''), COALESCE(installments, 0))
            DO UPDATE SET
                fee_percentage = EXCLUDED.fee_percentage,
                description = EXCLUDED.description,
                is_active = EXCLUDED.is_active
            RETURNING *
        `, [
            paymentMethod,
            cardBrand || null,
            installments || null,
            feePercentage,
            description || null,
            isActive !== undefined ? isActive : true
        ])

        res.status(201).json(toCamelCase(rows[0]))
    } catch (error) {
        console.error('❌ Erro ao criar taxa:', error)
        res.status(500).json({ error: error.message })
    }
})

// PUT /api/payment-fees/:id - Update payment fee
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const {
        paymentMethod,
        cardBrand,
        installments,
        feePercentage,
        description,
        isActive
    } = req.body

    try {
        const { rows } = await pool.query(`
            UPDATE payment_fees SET
                payment_method = COALESCE($1, payment_method),
                card_brand = COALESCE($2, card_brand),
                installments = COALESCE($3, installments),
                fee_percentage = COALESCE($4, fee_percentage),
                description = COALESCE($5, description),
                is_active = COALESCE($6, is_active)
            WHERE id = $7
            RETURNING *
        `, [
            paymentMethod,
            cardBrand,
            installments,
            feePercentage,
            description,
            isActive,
            id
        ])

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Taxa não encontrada' })
        }

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar taxa ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar taxa' })
    }
})

// DELETE /api/payment-fees/:id - Delete payment fee
router.delete('/:id', async (req, res) => {
    const { id } = req.params

    try {
        const { rowCount } = await pool.query(
            'DELETE FROM payment_fees WHERE id = $1',
            [id]
        )

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Taxa não encontrada' })
        }

        res.json({ success: true })
    } catch (error) {
        console.error(`❌ Erro ao deletar taxa ${id}:`, error)
        res.status(500).json({ error: 'Erro ao deletar taxa' })
    }
})

// DELETE /api/payment-fees - Delete all payment fees
router.delete('/', async (req, res) => {
    try {
        await pool.query('DELETE FROM payment_fees')
        res.json({ success: true })
    } catch (error) {
        console.error('❌ Erro ao deletar todas as taxas:', error)
        res.status(500).json({ error: 'Erro ao deletar todas as taxas' })
    }
})

export default router
