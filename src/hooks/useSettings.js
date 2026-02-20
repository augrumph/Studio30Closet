import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getSettings,
    getSetting,
    updateSettings,
    updateSetting,
    deleteSetting
} from '@/lib/api/settings'
import { toast } from 'sonner'

/**
 * Hook to fetch all settings
 */
export function useSettings() {
    return useQuery({
        queryKey: ['settings'],
        queryFn: getSettings,
        staleTime: 1000 * 60 * 60 // 1 hour - settings don't change often
    })
}

/**
 * Hook to fetch specific setting by key
 */
export function useSetting(key) {
    return useQuery({
        queryKey: ['settings', key],
        queryFn: () => getSetting(key),
        enabled: !!key,
        staleTime: 1000 * 60 * 60
    })
}

/**
 * Hook for settings mutations
 */
export function useSettingsMutations() {
    const queryClient = useQueryClient()

    const updateMultipleMutation = useMutation({
        mutationFn: updateSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] })
            toast.success('Configurações atualizadas com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao atualizar configurações: ${error.message}`)
        }
    })

    const updateSingleMutation = useMutation({
        mutationFn: ({ key, value }) => updateSetting(key, value),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['settings'] })
            queryClient.invalidateQueries({ queryKey: ['settings', variables.key] })
            toast.success('Configuração atualizada com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao atualizar configuração: ${error.message}`)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteSetting,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] })
            toast.success('Configuração removida com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao remover configuração: ${error.message}`)
        }
    })

    return {
        updateSettings: updateMultipleMutation.mutateAsync,
        isUpdatingMultiple: updateMultipleMutation.isPending,

        updateSetting: updateSingleMutation.mutateAsync,
        isUpdatingSingle: updateSingleMutation.isPending,

        deleteSetting: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending
    }
}
