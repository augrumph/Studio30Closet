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
        const normalizedVendas = vendas.map(v => {
            const parsedItems = typeof v.items === 'string' ? JSON.parse(v.items || '[]') : (v.items || [])

            return {
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
                items: parsedItems.map(item => ({
                    ...item,
                    costPrice: item.costPrice || item.cost_price || item.costPriceAtTime || item.cost_price_at_time || 0,
                    price: item.price || 0,
                    quantity: item.quantity || item.qty || 1
                }))
            }
        })

        // Lógica de DRE - Excluir vendas do cliente "Amor" (vendas promocionais a preço de custo)
        const salesToProcess = normalizedVendas.filter(v => {
            const status = (v.paymentStatus || '').toLowerCase()
            const customerName = (v.customer_name || '').toLowerCase().trim()

            // Excluir vendas canceladas/refutadas/devolvidas E vendas para "Amor"
            const isValidStatus = status !== 'cancelled' && status !== 'refuted' && status !== 'returned'
            const isNotPromotional = customerName !== 'amor'

            return isValidStatus && isNotPromotional
        })

        // 3.1. FIDELITY & NEW CUSTOMERS (RETAIL KPIs)
        // Precisamos olhar para TODAS as vendas (não só do período) para saber quem é recorrente
        const customerFirstPurchase = new Map()
        // Ordenar todas as vendas do banco por data (precisamos buscar todas ou confiar no normalizedVendas se for 'all')
        // Como o normalizedVendas pode ser filtrado por período, precisamos da lista completa para fidelização real.

        // Vamos buscar a data da primeira venda de cada cliente globalmente
        // Excluir cliente "Amor" (vendas promocionais)
        const { rows: firstPurchases } = await pool.query(`
            SELECT v.customer_id, MIN(v.created_at) as first_sale
            FROM vendas v
            LEFT JOIN customers c ON c.id = v.customer_id
            WHERE v.payment_status NOT IN ('cancelled', 'refuted', 'returned')
              AND LOWER(TRIM(c.name)) != 'amor'
            GROUP BY v.customer_id
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
        let periodDays = 30
        if (period === 'all') {
            // Se 'all', calcular dias desde a primeira venda
            const { rows: firstSaleRow } = await pool.query('SELECT MIN(created_at) as first_date FROM vendas')
            const firstDate = firstSaleRow[0]?.first_date ? new Date(firstSaleRow[0].first_date) : now
            periodDays = Math.max(1, Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)))
        } else {
            periodDays = startDate ? Math.ceil((new Date(now.toISOString()).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 30
        }

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

        // Construir mapa de pagamentos de parcelas por venda (para cálculo correto do saldo devedor)
        const paidByVenda = new Map()
        installments.forEach(inst => {
            const vid = String(inst.venda_id)
            const payments = inst.installment_payments || []
            const paid = payments.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0)
            paidByVenda.set(vid, (paidByVenda.get(vid) || 0) + paid)
        })

        salesToProcess.forEach(v => {
            // Garantir que createdAt é tratado como string para o .startsWith
            const vDateStr = v.createdAt instanceof Date ? v.createdAt.toISOString() : String(v.createdAt)
            const customerName = (v.customer_name || '').toLowerCase().trim()

            if (v.createdAt && vDateStr.startsWith(todayStr)) {
                todaySalesCount++
            }

            // Pular vendas do cliente "Amor" no fluxo de caixa também
            if (customerName === 'amor') return

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
                } else if (isCrediario && Number(v.entryPayment || 0) > 0) {
                    // Crediário parcelado pago: a entrada foi recebida no momento da venda
                    // As parcelas em si são contadas no loop de installment_payments abaixo
                    receivedAmount += Number(v.entryPayment)
                    inflows.push({
                        id: `entry-paid-${v.id}`,
                        date: v.createdAt,
                        description: `Entrada Venda #${v.id} - ${v.customer_name || 'Cliente'}`,
                        value: Number(v.entryPayment),
                        type: 'Venda'
                    })
                }
            } else if (v.paymentStatus === 'pending') {
                totalDevedores++

                if (isCrediario) {
                    // CORRETO: saldo devedor = total - entrada - parcelas já pagas
                    const totalPaidInstallments = paidByVenda.get(String(v.id)) || 0
                    const actualDue = Math.max(0, (Number(v.totalValue) - Number(v.entryPayment || 0)) - totalPaidInstallments)
                    valorDevedores += actualDue
                    pendingCrediario += actualDue
                } else {
                    valorDevedores += net
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

        // Recompras de Fornecedores
        const purchasesInPeriod = purchases.filter(p => {
            if (!startDate) return true
            const pDate = new Date(p.date || p.created_at)
            return pDate >= new Date(startDate) && (!endDate || pDate <= new Date(endDate))
        })

        const supplierRepurchasesCount = purchasesInPeriod.length
        const supplierRepurchasesTotal = purchasesInPeriod.reduce((sum, p) => sum + Number(p.value || 0), 0)
        const uniqueSuppliersReopurchased = new Set(purchasesInPeriod.map(p => p.supplier_id).filter(Boolean)).size

        // Ciclo de Recompra: média de dias entre pedidos consecutivos por fornecedor (usando todos os dados históricos)
        const purchasesBySupplier = {}
        purchases.forEach(p => {
            if (!p.supplier_id) return
            if (!purchasesBySupplier[p.supplier_id]) purchasesBySupplier[p.supplier_id] = []
            purchasesBySupplier[p.supplier_id].push(new Date(p.date || p.created_at))
        })

        const cycleDays = []
        Object.values(purchasesBySupplier).forEach(dates => {
            if (dates.length < 2) return
            dates.sort((a, b) => a - b)
            for (let i = 1; i < dates.length; i++) {
                cycleDays.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24))
            }
        })
        const repurchaseCycleDays = cycleDays.length > 0
            ? Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length)
            : 0

        // Retenção de Malinha
        const malinhaSales = salesToProcess.filter(v => v.orderId)
        let totalItemsSentInMalinhas = 0
        let totalItemsSoldInMalinhas = 0
        let retentionRate = 0

        // FIXED BUG #3: Calculate real retention rate from order_items
        if (malinhaSales.length > 0) {
            // Get unique order IDs from sales
            const orderIds = [...new Set(malinhaSales.map(v => v.orderId).filter(Boolean))]

            if (orderIds.length > 0) {
                try {
                    // Count total items sent in malinhas
                    const { rows: itemsCount } = await pool.query(`
                        SELECT COUNT(*) as total
                        FROM order_items
                        WHERE order_id = ANY($1)
                    `, [orderIds])
                    totalItemsSentInMalinhas = parseInt(itemsCount[0]?.total || 0)

                    // Count items actually sold (from vendas.items)
                    malinhaSales.forEach(v => {
                        const items = v.items || []
                        totalItemsSoldInMalinhas += items.length
                    })

                    retentionRate = totalItemsSentInMalinhas > 0
                        ? (totalItemsSoldInMalinhas / totalItemsSentInMalinhas) * 100
                        : 0
                } catch (err) {
                    console.warn('⚠️ Erro ao calcular taxa de retenção:', err.message)
                    retentionRate = 0
                }
            }
        }


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
            purchasing: {
                supplierRepurchasesCount,
                supplierRepurchasesTotal,
                uniqueSuppliersReopurchased,
                repurchaseCycleDays
            },
            expenses: expenses || [],
            installments: installments || []
        })

    } catch (err) {
        console.error('❌ Erro na API de Dashboard:', err)
        res.status(500).json({ error: 'Erro ao calcular métricas' })
    }
})

