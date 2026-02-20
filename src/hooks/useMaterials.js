import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getMaterialsStock,
    getMaterialById,
    createMaterial,
    updateMaterial,
    deleteMaterial
} from '@/lib/api/materials'
import { toast } from 'sonner'

/**
 * Hook to fetch all materials
 */
export function useMaterials() {
    return useQuery({
        queryKey: ['materials'],
        queryFn: getMaterialsStock,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })
}

/**
 * Hook to fetch single material
 */
export function useMaterial(id) {
    return useQuery({
        queryKey: ['materials', id],
        queryFn: () => getMaterialById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5
    })
}

/**
 * Hook for material mutations
 */
export function useMaterialMutations() {
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: createMaterial,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials'] })
            toast.success('Material criado com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao criar material: ${error.message}`)
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateMaterial(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['materials'] })
            queryClient.invalidateQueries({ queryKey: ['materials', variables.id] })
            toast.success('Material atualizado com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao atualizar material: ${error.message}`)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteMaterial,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials'] })
            toast.success('Material removido com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao remover material: ${error.message}`)
        }
    })

    return {
        createMaterial: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updateMaterial: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        deleteMaterial: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending
    }
}
