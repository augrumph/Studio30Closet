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
    const [page, setPage] = useState(1)
    const ITEMS_PER_PAGE = 20
    const { products, loadAllProductsForCatalog, productsLoading, productsError } = useAdminStore()

    // ✅ OTIMIZAÇÃO: useRef para controlar se já iniciou o carregamento
    const hasInitialized = useRef(false)

    useEffect(() => {
        // ✅ EVITAR CHAMADAS DUPLICADAS: Se já inicializou, não fazer nada
        if (hasInitialized.current) return
        hasInitialized.current = true

        const loadProductsOptimized = async () => {
            try {
                // Se já tem produtos em memória, não carregar novamente
                if (products.length > 0) {
                    console.log('✅ Produtos já em memória (total:', products.length, ')')
                    return
                }

                // Carregar produtos - o cache é gerenciado dentro do loadAllProductsForCatalog
                console.log('📡 Carregando produtos para catálogo...')
                await loadAllProductsForCatalog()
            } catch (error) {
                console.error('❌ Erro ao carregar produtos no catálogo:', error)
            }
        }

        loadProductsOptimized()
    }, []) // ✅ SEM DEPENDÊNCIAS - executa apenas uma vez

    // Filters from URL
    const selectedCategory = searchParams.get('categoria')
    const selectedSizesParam = searchParams.get('tamanhos')
    const selectedSizes = selectedSizesParam ? selectedSizesParam.split(',') : []

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

    // Filter products with search
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            // Availability filter (stock)
            if (showOnlyAvailable && product.stock <= 0) return false
            // Category filter
            if (selectedCategory && selectedCategory !== 'all' && product.category !== selectedCategory) return false
            // Size filter
            if (selectedSizes.length > 0 && !product.sizes.some(s => selectedSizes.includes(s))) return false
            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase()
                const matchesSearch =
                    product.name.toLowerCase().includes(query) ||
                    product.category?.toLowerCase().includes(query) ||
                    product.color?.toLowerCase().includes(query)
                return matchesSearch
            }
            return true
        })
    }, [products, selectedCategory, selectedSizes, searchQuery, showOnlyAvailable])

    const hasActiveFilters = selectedCategory || selectedSizes.length > 0

    // Pagination logic
    const startIdx = (page - 1) * ITEMS_PER_PAGE
    const endIdx = startIdx + ITEMS_PER_PAGE
    const paginatedProducts = filteredProducts.slice(startIdx, endIdx)
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
    const hasNextPage = page < totalPages

    // Reset page when filters change
    useEffect(() => {
        setPage(1)
    }, [selectedCategory, selectedSizes, searchQuery])

    // ✅ OTIMIZAÇÃO: Scroll suave apenas em Safari é lento - usar auto
    // E scrollar apenas quando paginação muda, não quando filtros mudam
    useEffect(() => {
        // Usar 'auto' para evitar layout thrashing no Safari
        window.scrollTo({ top: 0, behavior: 'auto' })
    }, [page])

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
                                <div className="text-sm font-medium text-gray-600 whitespace-nowrap">
                                    {filteredProducts.length} {filteredProducts.length === 1 ? 'peça' : 'peças'}
                                </div>
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
                        ) : paginatedProducts.length > 0 ? (
                            <>
                                <motion.div
                                    className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {paginatedProducts.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onQuickView={setSelectedProduct}
                                        />
                                    ))}
                                </motion.div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <motion.div
                                        className="flex items-center justify-center gap-2 sm:gap-3 mt-8 sm:mt-12"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                            className="touch-target px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#C75D3B] transition-all active:scale-95"
                                        >
                                            ← Anterior
                                        </button>

                                        <div className="flex items-center gap-1 sm:gap-2">
                                            {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                                                const pageNum = idx + Math.max(1, page - 2)
                                                if (pageNum > totalPages) return null
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setPage(pageNum)}
                                                        className={`touch-target px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${page === pageNum
                                                            ? 'bg-[#C75D3B] text-white'
                                                            : 'border-2 border-gray-200 hover:border-[#C75D3B]'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        <button
                                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                                            disabled={!hasNextPage}
                                            className="touch-target px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#C75D3B] transition-all active:scale-95"
                                        >
                                            Próxima →
                                        </button>
                                    </motion.div>
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
                                    Ver {filteredProducts.length} peças
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
