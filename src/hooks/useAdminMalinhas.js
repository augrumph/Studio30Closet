import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { getOrders, getOrderById, createOrder, updateOrder, deleteOrder, updateOrderStatus } from '@/lib/api/orders'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

/**
 * Hook to fetch paginated orders (malinhas)
 */
export function useAdminMalinhas({ page = 1, pageSize = 20, status = 'all', search = '', dateFilter = 'all' } = {}) {
    const query = useQuery({
        queryKey: ['admin', 'malinhas', { page, pageSize, status, search, dateFilter }],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                status,
                search,
                dateFilter
            })

            return apiClient(`/malinhas?${queryParams.toString()}`)
        },
        staleTime: 1000 * 60 * 2,
    })

    return {
        malinhas: query.data?.items || [],
        total: query.data?.total || 0,
        totalPages: query.data?.totalPages || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    }
}

/**
 * Hook to fetch a single order (malinha) by ID
 */
export function useAdminMalinha(id) {
    return useQuery({
        queryKey: ['admin', 'malinha', id],
        queryFn: () => getOrderById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5
    })
}

/**
 * Hook to fetch global KPIs for malinhas (not paginated)
 */
export function useAdminMalinhasKPIs() {
    return useQuery({
        queryKey: ['admin', 'malinhas', 'kpis'],
        queryFn: async () => {
            return apiClient('/malinhas/kpis')
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
    })
}

/**
 * Hook for Malinha mutations
 */
export function useAdminMalinhasMutations() {
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: createOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas', 'kpis'] })
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateOrder(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas', 'kpis'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinha', variables.id] })
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => updateOrderStatus(id, status),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas', 'kpis'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinha', variables.id] })
            toast.success('Status atualizado com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas', 'kpis'] })
            toast.success('Malinha removida com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    return {
        createMalinha: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updateMalinha: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        updateStatus: updateStatusMutation.mutateAsync,
        isUpdatingStatus: updateStatusMutation.isPending,

        deleteMalinha: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending
    }
}
