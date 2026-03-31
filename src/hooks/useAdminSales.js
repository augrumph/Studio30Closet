import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVendas, getVendaById, createVenda, updateVenda, deleteVenda } from '@/lib/api/vendas'

export function useAdminSales(filters = {}) {
    const { page = 1, limit = 50, searchTerm = '', paymentStatus = 'all', type = 'all', dateFilter = 'all' } = filters

    // Query principal de listagem
    const query = useQuery({
        queryKey: ['admin', 'sales', { page, limit, searchTerm, paymentStatus, type, dateFilter }],
        queryFn: () => getVendas(page, limit, {
            search: searchTerm,
            status: paymentStatus,
            dateFilter: dateFilter
        }),
        staleTime: 1000 * 60 * 5, // 5 minutos
        placeholderData: (previousData) => previousData // Keep previous data while fetching new page
    })

    return {
        vendas: query.data?.vendas || [],
        total: query.data?.total || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    }
}

export function useAdminSale(id) {
    return useQuery({
        queryKey: ['admin', 'sale', id],
        queryFn: () => getVendaById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5
    })
}

export function useAdminSalesMutations() {
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: createVenda,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'sales'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'vendas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'all-vendas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-raw'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'all-products'] })
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateVenda(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'sales'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'vendas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'sale', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'all-vendas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-raw'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'all-products'] })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteVenda,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'sales'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'vendas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'all-vendas'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-metrics-raw'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'all-products'] })
        }
    })

    return {
        createSale: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updateSale: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        deleteSale: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending
    }
}
