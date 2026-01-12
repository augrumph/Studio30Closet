import { supabase } from '../supabase'

/**
 * snake_case -> camelCase
 */
function toCamelCase(obj) {
    if (!obj || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(toCamelCase)

    return Object.entries(obj).reduce((acc, [key, value]) => {
        acc[key.replace(/_([a-z])/g, (_, l) => l.toUpperCase())] =
            typeof value === 'object' ? toCamelCase(value) : value
        return acc
    }, {})
}

/**
 * Obter métricas financeiras completas para DRE gerencial
 * @returns {Object} Métricas de receita, custos, despesas, lucro
 */
export async function getDashboardMetrics() {
    console.log('📊 API: Buscando métricas do dashboard...');

    try {
        // 1. DESPESAS FIXAS
        const { data: expensesData, error: expensesError } = await supabase
            .from('fixed_expenses')
            .select('*');

        if (expensesError) throw expensesError;

        // 2. CUPONS APLICADOS
        const { data: couponsData, error: couponsError } = await supabase
            .from('coupons')
            .select('*')
            .eq('is_active', true);

        if (couponsError) throw couponsError;

        // 3. INSTALLMENTS (para análise de fluxo de caixa)
        const { data: installmentsData, error: installmentsError } = await supabase
            .from('installments')
            .select('*, installment_payments(*), vendas(id, order_id)');

        if (installmentsError) throw installmentsError;

        // 4. COMPRAS (para análise de custo de estoque)
        const { data: purchasesData, error: purchasesError } = await supabase
            .from('purchases')
            .select('*, suppliers(id, name)');

        if (purchasesError) throw purchasesError;

        const camelExpenses = expensesData.map(toCamelCase);
        const camelCoupons = couponsData.map(toCamelCase);
        const camelInstallments = installmentsData.map(toCamelCase);
        const camelPurchases = purchasesData.map(toCamelCase);

        return {
            expenses: camelExpenses,
            coupons: camelCoupons,
            installments: camelInstallments,
            purchases: camelPurchases
        };
    } catch (err) {
        console.error('❌ Erro ao buscar métricas do dashboard:', err);
        throw err;
    }
}

export const dashboardService = {
    /**
     * ============================
     * KPI PRINCIPAL (DRE SIMPLIFICADO)
     * ============================
     */
    async getKPIs(startDate, endDate) {
        const { data, error } = await supabase
            .from('dashboard_kpis_period')
            .select('*')
            .gte('day', startDate)
            .lte('day', endDate)

        if (error) throw error

        // Calcular somatórios do período
        const summary = data.reduce(
            (acc, row) => {
                acc.totalSales += Number(row.total_sales || 0)
                acc.grossRevenue += Number(row.gross_revenue || 0)
                acc.netRevenue += Number(row.net_revenue || 0)
                acc.cashIn += Number(row.cash_in || 0)
                acc.cashOut += Number(row.cash_out || 0)
                return acc
            },
            {
                totalSales: 0,
                grossRevenue: 0,
                netRevenue: 0,
                cashIn: 0,
                cashOut: 0
            }
        )

        // ✅ Caixa (cashBalance) deve ser o saldo acumulado no último dia do período
        // Caso não haja dados no período, buscamos o saldo mais recente antes do período
        let finalCashBalance = 0
        if (data.length > 0) {
            // Pegar o cash_balance da linha mais recente do período
            const lastRow = [...data].sort((a, b) => b.day.localeCompare(a.day))[0]
            finalCashBalance = Number(lastRow.cash_balance || 0)
        } else {
            // Se o período selecionado não tem movimentação, busca o último saldo global
            const { data: lastBalance } = await supabase
                .from('dashboard_kpis_period')
                .select('cash_balance')
                .lte('day', endDate)
                .order('day', { ascending: false })
                .limit(1)

            if (lastBalance?.[0]) {
                finalCashBalance = Number(lastBalance[0].cash_balance || 0)
            }
        }

        return {
            ...summary,
            cashBalance: finalCashBalance,
            averageTicket:
                summary.totalSales > 0
                    ? summary.netRevenue / summary.totalSales
                    : 0
        }
    },

    /**
     * ============================
     * TENDÊNCIA DE VENDAS (GRÁFICO)
     * ============================
     */
    async getSalesTrend(startDate, endDate) {
        const { data, error } = await supabase
            .from('dashboard_sales_timeseries_daily')
            .select('day, net_revenue')
            .gte('day', startDate)
            .lte('day', endDate)
            .order('day')

        if (error) throw error
        return toCamelCase(data)
    },

    /**
     * ============================
     * AÇÕES DE ESTOQUE (INTELIGÊNCIA)
     * ============================
     */
    async getInventoryActions() {
        const { data, error } = await supabase
            .from('dashboard_inventory_actions')
            .select('*')

        if (error) throw error

        return toCamelCase(
            data.sort((a, b) => {
                const p = { repor_agora: 1, queimar_agora: 2, proteger_margem: 3 }
                return (p[a.action] || 9) - (p[b.action] || 9)
            })
        )
    },

    /**
     * ============================
     * TOP CLIENTES (RPC)
     * ============================
     */
    async getTopCustomers(startDate, endDate) {
        const { data, error } = await supabase.rpc('get_top_customers', {
            start_date: startDate,
            end_date: endDate
        })

        if (error) return []
        return toCamelCase(data)
    },

    /**
     * ============================
     * ATIVIDADE RECENTE
     * ============================
     */
    async getRecentSales() {
        const { data, error } = await supabase
            .from('vendas')
            .select(
                `id, created_at, net_amount, payment_method, payment_status,
         customers ( name )`
            )
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        return data.map(v => ({
            id: v.id,
            date: v.created_at,
            amount: v.net_amount,
            method: v.payment_method,
            status: v.payment_status,
            customer: v.customers?.name || 'Cliente'
        }))
    },

    /**
     * ============================
     * FINANCEIRO — A RECEBER / INADIMPLÊNCIA
     * ============================
     */
    async getCashFlowIndicators() {
        console.log('📊 Dashboard: Buscando indicadores de fluxo de caixa (A Receber/Inadimplência)');

        const { data, error } = await supabase
            .from('installments')
            .select('remaining_amount, due_date, status')
            .neq('status', 'paid') // Pega 'pending' e 'partially_paid'

        if (error) {
            console.error('❌ Erro ao buscar indicadores de caixa:', error);
            return { toReceive: 0, overdue: 0 }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString().split('T')[0];

        return data.reduce(
            (acc, i) => {
                const v = Number(i.remaining_amount || 0)
                acc.toReceive += v
                // Inadimplência: Se a data de vencimento for ANTERIOR a hoje
                if (i.due_date < todayIso) {
                    acc.overdue += v
                }
                return acc
            },
            { toReceive: 0, overdue: 0 }
        )
    }
}
