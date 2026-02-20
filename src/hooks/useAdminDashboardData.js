import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getDashboardMetrics } from '@/lib/api'

// Helper helpers
const fetchAllVendas = async () => {
    // Buscar TODAS as vendas (sem paginação) para garantir precisão dos KPIs
    let query = supabase
        .from('vendas')
        .select(`
            *,
            customers (id, name)
        `)
        .order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return data.map(v => ({
        ...v,
        // Mapeamento snake_case -> camelCase manual para garantir performance e compatibilidade
        customerName: v.customers?.name,
        customerId: v.customer_id,
        totalValue: v.total_value,
        paymentMethod: v.payment_method,
        paymentStatus: v.payment_status,
        createdAt: v.created_at,
        feeAmount: v.fee_amount,
        netAmount: v.net_amount,
        entryPayment: v.entry_payment,
        isInstallment: v.is_installment,
        cardBrand: v.card_brand,
        feePercentage: v.fee_percentage,
        numInstallments: v.num_installments,
        installmentStartDate: v.installment_start_date,
        orderId: v.order_id,

        // items já vem como coluna JSONB no select *
        items: (v.items || []).map(i => ({
            ...i,
            productId: i.product_id || i.productId, // Fallback para schemas mistos
            costPrice: i.costPrice || i.cost_price || 0,
            costPriceAtTime: i.cost_price_at_time || i.costPriceAtTime,
            quantity: i.quantity || i.qty || 1
        }))
    }))
}

const fetchAllOrders = async () => {
    const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(name, phone), items:order_items(*)')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data.map(o => ({
        ...o,
        itemsCount: o.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0
    }))
}

const fetchAllSuppliers = async () => {
    const { data, error } = await supabase.from('suppliers').select('*')
    if (error) throw error
    return data
}

const fetchAllPurchases = async () => {
    const { data, error } = await supabase
        .from('purchases')
        .select('*, suppliers(name)')
        .order('date', { ascending: false })

    if (error) throw error
    return data
}

const fetchAllProducts = async () => {
    // Precisamos apenas de ID, Nome e Custo para analytics básico se necessário
    const { data, error } = await supabase.from('products').select('*')
    if (error) throw error
    return data
}

export function useAdminDashboardData(filters = {}) {
    const { period = 'all', start, end } = filters
    const staleTime = 1000 * 60 * 5 // 5 minutos de cache

    const vendasQuery = useQuery({
        queryKey: ['admin', 'all-vendas'],
        queryFn: async () => {
            const res = await fetch('/api/vendas?pageSize=1000') // Buscar todas para analytics
            if (!res.ok) throw new Error('Erro ao buscar vendas')
            const data = await res.json()
            return data.vendas || []
        },
        staleTime,
    })

    const ordersQuery = useQuery({
        queryKey: ['admin', 'all-orders'],
        queryFn: async () => {
            const res = await fetch('/api/orders')
            if (!res.ok) throw new Error('Erro ao buscar pedidos')
            return res.json()
        },
        staleTime,
    })

    const productsQuery = useQuery({
        queryKey: ['admin', 'all-products'],
        queryFn: async () => {
            const res = await fetch('/api/products')
            if (!res.ok) throw new Error('Erro ao buscar produtos')
            return res.json()
        },
        staleTime,
    })

    const suppliersQuery = useQuery({
        queryKey: ['admin', 'all-suppliers'],
        queryFn: async () => {
            const res = await fetch('/api/suppliers')
            if (!res.ok) throw new Error('Erro ao buscar fornecedores')
            return res.json()
        },
        staleTime,
    })

    const purchasesQuery = useQuery({
        queryKey: ['admin', 'all-purchases'],
        queryFn: async () => {
            const res = await fetch('/api/purchases')
            if (!res.ok) throw new Error('Erro ao buscar compras')
            return res.json()
        },
        staleTime,
    })

    const dashboardMetricsQuery = useQuery({
        queryKey: ['admin', 'dashboard-metrics-api', period, start, end],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (period) params.append('period', period)
            if (start) params.append('start', start)
            if (end) params.append('end', end)

            const response = await fetch(`/api/dashboard/stats?${params.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar métricas do backend')
            return response.json()
        },
        staleTime,
    })

    const isLoading =
        vendasQuery.isLoading ||
        ordersQuery.isLoading ||
        productsQuery.isLoading ||
        suppliersQuery.isLoading ||
        purchasesQuery.isLoading ||
        dashboardMetricsQuery.isLoading

    const isInitialLoading =
        vendasQuery.data === undefined && vendasQuery.isLoading

    return {
        vendas: vendasQuery.data || [],
        orders: ordersQuery.data?.orders || [],
        products: productsQuery.data?.items || [],
        suppliers: suppliersQuery.data?.items || [],
        purchases: purchasesQuery.data?.items || [],
        dashboardMetricsRaw: dashboardMetricsQuery.data || {},
        customers: [],
        isLoading,
        isInitialLoading,
        refetchAll: () => {
            vendasQuery.refetch()
            ordersQuery.refetch()
            productsQuery.refetch()
            suppliersQuery.refetch()
            purchasesQuery.refetch()
            dashboardMetricsQuery.refetch()
        }
    }
}


