/**
 * useAnalytics Hook
 * 
 * Hook para buscar dados de analytics do site
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Busca resumo de analytics
 */
export function useAnalyticsSummary(dateRange = 'today') {
    return useQuery({
        queryKey: ['analytics', 'summary', dateRange],
        queryFn: async () => {
            let startDate = new Date()

            switch (dateRange) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0)
                    break
                case '7days':
                    startDate.setDate(startDate.getDate() - 7)
                    break
                case '30days':
                    startDate.setDate(startDate.getDate() - 30)
                    break
                case 'all':
                    startDate = new Date('2020-01-01')
                    break
            }

            const startDateStr = startDate.toISOString()

            // Buscar contagens por tipo de evento
            const { data: events, error } = await supabase
                .from('analytics_events')
                .select('event_type, event_data, session_id, referrer, device_type, created_at') // Include created_at for sorting
                .gte('created_at', startDateStr)
                .order('created_at', { ascending: true }) // 🎯 CRÍTICO: Ordenar para first-touch attribution

            if (error) throw error

            // Calcular métricas
            const pageViews = events.filter(e => e.event_type === 'page_view').length
            const catalogViews = events.filter(e => e.event_type === 'catalog_view').length
            const productViews = events.filter(e => e.event_type === 'product_view').length
            const addToCart = events.filter(e => e.event_type === 'add_to_cart').length
            const checkoutsStarted = events.filter(e => e.event_type === 'checkout_started').length
            const checkoutsCompleted = events.filter(e => e.event_type === 'checkout_completed').length

            // Sessões únicas
            const uniqueSessions = new Set(events.map(e => e.session_id)).size

            // Taxa de conversão
            const conversionRate = checkoutsStarted > 0
                ? ((checkoutsCompleted / checkoutsStarted) * 100).toFixed(1)
                : 0

            // Taxa de add to cart
            const addToCartRate = productViews > 0
                ? ((addToCart / productViews) * 100).toFixed(1)
                : 0

            // Fontes de Tráfego e Dispositivos
            const trafficSources = { google: 0, social: 0, direct: 0, other: 0 }
            const deviceBreakdown = { mobile: 0, desktop: 0, tablet: 0 }

            // Analisar primeira interação de cada sessão
            const processedSessions = new Set()

            events.forEach(e => {
                if (!processedSessions.has(e.session_id)) {
                    // 1. Traffic Source
                    const ref = (e.referrer || '').toLowerCase()
                    if (ref.includes('google')) trafficSources.google++
                    else if (ref.includes('instagram') || ref.includes('facebook') || ref.includes('tiktok')) trafficSources.social++
                    else if (!ref) trafficSources.direct++
                    else trafficSources.other++

                    // 2. Device Type
                    const device = (e.device_type || 'desktop').toLowerCase()
                    if (deviceBreakdown[device] !== undefined) {
                        deviceBreakdown[device]++
                    } else {
                        deviceBreakdown.desktop++ // Fallback
                    }

                    processedSessions.add(e.session_id)
                }
            })

            return {
                pageViews,
                catalogViews,
                productViews,
                addToCart,
                checkoutsStarted,
                checkoutsCompleted,
                uniqueSessions,
                conversionRate,
                addToCartRate,
                trafficSources,
                deviceBreakdown
            }
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
            const { data, error } = await supabase
                .from('analytics_events')
                .select('event_data')
                .eq('event_type', 'product_view')

            if (error) throw error

            // Agrupar por produto
            const productCounts = {}
            data.forEach(event => {
                const productId = event.event_data?.product_id
                const productName = event.event_data?.product_name
                if (productId) {
                    if (!productCounts[productId]) {
                        productCounts[productId] = {
                            id: productId,
                            name: productName || 'Produto',
                            views: 0
                        }
                    }
                    productCounts[productId].views++
                }
            })

            return Object.values(productCounts)
                .sort((a, b) => b.views - a.views)
                .slice(0, limit)
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
            const { data, error } = await supabase
                .from('analytics_events')
                .select('event_data')
                .eq('event_type', 'add_to_cart')

            if (error) throw error

            // Agrupar por produto
            const productCounts = {}
            data.forEach(event => {
                const productId = event.event_data?.product_id
                const productName = event.event_data?.product_name
                const price = event.event_data?.product_price || 0
                if (productId) {
                    if (!productCounts[productId]) {
                        productCounts[productId] = {
                            id: productId,
                            name: productName || 'Produto',
                            price,
                            count: 0
                        }
                    }
                    productCounts[productId].count++
                }
            })

            return Object.values(productCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, limit)
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
            const { data, error } = await supabase
                .from('abandoned_carts')
                .select('*')
                .eq('checkout_completed', false)
                .order('last_activity_at', { ascending: false })
                .limit(20)

            if (error) throw error

            return data || []
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
            const { data, error } = await supabase
                .from('analytics_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error

            return data || []
        },
        staleTime: 1000 * 30, // 30 segundos
    })
}
