import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'
import { cacheMiddleware } from '../cache.js'

const router = express.Router()

/**
 * Helper: Calcular campos derivados de uma venda com crediário
 */
async function calculateInstallmentFields(venda) {
    const vendaId = venda.id
    const totalValue = parseFloat(venda.total_value) || 0
    const entryPayment = parseFloat(venda.entry_payment) || 0

    // Buscar todas as parcelas e seus pagamentos
    const { rows: installments } = await pool.query(`
        SELECT
            i.*,
            COALESCE(SUM(ip.payment_amount), 0) as total_paid_via_payments
        FROM installments i
        LEFT JOIN installment_payments ip ON ip.installment_id = i.id
        WHERE i.venda_id = $1
        GROUP BY i.id
        ORDER BY i.installment_number ASC
    `, [vendaId])

    // Calcular totais
    let paidAmount = entryPayment
    let remainingAmount = 0
    let overdueCount = 0
    const today = new Date().toISOString().split('T')[0]

    installments.forEach(inst => {
        const instPaid = parseFloat(inst.paid_amount) || parseFloat(inst.total_paid_via_payments) || 0
        const instRemaining = parseFloat(inst.remaining_amount) || (parseFloat(inst.original_amount) - instPaid)

        paidAmount += instPaid
        remainingAmount += instRemaining

        if (inst.status === 'overdue' || (inst.due_date < today && instRemaining > 0)) {
            overdueCount++
        }
    })

    // Se não há parcelas, calcular manualmente
    if (installments.length === 0) {
        remainingAmount = totalValue - entryPayment
        paidAmount = entryPayment
    }

    return {
        dueAmount: Math.max(0, remainingAmount),
        paidAmount: paidAmount,
        overdueCount: overdueCount,
        hasInstallments: installments.length > 0
    }
}

/**
 * GET /api/installments - Listar vendas com crediário (BFF)
 * Query params: page, pageSize, status (pendentes, pagas, todas)
 */
