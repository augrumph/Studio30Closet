/**
 * ============================================================================
 * useEntregas - React Query Hook for Entregas
 * ============================================================================
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { getEntregas, getEntregaById, getEntregasMetrics, createEntrega, updateEntrega, deleteEntrega, updateEntregaStatus } from '@/lib/api/entregas'
import { toast } from 'sonner'

const ENTREGAS_KEY = 'entregas'

/**
 * Hook to fetch all entregas with optional filters
 */
export function useEntregas(options = {}) {
    const { status, platform, search } = options

    const query = useQuery({
        queryKey: [ENTREGAS_KEY, { status, platform, search }],
        queryFn: () => entregas.getAll({ status, platform, search }),
        staleTime: 1000 * 60 * 2, // 2 minutes
    })

    return {
        entregas: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    }
}

/**
 * Hook to fetch single entrega by ID
 */
export function useEntregaById(id) {
    return useQuery({
        queryKey: [ENTREGAS_KEY, id],
        queryFn: () => entregas.getById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 2,
    })
}

/**
 * Hook to fetch entregas metrics
 */
export function useEntregasMetrics() {
    return useQuery({
        queryKey: [ENTREGAS_KEY, 'metrics'],
        queryFn: () => entregas.getMetrics(),
        staleTime: 1000 * 60 * 1, // 1 minute
    })
}

/**
 * Hook with all mutation operations for entregas
 */
export function useEntregasMutations() {
    const queryClient = useQueryClient()

    const invalidateEntregas = () => {
        queryClient.invalidateQueries({ queryKey: [ENTREGAS_KEY] })
    }

    const createMutation = useMutation({
        mutationFn: (data) => entregas.create(data),
        onSuccess: () => {
            toast.success('Entrega criada com sucesso!')
            invalidateEntregas()
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }) => entregas.update(id, updates),
        onSuccess: () => {
            toast.success('Entrega atualizada!')
            invalidateEntregas()
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => entregas.delete(id),
        onSuccess: () => {
            toast.success('Entrega removida!')
            invalidateEntregas()
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, trackingCode }) =>
            entregas.update(id, { status, trackingCode }),
        onSuccess: (_, { status }) => {
            const statusLabels = {
                pending: 'Pendente',
                processing: 'Processando',
                shipped: 'Enviado',
                delivered: 'Entregue',
                cancelled: 'Cancelado'
            }
            toast.success(`Status atualizado para ${statusLabels[status] || status}`)
            invalidateEntregas()
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        }
    })

    return {
        createEntrega: createMutation.mutate,
        updateEntrega: updateMutation.mutate,
        deleteEntrega: deleteMutation.mutate,
        updateStatus: updateStatusMutation.mutate,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending || updateStatusMutation.isPending,
        isDeleting: deleteMutation.isPending
    }
}
