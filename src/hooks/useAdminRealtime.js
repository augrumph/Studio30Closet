import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

function realtimeUrl(token) {
    const base = API_BASE.startsWith('http') ? API_BASE : window.location.origin + API_BASE
    const url = new URL(`${base.replace(/\/$/, '')}/realtime`)
    url.searchParams.set('token', token)
    return url.toString()
}

export function useAdminRealtime(enabled = true) {
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!enabled || typeof window === 'undefined' || !window.EventSource) return

        const token = localStorage.getItem('auth_token')
        if (!token) return

        const source = new EventSource(realtimeUrl(token))

        const invalidateAdminData = () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'sales'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'vendas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'all-vendas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'sale'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'installment-sales'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'installments'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-raw'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'all-products'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'products-paginated'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
        }

        source.addEventListener('venda.created', invalidateAdminData)
        source.addEventListener('venda.updated', invalidateAdminData)
        source.addEventListener('venda.deleted', invalidateAdminData)
        source.addEventListener('installments.updated', invalidateAdminData)

        return () => source.close()
    }, [enabled, queryClient])
}
