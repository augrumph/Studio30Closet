/**
 * useAnalytics Hook
 * 
 * Hook para buscar dados de analytics do site (via BFF)
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

/**
 * Busca resumo de analytics
 */
export function useAnalyticsSummary(dateRange = 'today') {
    return useQuery({
        queryKey: ['analytics', 'summary', dateRange],
        queryFn: async () => {
            const queryParams = new URLSearchParams({ dateRange })
            return apiClient(`/analytics/summary?${queryParams.toString()}`)
        },
        staleTime: 1000 * 60 * 2, // 2 min
    })
}

/**
 * Busca produtos mais visualizados
 */
export function useTopViewedProducts(limit = 10) {
    return useQuery({
        queryKey: ['analytics', 'top-viewed', limit],
        queryFn: async () => {
            const queryParams = new URLSearchParams({ limit: limit.toString() })
            return apiClient(`/analytics/products/viewed?${queryParams.toString()}`)
        },
        staleTime: 1000 * 60 * 5,
    })
}

/**
 * Busca produtos mais adicionados ao carrinho
 */
export function useTopAddedToCart(limit = 10) {
    return useQuery({
        queryKey: ['analytics', 'top-cart', limit],
        queryFn: async () => {
            const queryParams = new URLSearchParams({ limit: limit.toString() })
            return apiClient(`/analytics/products/added-to-cart?${queryParams.toString()}`)
        },
        staleTime: 1000 * 60 * 5,
    })
}

/**
 * Busca carrinhos abandonados
 */
export function useAbandonedCarts() {
    return useQuery({
        queryKey: ['analytics', 'abandoned-carts'],
        queryFn: () => apiClient('/analytics/carts/abandoned'),
        staleTime: 1000 * 60 * 2,
    })
}

/**
 * Busca eventos recentes
 */
export function useRecentEvents(limit = 20) {
    return useQuery({
        queryKey: ['analytics', 'recent-events', limit],
        queryFn: async () => {
            const queryParams = new URLSearchParams({ limit: limit.toString() })
            return apiClient(`/analytics/events/recent?${queryParams.toString()}`)
        },
        staleTime: 1000 * 30, // 30 segundos
    })
}
