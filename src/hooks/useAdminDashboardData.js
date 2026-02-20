import { useQuery } from '@tanstack/react-query'
// Helper helpers

export function useAdminDashboardData(filters = {}) {
    const { period = 'all', start, end } = filters
    const staleTime = 1000 * 60 * 5 // 5 minutos de cache

    const vendasQuery = useQuery({
        queryKey: ['admin', 'all-vendas'],
        queryFn: async () => {
            const res = await fetch('/api/vendas?pageSize=1000') // Buscar todas para analytics
            if (!res.ok) throw new Error('Erro ao buscar vendas')
            const data = await res.json()
            return data.vendas || []
        },
        staleTime,
    })

    const ordersQuery = useQuery({
        queryKey: ['admin', 'all-orders'],
        queryFn: async () => {
            const res = await fetch('/api/orders')
            if (!res.ok) throw new Error('Erro ao buscar pedidos')
            return res.json()
        },
        staleTime,
    })

    const productsQuery = useQuery({
        queryKey: ['admin', 'all-products'],
        queryFn: async () => {
            const res = await fetch('/api/products')
            if (!res.ok) throw new Error('Erro ao buscar produtos')
            return res.json()
        },
        staleTime,
    })

    const suppliersQuery = useQuery({
        queryKey: ['admin', 'all-suppliers'],
        queryFn: async () => {
            const res = await fetch('/api/suppliers')
            if (!res.ok) throw new Error('Erro ao buscar fornecedores')
            return res.json()
        },
        staleTime,
    })

    const purchasesQuery = useQuery({
        queryKey: ['admin', 'all-purchases'],
        queryFn: async () => {
            const res = await fetch('/api/purchases')
            if (!res.ok) throw new Error('Erro ao buscar compras')
            return res.json()
        },
        staleTime,
    })

    const dashboardMetricsQuery = useQuery({
        queryKey: ['admin', 'dashboard-metrics-api', period, start, end],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (period) params.append('period', period)
            if (start) params.append('start', start)
            if (end) params.append('end', end)

            const response = await fetch(`/api/dashboard/stats?${params.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar métricas do backend')
            return response.json()
        },
        staleTime,
    })

    const isLoading =
        vendasQuery.isLoading ||
        ordersQuery.isLoading ||
        productsQuery.isLoading ||
        suppliersQuery.isLoading ||
        purchasesQuery.isLoading ||
        dashboardMetricsQuery.isLoading

    const isInitialLoading =
        vendasQuery.data === undefined && vendasQuery.isLoading

    return {
        vendas: vendasQuery.data || [],
        orders: ordersQuery.data?.orders || [],
        products: productsQuery.data?.items || [],
        suppliers: suppliersQuery.data?.items || [],
        purchases: purchasesQuery.data?.items || [],
        dashboardMetricsRaw: dashboardMetricsQuery.data || {},
        customers: [],
        isLoading,
        isInitialLoading,
        refetchAll: () => {
            vendasQuery.refetch()
            ordersQuery.refetch()
            productsQuery.refetch()
            suppliersQuery.refetch()
            purchasesQuery.refetch()
            dashboardMetricsQuery.refetch()
        }
    }
}