router.get('/', async (req, res) => {
    const { page = 1, pageSize = 20, status = 'pendentes' } = req.query
    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    console.log(`💳 Installments API: page=${page}, status=${status}`)

    try {
        // Filtro de status
        let statusCondition = ''
        if (status === 'pendentes') {
            statusCondition = "AND v.payment_status != 'paid'"
        } else if (status === 'pagas') {
            statusCondition = "AND v.payment_status = 'paid'"
        }

        const { rows } = await pool.query(`
            SELECT
                COUNT(*) OVER() as total_count,
                v.*,
                c.name as customer_name,
                c.phone as customer_phone
            FROM vendas v
            LEFT JOIN customers c ON c.id = v.customer_id
            WHERE v.payment_method IN ('fiado', 'fiado_parcelado')
            ${statusCondition}
            ORDER BY v.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        // Processar cada venda para calcular campos derivados
        const items = await Promise.all(rows.map(async (row) => {
            const { total_count, ...venda } = row
            const calculated = await calculateInstallmentFields(venda)
            const camelVenda = toCamelCase(venda)

            return {
                ...camelVenda,
                id: parseInt(camelVenda.id),
                customerId: parseInt(camelVenda.customerId) || null,
                orderId: parseInt(camelVenda.orderId) || null,
                totalValue: parseFloat(camelVenda.totalValue) || 0,
                entryPayment: parseFloat(camelVenda.entryPayment) || 0,
                numInstallments: parseInt(camelVenda.numInstallments) || 1,
                feePercentage: parseFloat(camelVenda.feePercentage) || 0,
                feeAmount: parseFloat(camelVenda.feeAmount) || 0,
                netAmount: parseFloat(camelVenda.netAmount) || 0,
                discountAmount: parseFloat(camelVenda.discountAmount) || 0,
                originalTotal: parseFloat(camelVenda.originalTotal) || 0,
                costPrice: parseFloat(camelVenda.costPrice) || null,
                dueAmount: calculated.dueAmount,
                paidAmount: calculated.paidAmount,
                overdueCount: calculated.overdueCount
            }
        }))

        res.json({
            items,
            total,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(total / pageSize)
        })
    } catch (error) {
        console.error("❌ Erro na API de Crediário:", error)
        res.status(500).json({ error: 'Erro ao buscar vendas com crediário' })
    }
})

/**
 * GET /api/installments/metrics - Métricas agregadas de crediário
 * Query params: status (pendentes, pagas, todas)
 */
router.get('/metrics', async (req, res) => {
    const { status = 'pendentes' } = req.query

    console.log(`📊 Installments Metrics API: status=${status}`)

    try {
        // Filtro de status
        let statusCondition = ''
        if (status === 'pendentes') {
            statusCondition = "AND v.payment_status != 'paid'"
        } else if (status === 'pagas') {
            statusCondition = "AND v.payment_status = 'paid'"
        }

        // ⚡ Query única agregada em vez de N+1 queries seriais
        const { rows } = await pool.query(`
            SELECT
                COUNT(DISTINCT v.id) as count,
                COALESCE(SUM(
                    GREATEST(0,
                        (v.total_value - COALESCE(v.entry_payment, 0))
                        - COALESCE(inst_totals.paid_sum, 0)
                    )
                ), 0) as total_due_estimative,
                COUNT(DISTINCT CASE WHEN overdue_check.overdue_count > 0 THEN v.id END) as overdue_vendor_count,
                COALESCE(SUM(CASE WHEN overdue_check.overdue_count > 0
                    THEN GREATEST(0,
                        (v.total_value - COALESCE(v.entry_payment, 0))
                        - COALESCE(inst_totals.paid_sum, 0)
                    )
                    ELSE 0 END
                ), 0) as total_overdue_estimative
            FROM vendas v
            LEFT JOIN (
                SELECT i.venda_id, COALESCE(SUM(ip.payment_amount), 0) as paid_sum
                FROM installments i
                LEFT JOIN installment_payments ip ON ip.installment_id = i.id
                GROUP BY i.venda_id
            ) inst_totals ON inst_totals.venda_id = v.id
            LEFT JOIN (
                SELECT i.venda_id, COUNT(*) as overdue_count
                FROM installments i
                WHERE i.status = 'overdue'
                   OR (i.due_date < CURRENT_DATE AND (i.remaining_amount > 0 OR i.paid_amount < i.original_amount))
                GROUP BY i.venda_id
            ) overdue_check ON overdue_check.venda_id = v.id
            WHERE v.payment_method IN ('fiado', 'fiado_parcelado')
            ${statusCondition}
        `)

        const row = rows[0]

        res.json({
            count: parseInt(row.count) || 0,
            totalDueEstimative: parseFloat(row.total_due_estimative) || 0,
            totalOverdueEstimative: parseFloat(row.total_overdue_estimative) || 0,
            overdueCount: parseInt(row.overdue_vendor_count) || 0
        })
    } catch (error) {
        console.error("❌ Erro ao calcular métricas de crediário:", error)
        res.status(500).json({ error: 'Erro ao calcular métricas' })
    }
})

/**
 * GET /api/installments/:vendaId/details - Detalhes de parcelas de uma venda
 */
router.get('/:vendaId/details', async (req, res) => {
    const { vendaId } = req.params

    console.log(`🔍 Installments Details API: vendaId=${vendaId}`)

    try {
        // Buscar parcelas com seus pagamentos
        const { rows: installments } = await pool.query(`
            SELECT
                i.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', ip.id,
                            'installment_id', ip.installment_id,
                            'payment_amount', ip.payment_amount,
                            'payment_date', ip.payment_date,
                            'payment_method', ip.payment_method,
                            'notes', ip.notes,
                            'created_at', ip.created_at,
                            'created_by', ip.created_by
                        ) ORDER BY ip.payment_date DESC
                    ) FILTER (WHERE ip.id IS NOT NULL),
                    '[]'
                ) as payments
            FROM installments i
            LEFT JOIN installment_payments ip ON ip.installment_id = i.id
            WHERE i.venda_id = $1
            GROUP BY i.id
            ORDER BY i.installment_number ASC
        `, [vendaId])

        // Converter e calcular totais
        const installmentsData = installments.map(inst => {
            const camelInst = toCamelCase(inst)

            // Converter pagamentos de string JSON para array se necessário
            let payments = camelInst.payments
            if (typeof payments === 'string') {
                try {
                    payments = JSON.parse(payments)
                } catch (e) {
                    payments = []
                }
            }

            return {
                ...camelInst,
                id: parseInt(camelInst.id),
                vendaId: parseInt(camelInst.vendaId),
                installmentNumber: parseInt(camelInst.installmentNumber),
                originalAmount: parseFloat(camelInst.originalAmount) || 0,
                paidAmount: parseFloat(camelInst.paidAmount) || 0,
                remainingAmount: parseFloat(camelInst.remainingAmount) || 0,
                payments: payments.map(p => ({
                    ...p,
                    id: parseInt(p.id) || p.id,
                    installmentId: parseInt(p.installmentId) || p.installment_id,
                    paymentAmount: parseFloat(p.paymentAmount || p.payment_amount) || 0
                }))
            }
        })

        // Calcular resumo
        const totalValue = installmentsData.reduce((sum, inst) => sum + inst.originalAmount, 0)
        const paidAmount = installmentsData.reduce((sum, inst) => sum + inst.paidAmount, 0)
        const remainingAmount = totalValue - paidAmount
        const paidPercentage = totalValue > 0 ? Math.round((paidAmount / totalValue) * 100) : 0

        res.json({
            installments: installmentsData,
            totalValue,
            paidAmount,
            remainingAmount,
            paidPercentage
        })
    } catch (error) {
        console.error(`❌ Erro ao buscar detalhes da venda ${vendaId}:`, error)
        res.status(500).json({ error: 'Erro ao buscar detalhes' })
    }
})

/**
 * POST /api/installments/:installmentId/payment - Registrar pagamento de parcela
 * Body: { amount, date, method, notes }
 */
router.post('/:installmentId/payment', async (req, res) => {
    const { installmentId } = req.params
    const { amount, date, method = 'dinheiro', notes = null } = req.body

    console.log(`💰 Registrando pagamento: R$ ${amount} na parcela ${installmentId}`)

    try {
        // Verificar duplicatas (idempotência)
        const recentWindow = new Date(Date.now() - 30000).toISOString()
        const { rows: duplicates } = await pool.query(`
            SELECT id FROM installment_payments
            WHERE installment_id = $1
            AND payment_amount = $2
            AND payment_date = $3
            AND created_at >= $4
            LIMIT 1
        `, [installmentId, amount, date, recentWindow])

        if (duplicates.length > 0) {
            console.warn('🛑 Pagamento duplicado detectado')
            // Retornar dados atualizados sem inserir
            const { rows } = await pool.query('SELECT * FROM installments WHERE id = $1', [installmentId])
            return res.json(toCamelCase(rows[0]))
        }

        // Inserir pagamento (trigger do banco atualizará a parcela)
        const { rows } = await pool.query(`
            INSERT INTO installment_payments (
                installment_id, payment_amount, payment_date, payment_method, notes, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [installmentId, amount, date, method, notes, 'admin'])

        // Buscar parcela atualizada
        const { rows: updatedInst } = await pool.query('SELECT * FROM installments WHERE id = $1', [installmentId])

        console.log('✅ Pagamento registrado com sucesso')
        res.json(toCamelCase(updatedInst[0]))
    } catch (error) {
        console.error(`❌ Erro ao registrar pagamento:`, error)
        res.status(500).json({ error: 'Erro ao registrar pagamento' })
    }
})

