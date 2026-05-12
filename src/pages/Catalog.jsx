import { ProductCard, ProductModal, ProductFilters, SkeletonCard } from '@/components/catalog'
import { useMalinhaStore } from '@/store/malinha-store'
import { useState, useMemo, memo, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { X, SlidersHorizontal, Search, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/hooks/useCatalog'
import { trackCatalogView } from '@/lib/api/analytics'
import { getProductById } from '@/lib/api/products'
import { getActiveCollections } from '@/lib/api/collections'
import { SEO } from '@/components/SEO'

const CATEGORIES_MAP = [
    { value: 'all',      label: 'Todas' },
    { value: 'vestidos', label: 'Vestidos' },
    { value: 'blusas',   label: 'Blusas' },
    { value: 'calcas',   label: 'Calças' },
    { value: 'saias',    label: 'Saias' },
    { value: 'conjuntos',label: 'Conjuntos' },
    { value: 'shorts',   label: 'Shorts' },
]

const ALL_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'U']

function FilterChip({ label, onRemove }) {
    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#4A3B32]/8 border border-[#4A3B32]/12 text-[#4A3B32] text-xs font-semibold rounded-full">
            {label}
            <button
                onClick={onRemove}
                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-[#4A3B32]/15 transition-colors"
                aria-label={`Remover filtro ${label}`}
            >
                <X className="w-2.5 h-2.5" />
            </button>
        </span>
    )
}

function CatalogContent() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [showMobileFilters, setShowMobileFilters] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)

    const selectedCategory = searchParams.get('categoria')
    const selectedSizesParam = searchParams.get('tamanhos')
    const selectedSizes = selectedSizesParam ? selectedSizesParam.split(',') : []
    const productIdFromUrl = searchParams.get('productId')
    const selectedCollection = searchParams.get('colecao')

    const [collections, setCollections] = useState([])
    useEffect(() => {
        getActiveCollections().then(setCollections).catch(() => { })
    }, [])

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } = useCatalog({
        category: selectedCategory,
        sizes: selectedSizes,
        search: searchQuery,
        collection: selectedCollection
    })

    const products = useMemo(() => data?.pages.flatMap(page => page.products) || [], [data])

    const displayProducts = useMemo(() => {
        if (!showOnlyAvailable) return products
        return products.filter(p => p.stock > 0)
    }, [products, showOnlyAvailable])

    const { items } = useMalinhaStore()

    useEffect(() => {
        trackCatalogView({ category: selectedCategory, sizes: selectedSizes, search: searchQuery })
    }, [])

    // Deep linking — open modal from URL
    useEffect(() => {
        const handleOpenProduct = async () => {
            if (productIdFromUrl && !selectedProduct) {
                const found = products.find(p => p.id.toString() === productIdFromUrl)
                if (found) { setSelectedProduct(found); return }
                try {
                    const fetched = await getProductById(productIdFromUrl)
                    if (fetched) setSelectedProduct(fetched)
                } catch (err) {
                    console.error('Erro ao buscar produto para modal:', err)
                }
            }
        }
        handleOpenProduct()
    }, [productIdFromUrl, products])

    const handleProductSelect = (product) => {
        setSelectedProduct(product)
        const newParams = new URLSearchParams(searchParams)
        if (product) {
            newParams.set('productId', product.id)
            document.title = `${product.name} | Studio 30`
        } else {
            newParams.delete('productId')
            document.title = 'Catálogo | Studio 30'
        }
        setSearchParams(newParams, { replace: true })
    }

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
        setShowOnlyAvailable(false)
    }
    const handleCollectionChange = (col) => updateFilter('colecao', col)

    const hasActiveFilters = selectedCategory || selectedSizes.length > 0 || searchQuery.trim() || selectedCollection || showOnlyAvailable

    // Active filter count for mobile button
    const activeFilterCount = (selectedSizes.length) + (selectedCollection ? 1 : 0) + (showOnlyAvailable ? 1 : 0)

    // Infinite scroll sentinel
    const loadMoreRef = useRef(null)
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
            },
            { threshold: 0.1, rootMargin: '200px' }
        )
        if (loadMoreRef.current) observer.observe(loadMoreRef.current)
        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FDFBF7]">
                <div className="container-custom pt-8 pb-4">
                    <div className="h-9 w-36 bg-gray-100 rounded-lg animate-pulse mb-2" />
                    <div className="h-4 w-44 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="border-b border-gray-100 mt-4" />
                <div className="container-custom pt-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
                <div className="text-center py-24">
                    <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h2 className="text-xl font-display text-[#4A3B32] mb-2">Erro ao carregar</h2>
                    <p className="text-gray-400 text-sm mb-6">{error?.message}</p>
                    <button onClick={() => window.location.reload()} className="btn-primary">Tentar novamente</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            <SEO
                title={selectedProduct ? selectedProduct.name : 'Catálogo Completo'}
                description={selectedProduct
                    ? `Compre ${selectedProduct.name} online ou adicione à seleção para receber na malinha.`
                    : 'Explore a coleção Studio 30, compre online ou monte sua malinha para provar em casa.'}
                image={selectedProduct?.images?.[0]}
                type={selectedProduct ? 'article' : 'website'}
            />

            {/* ── Header ─────────────────────────────────── */}
            <div className="container-custom pt-8 pb-0">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display text-[#4A3B32] tracking-tight">Catálogo</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {isLoading ? 'Carregando...' : `${displayProducts.length} peças encontradas`}
                        </p>
                    </div>

                    {/* Desktop search */}
                    <div className="hidden md:block flex-shrink-0 w-72 mt-1">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Buscar peça..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C75D3B]/20 focus:border-[#C75D3B]/40 transition-all placeholder:text-gray-300"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Category pills */}
                <div className="-mx-4 sm:mx-0 mt-5 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2 px-4 sm:px-0 pb-px" style={{ minWidth: 'max-content' }}>
                        {CATEGORIES_MAP.map(cat => {
                            const isActive = (!selectedCategory && cat.value === 'all') || selectedCategory === cat.value
                            return (
                                <button
                                    key={cat.value}
                                    onClick={() => handleCategoryChange(cat.value === 'all' ? null : cat.value)}
                                    className={cn(
                                        'px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                                        isActive
                                            ? 'bg-[#4A3B32] text-white shadow-sm'
                                            : 'bg-white border border-gray-200 text-[#4A3B32]/70 hover:border-[#4A3B32]/30 hover:text-[#4A3B32]'
                                    )}
                                >
                                    {cat.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="border-b border-gray-100 mt-4" />

            {/* ── Main Content ────────────────────────────── */}
            <div className="container-custom py-6 md:py-8">
                <div className="grid md:grid-cols-4 gap-6 md:gap-12">

                    {/* Sidebar — desktop */}
                    <aside className="hidden md:block">
                        <div className="sticky top-44">
                            <ProductFilters
                                hideCategories
                                categories={CATEGORIES_MAP}
                                selectedCategory={selectedCategory}
                                onCategoryChange={handleCategoryChange}
                                sizes={ALL_SIZES}
                                selectedSizes={selectedSizes}
                                onSizeChange={handleSizeChange}
                                onClearFilters={handleClearFilters}
                                showOnlyAvailable={showOnlyAvailable}
                                onAvailabilityChange={setShowOnlyAvailable}
                                collections={collections}
                                selectedCollection={selectedCollection}
                                onCollectionChange={handleCollectionChange}
                            />
                        </div>
                    </aside>

                    {/* Products */}
                    <div className="md:col-span-3">

                        {/* Mobile controls */}
                        <div className="md:hidden space-y-3 mb-5">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Buscar peça..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 h-11 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C75D3B]/20 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setShowMobileFilters(true)}
                                className="w-full flex items-center justify-center gap-2 h-11 bg-white border border-gray-200 text-[#4A3B32] rounded-xl font-semibold text-sm"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Filtros
                                {activeFilterCount > 0 && (
                                    <span className="ml-0.5 bg-[#C75D3B] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Active filter chips — sizes & collection */}
                        <AnimatePresence>
                            {(selectedSizes.length > 0 || selectedCollection || showOnlyAvailable) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-wrap gap-2 mb-5 overflow-hidden"
                                >
                                    {selectedSizes.map(size => (
                                        <FilterChip key={size} label={`Tam. ${size}`} onRemove={() => handleSizeChange(size)} />
                                    ))}
                                    {selectedCollection && (
                                        <FilterChip
                                            label={collections.find(c => String(c.id) === selectedCollection)?.title || 'Coleção'}
                                            onRemove={() => handleCollectionChange(null)}
                                        />
                                    )}
                                    {showOnlyAvailable && (
                                        <FilterChip label="Em estoque" onRemove={() => setShowOnlyAvailable(false)} />
                                    )}
                                    {(selectedSizes.length > 1 || (selectedSizes.length > 0 && (selectedCollection || showOnlyAvailable))) && (
                                        <button
                                            onClick={handleClearFilters}
                                            className="text-xs text-gray-400 hover:text-[#C75D3B] transition-colors font-medium"
                                        >
                                            Limpar tudo
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Grid */}
                        {displayProducts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                                    {displayProducts.map((product, index) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: (index % 12) * 0.03, duration: 0.3 }}
                                        >
                                            <ProductCard
                                                product={product}
                                                onQuickView={handleProductSelect}
                                                index={index}
                                                priority={index < 6}
                                            />
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Infinite scroll sentinel */}
                                <div ref={loadMoreRef} className="mt-10 flex justify-center py-4">
                                    {isFetchingNextPage && (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-7 h-7 border-[3px] border-[#C75D3B]/20 border-t-[#C75D3B] rounded-full animate-spin" />
                                            <p className="text-xs text-[#4A3B32]/40 font-medium">Carregando mais...</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Empty state */
                            <div className="py-24 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-[#F5F0EC] rounded-full flex items-center justify-center mb-5">
                                    <ShoppingBag className="w-7 h-7 text-[#C75D3B]/50" />
                                </div>
                                <h3 className="text-lg font-display text-[#4A3B32] mb-2">Nenhuma peça encontrada</h3>
                                <p className="text-sm text-gray-400 mb-6 max-w-xs">
                                    Tente ajustar os filtros ou buscar por outro termo.
                                </p>
                                <button
                                    onClick={handleClearFilters}
                                    className="px-5 py-2.5 bg-[#4A3B32] text-white text-sm font-semibold rounded-xl hover:bg-[#C75D3B] transition-colors"
                                >
                                    Limpar filtros
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filters Sheet */}
            <AnimatePresence>
                {showMobileFilters && (
                    <motion.div
                        className="fixed inset-0 z-50 md:hidden"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowMobileFilters(false)}
                        />
                        <motion.div
                            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[88vh] overflow-y-auto"
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        >
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 bg-gray-200 rounded-full" />
                            </div>

                            <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-display text-lg text-[#4A3B32]">Filtros</h3>
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-5">
                                <ProductFilters
                                    hideCategories
                                    categories={CATEGORIES_MAP}
                                    selectedCategory={selectedCategory}
                                    onCategoryChange={(cat) => {
                                        handleCategoryChange(cat)
                                        setShowMobileFilters(false)
                                    }}
                                    sizes={ALL_SIZES}
                                    selectedSizes={selectedSizes}
                                    onSizeChange={handleSizeChange}
                                    onClearFilters={handleClearFilters}
                                    showOnlyAvailable={showOnlyAvailable}
                                    onAvailabilityChange={setShowOnlyAvailable}
                                    collections={collections}
                                    selectedCollection={selectedCollection}
                                    onCollectionChange={(col) => {
                                        handleCollectionChange(col)
                                        setShowMobileFilters(false)
                                    }}
                                />
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="w-full mt-8 py-4 bg-[#4A3B32] text-white font-bold rounded-2xl hover:bg-[#C75D3B] transition-colors"
                                >
                                    Ver {displayProducts.length} resultado{displayProducts.length !== 1 ? 's' : ''}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ProductModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => handleProductSelect(null)}
            />

            {/* Float cart button — mobile */}
            <AnimatePresence>
                {items.length > 0 && !selectedProduct && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        className="fixed bottom-0 left-0 right-0 z-40 md:hidden px-4 pt-3 bg-gradient-to-t from-white/80 to-transparent"
                        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
                    >
                        <Link
                            to="/malinha"
                            className="flex items-center justify-between px-6 py-4 bg-[#4A3B32] active:bg-[#C75D3B] text-white rounded-2xl shadow-2xl shadow-[#4A3B32]/40 transition-colors active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <motion.div
                                    key={items.length}
                                    initial={{ scale: 1.4 }}
                                    animate={{ scale: 1 }}
                                    className="w-8 h-8 bg-[#C75D3B] rounded-full flex items-center justify-center text-sm font-black shadow-md"
                                >
                                    {items.length}
                                </motion.div>
                                <span className="font-semibold text-sm text-white/85">
                                    {items.length === 1 ? '1 peça' : `${items.length} peças`} selecionadas
                                </span>
                            </div>
                            <span className="font-bold text-sm flex items-center gap-1">
                                Finalizar <span className="text-base">→</span>
                            </span>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const Catalog = memo(CatalogContent)
export { Catalog }
export default Catalog
