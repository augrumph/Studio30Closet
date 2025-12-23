import { ProductCard, ProductModal, ProductFilters, SkeletonCard } from '@/components/catalog'
import { useAdminStore } from '@/store/admin-store'
import { useMalinhaStore } from '@/store/malinha-store'
import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'

export function Catalog() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [showMobileFilters, setShowMobileFilters] = useState(false)
    const { products, loadProducts, productsLoading } = useAdminStore()

    useEffect(() => {
        loadProducts()
    }, [loadProducts])

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

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            if (selectedCategory && selectedCategory !== 'all' && product.category !== selectedCategory) return false
            if (selectedSizes.length > 0 && !product.sizes.some(s => selectedSizes.includes(s))) return false
            return true
        })
    }, [products, selectedCategory, selectedSizes])

    const hasActiveFilters = selectedCategory || selectedSizes.length > 0

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            {/* Main Content */}
            <div className="container-custom py-20">
                <div className="grid md:grid-cols-4 gap-16">
                    {/* Sidebar Filters - Desktop */}
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
                            />
                        </div>
                    </aside>

                    {/* Products Grid */}
                    <div className="md:col-span-3">
                        {productsLoading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <SkeletonCard key={`skeleton-${index}`} />
                                ))}
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onQuickView={setSelectedProduct}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-32">
                                <h2 className="font-display text-6xl text-[#C75D3B]/20 mb-6" style={{ fontStyle: 'italic' }}>
                                    Nada por aqui
                                </h2>
                                <p className="text-[#4A3B32]/60 uppercase tracking-widest text-xs mb-8">
                                    Nenhuma peça encontrada
                                </p>
                                <button
                                    onClick={handleClearFilters}
                                    className="border-b-2 border-[#C75D3B] text-[#4A3B32] pb-1 hover:text-[#C75D3B] transition-colors"
                                >
                                    Limpar filtros
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filters Drawer */}
            {showMobileFilters && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div
                        className="absolute inset-0 bg-[#4A3B32]/40 backdrop-blur-sm"
                        onClick={() => setShowMobileFilters(false)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white flex flex-col">
                        <div className="p-6 border-b border-[#4A3B32]/5 flex items-center justify-between">
                            <h3 className="font-display text-2xl text-[#4A3B32]">Filtros</h3>
                            <button
                                onClick={() => setShowMobileFilters(false)}
                                className="text-[#4A3B32]/40 hover:text-[#4A3B32]"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <ProductFilters
                                categories={categoriesList}
                                selectedCategory={selectedCategory}
                                onCategoryChange={handleCategoryChange}
                                sizes={allSizes}
                                selectedSizes={selectedSizes}
                                onSizeChange={handleSizeChange}
                                onClearFilters={handleClearFilters}
                            />
                        </div>
                        <div className="p-6 border-t border-[#4A3B32]/5">
                            <button
                                onClick={() => setShowMobileFilters(false)}
                                className="w-full py-4 bg-[#C75D3B] text-white font-bold tracking-wide hover:bg-[#A64D31] transition-colors"
                            >
                                Ver {filteredProducts.length} peças
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Modal */}
            <ProductModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
            />
        </div>
    )
}
