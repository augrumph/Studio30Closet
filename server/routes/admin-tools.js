import express from 'express'
import { supabase } from '../supabase.js'

const router = express.Router()

// Listar produtos sem preço de custo
router.get('/products-without-cost', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, price, cost_price')
            .or('cost_price.is.null,cost_price.eq.0')
            .order('id', { ascending: true })

        if (error) throw error

        res.json({
            total: data.length,
            products: data
        })
    } catch (err) {
        console.error('❌ Erro ao buscar produtos sem custo:', err)
        res.status(500).json({ error: 'Erro ao buscar produtos' })
    }
})

// Atualizar preço de custo de um produto
router.patch('/products/:id/cost-price', async (req, res) => {
    const { id } = req.params
    const { cost_price } = req.body

    if (!cost_price || cost_price < 0) {
        return res.status(400).json({ error: 'Preço de custo inválido' })
    }

    try {
        const { data, error } = await supabase
            .from('products')
            .update({
                cost_price: parseFloat(cost_price),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        res.json({
            success: true,
            product: data
        })
    } catch (err) {
        console.error(`❌ Erro ao atualizar custo do produto ${id}:`, err)
        res.status(500).json({ error: 'Erro ao atualizar produto' })
    }
})

// Atualizar múltiplos produtos de uma vez
router.patch('/products/bulk-cost-price', async (req, res) => {
    const { updates } = req.body
    // updates = [{ id: 45, cost_price: 100 }, { id: 46, cost_price: 150 }]

    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'Lista de atualizações inválida' })
    }

    try {
        const results = []
        const errors = []

        for (const update of updates) {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .update({
                        cost_price: parseFloat(update.cost_price),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', update.id)
                    .select()
                    .single()

                if (error) throw error
                results.push(data)
            } catch (err) {
                errors.push({ id: update.id, error: err.message })
            }
        }

        res.json({
            success: errors.length === 0,
            updated: results.length,
            failed: errors.length,
            results,
            errors
        })
    } catch (err) {
        console.error('❌ Erro no bulk update:', err)
        res.status(500).json({ error: 'Erro ao atualizar produtos' })
    }
})

export default router
