import { ProductCard, ProductModal, ProductFilters, SkeletonCard } from '@/components/catalog'
import { useMalinhaStore } from '@/store/malinha-store'
import { useState, useMemo, memo, Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X, SlidersHorizontal, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/hooks/useCatalog'
import { trackCatalogView } from '@/lib/api/analytics'
import { getProductById } from '@/lib/api/products'
import { getActiveCollections } from '@/lib/api/collections'

// Componente Interno que usa o Hook (para poder usar Suspense no Pai se quisesse, 
// mas aqui vamos tratar os estados isLoading/error do hook direto para UX suave)
function CatalogContent() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [showMobileFilters, setShowMobileFilters] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)

    // Filters from URL
    const selectedCategory = searchParams.get('categoria')
    const selectedSizesParam = searchParams.get('tamanhos')
    const selectedSizes = selectedSizesParam ? selectedSizesParam.split(',') : []
    const productIdFromUrl = searchParams.get('productId')
    const selectedCollection = searchParams.get('colecao')

    // Collections state
    const [collections, setCollections] = useState([])
    useEffect(() => {
        getActiveCollections().then(setCollections).catch(() => { })
    }, [])

    // ⚡ REACT QUERY HOOK
    // Substitui todo o AdminStore, useEffects e useState de loading
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error
    } = useCatalog({
        category: selectedCategory,
        sizes: selectedSizes,
        search: searchQuery,
        collection: selectedCollection
    })

    // Flattening das páginas do Infinite Query para um array único
    const products = useMemo(() => {
        return data?.pages.flatMap(page => page.products) || []
    }, [data])

    // Filtro local de disponibilidade (se necessário, mas idealmente seria no backend)
    const displayProducts = useMemo(() => {
        if (!showOnlyAvailable) return products
        return products.filter(p => p.stock > 0)
    }, [products, showOnlyAvailable])

    // Carrinho (Zustand)
    const { items } = useMalinhaStore()

    // 📊 Analytics: Rastrear visualização do catálogo
    useEffect(() => {
        trackCatalogView({
            category: selectedCategory,
            sizes: selectedSizes,
            search: searchQuery
        })
    }, []) // Apenas no mount inicial

    // Auto-open product modal if productId in URL
    useEffect(() => {
        const handleOpenProduct = async () => {
            if (productIdFromUrl && !selectedProduct) {
                // 1. Tentar achar na lista já carregada (mais rápido)
                const productInList = products.find(p => p.id.toString() === productIdFromUrl)

                if (productInList) {
                    setSelectedProduct(productInList)
                    cleanUrl()
                    return
                }

                // 2. Se não achou (pode estar em outra página), buscar individualmente
                try {
                    const fetchedProduct = await getProductById(productIdFromUrl)
                    if (fetchedProduct) {
                        setSelectedProduct(fetchedProduct)
                        cleanUrl()
                    }
                } catch (err) {
                    console.error("Erro ao buscar produto para modal:", err)
                }
            }
        }

        const cleanUrl = () => {
            const newParams = new URLSearchParams(searchParams)
            newParams.delete('productId')
            setSearchParams(newParams, { replace: true })
        }

        handleOpenProduct()
    }, [productIdFromUrl, products, selectedProduct, searchParams, setSearchParams])

    // Handlers
    const updateFilter = (key, value) => {
        const newParams = new URLSearchParams(searchParams)
        if (!value || (Array.isArray(value) && value.length === 0)) {
            newParams.delete(key)
        } else {
            newParams.set(key, Array.isArray(value) ? value.join(',') : value)
        }
        setSearchParams(newParams)
    }

    const handleCategoryChange = (cat) => updateFilter('categoria', cat)

    const handleSizeChange = (size) => {
        const newSizes = selectedSizes.includes(size)
            ? selectedSizes.filter(s => s !== size)
            : [...selectedSizes, size]
        updateFilter('tamanhos', newSizes)
    }

    const handleClearFilters = () => {
        setSearchParams({})
        setSearchQuery('')
    }

    const handleCollectionChange = (col) => updateFilter('colecao', col)

    // Listas estáticas para filtros
    const allSizes = ['PP', 'P', 'M', 'G', 'GG', 'U']

    // Categorias corretas mapeadas para o banco de dados (lowercase, sem acento)
    const CATEGORIES_MAP = [
        { value: 'all', label: 'Todas' },
        { value: 'vestidos', label: 'Vestidos' },
        { value: 'blusas', label: 'Blusas' },
        { value: 'calcas', label: 'Calças' },
        { value: 'saias', label: 'Saias' },
        { value: 'conjuntos', label: 'Conjuntos' },
        { value: 'shorts', label: 'Shorts' }
    ]

    const hasActiveFilters = selectedCategory || selectedSizes.length > 0 || searchQuery.trim() || selectedCollection

    // 🔄 Infinite Scroll Logic
    const loadMoreRef = useRef(null)
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            },
            { threshold: 0.1, rootMargin: '200px' } // Load 200px before reaching bottom
        )

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current)
        }

        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    // Render de Loading Inicial
    if (isLoading) {
        return (
            <div className="container-custom py-6 md:py-20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            </div>
        )
    }

    // Render de Erro
    if (isError) {
        return (
            <div className="text-center py-32">
                <h2 className="text-3xl font-display text-red-500 mb-4">Erro ao carregar</h2>
                <p className="text-gray-500">{error?.message}</p>
                <button onClick={() => window.location.reload()} className="mt-4 btn-primary">Tentar novamente</button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            {/* Main Content */}
            <div className="container-custom py-6 md:py-20">
                <div className="grid md:grid-cols-4 gap-6 md:gap-16">
                    {/* Sidebar Filters - Desktop Only */}
                    <aside className="hidden md:block">
                        <div className="sticky top-44">
                            <ProductFilters
                                categories={CATEGORIES_MAP}
                                selectedCategory={selectedCategory}
                                onCategoryChange={handleCategoryChange}
                                sizes={allSizes}
                                selectedSizes={selectedSizes}
                                onSizeChange={handleSizeChange}
                                onClearFilters={handleClearFilters}
                                showOnlyAvailable={showOnlyAvailable}
                                onAvailabilityChange={setShowOnlyAvailable}
                                // Collections
                                collections={collections}
                                selectedCollection={selectedCollection}
                                onCollectionChange={handleCollectionChange}
                            />
                        </div>
                    </aside>

                    {/* Products Grid */}
                    <div className="md:col-span-3">
                        {/* Top Message - Mobile First Optimization */}
                        <div className="md:hidden bg-[#E07850]/10 border border-[#E07850]/20 rounded-lg p-3 mb-4 flex items-center justify-center text-center">
                            <p className="text-sm font-medium text-[#E07850]">
                                🛍️ Prove no conforto da sua casa — eu levo a malinha até você em Mandirituba-PR e região
                            </p>
                        </div>

                        {/* MOBILE: Search Bar + Filter Controls */}
                        <div className="md:hidden space-y-3 mb-6">
                            <div className="relative touch-target">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Buscar peça..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 h-[48px] bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C75D3B] transition-all"
                                />
                            </div>

                            <button
                                onClick={() => setShowMobileFilters(true)}
                                className="w-full flex items-center justify-center gap-2 h-[48px] bg-white border border-gray-200 text-[#4A3B32] rounded-lg font-semibold"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Filtros {hasActiveFilters && `(${selectedSizes.length + (selectedCategory ? 1 : 0)})`}
                            </button>
                        </div>

                        {/* GRID */}
                        {displayProducts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                                    {displayProducts.map((product, index) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: (index % 6) * 0.05 }}
                                        >
                                            <ProductCard
                                                product={product}
                                                onQuickView={setSelectedProduct}
                                                index={index}
                                                isLarge={index < 2}
                                            />
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Load More Button / Infinite Scroll Sentinel */}
                                {hasNextPage && (
                                    <div ref={loadMoreRef} className="mt-8 flex justify-center py-8 w-full">
                                        {isFetchingNextPage ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 border-4 border-[#C75D3B]/30 border-t-[#C75D3B] rounded-full animate-spin" />
                                                <p className="text-xs text-[#4A3B32]/60 animate-pulse font-medium">Carregando mais peças...</p>
                                            </div>
                                        ) : (
                                            <div className="h-10 w-full" />
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-24">
                                <p className="text-gray-400 italic">Nenhum produto encontrado.</p>
                                <button onClick={handleClearFilters} className="mt-4 text-[#C75D3B] font-bold underline">
                                    Limpar filtros
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filters Modal */}
            <AnimatePresence>
                {showMobileFilters && (
                    <motion.div
                        className="fixed inset-0 z-50 md:hidden"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
                        <motion.div
                            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto"
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        >
                            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                                <h3 className="font-display text-xl">Filtros</h3>
                                <button onClick={() => setShowMobileFilters(false)}><X className="w-6 h-6" /></button>
                            </div>
                            <div className="p-6">
                                <ProductFilters
                                    categories={CATEGORIES_MAP}
                                    selectedCategory={selectedCategory}
                                    onCategoryChange={(cat) => {
                                        handleCategoryChange(cat)
                                        setShowMobileFilters(false)
                                    }}
                                    sizes={allSizes}
                                    selectedSizes={selectedSizes}
                                    onSizeChange={handleSizeChange} // Tamanhos continuam permitindo múltipla seleção
                                    onClearFilters={() => {
                                        handleClearFilters()
                                        // setShowMobileFilters(false) // Opcional: fechar ao limpar? Geralmente não.
                                    }}
                                    // Collections
                                    collections={collections}
                                    selectedCollection={selectedCollection}
                                    onCollectionChange={(col) => {
                                        handleCollectionChange(col)
                                        setShowMobileFilters(false)
                                    }}
                                />
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="w-full mt-6 py-4 bg-[#C75D3B] text-white font-bold rounded-lg"
                                >
                                    Ver Resultados
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ProductModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
            />

            {/* Float Cart Button */}
            <AnimatePresence>
                {items.length > 0 && !selectedProduct && (
                    <motion.div
                        initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                        className="fixed bottom-6 left-4 right-4 z-40 md:hidden"
                    >


                        <a href="/malinha" className="flex items-center justify-between px-6 py-4 bg-[#C75D3B] text-white rounded-2xl shadow-xl relative overflow-hidden">
                            <span className="font-bold relative z-10">{items.length} peças</span>
                            <span className="font-bold relative z-10">Ver Malinha</span>
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const Catalog = memo(CatalogContent)
export { Catalog }
export default Catalog
