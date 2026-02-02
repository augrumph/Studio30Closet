import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query'
import { getProductsPaginated } from '@/lib/api'

// Hook customizado para o Catálogo
export function useCatalog({ category, sizes, search, collection }) {
    return useInfiniteQuery({
        // A queryKey muda conforme os filtros -> React Query recarrega sozinho!
        queryKey: ['products', 'catalog', { category, sizes, search, collection }],

        queryFn: async ({ pageParam = 0 }) => {
            console.log(`🚀 Fetching Catalog Page: ${pageParam}`, { category, sizes, search, collection })

            // Tratamento dos filtros para a API
            const filters = {
                category: category === 'all' ? undefined : category,
                sizes: sizes?.length > 0 ? sizes : undefined,
                search: search || undefined,
                collection: collection || undefined
            }

            // Chama a API existente
            const { products, total } = await getProductsPaginated(pageParam, 6, filters)

            return {
                products,
                total,
                nextPage: products.length === 6 ? pageParam + 6 : undefined // Se trouxe 6, tenta próxima
            }
        },

        getNextPageParam: (lastPage) => lastPage.nextPage,

        // Dados locais iniciais (se quiséssemos SSR, não é o caso)
        placeholderData: keepPreviousData,
    })
}
