import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    deleteProduct as deleteProductApi,
    deleteMultipleProducts as deleteMultipleProductsApi,
    createProduct as createProductApi,
    updateProduct as updateProductApi
} from '@/lib/api/products'

/**
 * Hook para buscar produtos com paginação no servidor
 */
export function useAdminProducts({ page = 1, pageSize = 20, search = '', category = 'all', active = 'all' } = {}) {
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: ['admin', 'products-paginated', { page, pageSize, search, category, active }],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                search,
                category,
                active
            })

            const response = await fetch(`/api/products?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar produtos do backend')
            return response.json()
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de cache
    })

    const deleteMutation = useMutation({
        mutationFn: deleteProductApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products-paginated'] })
        }
    })

    const multiDeleteMutation = useMutation({
        mutationFn: deleteMultipleProductsApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products-paginated'] })
        }
    })

    const createMutation = useMutation({
        mutationFn: createProductApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products-paginated'] })
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateProductApi(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products-paginated'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'product'] })
        }
    })

    return {
        ...query,
        products: query.data?.items || [],
        total: query.data?.total || 0,
        totalPages: query.data?.totalPages || 0,
        deleteProduct: deleteMutation.mutateAsync,
        deleteMultipleProducts: multiDeleteMutation.mutateAsync,
        createProduct: createMutation.mutateAsync,
        updateProduct: updateMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        refetch: query.refetch
    }
}

/**
 * Hook to fetch single product
 */
export function useAdminProduct(id) {
    return useQuery({
        queryKey: ['admin', 'product', id],
        queryFn: async () => {
            const response = await fetch(`/api/products/${id}`)
            if (!response.ok) throw new Error('Falha ao buscar produto')
            return response.json()
        },
        enabled: !!id,
        staleTime: 0
    })
}
