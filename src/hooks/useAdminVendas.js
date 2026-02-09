import { useQuery } from '@tanstack/react-query'

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

            const response = await fetch(`/api/vendas?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar vendas do backend')
            return response.json()
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de cache
    })
}
