/**
 * useAnalytics Hook
 * 
 * Hook para buscar dados de analytics do site (via BFF)
 */

import { useQuery } from '@tanstack/react-query'

/**
 * Busca resumo de analytics
 */
export function useAnalyticsSummary(dateRange = 'today') {
    return useQuery({
        queryKey: ['analytics', 'summary', dateRange],
        queryFn: async () => {
            const queryParams = new URLSearchParams({ dateRange })
            const response = await fetch(`/api/analytics/summary?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar resumo de analytics')
            return response.json()
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
            const response = await fetch(`/api/analytics/products/viewed?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar produtos mais visualizados')
            return response.json()
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
            const response = await fetch(`/api/analytics/products/added-to-cart?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar produtos mais adicionados')
            return response.json()
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
        queryFn: async () => {
            const response = await fetch('/api/analytics/carts/abandoned')
            if (!response.ok) throw new Error('Falha ao buscar carrinhos abandonados')
            return response.json()
        },
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
            const response = await fetch(`/api/analytics/events/recent?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar eventos recentes')
            return response.json()
        },
        staleTime: 1000 * 30, // 30 segundos
    })
}
