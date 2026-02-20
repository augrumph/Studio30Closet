import express from 'express'
import { pool, getClient } from '../db.js'
import { toCamelCase } from '../utils.js'
import { updateProductStock } from '../stock-utils.js'

const router = express.Router()

// GET /api/vendas - Listar vendas
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 50,
        status = 'all',
        method = 'all',
        search = '',
        dateFilter = 'all',
        startDate,
        endDate
    } = req.query

    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    console.log(`🛍️ Vendas API: page=${page}, status=${status}, method=${method}, dateFilter=${dateFilter}, search="${search}"`)

    try {
        let whereConditions = []
        let params = []
        let paramIndex = 1

        // Filtro de status de pagamento
        if (status !== 'all') {
            whereConditions.push(`v.payment_status = $${paramIndex++}`)
            params.push(status)
        }

        // Filtro de método de pagamento
        if (method !== 'all') {
            whereConditions.push(`v.payment_method = $${paramIndex++}`)
            params.push(method)
        }

        // Filtro de busca por cliente
        if (search && search.trim()) {
            whereConditions.push(`c.name ILIKE $${paramIndex++}`)
            params.push(`%${search.trim()}%`)
        }

        // Filtro de data rápido
        let computedStartDate = startDate
        let computedEndDate = endDate

        if (dateFilter === 'today') {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            computedStartDate = today.toISOString()
            computedEndDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        } else if (dateFilter === 'month') {
            const now = new Date()
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
            computedStartDate = firstDay.toISOString()
            computedEndDate = new Date().toISOString()
        }

        if (computedStartDate) {
            whereConditions.push(`v.created_at >= $${paramIndex++}`)
            params.push(computedStartDate)
        }

        if (computedEndDate) {
            whereConditions.push(`v.created_at <= $${paramIndex++}`)
            params.push(computedEndDate)
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

        const { rows } = await pool.query(`
            SELECT
                COUNT(*) OVER() as total_count,
                v.*,
                c.name as customer_name,
                c.phone as customer_phone
            FROM vendas v
            LEFT JOIN customers c ON c.id = v.customer_id
            ${whereClause}
            ORDER BY v.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        // Mapear e limpar dados, removendo total_count de cada registro
        const vendas = rows.map(row => {
            const { total_count, ...venda } = row
            const camelVenda = toCamelCase(venda)

            // Converter campos numéricos para números
            return {
                ...camelVenda,
                id: parseInt(camelVenda.id) || camelVenda.id,
                customerId: parseInt(camelVenda.customerId) || null,
                orderId: parseInt(camelVenda.orderId) || null,
                totalValue: parseFloat(camelVenda.totalValue) || 0,
                costPrice: parseFloat(camelVenda.costPrice) || null,
                feePercentage: parseFloat(camelVenda.feePercentage) || 0,
                feeAmount: parseFloat(camelVenda.feeAmount) || 0,
                netAmount: parseFloat(camelVenda.netAmount) || 0,
                numInstallments: parseInt(camelVenda.numInstallments) || 1,
                entryPayment: parseFloat(camelVenda.entryPayment) || 0,
                discountAmount: parseFloat(camelVenda.discountAmount) || 0,
                originalTotal: parseFloat(camelVenda.originalTotal) || 0
            }
        })

        res.json({
            vendas,
            total,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(total / pageSize)
        })
    } catch (error) {
        console.error('❌ Erro ao listar vendas:', error)
        res.status(500).json({ error: 'Erro ao listar vendas' })
    }
})

// GET /api/vendas/:id - Detalhes da venda
router.get('/:id', async (req, res) => {
    const { id } = req.params

    try {
        const { rows } = await pool.query(`
            SELECT
                v.*,
                c.name as customer_name,
                c.phone as customer_phone,
                c.email as customer_email
            FROM vendas v
            LEFT JOIN customers c ON c.id = v.customer_id
            WHERE v.id = $1
        `, [id])

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Venda não encontrada' })
        }

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao buscar venda ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar venda' })
    }
})

// POST /api/vendas - Criar venda
router.post('/', async (req, res) => {
    const {
        customerId,
        orderId,
        totalValue,
        costPrice,
        items,
        paymentMethod,
        cardBrand,
        feePercentage,
        feeAmount,
        netAmount,
        paymentStatus,
        isInstallment,
        numInstallments,
        entryPayment,
        installmentStartDate,
        discountAmount,
        originalTotal
    } = req.body

    const client = await getClient()

    try {
        await client.query('BEGIN')

        // 1. Inserir Venda (dentro da transação)
        const { rows } = await client.query(`
            INSERT INTO vendas (
                customer_id, order_id, total_value, cost_price, items,
                payment_method, card_brand, fee_percentage, fee_amount, net_amount,
                payment_status, is_installment, num_installments, entry_payment,
                installment_start_date, discount_amount, original_total
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `, [
            customerId, orderId || null, totalValue, costPrice || null,
            items ? JSON.stringify(items) : '[]',
            paymentMethod, cardBrand || null, feePercentage || 0, feeAmount || 0, netAmount || totalValue,
            paymentStatus || 'pending', isInstallment || false, numInstallments || 1,
            entryPayment || 0, installmentStartDate || null, discountAmount || 0, originalTotal || totalValue
        ])

        const novaVenda = rows[0]

        // 2. Atualizar Estoque (Sempre, pois se vier de malinha, a malinha vai liberar a reserva ao mudar status)
        if (items && items.length > 0) {
            console.log(`📦 Venda ${novaVenda.id} - Baixando estoque de ${items.length} itens...`)
            for (const item of items) {
                // Tenta pegar cor/tamanho de várias propriedades possíveis para robustez
                const color = item.selectedColor || item.colorSelected || item.color || 'Padrão'
                const size = item.selectedSize || item.sizeSelected || item.size || 'Único'
                const qty = item.quantity || 1

                if (item.productId) {
                    await updateProductStock(
                        client,
                        item.productId,
                        qty,
                        color,
                        size,
                        'reserve' // 'reserve' decrementa o estoque (saída)
                    )
                }
            }
        }

        await client.query('COMMIT')

        res.status(201).json(toCamelCase(novaVenda))
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Erro ao criar venda:', error)
        res.status(500).json({ error: error.message || 'Erro ao criar venda' })
    } finally {
        client.release()
    }
})

// PUT /api/vendas/:id - Atualizar venda
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const { paymentStatus, paymentMethod, totalValue, netAmount } = req.body

    try {
        const { rows } = await pool.query(`
            UPDATE vendas SET
                payment_status = COALESCE($1, payment_status),
                payment_method = COALESCE($2, payment_method),
                total_value = COALESCE($3, total_value),
                net_amount = COALESCE($4, net_amount)
            WHERE id = $5
            RETURNING *
        `, [paymentStatus, paymentMethod, totalValue, netAmount, id])

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Venda não encontrada' })
        }

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar venda ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar venda' })
    }
})

// DELETE /api/vendas/:id - Deletar venda
router.delete('/:id', async (req, res) => {
    const { id } = req.params

    try {
        const { rowCount } = await pool.query('DELETE FROM vendas WHERE id = $1', [id])

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Venda não encontrada' })
        }

        res.json({ message: 'Venda deletada com sucesso' })
    } catch (error) {
        console.error(`❌ Erro ao deletar venda ${id}:`, error)
        res.status(500).json({ error: 'Erro ao deletar venda' })
    }
})

export default router
