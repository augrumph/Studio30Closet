import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from '@/lib/api/suppliers'
import { toast } from 'sonner'

/**
 * Hook to fetch all suppliers (Paginated)
 */
export function useAdminSuppliers({ page = 1, pageSize = 20, search = '' } = {}) {
    const query = useQuery({
        queryKey: ['admin', 'suppliers', { page, pageSize, search }],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                search
            })

            const response = await fetch(`/api/suppliers?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar fornecedores do backend')
            return response.json()
        },
        staleTime: 1000 * 60 * 5, // 5 min
    })

    return {
        suppliers: query.data?.items || [],
        total: query.data?.total || 0,
        totalPages: query.data?.totalPages || 0,
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
            toast.error(formatUserFriendlyError(error))
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
            toast.error(formatUserFriendlyError(error))
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
            toast.success('Fornecedor removido com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
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
