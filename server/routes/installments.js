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

        // Buscar todas as vendas com crediário
        const { rows: vendas } = await pool.query(`
            SELECT
                v.id,
                v.total_value,
                v.entry_payment,
                v.payment_status
            FROM vendas v
            WHERE v.payment_method IN ('fiado', 'fiado_parcelado')
            ${statusCondition}
        `)

        let totalDueEstimative = 0
        let totalOverdueEstimative = 0
        let overdueCount = 0
        let count = vendas.length

        // Calcular métricas para cada venda
        for (const venda of vendas) {
            const calculated = await calculateInstallmentFields(venda)
            totalDueEstimative += calculated.dueAmount

            if (calculated.overdueCount > 0) {
                overdueCount++
                totalOverdueEstimative += calculated.dueAmount
            }
        }

        res.json({
            count,
            totalDueEstimative,
            totalOverdueEstimative,
            overdueCount
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

export default router
