import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'
import { cacheMiddleware } from '../cache.js'
import { validateInstallmentPayment } from '../middleware/validation.js'
import { calculateInstallmentFields, syncVendaPaymentStatus, payFullVendaLogic } from '../lib/venda-utils.js'

const router = express.Router()

// Utilitários movidos para ../lib/venda-utils.js

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
            AND LOWER(TRIM(COALESCE(c.name, ''))) != 'amor'
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

        // ⚡ Query única agregada — saldo calculado por parcela com GREATEST(0) em cada uma
        // para evitar que sobrepagamentos em uma parcela cancelem outras
        const { rows } = await pool.query(`
            SELECT
                COUNT(DISTINCT v.id) as count,
                COALESCE(SUM(per_inst.inst_remaining), 0) as total_due_estimative,
                COUNT(DISTINCT CASE WHEN overdue_check.overdue_count > 0 THEN v.id END) as overdue_vendor_count,
                COALESCE(SUM(CASE WHEN overdue_check.overdue_count > 0 THEN per_inst.inst_remaining ELSE 0 END), 0) as total_overdue_estimative
            FROM vendas v
            LEFT JOIN (
                SELECT i.venda_id, SUM(GREATEST(0, i.original_amount - COALESCE(ip_sums.paid, 0))) as inst_remaining
                FROM installments i
                LEFT JOIN (
                    SELECT installment_id, SUM(payment_amount) as paid
                    FROM installment_payments
                    GROUP BY installment_id
                ) ip_sums ON ip_sums.installment_id = i.id
                GROUP BY i.venda_id
            ) per_inst ON per_inst.venda_id = v.id
            LEFT JOIN (
                SELECT i.venda_id, COUNT(*) as overdue_count
                FROM installments i
                WHERE i.status = 'overdue'
                   OR (i.due_date < CURRENT_DATE AND (i.remaining_amount > 0 OR i.paid_amount < i.original_amount))
                GROUP BY i.venda_id
            ) overdue_check ON overdue_check.venda_id = v.id
            WHERE v.payment_method IN ('fiado', 'fiado_parcelado')
            AND LOWER(TRIM(COALESCE((SELECT name FROM customers WHERE id = v.customer_id), ''))) != 'amor'
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
        // Usar soma do remainingAmount por parcela (já limitado a >= 0 pelo trigger)
        // Nunca calcular como totalValue - paidAmount pois overpagamentos tornariam negativo
        const remainingAmount = installmentsData.reduce((sum, inst) => sum + inst.remainingAmount, 0)
        const paidPercentage = totalValue > 0 ? Math.min(100, Math.round((paidAmount / totalValue) * 100)) : 0

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
router.post('/:installmentId/payment', validateInstallmentPayment, async (req, res) => {
    const { installmentId } = req.params
    const { amount, date, method = 'dinheiro', notes = null } = req.body

    console.log(`💰 Registrando pagamento: R$ ${amount} na parcela ${installmentId}`)

    try {
        // 1. VALIDAÇÃO: Verificar se a parcela existe
        const { rows: installmentRows } = await pool.query(
            'SELECT * FROM installments WHERE id = $1',
            [installmentId]
        )

        if (installmentRows.length === 0) {
            console.error(`❌ Parcela ${installmentId} não encontrada`)
            return res.status(404).json({
                error: 'Parcela não encontrada',
                message: `Não existe parcela com ID ${installmentId}`
            })
        }

        const installment = installmentRows[0]

        // 2 & 3. VALIDAÇÃO: Calcular saldo REAL a partir dos pagamentos reais (nunca usar coluna stale)
        const { rows: realRows } = await pool.query(`
            SELECT GREATEST(0, i.original_amount - COALESCE(SUM(ip.payment_amount), 0)) as real_remaining
            FROM installments i
            LEFT JOIN installment_payments ip ON ip.installment_id = i.id
            WHERE i.id = $1
            GROUP BY i.id
        `, [installmentId])

        const remainingAmount = parseFloat(realRows[0]?.real_remaining) || 0

        if (remainingAmount <= 0.01) {
            console.warn(`⚠️ Parcela ${installmentId} já está totalmente paga (saldo real: ${remainingAmount})`)
            return res.status(400).json({
                error: 'Parcela já paga',
                message: 'Esta parcela já foi totalmente paga',
                installment: toCamelCase(installment)
            })
        }

        if (amount > remainingAmount + 0.01) {
            console.error(`❌ Valor do pagamento (R$ ${amount}) ultrapassa saldo real (R$ ${remainingAmount})`)
            return res.status(400).json({
                error: 'Valor inválido',
                message: `Valor do pagamento (R$ ${amount.toFixed(2)}) não pode ultrapassar o saldo restante (R$ ${remainingAmount.toFixed(2)})`,
                remainingAmount: remainingAmount
            })
        }

        // 4. VERIFICAR DUPLICATAS (idempotência) - evitar double-click
        // Bloqueia pagamentos com mesmo valor e mesma data, independentemente do horário.
        const { rows: duplicates } = await pool.query(`
            SELECT id FROM installment_payments
            WHERE installment_id = $1
            AND payment_amount = $2
            AND payment_date = $3
            LIMIT 1
        `, [installmentId, amount, date])

        if (duplicates.length > 0) {
            console.warn('🛑 Pagamento duplicado detectado (idempotência)')
            // Retornar dados atualizados sem inserir
            const { rows: current } = await pool.query('SELECT * FROM installments WHERE id = $1', [installmentId])
            return res.json(toCamelCase(current[0]))
        }

        // 5. INSERIR PAGAMENTO
        const { rows: paymentRows } = await pool.query(`
            INSERT INTO installment_payments (
                installment_id, payment_amount, payment_date, payment_method, notes, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [installmentId, amount, date, method, notes, 'admin'])

        console.log(`✅ Pagamento ID ${paymentRows[0].id} registrado com sucesso`)

        // 6. RECALCULAR paid_amount, remaining_amount e status da parcela a partir dos pagamentos reais
        // Não dependemos de trigger — calculamos diretamente para garantir consistência.
        await pool.query(`
            UPDATE installments SET
                paid_amount = (
                    SELECT COALESCE(SUM(payment_amount), 0)
                    FROM installment_payments WHERE installment_id = $1
                ),
                remaining_amount = GREATEST(0, original_amount - (
                    SELECT COALESCE(SUM(payment_amount), 0)
                    FROM installment_payments WHERE installment_id = $1
                )),
                status = CASE
                    WHEN original_amount - (
                        SELECT COALESCE(SUM(payment_amount), 0)
                        FROM installment_payments WHERE installment_id = $1
                    ) <= 0.01 THEN 'paid'
                    WHEN due_date < CURRENT_DATE AND original_amount - (
                        SELECT COALESCE(SUM(payment_amount), 0)
                        FROM installment_payments WHERE installment_id = $1
                    ) > 0.01 THEN 'overdue'
                    ELSE 'pending'
                END,
                updated_at = NOW()
            WHERE id = $1
        `, [installmentId])

        // 7. BUSCAR PARCELA ATUALIZADA
        const { rows: updatedInst } = await pool.query('SELECT * FROM installments WHERE id = $1', [installmentId])

        if (updatedInst.length === 0) {
            throw new Error('Falha ao buscar parcela atualizada')
        }

        const updatedInstallment = updatedInst[0]
        console.log(`📊 Parcela ${installmentId} - Status: ${updatedInstallment.status}, Restante: R$ ${updatedInstallment.remaining_amount}`)

        // 8. SINCRONIZAR STATUS DA VENDA
        await syncVendaPaymentStatus(updatedInstallment.venda_id)

        res.json(toCamelCase(updatedInstallment))
    } catch (error) {
        console.error(`❌ Erro ao registrar pagamento na parcela ${installmentId}:`, error)

        // Tratar erros específicos do banco
        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({
                error: 'Referência inválida',
                message: 'A parcela especificada não existe ou foi removida'
            })
        }

        if (error.code === '23514') { // Check constraint violation
            return res.status(400).json({
                error: 'Violação de constraint',
                message: 'O valor do pagamento viola as regras de negócio do banco de dados'
            })
        }

        res.status(500).json({
            error: 'Erro ao registrar pagamento',
            message: error.message || 'Erro interno do servidor'
        })
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
        const entryAmt = entryPayment != null ? parseFloat(entryPayment) : parseFloat(venda.entry_payment) || 0
        const valorParcelar = Math.max(0, totalValue - entryAmt)
        const baseAmount = numInstallments > 0 ? Math.floor((valorParcelar / numInstallments) * 100) / 100 : 0

        // Criar N parcelas
        const insertedInstallments = []
        const baseDate = new Date(startDate)
        const baseDayMs = baseDate.getTime()
        for (let i = 0; i < numInstallments; i++) {
            // Cada parcela vence exatamente 30 dias após a anterior (sem bugs de virada de mês)
            const dueDate = new Date(baseDayMs + i * 30 * 24 * 60 * 60 * 1000)
            const dueDateStr = dueDate.toISOString().split('T')[0]

            // Última parcela absorve arredondamento (ex: R$100 ÷ 3 = R$33.33 + R$33.33 + R$33.34)
            const isLast = i === numInstallments - 1
            const thisAmount = isLast
                ? (valorParcelar - baseAmount * (numInstallments - 1)).toFixed(2)
                : baseAmount.toFixed(2)

            const { rows: inst } = await pool.query(`
                INSERT INTO installments (venda_id, installment_number, due_date, original_amount, paid_amount, remaining_amount, status)
                VALUES ($1, $2, $3, $4, 0, $4, 'pending')
                RETURNING *
            `, [vendaId, i + 1, dueDateStr, thisAmount])

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

        // Recalcular paid_amount e remaining_amount do zero (não usar aritmética em coluna stale)
        const instId = oldPayment.installment_id
        await pool.query(`
            UPDATE installments SET
                paid_amount = (
                    SELECT COALESCE(SUM(payment_amount), 0)
                    FROM installment_payments WHERE installment_id = $1
                ),
                remaining_amount = GREATEST(0, original_amount - (
                    SELECT COALESCE(SUM(payment_amount), 0)
                    FROM installment_payments WHERE installment_id = $1
                )),
                status = CASE
                    WHEN original_amount - (
                        SELECT COALESCE(SUM(payment_amount), 0)
                        FROM installment_payments WHERE installment_id = $1
                    ) <= 0.01 THEN 'paid'
                    WHEN due_date < CURRENT_DATE AND original_amount - (
                        SELECT COALESCE(SUM(payment_amount), 0)
                        FROM installment_payments WHERE installment_id = $1
                    ) > 0.01 THEN 'overdue'
                    ELSE 'pending'
                END,
                updated_at = NOW()
            WHERE id = $1
        `, [instId])

        // Sincronizar status da venda
        const { rows: instRows } = await pool.query('SELECT venda_id FROM installments WHERE id = $1', [instId])
        if (instRows.length > 0) {
            await syncVendaPaymentStatus(instRows[0].venda_id)
        }

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

        // Recalcular paid_amount, remaining_amount e status a partir dos pagamentos reais restantes
        const instId = payment[0].installment_id
        await pool.query(`
            UPDATE installments SET
                paid_amount = (
                    SELECT COALESCE(SUM(payment_amount), 0)
                    FROM installment_payments WHERE installment_id = $1
                ),
                remaining_amount = GREATEST(0, original_amount - (
                    SELECT COALESCE(SUM(payment_amount), 0)
                    FROM installment_payments WHERE installment_id = $1
                )),
                status = CASE
                    WHEN original_amount - (
                        SELECT COALESCE(SUM(payment_amount), 0)
                        FROM installment_payments WHERE installment_id = $1
                    ) <= 0.01 THEN 'paid'
                    WHEN due_date < CURRENT_DATE AND original_amount - (
                        SELECT COALESCE(SUM(payment_amount), 0)
                        FROM installment_payments WHERE installment_id = $1
                    ) > 0.01 THEN 'overdue'
                    ELSE 'pending'
                END,
                updated_at = NOW()
            WHERE id = $1
        `, [instId])

        // Sincronizar status da venda
        const { rows: instRows } = await pool.query('SELECT venda_id FROM installments WHERE id = $1', [instId])
        if (instRows.length > 0) {
            await syncVendaPaymentStatus(instRows[0].venda_id)
        }

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
    const { paymentMethod = 'dinheiro' } = req.body

    try {
        await payFullVendaLogic(vendaId, paymentMethod)
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

/**
 * POST /api/installments/repair-balances - Corrigir paid_amount e remaining_amount de TODAS as parcelas
 * Recalcula a partir dos registros reais em installment_payments.
 * Executar UMA VEZ para corrigir dados históricos corrompidos.
 */
router.post('/repair-balances', async (req, res) => {
    try {
        console.log('🔧 Iniciando reparo de saldos de parcelas...')

        const { rowCount } = await pool.query(`
            UPDATE installments i SET
                paid_amount = COALESCE((
                    SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                ), 0),
                remaining_amount = GREATEST(0, i.original_amount - COALESCE((
                    SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                ), 0)),
                status = CASE
                    WHEN i.original_amount - COALESCE((
                        SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                    ), 0) <= 0.01 THEN 'paid'
                    WHEN i.due_date < CURRENT_DATE AND i.original_amount - COALESCE((
                        SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                    ), 0) > 0.01 THEN 'overdue'
                    ELSE 'pending'
                END,
                updated_at = NOW()
        `)

        console.log(`✅ ${rowCount} parcelas recalculadas`)
        res.json({ success: true, repairedCount: rowCount })
    } catch (error) {
        console.error('❌ Erro ao reparar saldos:', error)
        res.status(500).json({ error: 'Erro ao reparar saldos' })
    }
})

/**
 * POST /api/installments/cleanup-duplicates - Remover pagamentos duplicados
 * Mantém apenas o registro mais antigo (created_at mínimo) por combinação
 * (installment_id, payment_amount, payment_date). Depois recalcula todos os saldos.
 */
router.post('/cleanup-duplicates', async (req, res) => {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        // Identificar e deletar duplicatas — mantém o menor id por grupo
        const { rows: deleted } = await client.query(`
            DELETE FROM installment_payments
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM installment_payments
                GROUP BY installment_id, payment_amount, payment_date
            )
            RETURNING id, installment_id, payment_amount, payment_date, created_at
        `)

        // Recalcular todos os saldos a partir dos registros restantes
        const { rowCount: repaired } = await client.query(`
            UPDATE installments i SET
                paid_amount = COALESCE((
                    SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                ), 0),
                remaining_amount = GREATEST(0, i.original_amount - COALESCE((
                    SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                ), 0)),
                status = CASE
                    WHEN i.original_amount - COALESCE((
                        SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                    ), 0) <= 0.01 THEN 'paid'
                    WHEN i.due_date < CURRENT_DATE AND i.original_amount - COALESCE((
                        SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                    ), 0) > 0.01 THEN 'overdue'
                    ELSE 'pending'
                END,
                updated_at = NOW()
        `)

        // Marcar vendas onde todas as parcelas estão pagas
        await client.query(`
            UPDATE vendas SET payment_status = 'paid', updated_at = NOW()
            WHERE payment_method IN ('fiado', 'fiado_parcelado')
            AND payment_status != 'paid'
            AND id IN (
                SELECT venda_id FROM installments
                GROUP BY venda_id
                HAVING COUNT(*) > 0 AND SUM(CASE WHEN status != 'paid' THEN 1 ELSE 0 END) = 0
            )
        `)

        await client.query('COMMIT')

        console.log(`🧹 Limpeza de duplicatas: ${deleted.length} pagamentos removidos, ${repaired} parcelas recalculadas`)
        res.json({
            success: true,
            deletedCount: deleted.length,
            repairedCount: repaired,
            deletedPayments: deleted
        })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Erro ao limpar duplicatas:', error)
        res.status(500).json({ error: 'Erro ao limpar duplicatas' })
    } finally {
        client.release()
    }
})

export default router

