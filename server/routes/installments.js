import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'
import { cacheMiddleware } from '../cache.js'

const router = express.Router()

/**
 * GET /api/installments
 * Lista de vendas com crediário/parcelamento
 * Cache: 2 minutes
 */
router.get('/', cacheMiddleware(120), async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        status = 'pendentes' // 'pendentes', 'pagas', 'todas'
    } = req.query

    console.log(`💳 Installments API: Buscando página ${page} [Status: ${status}]`)

    try {
        const from = (page - 1) * pageSize
        const to = from + Number(pageSize) - 1

        let query = supabase
            .from('vendas')
            .select('id, customer_id, total_value, entry_payment, num_installments, is_installment, payment_method, payment_status, created_at, customers(id, name, phone)', { count: 'exact' })
            .in('payment_method', ['fiado', 'fiado_parcelado'])
            .order('created_at', { ascending: false })

        if (status === 'pagas') {
            query = query.eq('payment_status', 'paid')
        } else if (status === 'pendentes') {
            query = query.neq('payment_status', 'paid')
        }

        query = query.range(from, to)

        const { data: vendas, error, count } = await query

        if (error) throw error

        // OPTIMIZATION: Fetch all installments and payments in ONE query instead of N+1
        const vendaIds = vendas.map(v => v.id)

        // Batch fetch all installments with payments for all vendas
        const { data: allInstallments, error: instError } = await supabase
            .from('installments')
            .select('*, payments:installment_payments(*)')
            .in('venda_id', vendaIds)

        if (instError) {
            console.error('Error fetching installments:', instError)
        }

        // Group installments by venda_id for fast lookup
        const installmentsByVenda = {}
        if (allInstallments) {
            allInstallments.forEach(inst => {
                if (!installmentsByVenda[inst.venda_id]) {
                    installmentsByVenda[inst.venda_id] = []
                }
                installmentsByVenda[inst.venda_id].push(inst)
            })
        }

        // Process all vendas (now synchronous, no more N queries!)
        const items = vendas.map(venda => {
            const installments = installmentsByVenda[venda.id] || []

            // Calculate summary from installments
            let summary = null
            if (installments.length > 0) {
                let totalValue = 0
                let paidAmount = 0
                let numInstallments = installments.length
                let paidInstallments = 0
                let overdueAmount = 0
                let lastPaymentDate = null

                installments.forEach(inst => {
                    const originalAmount = parseFloat(inst.original_amount || 0)
                    totalValue += originalAmount

                    const payments = inst.payments || []
                    const instPaid = payments.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0)
                    paidAmount += instPaid

                    const remaining = originalAmount - instPaid
                    if (remaining <= 0.01) {
                        paidInstallments++
                    } else if (new Date(inst.due_date) < new Date()) {
                        overdueAmount += remaining
                    }

                    // Track last payment date
                    payments.forEach(p => {
                        const payDate = new Date(p.payment_date)
                        if (!lastPaymentDate || payDate > new Date(lastPaymentDate)) {
                            lastPaymentDate = p.payment_date
                        }
                    })
                })

                const entryPayment = parseFloat(venda.entry_payment || 0)
                const remainingValue = Math.max(0, totalValue - paidAmount)

                summary = {
                    totalValue,
                    entryPayment,
                    remainingValue,
                    numInstallments,
                    paidInstallments,
                    pendingInstallments: numInstallments - paidInstallments,
                    overdueAmount,
                    lastPaymentDate
                }
            }

            // Calculate status
            const camelVenda = toCamelCase(venda)
            const dueAmount = summary
                ? summary.remainingValue
                : Math.max(0, (camelVenda.totalValue || 0) - (camelVenda.entryPayment || 0))

            const isPaid = dueAmount <= 0.01

            return {
                ...camelVenda,
                customerName: venda.customers?.name || 'Cliente desconhecido',
                customers: venda.customers ? toCamelCase(venda.customers) : null,
                dueAmount,
                overdueCount: summary?.overdueAmount > 0 ? 1 : 0,
                isPaid,
                summary
            }
        })

        res.json({
            items,
            total: count || 0,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil((count || 0) / Number(pageSize))
        })

    } catch (error) {
        console.error("Erro na API de Crediário:", error)
        res.status(500).json({ message: 'Erro interno do servidor ao buscar crediário' })
    }
})

