import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, deleteOrder } from '@/lib/api'

export function useAdminOrders() {
    const queryClient = useQueryClient()

    // 1. Fetch de Pedidos (Substitui loadOrders)
    // Faz polling a cada 30 segundos para manter a lista de pedidos atualizada (Quase Real-time)
    const query = useQuery({
        queryKey: ['admin', 'orders'],
        queryFn: async () => {
            // Buscando uma quantidade maior para garantir que o dashboard mostre
            // os pedidos recentes corretamente sem precisar de paginação complexa inicial
            const { orders, total } = await getOrders(1, 100)
            return { orders, total }
        },
        staleTime: 1000 * 30, // 30 segundos de cache
        refetchInterval: 1000 * 30, // Recarrega automaticamente a cada 30s
        refetchOnWindowFocus: true // Garante dados frescos ao voltar para a aba
    })

    // 2. Mutation: Deletar uma malinha
    const deleteMutation = useMutation({
        mutationFn: deleteOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
        }
    })

    return {
        // Data State
        orders: query.data?.orders || [],
        totalOrders: query.data?.total || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,

        // Actions
        deleteOrder: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending
    }
}
