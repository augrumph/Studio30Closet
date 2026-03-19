import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

/**
 * Hook para buscar vendas com paginação no servidor
 */
export function useAdminVendas({ page = 1, pageSize = 20, status = 'all', search = '', method = 'all', dateFilter = 'all' } = {}) {
    return useQuery({
        queryKey: ['admin', 'vendas', { page, pageSize, status, search, method, dateFilter }],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                status,
                search,
                method,
                dateFilter
            })

            return apiClient(`/vendas?${queryParams.toString()}`)
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de cache
    })
}
