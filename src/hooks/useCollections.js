import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getCollections,
    getActiveCollections,
    getCollectionById,
    createCollection,
    updateCollection,
    deleteCollection
} from '@/lib/api/collections'
import { toast } from 'sonner'

/**
 * Hook to fetch all collections
 */
export function useCollections() {
    return useQuery({
        queryKey: ['collections'],
        queryFn: getCollections,
        staleTime: 1000 * 60 * 10 // 10 minutes
    })
}

/**
 * Hook to fetch only active collections (for catalog filters)
 */
export function useActiveCollections() {
    return useQuery({
        queryKey: ['collections', 'active'],
        queryFn: getActiveCollections,
        staleTime: 1000 * 60 * 10 // 10 minutes
    })
}

/**
 * Hook to fetch single collection
 */
export function useCollection(id) {
    return useQuery({
        queryKey: ['collections', id],
        queryFn: () => getCollectionById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 10
    })
}

/**
 * Hook for collection mutations
 */
export function useCollectionMutations() {
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: createCollection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collections'] })
            toast.success('Coleção criada com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao criar coleção: ${error.message}`)
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateCollection(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['collections'] })
            queryClient.invalidateQueries({ queryKey: ['collections', variables.id] })
            toast.success('Coleção atualizada com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao atualizar coleção: ${error.message}`)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteCollection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collections'] })
            toast.success('Coleção removida com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao remover coleção: ${error.message}`)
        }
    })

    return {
        createCollection: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updateCollection: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        deleteCollection: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending
    }
}
