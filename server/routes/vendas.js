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

            // Converter campos numéricos para números e parsear itens
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
                originalTotal: parseFloat(camelVenda.originalTotal) || 0,
                items: typeof camelVenda.items === 'string' ? JSON.parse(camelVenda.items || '[]') : (camelVenda.items || [])
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

        const venda = toCamelCase(rows[0])
        if (typeof venda.items === 'string') {
            venda.items = JSON.parse(venda.items || '[]')
        }

        res.json(venda)
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

// PUT /api/vendas/:id - Atualizar venda (atualização completa)
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const {
        customerId,
        paymentStatus,
        paymentMethod,
        cardBrand,
        totalValue,
        originalTotal,
        discountAmount,
        costPrice,
        feePercentage,
        feeAmount,
        netAmount,
        isInstallment,
        numInstallments,
        entryPayment,
        installmentStartDate,
        items
    } = req.body

    try {
        const { rows } = await pool.query(`
            UPDATE vendas SET
                customer_id = COALESCE($1, customer_id),
                payment_status = COALESCE($2, payment_status),
                payment_method = COALESCE($3, payment_method),
                card_brand = COALESCE($4, card_brand),
                total_value = COALESCE($5, total_value),
                original_total = COALESCE($6, original_total),
                discount_amount = COALESCE($7, discount_amount),
                cost_price = COALESCE($8, cost_price),
                fee_percentage = COALESCE($9, fee_percentage),
                fee_amount = COALESCE($10, fee_amount),
                net_amount = COALESCE($11, net_amount),
                is_installment = COALESCE($12, is_installment),
                num_installments = COALESCE($13, num_installments),
                entry_payment = COALESCE($14, entry_payment),
                installment_start_date = COALESCE($15, installment_start_date),
                items = COALESCE($16, items),
                updated_at = NOW()
            WHERE id = $17
            RETURNING *
        `, [
            customerId || null,
            paymentStatus || null,
            paymentMethod || null,
            cardBrand || null,
            totalValue !== undefined ? totalValue : null,
            originalTotal !== undefined ? originalTotal : null,
            discountAmount !== undefined ? discountAmount : null,
            costPrice !== undefined ? costPrice : null,
            feePercentage !== undefined ? feePercentage : null,
            feeAmount !== undefined ? feeAmount : null,
            netAmount !== undefined ? netAmount : null,
            isInstallment !== undefined ? isInstallment : null,
            numInstallments !== undefined ? numInstallments : null,
            entryPayment !== undefined ? entryPayment : null,
            installmentStartDate || null,
            items !== undefined ? JSON.stringify(items) : null,
            id
        ])

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Venda não encontrada' })
        }

        const updated = toCamelCase(rows[0])
        if (typeof updated.items === 'string') {
            updated.items = JSON.parse(updated.items || '[]')
        }

        console.log(`✅ Venda #${id} atualizada com sucesso`)
        res.json(updated)
    } catch (error) {
        console.error(`❌ Erro ao atualizar venda ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar venda' })
    }
})

// DELETE /api/vendas/:id - Deletar venda (com restauração de estoque)
router.delete('/:id', async (req, res) => {
    const { id } = req.params
    const client = await getClient()

    try {
        await client.query('BEGIN')

        // Buscar venda antes de deletar para pegar os itens
        const { rows: [venda] } = await client.query('SELECT items FROM vendas WHERE id = $1', [id])

        if (!venda) {
            await client.query('ROLLBACK')
            return res.status(404).json({ error: 'Venda não encontrada' })
        }

        // Restaurar estoque de cada item
        const items = typeof venda.items === 'string'
            ? JSON.parse(venda.items || '[]')
            : (venda.items || [])

        if (items.length > 0) {
            console.log(`🔓 Restaurando estoque de ${items.length} itens da venda #${id}...`)
            for (const item of items) {
                if (item.productId) {
                    try {
                        const color = item.selectedColor || 'Padrão'
                        const size = item.selectedSize || 'Único'

                        await updateProductStock(
                            client,
                            item.productId,
                            item.quantity || 1,
                            color,
                            size,
                            'restore'
                        )
                    } catch (stockErr) {
                        // Log mas não bloqueia a deleção se o produto não existir mais
                        console.warn(`⚠️ Não foi possível restaurar estoque do produto ${item.productId}:`, stockErr.message)
                    }
                }
            }
        }

        const { rowCount } = await client.query('DELETE FROM vendas WHERE id = $1', [id])
        await client.query('COMMIT')

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Venda não encontrada' })
        }

        res.json({ message: 'Venda deletada com sucesso' })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error(`❌ Erro ao deletar venda ${id}:`, error)
        res.status(500).json({ error: 'Erro ao deletar venda' })
    } finally {
        client.release()
    }
})

export default router
