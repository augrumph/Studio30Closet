import { useEffect, useRef } from 'react'
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
    const lastEventIdRef = useRef(null)

    useEffect(() => {
        if (!enabled || typeof window === 'undefined' || !window.EventSource) return

        const token = localStorage.getItem('auth_token')
        if (!token) return

        let source = null
        let reconnectTimer = null

        function connect() {
            const urlStr = realtimeUrl(token)
            const url = new URL(urlStr)
            if (lastEventIdRef.current) {
                url.searchParams.set('lastEventId', lastEventIdRef.current)
            }
            source = new EventSource(url.toString())

            const invalidateSales = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'sales'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'vendas'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'all-vendas'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'sale'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-raw'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-api'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
                // Vendas afetam estoque
                queryClient.invalidateQueries({ queryKey: ['admin', 'stock'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'all-products'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'products-paginated'] })
            }

            const invalidateInstallments = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'installment-sales'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'installments'] })
                invalidateSales()
            }

            const invalidateProducts = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'all-products'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'products-paginated'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'product'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'stock'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-raw'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-api'] })
            }

            const invalidateCustomers = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'customer'] })
                queryClient.invalidateQueries({ queryKey: ['customers-with-metrics'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-raw'] })
            }

            const invalidateOrders = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'online-orders'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'order-full'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'malinhas', 'kpis'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-raw'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-api'] })
            }

            const invalidateSettings = () => {
                queryClient.invalidateQueries({ queryKey: ['settings'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'integrations'] })
                queryClient.invalidateQueries({ queryKey: ['integrations'] })
            }

            const invalidateFraud = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'fraud'] })
                invalidateOrders()
            }

            const invalidatePurchases = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'purchases'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'all-purchases'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-raw'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-api'] })
            }

            const invalidateExpenses = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-raw'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-api'] })
            }

            const invalidateSuppliers = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'all-suppliers'] })
            }

            const invalidateMaterials = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'materials'] })
            }

            const invalidateCollections = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] })
                queryClient.invalidateQueries({ queryKey: ['collections'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'all-products'] })
            }

            const invalidatePaymentFees = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'payment-fees'] })
                queryClient.invalidateQueries({ queryKey: ['payment-fees'] })
            }

            const invalidateEntregas = () => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'entregas'] })
            }

            const listeners = [
                ['venda.created', invalidateSales],
                ['venda.updated', invalidateSales],
                ['venda.deleted', invalidateSales],
                ['installments.updated', invalidateInstallments],
                ['products.created', invalidateProducts],
                ['products.updated', invalidateProducts],
                ['products.deleted', invalidateProducts],
                ['customers.created', invalidateCustomers],
                ['customers.updated', invalidateCustomers],
                ['customers.deleted', invalidateCustomers],
                ['customers.preferences.updated', invalidateCustomers],
                ['orders.created', invalidateOrders],
                ['orders.updated', invalidateOrders],
                ['orders.deleted', invalidateOrders],
                ['malinhas.updated', invalidateOrders],
                ['fraud.updated', invalidateFraud],
                ['settings.updated', invalidateSettings],
                ['integrations.updated', invalidateSettings],
                ['purchases.created', invalidatePurchases],
                ['purchases.updated', invalidatePurchases],
                ['purchases.deleted', invalidatePurchases],
                ['expenses.created', invalidateExpenses],
                ['expenses.updated', invalidateExpenses],
                ['expenses.deleted', invalidateExpenses],
                ['suppliers.created', invalidateSuppliers],
                ['suppliers.updated', invalidateSuppliers],
                ['suppliers.deleted', invalidateSuppliers],
                ['materials.created', invalidateMaterials],
                ['materials.updated', invalidateMaterials],
                ['materials.deleted', invalidateMaterials],
                ['collections.created', invalidateCollections],
                ['collections.updated', invalidateCollections],
                ['collections.deleted', invalidateCollections],
                ['payment-fees.updated', invalidatePaymentFees],
                ['entregas.created', invalidateEntregas],
                ['entregas.updated', invalidateEntregas],
                ['entregas.deleted', invalidateEntregas],
            ]

            // Track last event ID for replay on reconnect
            source.addEventListener('message', (e) => {
                try {
                    const data = JSON.parse(e.data)
                    if (data.id) lastEventIdRef.current = data.id
                } catch { /* ignore */ }
            })

            listeners.forEach(([eventName, handler]) => {
                source.addEventListener(eventName, (e) => {
                    try {
                        const data = JSON.parse(e.data)
                        if (data.id) lastEventIdRef.current = data.id
                    } catch { /* ignore */ }
                    handler()
                })
            })

            source.onerror = () => {
                // EventSource auto-reconnects; we just close current and let the effect re-run
                // so new connection picks up lastEventId for replay
                source.close()
                reconnectTimer = setTimeout(() => {
                    source = null
                    connect()
                }, 3000)
            }
        }

        connect()

        return () => {
            clearTimeout(reconnectTimer)
            if (source) source.close()
        }
    }, [enabled, queryClient])
}