/**
 * POST /api/installments/create - Criar parcelas para uma venda
 * Substitui RPC create_installments do Supabase
 * Body: { vendaId, numInstallments, entryPayment, installmentStartDate }
 */
router.post('/create', async (req, res) => {
    const { vendaId, numInstallments, entryPayment = 0, installmentStartDate } = req.body

    if (!vendaId || !numInstallments) {
        return res.status(400).json({ success: false, error: 'vendaId e numInstallments são obrigatórios' })
    }

    const startDate = installmentStartDate || new Date().toISOString().split('T')[0]

    try {
        // Verificar se já existem parcelas COM PAGAMENTOS (segurança)
        const { rows: existing } = await pool.query(
            'SELECT id, paid_amount FROM installments WHERE venda_id = $1',
            [vendaId]
        )

        if (existing.length > 0) {
            const temPagamento = existing.some(p => (parseFloat(p.paid_amount) || 0) > 0)
            if (temPagamento) {
                return res.status(409).json({
                    success: false,
                    error: 'Esta venda já possui pagamentos registrados. Estorne os pagamentos primeiro para re-gerar parcelas.'
                })
            }
            // Deletar parcelas sem pagamento para re-gerar
            await pool.query('DELETE FROM installments WHERE venda_id = $1', [vendaId])
        }

        // Buscar dados da venda
        const { rows: vendaRows } = await pool.query(
            'SELECT total_value, entry_payment FROM vendas WHERE id = $1',
            [vendaId]
        )

        if (vendaRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Venda não encontrada' })
        }

        const venda = vendaRows[0]
        const totalValue = parseFloat(venda.total_value) || 0
        const entryAmt = parseFloat(entryPayment) || parseFloat(venda.entry_payment) || 0
        const valorParcelar = Math.max(0, totalValue - entryAmt)
        const valorParcela = numInstallments > 0 ? valorParcelar / numInstallments : 0

        // Criar N parcelas
        const insertedInstallments = []
        for (let i = 0; i < numInstallments; i++) {
            // Cada parcela vence 30 dias após a anterior
            const dueDate = new Date(startDate)
            dueDate.setMonth(dueDate.getMonth() + i)
            const dueDateStr = dueDate.toISOString().split('T')[0]

            const { rows: inst } = await pool.query(`
                INSERT INTO installments (venda_id, installment_number, due_date, original_amount, paid_amount, remaining_amount, status)
                VALUES ($1, $2, $3, $4, 0, $4, 'pending')
                RETURNING *
            `, [vendaId, i + 1, dueDateStr, valorParcela.toFixed(2)])

            insertedInstallments.push(inst[0])
        }

        console.log(`✅ ${numInstallments} parcelas criadas para venda #${vendaId}`)
        res.status(201).json({ success: true, count: numInstallments, installments: insertedInstallments.map(toCamelCase) })
    } catch (error) {
        console.error(`❌ Erro ao criar parcelas da venda ${vendaId}:`, error)
        res.status(500).json({ success: false, error: 'Erro ao criar parcelas' })
    }
})

