import { ProductCard, ProductModal, ProductFilters, SkeletonCard } from '@/components/catalog'
import { useAdminStore } from '@/store/admin-store'
import { useMalinhaStore } from '@/store/malinha-store'
import { useEffect, useState, useMemo, memo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X, SlidersHorizontal, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCachedProducts } from '@/lib/cache'
import { cn } from '@/lib/utils'

export function Catalog() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [showMobileFilters, setShowMobileFilters] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false) // Por padrão, mostrar tudo
    const [isLoadingMore, setIsLoadingMore] = useState(false) // Para o spinner do infinite scroll
    const { products, productsTotal, loadFirstProductsPage, loadMoreProducts, productsLoading, productsError } = useAdminStore()

    // Filters from URL
    const selectedCategory = searchParams.get('categoria')
    const selectedSizesParam = searchParams.get('tamanhos')
    const selectedSizes = selectedSizesParam ? selectedSizesParam.split(',') : []

    // ⚡ BUILD FILTERS OBJECT for server-side queries
    const currentFilters = useMemo(() => ({
        category: selectedCategory,
        sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
        search: searchQuery.trim() || undefined
    }), [selectedCategory, selectedSizes, searchQuery])

    // ✅ OTIMIZAÇÃO: useRef para controlar se já iniciou o carregamento
    const hasInitialized = useRef(false)
    const lastFiltersRef = useRef(JSON.stringify({}))

    // Carregar produtos iniciais
    useEffect(() => {
        if (hasInitialized.current) return
        hasInitialized.current = true

        const loadProductsOptimized = async () => {
            try {
                console.log('🚀 Catalog: Carregando primeiros 6 produtos...')
                await loadFirstProductsPage(currentFilters)
                lastFiltersRef.current = JSON.stringify(currentFilters)
            } catch (error) {
                console.error('❌ Erro ao carregar produtos no catálogo:', error)
            }
        }

        loadProductsOptimized()
    }, []) // ✅ SEM DEPENDÊNCIAS - executa apenas uma vez

    // 🔄 RECARREGAR DO SERVIDOR quando filtros mudam
    useEffect(() => {
        const filtersStr = JSON.stringify(currentFilters)
        if (filtersStr === lastFiltersRef.current) return
        if (!hasInitialized.current) return

        console.log('🔍 Filtros mudaram, recarregando do servidor...', currentFilters)
        lastFiltersRef.current = filtersStr
        loadFirstProductsPage(currentFilters)
    }, [currentFilters, loadFirstProductsPage])

    const { items } = useMalinhaStore()

    // Update URL params
    const updateFilter = (key, value) => {
        const newParams = new URLSearchParams(searchParams)
        if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
            newParams.delete(key)
        } else {
            newParams.set(key, Array.isArray(value) ? value.join(',') : value)
        }
        setSearchParams(newParams)
    }

    const handleCategoryChange = (category) => {
        updateFilter('categoria', category)
    }

    const handleSizeChange = (size) => {
        const newSizes = selectedSizes.includes(size)
            ? selectedSizes.filter(s => s !== size)
            : [...selectedSizes, size]
        updateFilter('tamanhos', newSizes)
    }

    const handleClearFilters = () => {
        setSearchParams({})
    }

    // Dynamic filters from data
    const categoriesList = ['all', ...new Set(products.map(p => p.category))]
    const allSizes = ['PP', 'P', 'M', 'G', 'GG', 'U']

    // Produtos já vem filtrados do servidor, apenas filtrar estoque local se necessário
    const displayProducts = useMemo(() => {
        if (!showOnlyAvailable) return products
        return products.filter(p => p.stock > 0)
    }, [products, showOnlyAvailable])

    const hasActiveFilters = selectedCategory || selectedSizes.length > 0 || searchQuery.trim()

    // INFINITE SCROLL: Verificar se há mais produtos no servidor
    const hasMore = products.length < productsTotal

    // Intersection Observer para INFINITE SCROLL (busca do servidor COM FILTROS)
    useEffect(() => {
        if (!hasMore || isLoadingMore) return

        const observer = new IntersectionObserver(async (entries) => {
            if (entries[0].isIntersecting && !isLoadingMore) {
                console.log('📜 Infinite Scroll: Carregando mais do servidor...')
                setIsLoadingMore(true)
                await loadMoreProducts(products.length, currentFilters)
                setIsLoadingMore(false)
            }
        }, { threshold: 0.1, rootMargin: '100px' })

        const sentinel = document.getElementById('catalog-sentinel')
        if (sentinel) observer.observe(sentinel)

        return () => observer.disconnect()
    }, [hasMore, products.length, isLoadingMore, loadMoreProducts, currentFilters])

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            {/* Main Content */}
            <div className="container-custom py-6 md:py-20">
                <div className="grid md:grid-cols-4 gap-6 md:gap-16">
                    {/* Sidebar Filters - Desktop Only */}
                    <aside className="hidden md:block">
                        <div className="sticky top-44">
                            <ProductFilters
                                categories={categoriesList}
                                selectedCategory={selectedCategory}
                                onCategoryChange={handleCategoryChange}
                                sizes={allSizes}
                                selectedSizes={selectedSizes}
                                onSizeChange={handleSizeChange}
                                onClearFilters={handleClearFilters}
                                showOnlyAvailable={showOnlyAvailable}
                                onAvailabilityChange={setShowOnlyAvailable}
                            />
                        </div>
                    </aside>

                    {/* Products Grid */}
                    <div className="md:col-span-3">
                        {/* MOBILE: Search Bar + Filter Controls */}
                        <div className="md:hidden space-y-3 mb-6">
                            {/* Search Input - Mobile Optimized */}
                            <div className="relative touch-target">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Buscar peça..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 h-[48px] bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C75D3B] transition-all"
                                    aria-label="Buscar produtos"
                                />
                            </div>

                            {/* Filter Button + Count */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowMobileFilters(true)}
                                    className="flex-1 touch-target flex items-center justify-center gap-2 bg-white border-2 border-[#4A3B32]/20 text-[#4A3B32] rounded-lg font-semibold transition-all hover:border-[#C75D3B] hover:text-[#C75D3B] active:scale-95"
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    Filtros
                                    {hasActiveFilters && (
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#C75D3B] text-white text-[10px] font-bold ml-1">
                                            {(selectedSizes.length || 0) + (selectedCategory ? 1 : 0)}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Active Filters Display */}
                            {hasActiveFilters && (
                                <motion.div
                                    className="flex flex-wrap gap-2 p-2 bg-[#FDF0ED]/50 rounded-lg border border-[#E8C4B0]"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    {selectedCategory && selectedCategory !== 'all' && (
                                        <button
                                            onClick={() => handleCategoryChange(null)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200 hover:border-[#C75D3B] active:scale-95 transition-all"
                                        >
                                            {selectedCategory}
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                    {selectedSizes.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => handleSizeChange(size)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200 hover:border-[#C75D3B] active:scale-95 transition-all"
                                        >
                                            {size}
                                            <X className="w-3 h-3" />
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        {/* Product Grid - Mobile First with Pagination */}
                        {productsLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <SkeletonCard key={`skeleton-${index}`} />
                                ))}
                            </div>
                        ) : productsError ? (
                            <div className="text-center py-16 sm:py-24 md:py-32">
                                <h2 className="font-display text-3xl sm:text-5xl md:text-6xl text-red-500 mb-4 sm:mb-6">
                                    Erro ao carregar
                                </h2>
                                <p className="text-[#4A3B32]/60 uppercase tracking-widest text-xs mb-6 sm:mb-8">
                                    {productsError}
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="touch-target px-6 bg-[#C75D3B] text-white rounded-lg font-semibold transition-all hover:bg-[#A64D31] active:scale-95"
                                >
                                    Tentar novamente
                                </button>
                            </div>
                        ) : displayProducts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                                    {displayProducts.map((product, index) => (
                                        product ? (
                                            <motion.div
                                                key={product.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    duration: 0.3,
                                                    delay: (index % 6) * 0.05,  // Stagger only within each batch of 6
                                                    ease: "easeOut"
                                                }}
                                            >
                                                <ProductCard
                                                    product={product}
                                                    onQuickView={setSelectedProduct}
                                                />
                                            </motion.div>
                                        ) : null
                                    ))}
                                </div>

                                {/* Infinite Scroll Sentinel + Skeletons */}
                                {hasMore && (
                                    <>
                                        <div id="catalog-sentinel" className="w-full" />
                                        {isLoadingMore && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mt-3 sm:mt-4 md:mt-6">
                                                {Array.from({ length: 6 }).map((_, index) => (
                                                    <SkeletonCard key={`skeleton-more-${index}`} />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-16 sm:py-24 md:py-32">
                                <h2 className="font-display text-3xl sm:text-5xl md:text-6xl text-[#C75D3B]/20 mb-4 sm:mb-6" style={{ fontStyle: 'italic' }}>
                                    Nada por aqui
                                </h2>
                                <p className="text-[#4A3B32]/60 uppercase tracking-widest text-xs mb-6 sm:mb-8">
                                    Nenhuma peça encontrada
                                </p>
                                <button
                                    onClick={() => {
                                        handleClearFilters()
                                        setSearchQuery('')
                                    }}
                                    className="touch-target px-6 bg-[#C75D3B] text-white rounded-lg font-semibold transition-all hover:bg-[#A64D31] active:scale-95"
                                >
                                    Limpar filtros
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filters Bottom Sheet - OPTIMIZED */}
            <AnimatePresence>
                {showMobileFilters && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fixed inset-0 z-40 md:hidden bg-black/40 backdrop-blur-sm"
                            onClick={() => setShowMobileFilters(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        />

                        {/* Bottom Sheet */}
                        <motion.div
                            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-2xl flex flex-col max-h-[85vh]"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            {/* Drag Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-12 h-1 bg-gray-300 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                                <h3 className="font-display text-xl text-[#4A3B32]">Filtros</h3>
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="touch-target flex items-center justify-center text-[#4A3B32]/40 hover:text-[#4A3B32] active:scale-90"
                                    aria-label="Fechar filtros"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Filters Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto px-6 py-4">
                                <ProductFilters
                                    categories={categoriesList}
                                    selectedCategory={selectedCategory}
                                    onCategoryChange={handleCategoryChange}
                                    sizes={allSizes}
                                    selectedSizes={selectedSizes}
                                    onSizeChange={handleSizeChange}
                                    onClearFilters={handleClearFilters}
                                    showOnlyAvailable={showOnlyAvailable}
                                    onAvailabilityChange={setShowOnlyAvailable}
                                />
                            </div>

                            {/* Footer CTA */}
                            <div className="border-t border-gray-200 p-6 space-y-3 bg-white rounded-b-2xl sticky bottom-0">
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="w-full touch-target bg-[#C75D3B] text-white font-bold rounded-lg transition-all hover:bg-[#A64D31] active:scale-95"
                                >
                                    Ver Resultados
                                </button>
                                <button
                                    onClick={() => {
                                        handleClearFilters()
                                        setSearchQuery('')
                                    }}
                                    className="w-full touch-target text-[#C75D3B] font-semibold rounded-lg border border-[#C75D3B] transition-all hover:bg-[#FDF0ED] active:scale-95"
                                >
                                    Limpar tudo
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Product Modal */}
            <ProductModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
            />

            {/* 🛒 Floating Cart Button - Mobile Only */}
            <AnimatePresence>
                {items.length > 0 && !selectedProduct && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="md:hidden fixed bottom-6 left-4 right-4 z-40"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                        <a
                            href="/malinha"
                            className="flex items-center justify-between w-full px-5 py-4 bg-gradient-to-r from-[#C75D3B] to-[#A64D31] text-white rounded-2xl shadow-2xl shadow-[#C75D3B]/30 active:scale-[0.98] transition-transform"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="text-lg font-bold">{items.length}</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Ver Malinha</p>
                                    <p className="text-xs text-white/70">{items.length} {items.length === 1 ? 'peça' : 'peças'} selecionadas</p>
                                </div>
                            </div>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default memo(Catalog)
