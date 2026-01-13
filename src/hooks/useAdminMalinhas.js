import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, getOrderById, createOrder, updateOrder, deleteOrder, updateOrderStatus } from '@/lib/api/orders'
import { toast } from 'sonner'

/**
 * Hook to fetch paginated orders (malinhas)
 */
export function useAdminMalinhas(page = 1, limit = 20, status = 'all', searchTerm = '') {
    // Determine filters object based on API signature
    // Assuming getOrders takes page, limit, filters object or separate args.
    // Based on customers/vendas pattern, likely args.

    const query = useQuery({
        queryKey: ['admin', 'malinhas', { page, limit, status, searchTerm }],
        queryFn: () => getOrders({ page, limit, status, searchTerm }), // Adapting to object if supported, or individual args
        staleTime: 1000 * 60 * 2,
        placeholderData: (prev) => prev
    })

    return {
        malinhas: query.data?.orders || [],
        total: query.data?.total || 0,
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
            toast.error(`Erro ao criar malinha: ${error.message}`)
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
            toast.error(`Erro ao atualizar malinha: ${error.message}`)
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
            toast.error(`Erro ao atualizar status: ${error.message}`)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas'] })
            toast.success('Malinha removida com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao remover malinha: ${error.message}`)
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