router.get('/business-overview', cacheMiddleware(120), async (req, res) => {
    try {
        const [
            vendasMonthlyResult,
            purchasesMonthlyResult,
            investmentByPersonResult,
            newCustomersResult,
            newProductsResult,
            reconciliationResult,
            installmentPaymentsResult,
            pendingCrediarioResult,
            cpvInventoryResult
        ] = await Promise.all([
            // Query A — Monthly faturamento
            pool.query(`
                SELECT
                    TO_CHAR(created_at, 'YYYY-MM') as month_key,
                    COALESCE(SUM(total_value), 0) as faturamento,
                    COALESCE(SUM(discount_amount), 0) as descontos,
                    COUNT(*) as vendas_count
                FROM vendas
                WHERE payment_status NOT IN ('cancelled','refuted','returned')
                AND LOWER(TRIM(COALESCE((SELECT name FROM customers WHERE id = customer_id),''))) != 'amor'
                GROUP BY 1
                ORDER BY 1
            `),

            // Query B — Monthly purchases
            pool.query(`
                SELECT
                    TO_CHAR(date, 'YYYY-MM') as month_key,
                    COALESCE(SUM(value), 0) as compras_total,
                    COUNT(*) as compras_count
                FROM purchases
                GROUP BY 1
                ORDER BY 1
            `),

            // Query C — Investment by person
            pool.query(`
                SELECT spent_by, SUM(value) as total, COUNT(*) as count
                FROM purchases
                GROUP BY spent_by
                ORDER BY total DESC
            `),

            // Query D — New customers per month
            pool.query(`
                SELECT TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') as month_key, COUNT(*) as count
                FROM customers
                GROUP BY 1
                ORDER BY 1
            `),

            // Query E — New products per month
            pool.query(`
                SELECT TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') as month_key, COUNT(*) as count
                FROM products
                GROUP BY 1
                ORDER BY 1
            `),

            // Query F — Reconciliation data
            pool.query(`
                SELECT
                    COALESCE(SUM(total_value), 0) as faturamento_liquido,
                    COALESCE(SUM(discount_amount), 0) as descontos,
                    COALESCE(SUM(total_value + COALESCE(discount_amount,0)), 0) as faturamento_bruto,
                    COALESCE(SUM(CASE WHEN payment_status='paid' AND payment_method NOT IN ('fiado','fiado_parcelado') THEN total_value ELSE 0 END), 0) as recebido_avista,
                    COALESCE(SUM(CASE WHEN payment_method IN ('fiado','fiado_parcelado') THEN COALESCE(entry_payment,0) ELSE 0 END), 0) as entradas_crediario,
                    COALESCE(SUM(CASE WHEN payment_status='pending' AND payment_method NOT IN ('fiado','fiado_parcelado') THEN total_value ELSE 0 END), 0) as pending_pagamentos
                FROM vendas
                WHERE payment_status NOT IN ('cancelled','refuted','returned')
                AND LOWER(TRIM(COALESCE((SELECT name FROM customers WHERE id = customer_id),''))) != 'amor'
            `),

            // Query G — Installment payments received
            pool.query(`
                SELECT COALESCE(SUM(ip.payment_amount),0) as parcelas_recebidas
                FROM installment_payments ip
                JOIN installments i ON i.id = ip.installment_id
                JOIN vendas v ON v.id = i.venda_id
            `),

            // Query H — Pending crediário (remaining)
            pool.query(`
                SELECT COALESCE(SUM(i.remaining_amount),0) as pending_crediario
                FROM installments i
                JOIN vendas v ON v.id = i.venda_id
                WHERE i.remaining_amount > 0
                AND LOWER(TRIM(COALESCE((SELECT name FROM customers WHERE id = v.customer_id),''))) != 'amor'
            `),

            // Query I — CPV and inventory
            pool.query(`
                SELECT
                    (SELECT COALESCE(SUM((item->>'costPrice')::numeric * (item->>'quantity')::numeric),0)
                     FROM vendas v2, jsonb_array_elements(v2.items::jsonb) AS item
                     WHERE v2.payment_status NOT IN ('cancelled','refuted','returned')
                     AND (item->>'costPrice')::numeric > 0
                    ) as cpv,
                    COALESCE(SUM(price * stock),0) as estoque_venda,
                    COALESCE(SUM(cost_price * stock),0) as estoque_custo,
                    SUM(stock) as estoque_unidades,
                    COUNT(*) as estoque_produtos
                FROM products WHERE active = true AND stock > 0
            `)
        ])

        const monthNames = {
            '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
            '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
            '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
        }

        const currentMonthKey = new Date().toISOString().slice(0, 7)

        // Build unique months set
        const allMonths = new Set()
        vendasMonthlyResult.rows.forEach(r => allMonths.add(r.month_key))
        purchasesMonthlyResult.rows.forEach(r => allMonths.add(r.month_key))
        const sortedMonths = Array.from(allMonths).sort()

        // Index data by month
        const vendasByMonth = {}
        vendasMonthlyResult.rows.forEach(r => { vendasByMonth[r.month_key] = r })
        const purchasesByMonth = {}
        purchasesMonthlyResult.rows.forEach(r => { purchasesByMonth[r.month_key] = r })
        const newCustomersByMonth = {}
        newCustomersResult.rows.forEach(r => { newCustomersByMonth[r.month_key] = r })
        const newProductsByMonth = {}
        newProductsResult.rows.forEach(r => { newProductsByMonth[r.month_key] = r })

        const monthly = sortedMonths.map(monthKey => {
            const [year, month] = monthKey.split('-')
            const label = `${monthNames[month]}/${year}`
            const v = vendasByMonth[monthKey] || {}
            const p = purchasesByMonth[monthKey] || {}
            const c = newCustomersByMonth[monthKey] || {}
            const pr = newProductsByMonth[monthKey] || {}
            return {
                month_key: monthKey,
                label,
                isCurrent: monthKey === currentMonthKey,
                faturamento: parseFloat(v.faturamento || 0),
                descontos: parseFloat(v.descontos || 0),
                vendas_count: parseInt(v.vendas_count || 0),
                compras_total: parseFloat(p.compras_total || 0),
                compras_count: parseInt(p.compras_count || 0),
                novos_clientes: parseInt(c.count || 0),
                novos_produtos: parseInt(pr.count || 0)
            }
        })

        // Investment by person
        const personLabels = { augusto: 'Augusto', loja: 'Loja', thais: 'Thais' }
        const totalInvestment = investmentByPersonResult.rows.reduce((sum, r) => sum + parseFloat(r.total || 0), 0)
        const investmentByPerson = investmentByPersonResult.rows.map(r => ({
            spent_by: r.spent_by,
            label: personLabels[r.spent_by] || r.spent_by,
            total: parseFloat(r.total || 0),
            count: parseInt(r.count || 0),
            pct: totalInvestment > 0 ? (parseFloat(r.total || 0) / totalInvestment) * 100 : 0
        }))

        // Reconciliation
        const rec = reconciliationResult.rows[0] || {}
        const cpvData = cpvInventoryResult.rows[0] || {}
        const faturamentoLiquido = parseFloat(rec.faturamento_liquido || 0)
        const cpv = parseFloat(cpvData.cpv || 0)
        const parcelasRecebidas = parseFloat(installmentPaymentsResult.rows[0]?.parcelas_recebidas || 0)
        const pendingCrediario = parseFloat(pendingCrediarioResult.rows[0]?.pending_crediario || 0)

        const recebidoAvista = parseFloat(rec.recebido_avista || 0)
        const entradasCrediario = parseFloat(rec.entradas_crediario || 0)
        const totalRecebido = recebidoAvista + entradasCrediario + parcelasRecebidas

        const margemBrutaPct = faturamentoLiquido > 0
            ? ((faturamentoLiquido - cpv) / faturamentoLiquido) * 100
            : 0

        const reconciliation = {
            faturamento_liquido: faturamentoLiquido,
            faturamento_bruto: parseFloat(rec.faturamento_bruto || 0),
            descontos: parseFloat(rec.descontos || 0),
            recebido_avista: recebidoAvista,
            entradas_crediario: entradasCrediario,
            parcelas_recebidas: parcelasRecebidas,
            total_recebido: totalRecebido,
            pending_crediario: pendingCrediario,
            pending_pagamentos: parseFloat(rec.pending_pagamentos || 0),
            cpv,
            margem_bruta_pct: margemBrutaPct,
            estoque_venda: parseFloat(cpvData.estoque_venda || 0),
            estoque_custo: parseFloat(cpvData.estoque_custo || 0),
            estoque_unidades: parseInt(cpvData.estoque_unidades || 0),
            estoque_produtos: parseInt(cpvData.estoque_produtos || 0)
        }

        res.json({ monthly, investmentByPerson, reconciliation })

    } catch (err) {
        console.error('❌ Erro na API business-overview:', err)
        res.status(500).json({ error: 'Erro ao calcular business overview' })
    }
})

export default router