/**
 * GET /api/installments/metrics
 * Métricas gerais (filtradas por status)
 * Cache: 5 minutes
 */
router.get('/metrics', cacheMiddleware(300), async (req, res) => {
    const { status = 'pendentes' } = req.query

    try {
        let query = supabase
            .from('vendas')
            .select('id, total_value, entry_payment, payment_method, payment_status, created_at')
            .in('payment_method', ['fiado', 'fiado_parcelado'])

        if (status === 'pagas') {
            query = query.eq('payment_status', 'paid')
        } else if (status === 'pendentes') {
            query = query.neq('payment_status', 'paid')
        }

        const { data, error } = await query

        if (error) throw error

        const totalCount = data.length
        let totalDueEstimative = 0
        let totalOverdueEstimative = 0
        let overdueCount = 0

        // Fetch all installments for these vendas to calculate overdue
        const vendaIds = data.map(v => v.id)

        if (vendaIds.length > 0) {
            const { data: allInstallments, error: instError } = await supabase
                .from('installments')
                .select('venda_id, original_amount, due_date, payments:installment_payments(payment_amount)')
                .in('venda_id', vendaIds)

            if (!instError && allInstallments) {
                const now = new Date()

                allInstallments.forEach(inst => {
                    const originalAmount = parseFloat(inst.original_amount || 0)
                    const payments = inst.payments || []
                    const paidAmount = payments.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0)
                    const remainingAmount = originalAmount - paidAmount

                    // Check if overdue (past due date and still has remaining amount)
                    if (remainingAmount > 0.01 && new Date(inst.due_date) < now) {
                        totalOverdueEstimative += remainingAmount
                        overdueCount++
                    }
                })
            }
        }

        data.forEach(v => {
            const due = (v.total_value || 0) - (v.entry_payment || 0)
            totalDueEstimative += Math.max(0, due)
        })

        res.json({
            count: totalCount || 0,
            totalDueEstimative,
            totalOverdueEstimative,
            overdueCount
        })

    } catch (error) {
        console.error("Erro na API de Métricas de Crediário:", error)
        res.status(500).json({ message: 'Erro ao buscar métricas' })
    }
})

/**
 * GET /api/installments/:vendaId/details
 * Detalhes das parcelas de uma venda
 */
router.get('/:vendaId/details', async (req, res) => {
    const { vendaId } = req.params

    try {
        // Fetch installments with payments
        const { data, error } = await supabase
            .from('installments')
            .select('*, payments:installment_payments(*)')
            .eq('venda_id', vendaId)
            .order('installment_number', { ascending: true })

        if (error) throw error

        const installments = data.map(inst => {
            const payments = (inst.payments || []).map(toCamelCase)
            const paidAmount = payments.reduce((sum, p) => sum + p.paymentAmount, 0)
            const originalAmount = parseFloat(inst.original_amount)
            const remainingAmount = Math.max(0, originalAmount - paidAmount)

            return {
                ...toCamelCase(inst),
                payments, // Nested payments
                paidAmount,
                remainingAmount,
                status: remainingAmount <= 0.01 ? 'paid' : (new Date(inst.due_date) < new Date() ? 'overdue' : 'pending')
            }
        })

        // Summary
        const totalValue = installments.reduce((sum, i) => sum + i.originalAmount, 0)
        const totalPaid = installments.reduce((sum, i) => sum + i.paidAmount, 0)
        const totalRemaining = totalValue - totalPaid

        res.json({
            installments,
            summary: {
                totalValue,
                totalPaid,
                totalRemaining
            }
        })

    } catch (error) {
        console.error(`Erro ao buscar detalhes da venda ${vendaId}:`, error)
        res.status(500).json({ message: 'Erro ao buscar detalhes' })
    }
})

export default router
