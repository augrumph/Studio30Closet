import express from 'express'
import { getClient, pool } from '../db.js'
import { toCamelCase } from '../utils.js'
import { updateProductStock } from '../stock-utils.js'
import { emitRealtimeEvent } from '../lib/realtime-events.js'
import { enrichImages } from '../lib/s3.js'

const router = express.Router()

// GET /api/returns - List returns
router.get('/', async (req, res) => {
    const { page = 1, pageSize = 50 } = req.query
    const offset = (page - 1) * pageSize

    try {
        const { rows } = await pool.query(`
            SELECT 
                COUNT(*) OVER() as total_count,
                r.*, 
                c.name as customer_name,
                v.created_at as original_venda_date
            FROM returns r
            LEFT JOIN customers c ON c.id = r.customer_id
            LEFT JOIN vendas v ON v.id = r.original_venda_id
            ORDER BY r.created_at DESC
            LIMIT $1 OFFSET $2
        `, [pageSize, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0
        const items = rows.map(row => {
            const { total_count, ...rest } = row
            const camelRest = toCamelCase(rest)
            if (typeof camelRest.items === 'string') {
                camelRest.items = JSON.parse(camelRest.items || '[]')
            }
            return camelRest
        })

        res.json({
            items,
            total,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(total / pageSize)
        })
    } catch (err) {
        console.error('❌ Erro ao listar devoluções:', err)
        res.status(500).json({ error: 'Erro ao listar devoluções' })
    }
})

// POST /api/returns - Process a return
router.post('/', async (req, res) => {
    const { customerId, originalVendaId, items, returnType, notes } = req.body
    
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Dados inválidos para devolução' })
    }

    const client = await getClient()

    try {
        await client.query('BEGIN')

        let totalCreditGenerated = 0

        // 1. Process items and handle stock
        for (const item of items) {
            const qty = item.quantity || 1
            const itemTotal = (item.price || 0) * qty
            totalCreditGenerated += itemTotal

            if (item.productId) {
                const color = item.selectedColor || item.colorSelected || item.color || 'Padrão'
                const size = item.selectedSize || item.sizeSelected || item.size || 'Único'

                if (item.condition === 'defective') {
                    // Log movement as defect, do NOT add to sellable stock
                    await client.query(
                        `INSERT INTO stock_movements (product_id, quantity, movement_type, notes, from_status, to_status)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [item.productId, qty, 'defeito', `Devolução (Defeito) - ${notes || ''}`, 'active', 'quarentena']
                    )
                } else {
                    // Restore sellable stock
                    await updateProductStock(client, item.productId, qty, color, size, 'restore')
                }
            }
        }

        // 2. Handle Debt Abatement or Store Credit
        let remainingToCredit = totalCreditGenerated

        if (originalVendaId && returnType === 'credit') {
            // Check if there's pending debt on this sale
            const { rows: pendingInstallments } = await client.query(`
                SELECT i.id, i.original_amount,
                    GREATEST(0, i.original_amount - COALESCE((
                        SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                    ), 0)) as real_remaining
                FROM installments i
                WHERE i.venda_id = $1 AND i.status != 'paid'
                ORDER BY i.due_date ASC
                FOR UPDATE
            `, [originalVendaId])

            const today = new Date().toISOString().split('T')[0]

            for (const inst of pendingInstallments) {
                if (remainingToCredit <= 0) break
                
                const debt = parseFloat(inst.real_remaining)
                if (debt <= 0) continue

                const paymentForThisInst = Math.min(remainingToCredit, debt)
                
                // Record the payment
                await client.query(`
                    INSERT INTO installment_payments (installment_id, payment_amount, payment_date, payment_method, notes, created_by)
                    VALUES ($1, $2, $3, 'devolucao', $4, 'admin')
                `, [inst.id, paymentForThisInst, today, `Abatimento por devolução - Venda #${originalVendaId}`])

                // Update installment status if fully paid
                if (paymentForThisInst >= debt - 0.01) {
                    await client.query(`
                        UPDATE installments SET status = 'paid', updated_at = NOW() WHERE id = $1
                    `, [inst.id])
                }

                remainingToCredit -= paymentForThisInst
            }

            // Sync original venda status
            const { syncVendaPaymentStatus } = await import('../lib/venda-utils.js')
            await syncVendaPaymentStatus(originalVendaId, client)
        }

        // The remainder (if any) goes to store credit
        if (remainingToCredit > 0 && returnType === 'credit') {
            await client.query(
                'UPDATE customers SET store_credit = COALESCE(store_credit, 0) + $1 WHERE id = $2',
                [remainingToCredit, customerId]
            )
        }

        // 3. Log the return
        const { rows: [newReturn] } = await client.query(`
            INSERT INTO returns (original_venda_id, customer_id, items, total_value, return_type, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [originalVendaId || null, customerId, JSON.stringify(items), totalCreditGenerated, returnType || 'credit', notes])

        await client.query('COMMIT')

        console.log(`✅ Devolução registrada. Tipo: ${returnType}, Cliente: ${customerId}, Valor: ${totalCreditGenerated}`)
        
        emitRealtimeEvent('return.created', { id: newReturn.id })
        emitRealtimeEvent('products.updated', { source: 'return' })

        const camelReturn = toCamelCase(newReturn)
        if (typeof camelReturn.items === 'string') {
            camelReturn.items = JSON.parse(camelReturn.items || '[]')
        }

        res.status(201).json(camelReturn)

    } catch (err) {
        await client.query('ROLLBACK')
        console.error('❌ Erro ao processar devolução:', err)
        res.status(500).json({ error: err.message || 'Erro ao processar devolução' })
    } finally {
        client.release()
    }
})

export default router
