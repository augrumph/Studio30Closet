import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPurchases, getPurchaseById, createPurchase, updatePurchase, deletePurchase } from '@/lib/api/purchases'
import { toast } from 'sonner'

/**
 * Hook to fetch all purchases (Client-side filtering mainly, but future server filtering supported)
 */
export function useAdminPurchases() {
    const query = useQuery({
        queryKey: ['admin', 'purchases'],
        queryFn: getPurchases,
        staleTime: 1000 * 60 * 5, // 5 min cache
        placeholderData: (prev) => prev
    })

    return {
        purchases: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
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
            toast.error(`Erro ao registrar compra: ${error.message}`)
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
            toast.error(`Erro ao atualizar compra: ${error.message}`)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deletePurchase,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'purchases'] })
            toast.success('Compra removida com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao remover compra: ${error.message}`)
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
