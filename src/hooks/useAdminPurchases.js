import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { getPurchases, getPurchaseById, createPurchase, updatePurchase, deletePurchase } from '@/lib/api/purchases'
import { toast } from 'sonner'

/**
 * Hook to fetch all purchases (Paginated & Filtered via BFF)
 */
export function useAdminPurchases({ page = 1, pageSize = 20, search = '', period = 'all', startDate, endDate } = {}) {
    const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search,
        period
    })

    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)

    const query = useQuery({
        queryKey: ['admin', 'purchases', { page, pageSize, search, period, startDate, endDate }],
        queryFn: async () => {
            const response = await fetch(`/api/purchases?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar compras do backend')
            return response.json()
        },
        staleTime: 1000 * 60 * 5, // 5 min
    })

    return {
        purchases: query.data?.items || [],
        total: query.data?.total || 0,
        totalPages: query.data?.totalPages || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    }
}

/**
 * Hook to fetch metrics for purchases
 */
export function useAdminPurchasesMetrics({ search = '', period = 'all', startDate, endDate } = {}) {
    const queryParams = new URLSearchParams({
        search,
        period
    })
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)

    const query = useQuery({
        queryKey: ['admin', 'purchases', 'metrics', { search, period, startDate, endDate }],
        queryFn: async () => {
            const response = await fetch(`/api/purchases/metrics?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar métricas de compras')
            return response.json()
        },
        staleTime: 1000 * 60 * 10,
    })

    return {
        metrics: query.data || { totalValue: 0, totalItems: 0, totalLoja: 0, totalAugusto: 0, totalThais: 0 },
        isLoading: query.isLoading
    }
}

/**
 * Hook to fetch single purchase
 */
export function useAdminPurchase(id) {
    return useQuery({
        queryKey: ['admin', 'purchase', id],
        queryFn: () => getPurchaseById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 10
    })
}

/**
 * Hook for Purchase mutations
 */
export function useAdminPurchasesMutations() {
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: createPurchase,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'purchases'] })
            toast.success('Compra registrada com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updatePurchase(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'purchases'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'purchase', variables.id] })
            toast.success('Compra atualizada com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deletePurchase,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'purchases'] })
            toast.success('Compra removida com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    return {
        createPurchase: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updatePurchase: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        deletePurchase: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending
    }
}
