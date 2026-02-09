/**
 * React Query Hook: useMidiInsights
 * Sistema de insights proativos da Midi
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { getMidiInsights, dismissInsight, generateInsights } from '@/lib/api/insights'
import { toast } from 'sonner'

// Query Keys
export const insightsQueryKeys = {
    all: ['insights'],
    active: (limit, category) => ['insights', 'active', { limit, category }],
}

/**
 * Hook to fetch active insights
 */
export function useMidiInsights({ limit = 10, category = null } = {}) {
    return useQuery({
        queryKey: insightsQueryKeys.active(limit, category),
        queryFn: () => getActiveInsights(limit, category),
        staleTime: 1000 * 60 * 2, // 2 minutes
        refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
    })
}

/**
 * Hook to dismiss an insight
 */
export function useDismissInsight() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ insightId, dismissedBy }) => dismissInsight(insightId, dismissedBy),
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries(insightsQueryKeys.all)
            toast.success('Insight dispensado')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        },
    })
}

/**
 * Hook to mark insight as read
 */
export function useMarkInsightRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (insightId) => markInsightRead(insightId),
        onSuccess: () => {
            queryClient.invalidateQueries(insightsQueryKeys.all)
        },
    })
}

/**
 * Hook to generate new insights
 */
export function useGenerateInsights() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => generateInsights(),
        onSuccess: (data) => {
            queryClient.invalidateQueries(insightsQueryKeys.all)
            const total = data.reduce((sum, item) => sum + item.insightCount, 0)
            toast.success(`${total} novos insights gerados!`)
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        },
    })
}
