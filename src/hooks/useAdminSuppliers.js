import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from '@/lib/api/suppliers'
import { toast } from 'sonner'

/**
 * Hook to fetch all suppliers (Client-side filtering for now)
 */
export function useAdminSuppliers() {
    const query = useQuery({
        queryKey: ['admin', 'suppliers'],
        queryFn: getSuppliers,
        staleTime: 1000 * 60 * 10, // 10 min cache
        placeholderData: (prev) => prev
    })

    return {
        suppliers: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    }
}

/**
 * Hook to fetch single supplier
 */
export function useAdminSupplier(id) {
    return useQuery({
        queryKey: ['admin', 'supplier', id],
        queryFn: () => getSupplierById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 10
    })
}

/**
 * Hook for Supplier mutations
 */
export function useAdminSuppliersMutations() {
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: createSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
            toast.success('Fornecedor criado com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao criar fornecedor: ${error.message}`)
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateSupplier(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'supplier', variables.id] })
            toast.success('Fornecedor atualizado com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao atualizar fornecedor: ${error.message}`)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
            toast.success('Fornecedor removido com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao remover fornecedor: ${error.message}`)
        }
    })

    return {
        createSupplier: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updateSupplier: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        deleteSupplier: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending
    }
}
