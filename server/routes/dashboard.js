import express from 'express'
import { pool } from '../db.js'
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

        console.log(`📊 Dashboard Query Params: Period=${period}, Start=${startDate}, End=${endDate}`)

        // 2. BUSCA OTIMIZADA (Paralela)
        const [
            vendasResult,
            expensesResult,
            installmentsResult,
            purchasesResult,
            ordersResult,
            productsResult
        ] = await Promise.all([
            // Vendas do período (com customer name via JOIN)
            startDate
                ? pool.query(`
                    SELECT v.*, c.name as customer_name
                    FROM vendas v
                    LEFT JOIN customers c ON c.id = v.customer_id
                    WHERE v.created_at >= $1 AND v.created_at <= $2
                    ORDER BY v.created_at DESC
                `, [startDate, endDate || now.toISOString()])
                : pool.query(`
                    SELECT v.*, c.name as customer_name
                    FROM vendas v
                    LEFT JOIN customers c ON c.id = v.customer_id
                    ORDER BY v.created_at DESC
                `),

            // Despesas fixas
            pool.query('SELECT * FROM fixed_expenses'),

            // Parcelas com payments (nested)
            pool.query(`
                SELECT
                    i.*,
                    json_agg(
                        json_build_object(
                            'id', ip.id,
                            'installment_id', ip.installment_id,
                            'payment_date', ip.payment_date,
                            'amount_paid', ip.payment_amount, -- ✅ Corrigido de amount_paid
                            'payment_method', ip.payment_method,
                            'created_at', ip.created_at
                        )
                    ) FILTER (WHERE ip.id IS NOT NULL) as installment_payments
                FROM installments i
                LEFT JOIN installment_payments ip ON ip.installment_id = i.id
                GROUP BY i.id
            `),

            // Compras com supplier name via JOIN
            pool.query(`
                SELECT p.*, s.name as supplier_name
                FROM purchases p
                LEFT JOIN suppliers s ON s.id = p.supplier_id
            `),

            // Pedidos (só precisa de count)
            pool.query('SELECT id FROM orders'),

            // Produtos para inventário
            pool.query('SELECT id, price, cost_price, stock, active FROM products')
        ])

        const vendas = vendasResult.rows
        const expenses = expensesResult.rows
        const installments = installmentsResult.rows
        const purchases = purchasesResult.rows
        const orders = ordersResult.rows
        const products = productsResult.rows

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

        // 3.1. FIDELITY & NEW CUSTOMERS (RETAIL KPIs)
        // Precisamos olhar para TODAS as vendas (não só do período) para saber quem é recorrente
        const customerFirstPurchase = new Map()
        // Ordenar todas as vendas do banco por data (precisamos buscar todas ou confiar no normalizedVendas se for 'all')
        // Como o normalizedVendas pode ser filtrado por período, precisamos da lista completa para fidelização real.

        // Vamos buscar a data da primeira venda de cada cliente globalmente
        const { rows: firstPurchases } = await pool.query(`
            SELECT customer_id, MIN(created_at) as first_sale
            FROM vendas
            WHERE payment_status NOT IN ('cancelled', 'refuted', 'returned')
            GROUP BY customer_id
        `)
        firstPurchases.forEach(fp => customerFirstPurchase.set(fp.customer_id, new Date(fp.first_sale).getTime()))

        let grossRevenue = 0
        let totalDiscounts = 0
        let totalCPV = 0
        let costWarnings = 0
        let totalItemsSold = 0
        let totalFees = 0
        let recurringRevenue = 0
        let newCustomersCount = 0
        const countedAsNewInPeriod = new Set()

        salesToProcess.forEach(v => {
            const discount = Number(v.discountAmount || 0)
            const finalValue = Number(v.totalValue || 0)
            const originalTotal = finalValue + discount
            const saleTime = new Date(v.createdAt).getTime()
            const cid = v.customer_id

            grossRevenue += originalTotal
            totalDiscounts += discount
            totalFees += Number(v.feeAmount || 0)

            // Recorrência
            if (cid && customerFirstPurchase.has(cid)) {
                const firstTime = customerFirstPurchase.get(cid)
                if (saleTime > firstTime + 1000) { // Margem de 1s
                    recurringRevenue += finalValue
                } else if (!countedAsNewInPeriod.has(cid)) {
                    newCustomersCount++
                    countedAsNewInPeriod.add(cid)
                }
            }

            v.items.forEach(item => {
                let cost = item.costPrice
                const quantity = item.quantity
                totalItemsSold += quantity

                if (!cost || cost <= 0) {
                    costWarnings += quantity
                    cost = 0
                }
                totalCPV += (cost * quantity)
            })
        })

        const netRevenue = grossRevenue - totalDiscounts
        const grossProfit = netRevenue - totalCPV
        const fidelityRate = grossRevenue > 0 ? (recurringRevenue / grossRevenue) * 100 : 0
        const averageUnitRetail = totalItemsSold > 0 ? netRevenue / totalItemsSold : 0


        // Despesas
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

        // Proporção do período
        const periodDays = startDate ? Math.ceil((new Date(now.toISOString()).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 30
        const factor = periodDays / 30

        const appliedExpenses = monthlyExpenses * factor
        const appliedDas = dasExpense * factor
        const appliedInterest = loanInterest * factor

        const operatingProfit = grossProfit - appliedExpenses - appliedDas - totalFees
        const netProfit = operatingProfit - appliedInterest

        // Fluxo de Caixa (Detonado - inflows/outflows)
        let receivedAmount = 0
        let pendingCrediario = 0
        let totalDevedores = 0
        let valorDevedores = 0
        const todayStr = new Date().toISOString().split('T')[0]
        let todaySalesCount = 0

        const inflows = []
        const outflows = []

        salesToProcess.forEach(v => {
            // Garantir que createdAt é tratado como string para o .startsWith
            const vDateStr = v.createdAt instanceof Date ? v.createdAt.toISOString() : String(v.createdAt)
            if (v.createdAt && vDateStr.startsWith(todayStr)) {
                todaySalesCount++
            }

            const isCrediario = (v.paymentMethod === 'fiado' || v.paymentMethod === 'fiado_parcelado' || v.paymentMethod === 'crediario')
            const net = Number(v.netAmount || (v.totalValue - v.feeAmount))

            if (v.paymentStatus === 'paid') {
                if (!v.isInstallment || !isCrediario) {
                    receivedAmount += net
                    inflows.push({
                        id: `sale-${v.id}`,
                        date: v.createdAt,
                        description: `Venda #${v.id} - ${v.customer_name || 'Cliente'}`,
                        value: net,
                        type: 'Venda'
                    })
                }
            } else if (v.paymentStatus === 'pending') {
                totalDevedores++
                valorDevedores += Number(v.totalValue || 0)

                if (isCrediario) {
                    pendingCrediario += Number(v.totalValue || 0)
                }

                if (v.entryPayment > 0) {
                    receivedAmount += Number(v.entryPayment)
                    inflows.push({
                        id: `entry-${v.id}`,
                        date: v.createdAt,
                        description: `Entrada Venda #${v.id} - ${v.customer_name || 'Cliente'}`,
                        value: Number(v.entryPayment),
                        type: 'Venda'
                    })
                }
            }
        })

        // Pagamentos de parcelas no período
        installments.forEach(inst => {
            (inst.installment_payments || []).forEach(pay => {
                const payDate = new Date(pay.payment_date || pay.created_at)
                // Filtrar se o pagamento está no período selecionado
                const isInPeriod = (!startDate || payDate >= new Date(startDate)) && (!endDate || payDate <= new Date(endDate))

                if (isInPeriod) {
                    const amt = Number(pay.amount_paid || 0)
                    receivedAmount += amt
                    inflows.push({
                        id: `pay-${pay.id}`,
                        date: pay.payment_date || pay.created_at,
                        description: `Parcela #${pay.installment_id}`,
                        value: amt,
                        type: 'Parcela'
                    })
                }
            })
        })

        // Compras e Despesas no Outflow
        purchases.forEach(p => {
            const pDate = new Date(p.date || p.created_at)
            const isInPeriod = (!startDate || pDate >= new Date(startDate)) && (!endDate || pDate <= new Date(endDate))
            if (isInPeriod) {
                outflows.push({
                    id: `purch-${p.id}`,
                    date: p.date || p.created_at,
                    description: `Compra: ${p.supplier_name || 'Fornecedor'}`,
                    value: Number(p.value || 0),
                    type: 'Compra'
                })
            }
        })

        if (appliedExpenses > 0) outflows.push({ id: 'exp-op', date: now, description: 'Despesas Operacionais (Rateio)', value: appliedExpenses, type: 'Despesa' })
        if (appliedDas > 0) outflows.push({ id: 'exp-das', date: now, description: 'Imposto DAS (Estimado)', value: appliedDas, type: 'Imposto' })
        if (appliedInterest > 0) outflows.push({ id: 'exp-loan', date: now, description: 'Juros Empréstimo (Rateio)', value: appliedInterest, type: 'Empréstimo' })

        // Ordenar fluxos
        inflows.sort((a, b) => new Date(b.date) - new Date(a.date))
        outflows.sort((a, b) => new Date(b.date) - new Date(a.date))

        // Retenção de Malinha
        const malinhaSales = salesToProcess.filter(v => v.orderId)
        let totalItemsSentInMalinhas = 0
        let totalItemsSoldInMalinhas = 0
        // Para retenção real, precisaríamos dos itens originais dos orders, 
        // mas vamos simplificar se não tivermos a tabela order_items aqui.
        // Como o Dashboard do front já calculava de forma limitada, vamos manter um placeholder realista
        const retentionRate = 0 // Placeholder ou cálculo se ordersResult tiver items_count


        // Inventário
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
                todaySalesCount,
                fidelityRate,
                newCustomersCount,
                averageUnitRetail
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
                itemsPerSale: salesToProcess.length > 0 ? totalItemsSold / salesToProcess.length : 0,
                totalDevedores,
                costWarnings,
                isCPVEstimated: (costWarnings / (totalItemsSold || 1)) > 0.05,
                estimatedPercent: (costWarnings / (totalItemsSold || 1)) * 100,
                retentionRate
            },
            cashFlow: {
                receivedAmount,
                pendingCrediario,
                valorDevedores,
                totalFees,
                cashFlowDetails: {
                    inflows,
                    outflows
                }
            },
            expenses: expenses || [],
            installments: installments || []
        })

    } catch (err) {
        console.error('❌ Erro na API de Dashboard:', err)
        res.status(500).json({ error: 'Erro ao calcular métricas' })
    }
})

export default router
