import { useQuery } from '@tanstack/react-query'

/**
 * Hook para verificar estoque de múltiplos itens de uma vez
 */
export function useStock(items) {
    const productIds = items?.map(item => item.productId) || []

    return useQuery({
        queryKey: ['stock', productIds],
        queryFn: async () => {
            if (productIds.length === 0) return []

            const response = await fetch('/api/products/stock-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: productIds })
            })

            if (!response.ok) throw new Error('Erro ao checar estoque')
            return response.json()
        },
        // Configuração especial para Checkout
        enabled: productIds.length > 0, // Só roda se tiver itens
        staleTime: 0, // SEMPRE pegar fresco (estoque é crítico)
        refetchOnWindowFocus: true, // Se sair e voltar, checa de novo
        refetchInterval: 1000 * 60, // Checa a cada 1 minuto
    })
}
