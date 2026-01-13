import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/lib/api/dashboard'

export function useAdminDashboard(periodFilter, customDateRange) {
    // Calcular datas de início e fim baseado no filtro
    const getDateRange = () => {
        const now = new Date()
        let start = new Date()
        let end = new Date()

        if (periodFilter === 'all') {
            start = new Date('2023-01-01') // Data inicial arbitrária ou fetch da primeira venda
        } else if (periodFilter === 'last7days') {
            start.setDate(now.getDate() - 7)
        } else if (periodFilter === 'last30days') {
            start.setDate(now.getDate() - 30)
        } else if (periodFilter === 'currentMonth') {
            start = new Date(now.getFullYear(), now.getMonth(), 1)
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        } else if (periodFilter === 'custom' && customDateRange.start && customDateRange.end) {
            start = new Date(customDateRange.start)
            end = new Date(customDateRange.end)
            // Ajustar fuso/hora do fim do dia
            end.setHours(23, 59, 59)
        }

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        }
    }

    const { start, end } = getDateRange()

    // 1. KPIs Principais (Receita, Lucro, Caixa)
    const kpisQuery = useQuery({
        queryKey: ['dashboard', 'kpis', { start, end }],
        queryFn: () => dashboardService.getKPIs(start, end),
        staleTime: 1000 * 60 * 5, // 5 min
    })

    // 2. Tendência de Vendas (Gráfico)
    const trendQuery = useQuery({
        queryKey: ['dashboard', 'trend', { start, end }],
        queryFn: () => dashboardService.getSalesTrend(start, end),
        staleTime: 1000 * 60 * 5,
    })

    // 3. Top Clientes
    const customersQuery = useQuery({
        queryKey: ['dashboard', 'top-customers', { start, end }],
        queryFn: () => dashboardService.getTopCustomers(start, end),
        staleTime: 1000 * 60 * 5,
    })

    // 4. Fluxo de Caixa / Inadimplência (Snapshot atual, independente do período)
    const cashFlowQuery = useQuery({
        queryKey: ['dashboard', 'cash-flow'],
        queryFn: () => dashboardService.getCashFlowIndicators(),
        staleTime: 1000 * 60, // 1 min (pode mudar rápido com pagamentos)
    })

    // 5. Atividade Recente (Últimas vendas)
    const recentActivityQuery = useQuery({
        queryKey: ['dashboard', 'recent'],
        queryFn: () => dashboardService.getRecentSales(),
        staleTime: 1000 * 30, // 30s
        refetchInterval: 1000 * 60, // Auto-update
    })

    // 6. Ações Inteligentes de Estoque
    const inventoryActionsQuery = useQuery({
        queryKey: ['dashboard', 'inventory-actions'],
        queryFn: () => dashboardService.getInventoryActions(),
        staleTime: 1000 * 60 * 60, // 1h (muda pouco)
    })

    return {
        // Data
        kpis: kpisQuery.data || {},
        salesTrend: trendQuery.data || [],
        topCustomers: customersQuery.data || [],
        cashFlowIndicators: cashFlowQuery.data || { toReceive: 0, overdue: 0 },
        recentActivity: recentActivityQuery.data || [],
        inventoryActions: inventoryActionsQuery.data || [],

        // Loading States (Granular)
        isLoadingKPIs: kpisQuery.isLoading,
        isLoadingCharts: trendQuery.isLoading || customersQuery.isLoading,
        isLoadingRecent: recentActivityQuery.isLoading,

        // General Loading (se qualquer um estiver carregando)
        isLoading: kpisQuery.isLoading || trendQuery.isLoading || customersQuery.isLoading
    }
}
