import { useEffect } from 'react'
import { useAdminStore } from '@/store/admin-store'
import { cacheProducts, getCachedProducts } from '@/lib/cache'

/**
 * usePrefetchProducts - Hook para precarregar TODOS os produtos em background
 * Ideal para executar na Homepage para que Catálogo carregue rápido
 * 1. Tenta cache primeiro (mais rápido)
 * 2. Se miss, carrega do servidor em background
 * 3. Cacheia resultado para próxima vez
 */
export function usePrefetchProducts() {
    const { products, loadAllProductsForCatalog } = useAdminStore()

    useEffect(() => {
        const prefetch = async () => {
            // Se já tem todos os produtos em memória, não precisa
            if (products.length > 0) {
                console.log('✅ Produtos já carregados em memória (total:', products.length, ')')
                return
            }

            // Tentar carregar do cache primeiro
            console.log('🔍 Prefetch: Buscando produtos no cache local...')
            const cachedProducts = await getCachedProducts()

            if (cachedProducts && cachedProducts.length > 0) {
                // Cache hit! Usar cache imediatamente
                console.log('⚡ Prefetch: Cache HIT! Produtos cacheados:', cachedProducts.length)
                // Products já estão em cache, estarão prontos quando usuário ir ao Catálogo
                return
            }

            // Cache miss ou expirado - carregar TUDO do servidor em background
            console.log('📡 Prefetch: Cache miss - carregando TODOS os produtos em background...')
            try {
                await loadAllProductsForCatalog()

                // Após carregar, cachear os produtos para próxima vez
                const state = useAdminStore.getState()
                if (state.products && state.products.length > 0) {
                    console.log('💾 Prefetch: Cacheando', state.products.length, 'produtos...')
                    await cacheProducts(state.products)
                    console.log('✅ Prefetch: Produtos cacheados com sucesso!')
                }
            } catch (error) {
                console.error('❌ Prefetch: Erro ao carregar produtos:', error)
            }
        }

        prefetch()
    }, [])
}
