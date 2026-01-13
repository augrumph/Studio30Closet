import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllProductsAdmin, getProductById, createProduct, updateProduct, deleteProduct, deleteMultipleProducts } from '@/lib/api'

// Hook para buscar um único produto (para edição)
export function useAdminProduct(id) {
    return useQuery({
        queryKey: ['admin', 'product', id],
        queryFn: () => getProductById(id),
        enabled: !!id, // Só roda se tiver ID
        staleTime: 1000 * 60 * 5 // Cache de 5 minutos
    })
}

export function useAdminProducts() {
    const queryClient = useQueryClient()

    // 1. Fetch de Produtos (Substitui loadInventoryForAdmin)
    // Cache de 5 minutos, mas faz refetch ao focar na janela para garantir dados frescos
    const query = useQuery({
        queryKey: ['admin', 'products'],
        queryFn: getAllProductsAdmin,
        staleTime: 1000 * 60 * 5, // 5 minutos sem refetch automático se não houver interação
        refetchOnWindowFocus: true // Garante que se o admin voltar pra aba, atualiza estoque/vendas
    })

    // 2. Mutation: Deletar um produto
    const deleteMutation = useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            // Invalida o cache para recarregar a lista automaticamente
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
        }
    })

    // 3. Mutation: Deletar vários produtos
    const deleteMultipleMutation = useMutation({
        mutationFn: deleteMultipleProducts,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
        }
    })

    // 4. Mutation: Criar produto
    const createMutation = useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
        }
    })

    // 5. Mutation: Atualizar produto
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateProduct(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'product', variables.id] })
        }
    })

    return {
        // Data State
        products: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,

        // Actions
        deleteProduct: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,

        deleteMultipleProducts: deleteMultipleMutation.mutateAsync,
        isDeletingMultiple: deleteMultipleMutation.isPending,

        createProduct: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updateProduct: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending
    }
}
