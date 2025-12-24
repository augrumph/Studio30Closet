import { cn } from '@/lib/utils'

export function ProductFilters({
    categories,
    selectedCategory,
    onCategoryChange,
    sizes,
    selectedSizes,
    onSizeChange,
    onClearFilters
}) {
    const hasActiveFilters = selectedCategory || selectedSizes.length > 0

    return (
        <div className="space-y-12">
            {/* Categorias */}
            <div className="space-y-5" role="group" aria-labelledby="category-filter-label">
                <h4 id="category-filter-label" className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-[0.2em]">
                    Categorias
                </h4>
                {categories.map((category) => {
                    const isSelected = selectedCategory === category || (!selectedCategory && category === 'all')
                    return (
                        <button
                            key={category}
                            onClick={() => onCategoryChange(category === 'all' ? null : category)}
                            aria-pressed={isSelected}
                            aria-label={`Filtrar por categoria: ${category === 'all' ? 'todas' : category}`}
                            className={cn(
                                'block w-full text-left py-2 text-sm transition-colors capitalize',
                                isSelected
                                    ? 'text-[#C75D3B] font-medium'
                                    : 'text-[#4A3B32]/60 hover:text-[#4A3B32]'
                            )}
                        >
                            {category === 'all' ? 'Ver todas' : category}
                        </button>
                    )
                })}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#4A3B32]/5" />

            {/* Tamanhos */}
            <div className="space-y-5" role="group" aria-labelledby="size-filter-label">
                <h4 id="size-filter-label" className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-[0.2em]">
                    Tamanhos
                </h4>
                <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => {
                        const isSelected = selectedSizes.includes(size)
                        return (
                            <button
                                key={size}
                                onClick={() => onSizeChange(size)}
                                aria-pressed={isSelected}
                                aria-label={`Filtrar por tamanho ${size}`}
                                className={cn(
                                    'px-4 py-2 text-sm font-medium border transition-all',
                                    isSelected
                                        ? 'bg-[#4A3B32] text-white border-[#4A3B32]'
                                        : 'bg-transparent text-[#4A3B32] border-[#4A3B32]/20 hover:border-[#4A3B32]'
                                )}
                            >
                                {size}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Limpar Filtros */}
            {hasActiveFilters && (
                <>
                    <div className="h-px bg-[#4A3B32]/5" />
                    <button
                        onClick={onClearFilters}
                        aria-label="Limpar todos os filtros aplicados"
                        className="text-sm text-[#C75D3B] hover:text-[#A64D31] transition-colors"
                    >
                        Limpar filtros
                    </button>
                </>
            )}
        </div>
    )
}
