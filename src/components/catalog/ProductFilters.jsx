import { cn } from '@/lib/utils'
import { sortSizes } from '@/lib/sizes'

export function ProductFilters({
    categories,
    selectedCategory,
    onCategoryChange,
    sizes,
    selectedSizes,
    onSizeChange,
    onClearFilters,
    showOnlyAvailable,
    onAvailabilityChange,
    collections = [],
    selectedCollection,
    onCollectionChange,
    hideCategories = false,
}) {
    const hasActiveFilters = selectedCategory || selectedSizes.length > 0 || selectedCollection || showOnlyAvailable

    return (
        <div className="space-y-7">
            {/* Coleções */}
            {collections.length > 0 && (
                <div className="space-y-2" role="group" aria-labelledby="collection-filter-label">
                    <h4 id="collection-filter-label" className="text-[10px] font-black text-[#4A3B32]/35 uppercase tracking-[0.22em]">
                        Coleções
                    </h4>
                    <button
                        onClick={() => onCollectionChange?.(null)}
                        aria-pressed={!selectedCollection}
                        className={cn(
                            'block w-full text-left py-1.5 text-sm transition-colors',
                            !selectedCollection
                                ? 'text-[#C75D3B] font-semibold'
                                : 'text-[#4A3B32]/50 hover:text-[#4A3B32]'
                        )}
                    >
                        Ver todas
                    </button>
                    {collections.map((col) => {
                        const isSelected = selectedCollection === String(col.id)
                        return (
                            <button
                                key={col.id}
                                onClick={() => onCollectionChange?.(String(col.id))}
                                aria-pressed={isSelected}
                                className={cn(
                                    'block w-full text-left py-1.5 text-sm transition-colors',
                                    isSelected
                                        ? 'text-[#C75D3B] font-semibold'
                                        : 'text-[#4A3B32]/50 hover:text-[#4A3B32]'
                                )}
                            >
                                {col.title}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Categorias — ocultas quando já exibidas nos pills do topo */}
            {!hideCategories && categories && (
                <>
                    {collections.length > 0 && <div className="h-px bg-[#4A3B32]/6" />}
                    <div className="space-y-2" role="group" aria-labelledby="category-filter-label">
                        <h4 id="category-filter-label" className="text-[10px] font-black text-[#4A3B32]/35 uppercase tracking-[0.22em]">
                            Categorias
                        </h4>
                        {categories.map((cat) => {
                            const value = typeof cat === 'string' ? cat : cat.value
                            const label = typeof cat === 'string' ? cat : cat.label
                            const isSelected = selectedCategory === value || (!selectedCategory && value === 'all')
                            return (
                                <button
                                    key={value}
                                    onClick={() => onCategoryChange(value === 'all' ? null : value)}
                                    aria-pressed={isSelected}
                                    className={cn(
                                        'block w-full text-left py-1.5 text-sm transition-colors capitalize',
                                        isSelected
                                            ? 'text-[#C75D3B] font-semibold'
                                            : 'text-[#4A3B32]/50 hover:text-[#4A3B32]'
                                    )}
                                >
                                    {value === 'all' ? 'Ver todas' : label}
                                </button>
                            )
                        })}
                    </div>
                </>
            )}

            {collections.length > 0 && <div className="h-px bg-[#4A3B32]/6" />}

            {/* Tamanhos */}
            <div className="space-y-3" role="group" aria-labelledby="size-filter-label">
                <h4 id="size-filter-label" className="text-[10px] font-black text-[#4A3B32]/35 uppercase tracking-[0.22em]">
                    Tamanho
                </h4>
                <div className="flex flex-wrap gap-2">
                    {sortSizes(sizes).map((size) => {
                        const isSelected = selectedSizes.includes(size)
                        return (
                            <button
                                key={size}
                                onClick={() => onSizeChange(size)}
                                aria-pressed={isSelected}
                                className={cn(
                                    'w-10 h-10 flex items-center justify-center text-sm font-semibold rounded-lg border transition-all',
                                    isSelected
                                        ? 'bg-[#4A3B32] text-white border-[#4A3B32] shadow-sm'
                                        : 'bg-white text-[#4A3B32] border-[#4A3B32]/15 hover:border-[#4A3B32]/40'
                                )}
                            >
                                {size}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="h-px bg-[#4A3B32]/6" />

            {/* Disponibilidade */}
            <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#4A3B32]/35 uppercase tracking-[0.22em]">
                    Disponibilidade
                </h4>
                <div
                    className="flex items-center justify-between cursor-pointer group py-0.5"
                    onClick={() => onAvailabilityChange?.(!showOnlyAvailable)}
                >
                    <span className="text-sm text-[#4A3B32]/70 group-hover:text-[#4A3B32] transition-colors select-none">
                        Ocultar esgotados
                    </span>
                    <button
                        className={cn(
                            "relative w-9 h-5 rounded-full transition-colors duration-200 pointer-events-none",
                            showOnlyAvailable ? "bg-[#C75D3B]" : "bg-gray-200"
                        )}
                        role="switch"
                        aria-checked={showOnlyAvailable}
                        tabIndex="-1"
                    >
                        <span className={cn(
                            "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                            showOnlyAvailable && "translate-x-4"
                        )} />
                    </button>
                </div>
            </div>

            {/* Limpar */}
            {hasActiveFilters && (
                <>
                    <div className="h-px bg-[#4A3B32]/6" />
                    <button
                        onClick={onClearFilters}
                        className="text-sm text-[#C75D3B] hover:text-[#A64D31] transition-colors font-medium"
                    >
                        Limpar todos os filtros
                    </button>
                </>
            )}
        </div>
    )
}
