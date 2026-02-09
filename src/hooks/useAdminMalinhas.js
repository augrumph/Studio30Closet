import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { getOrders, getOrderById, createOrder, updateOrder, deleteOrder, updateOrderStatus } from '@/lib/api/orders'
import { toast } from 'sonner'

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

            const response = await fetch(`/api/malinhas?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar malinhas do backend')
            return response.json()
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
 * Hook for Malinha mutations
 */
export function useAdminMalinhasMutations() {
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: createOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas'] })
            toast.success('Malinha criada com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateOrder(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinha', variables.id] })
            toast.success('Malinha atualizada com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => updateOrderStatus(id, status),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas'] })
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
