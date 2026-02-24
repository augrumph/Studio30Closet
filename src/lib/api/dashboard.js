/**
 * API do Dashboard — via Express BFF (Railway PostgreSQL)
 * Todas as funções usam GET /api/dashboard/stats como fonte única.
 */

let _statsCache = null
let _statsCacheTime = 0
const CACHE_TTL = 60 * 1000 // 1 min local

async function fetchStats(period = 'all', startDate, endDate) {
    const now = Date.now()
    if (_statsCache && now - _statsCacheTime < CACHE_TTL) return _statsCache

    const params = new URLSearchParams({ period })
    if (startDate) params.set('start', startDate)
    if (endDate) params.set('end', endDate)

    const response = await fetch(`/api/dashboard/stats?${params.toString()}`)
    if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Erro ${response.status}`)
    }
    const data = await response.json()
    _statsCache = data
    _statsCacheTime = now
    return data
}

/**
 * Obter dados agregados do dashboard (expenses + installments + purchases)
 */
export async function getDashboardMetrics() {
    try {
        const stats = await fetchStats()
        return {
            expenses: stats.expenses || [],
            coupons: [],
            installments: stats.installments || [],
            purchases: stats.purchases || []
        }
    } catch (err) {
        console.error('❌ Erro ao buscar métricas do dashboard:', err)
        throw err
    }
}

export const dashboardService = {
    async getKPIs(startDate, endDate) {
        try {
            // Detectar período baseado nas datas
            const today = new Date()
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

            let period = 'custom'
            if (!startDate) period = 'all'
            else if (startDate === monthStart) period = 'currentMonth'

            const stats = await fetchStats(period, startDate, endDate)
            return {
                totalSales: stats.salesCount || 0,
                grossRevenue: stats.grossRevenue || 0,
                netRevenue: stats.netRevenue || 0,
                cashIn: stats.receivedAmount || 0,
                cashOut: stats.totalExpenses || 0,
                cashBalance: (stats.receivedAmount || 0) - (stats.totalExpenses || 0),
                averageTicket: stats.averageTicket || 0,
                netProfit: stats.netProfit || 0,
                netMarginPercent: stats.netMarginPercent || 0
            }
        } catch {
            return { totalSales: 0, grossRevenue: 0, netRevenue: 0, cashIn: 0, cashOut: 0, cashBalance: 0, averageTicket: 0, netProfit: 0, netMarginPercent: 0 }
        }
    },

    async getSalesTrend(startDate, endDate) {
        try {
            const stats = await fetchStats('custom', startDate, endDate)
            // Se o backend não retornar trend, gerar a partir das vendas
            if (stats.salesTrend) return stats.salesTrend
            // Fallback: agrupar vendas por dia
            const vendas = stats.vendas || []
            const byDay = {}
            vendas.forEach(v => {
                const day = (v.createdAt || v.created_at || '').slice(0, 10)
                if (day) byDay[day] = (byDay[day] || 0) + (v.totalValue || v.total_value || 0)
            })
            return Object.entries(byDay)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([day, netRevenue]) => ({ day, netRevenue }))
        } catch {
            return []
        }
    },

    async getInventoryActions() {
        try {
            const response = await fetch('/api/stock/alerts')
            if (!response.ok) return []
            return response.json()
        } catch {
            return []
        }
    },

    async getTopCustomers(startDate, endDate) {
        try {
            const params = new URLSearchParams({ limit: 10 })
            if (startDate) params.set('startDate', startDate)
            if (endDate) params.set('endDate', endDate)
            const response = await fetch(`/api/customers/top?${params.toString()}`)
            if (!response.ok) return []
            return response.json()
        } catch {
            return []
        }
    },

    async getRecentSales() {
        try {
            const response = await fetch('/api/vendas?page=1&pageSize=10')
            if (!response.ok) return []
            const data = await response.json()
            return (data.items || []).map(v => ({
                id: v.id,
                date: v.createdAt,
                amount: v.netAmount || v.totalValue,
                method: v.paymentMethod,
                status: v.paymentStatus,
                customer: v.customerName || 'Cliente'
            }))
        } catch {
            return []
        }
    },

    async getCashFlowIndicators() {
        try {
            const stats = await fetchStats()
            return {
                toReceive: stats.toReceiveAmount || 0,
                overdue: stats.overdueAmount || 0
            }
        } catch {
            return { toReceive: 0, overdue: 0 }
        }
    }
}
