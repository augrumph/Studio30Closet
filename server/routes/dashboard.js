import express from 'express'
import { supabase } from '../supabase.js'
import { cacheMiddleware } from '../cache.js'

const router = express.Router()

// Cache: 3 minutes for dashboard stats (frequently accessed, needs freshness)
router.get('/stats', cacheMiddleware(180), async (req, res) => {
    const { period = 'all', start, end } = req.query
    console.log(`📊 Dashboard API: Calculando métricas [Período: ${period}]`)

    try {
        // 1. Definir datas do período
        const now = new Date()
        let startDate = null
        let endDate = null

        if (period === 'last7days') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        } else if (period === 'last30days') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        } else if (period === 'currentMonth') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        } else if (period === 'custom' && start && end) {
            startDate = new Date(start).toISOString()
            endDate = new Date(end)
            endDate.setHours(23, 59, 59)
            endDate = endDate.toISOString()
        }

        // 2. BUSCA OTIMIZADA (Paralela)
        const [
            { data: vendas, error: vError },
            { data: expenses, error: eError },
            { data: installments, error: iError },
            { data: purchases, error: pError },
            { data: orders, error: oError },
            { data: products, error: prodError }
        ] = await Promise.all([
            // Vendas do período (com itens para CPV)
            startDate
                ? supabase.from('vendas').select('*, customers(name)').gte('created_at', startDate).lte('created_at', endDate || now.toISOString())
                : supabase.from('vendas').select('*, customers(name)'),

            // Despesas fixas
            supabase.from('fixed_expenses').select('*'),

            // Parcelas (para fluxo de caixa e inadimplência)
            supabase.from('installments').select('*, installment_payments(*)'),

            // Compras
            supabase.from('purchases').select('*, suppliers(name)'),

            // Pedidos (para taxa de retenção da malinha)
            supabase.from('orders').select('id'),

            // Produtos (para inventário ATUAL)
            supabase.from('products').select('id, price, cost_price, stock, active')
        ])

        if (vError || eError || iError || pError || oError || prodError) {
            throw vError || eError || iError || pError || oError || prodError
        }

        // 3. PROCESSAMENTO FINANCEIRO (Baseado na lógica do useDashboardMetrics.js)
        console.log('✅ Dados carregados:', {
            vendas: vendas?.length,
            expenses: expenses?.length,
            installments: installments?.length,
            purchases: purchases?.length,
            orders: orders?.length
        })

        // Mapeamento snake_case para camelCase
        const normalizedVendas = vendas.map(v => ({
            ...v,
            totalValue: v.total_value,
            paymentStatus: v.payment_status,
            paymentMethod: v.payment_method,
            createdAt: v.created_at,
            discountAmount: v.discount_amount || v.discount || 0,
            feeAmount: v.fee_amount || 0,
            netAmount: v.net_amount || 0,
            entryPayment: v.entry_payment || 0,
            isInstallment: v.is_installment,
            orderId: v.order_id,
            items: (v.items || []).map(item => ({
                ...item,
                costPrice: item.costPrice || item.cost_price || item.costPriceAtTime || item.cost_price_at_time || 0,
                price: item.price || 0,
                quantity: item.quantity || item.qty || 1
            }))
        }))

        // Lógica de DRE
        const salesToProcess = normalizedVendas.filter(v => {
            const status = (v.paymentStatus || '').toLowerCase()
            return status !== 'cancelled' && status !== 'refuted' && status !== 'returned'
        })

        let grossRevenue = 0
        let totalDiscounts = 0
        let totalCPV = 0
        let costWarnings = 0
        let totalItemsSold = 0
        let totalFees = 0

        salesToProcess.forEach(v => {
            const discount = Number(v.discountAmount || 0)
            const finalValue = Number(v.totalValue || 0)
            const originalTotal = finalValue + discount

            grossRevenue += originalTotal
            totalDiscounts += discount
            totalFees += Number(v.feeAmount || 0)

            v.items.forEach(item => {
                let cost = item.costPrice
                const quantity = item.quantity
                totalItemsSold += quantity

                if (!cost || cost <= 0) {
                    costWarnings += quantity
                    cost = 0 // Don't estimate, use 0 if not provided
                }
                totalCPV += (cost * quantity)
            })
        })

        const netRevenue = grossRevenue - totalDiscounts
        const grossProfit = netRevenue - totalCPV

        // Despesas (Lógica simplificada para o MVP do backend)
        let monthlyExpenses = 0
        let dasExpense = 0
        let loanInterest = 0
        let loanAmortization = 0

        expenses.forEach(exp => {
            let val = Number(exp.value || 0)
            const rec = (exp.recurrence || 'mensal').toLowerCase()
            const name = (exp.name || '').toLowerCase()

            if (rec === 'diário' || rec === 'daily') val *= 30
            else if (rec === 'semanal' || rec === 'weekly') val *= 4.33
            else if (rec === 'anual' || rec === 'yearly') val /= 12

            if (name.includes('das') || name.includes('mei') || name.includes('imposto')) dasExpense += val
            else if (name.includes('juros')) loanInterest += val
            else if (name.includes('empréstimo') || name.includes('amortização')) loanAmortization += val
            else monthlyExpenses += val
        })

        // Proporção do período (dias)
        const periodDays = startDate ? Math.ceil((new Date(now.toISOString()).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 30
        const factor = periodDays / 30

        const appliedExpenses = monthlyExpenses * factor
        const appliedDas = dasExpense * factor
        const appliedInterest = loanInterest * factor

        const operatingProfit = grossProfit - appliedExpenses - appliedDas - totalFees
        const netProfit = operatingProfit - appliedInterest

        // Fluxo de Caixa (Refinado)
        let receivedAmount = 0
        let pendingCrediario = 0
        let totalDevedores = 0
        let valorDevedores = 0
        // Define todaySalesCount properly
        const todayStr = new Date().toISOString().split('T')[0]
        let todaySalesCount = 0

        salesToProcess.forEach(v => {
            if (v.createdAt && v.createdAt.startsWith(todayStr)) {
                todaySalesCount++
            }
            if (v.paymentStatus === 'paid') {
                receivedAmount += Number(v.netAmount || (v.totalValue - v.feeAmount))
            } else if (v.paymentStatus === 'pending') {
                totalDevedores++
                valorDevedores += Number(v.totalValue || 0)

                if (v.paymentMethod === 'fiado' || v.paymentMethod === 'fiado_parcelado') {
                    pendingCrediario += Number(v.totalValue || 0)
                }
            }
        })

        // Inventário: Calcular com base nos produtos em estoque (REAL)
        const activeProducts = (products || []).filter(p => p.active !== false)

        let inventoryTotalValue = 0
        let inventoryTotalCost = 0

        activeProducts.forEach(p => {
            const stock = p.stock || 0
            if (stock > 0) {
                inventoryTotalValue += (p.price || 0) * stock
                inventoryTotalCost += (p.cost_price || 0) * stock
            }
        })

        const inventoryAverageMarkup = inventoryTotalCost > 0
            ? ((inventoryTotalValue - inventoryTotalCost) / inventoryTotalCost) * 100
            : 0

        res.json({
            summary: {
                grossRevenue,
                totalDiscounts,
                netRevenue,
                totalCPV,
                grossProfit,
                operatingProfit,
                netProfit,
                netMarginPercent: netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0,
                todaySalesCount
            },
            inventory: {
                totalEstimatedValue: inventoryTotalValue,
                totalCostValue: inventoryTotalCost,
                totalItems: activeProducts.reduce((acc, p) => acc + (p.stock || 0), 0),
                totalProducts: activeProducts.length,
                averageMarkup: inventoryAverageMarkup
            },
            operational: {
                totalSalesCount: salesToProcess.length,
                totalItemsSold,
                averageTicket: salesToProcess.length > 0 ? netRevenue / salesToProcess.length : 0,
                totalDevedores,
                costWarnings,
                isCPVEstimated: (costWarnings / (totalItemsSold || 1)) > 0.05
            },
            cashFlow: {
                receivedAmount,
                pendingCrediario,
                valorDevedores,
                totalFees
            },
            // Dados brutos para cálculo preciso no frontend (useDashboardMetrics)
            expenses: expenses || [],
            installments: installments || []
        })

    } catch (err) {
        console.error('❌ Erro na API de Dashboard:', err)
        res.status(500).json({ error: 'Erro ao calcular métricas' })
    }
})

export default router