/**
 * PUT /api/installments/payments/:paymentId - Editar um pagamento existente
 * Body: { amount, date, method, notes }
 */
router.put('/payments/:paymentId', async (req, res) => {
    const { paymentId } = req.params
    const { amount, date, method, notes } = req.body

    try {
        // Buscar pagamento antigo para calcular diferença
        const { rows: oldRows } = await pool.query(
            'SELECT payment_amount, installment_id FROM installment_payments WHERE id = $1',
            [paymentId]
        )

        if (oldRows.length === 0) return res.status(404).json({ error: 'Pagamento não encontrado' })

        const oldPayment = oldRows[0]
        const amountDiff = parseFloat(amount) - parseFloat(oldPayment.payment_amount)

        // Atualizar o pagamento
        const { rows: updatedPayment } = await pool.query(`
            UPDATE installment_payments SET
                payment_amount = $1,
                payment_date = $2,
                payment_method = COALESCE($3, payment_method),
                notes = COALESCE($4, notes),
                updated_at = NOW()
            WHERE id = $5
            RETURNING *
        `, [amount, date, method, notes, paymentId])

        // Atualizar paid_amount da parcela
        await pool.query(`
            UPDATE installments SET
                paid_amount = GREATEST(0, paid_amount + $1),
                updated_at = NOW()
            WHERE id = $2
        `, [amountDiff, oldPayment.installment_id])

        res.json(toCamelCase(updatedPayment[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar pagamento ${paymentId}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar pagamento' })
    }
})

/**
 * DELETE /api/installments/payments/:paymentId - Deletar pagamento
 */
router.delete('/payments/:paymentId', async (req, res) => {
    const { paymentId } = req.params

    try {
        // Buscar pagamento antes de deletar
        const { rows: payment } = await pool.query(
            'SELECT payment_amount, installment_id FROM installment_payments WHERE id = $1',
            [paymentId]
        )

        if (payment.length === 0) return res.status(404).json({ error: 'Pagamento não encontrado' })

        // Deletar pagamento
        await pool.query('DELETE FROM installment_payments WHERE id = $1', [paymentId])

        // Reduzir paid_amount da parcela
        await pool.query(`
            UPDATE installments SET
                paid_amount = GREATEST(0, paid_amount - $1),
                updated_at = NOW()
            WHERE id = $2
        `, [parseFloat(payment[0].payment_amount), payment[0].installment_id])

        res.json({ success: true })
    } catch (error) {
        console.error(`❌ Erro ao deletar pagamento ${paymentId}:`, error)
        res.status(500).json({ error: 'Erro ao deletar pagamento' })
    }
})

/**
 * PUT /api/installments/:vendaId/pay-full - Quitar venda totalmente
 */
router.put('/:vendaId/pay-full', async (req, res) => {
    const { vendaId } = req.params

    try {
        // Atualizar status da venda para paid
        await pool.query("UPDATE vendas SET payment_status = 'paid' WHERE id = $1", [vendaId])

        // Buscar parcelas pendentes
        const { rows: pendingInstallments } = await pool.query(
            "SELECT id, original_amount FROM installments WHERE venda_id = $1 AND status != 'paid'",
            [vendaId]
        )

        if (pendingInstallments.length > 0) {
            const today = new Date().toISOString().split('T')[0]
            for (const inst of pendingInstallments) {
                await pool.query(`
                    INSERT INTO installment_payments (installment_id, payment_amount, payment_date, payment_method, notes, created_by)
                    VALUES ($1, $2, $3, 'dinheiro', 'Quitação total da venda', 'admin')
                `, [inst.id, inst.original_amount, today])
            }
        }

        console.log(`✅ Venda #${vendaId} quitada totalmente`)
        res.json({ success: true })
    } catch (error) {
        console.error(`❌ Erro ao quitar venda ${vendaId}:`, error)
        res.status(500).json({ error: 'Erro ao quitar venda' })
    }
})

/**
 * GET /api/installments/upcoming - Vencimentos próximos (hoje + semana)
 */
router.get('/upcoming', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]
        const endOfWeek = new Date()
        endOfWeek.setDate(endOfWeek.getDate() + 7)
        const endOfWeekStr = endOfWeek.toISOString().split('T')[0]

        const { rows } = await pool.query(`
            SELECT
                i.*,
                c.name as customer_name,
                c.phone as customer_phone,
                v.total_value
            FROM installments i
            JOIN vendas v ON v.id = i.venda_id
            LEFT JOIN customers c ON c.id = v.customer_id
            WHERE i.status IN ('pending', 'overdue')
            AND i.due_date >= $1
            AND i.due_date <= $2
            ORDER BY i.due_date ASC
        `, [today, endOfWeekStr])

        const { rows: overdueRows } = await pool.query(
            "SELECT COUNT(*) as cnt FROM installments WHERE status = 'overdue'"
        )

        const todayItems = rows.filter(r => r.due_date === today || r.due_date <= today)
        const weekItems = rows.filter(r => r.due_date > today)

        res.json({
            today: todayItems.map(r => ({ ...toCamelCase(r), customerName: r.customer_name })),
            thisWeek: weekItems.map(r => ({ ...toCamelCase(r), customerName: r.customer_name })),
            overdueCount: parseInt(overdueRows[0].cnt) || 0,
            totalDueToday: todayItems.reduce((sum, i) => sum + parseFloat(i.remaining_amount || 0), 0),
            totalDueThisWeek: weekItems.reduce((sum, i) => sum + parseFloat(i.remaining_amount || 0), 0)
        })
    } catch (error) {
        console.error('❌ Erro ao buscar vencimentos:', error)
        res.status(500).json({ error: 'Erro ao buscar vencimentos' })
    }
})

export default router

