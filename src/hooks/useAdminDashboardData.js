import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useAdminDashboardData(filters = {}) {
    const { period = 'all', start, end } = filters
    const staleTime = 1000 * 60 * 5 // 5 minutos de cache

    const vendasQuery = useQuery({
        queryKey: ['admin', 'all-vendas'],
        queryFn: async () => {
            const data = await apiClient('/vendas?pageSize=1000')
            return data.vendas || []
        },
        staleTime,
    })

    const ordersQuery = useQuery({
        queryKey: ['admin', 'all-orders'],
        queryFn: () => apiClient('/orders'),
        staleTime,
    })

    const productsQuery = useQuery({
        queryKey: ['admin', 'all-products'],
        queryFn: () => apiClient('/products'),
        staleTime,
    })

    const suppliersQuery = useQuery({
        queryKey: ['admin', 'all-suppliers'],
        queryFn: () => apiClient('/suppliers'),
        staleTime,
    })

    const purchasesQuery = useQuery({
        queryKey: ['admin', 'all-purchases'],
        queryFn: () => apiClient('/purchases'),
        staleTime,
    })

    const customersQuery = useQuery({
        queryKey: ['admin', 'all-customers'],
        queryFn: () => apiClient('/customers?pageSize=1000'),
        staleTime,
    })

    const dashboardMetricsQuery = useQuery({
        queryKey: ['admin', 'dashboard-metrics-api', period, start, end, filters.method, filters.status, filters.search],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (period) params.append('period', period)
            if (start) params.append('start', start)
            if (end) params.append('end', end)
            if (filters.method && filters.method !== 'all') params.append('method', filters.method)
            if (filters.status && filters.status !== 'all') params.append('status', filters.status)
            if (filters.search) params.append('search', filters.search)
            return apiClient(`/dashboard/stats?${params.toString()}`)
        },
        staleTime,
    })

    const isLoading =
        vendasQuery.isLoading ||
        ordersQuery.isLoading ||
        productsQuery.isLoading ||
        suppliersQuery.isLoading ||
        purchasesQuery.isLoading ||
        customersQuery.isLoading ||
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
        customers: customersQuery.data?.customers || [],
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


