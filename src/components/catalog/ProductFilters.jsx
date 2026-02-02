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
    // New: Collections
    collections = [],
    selectedCollection,
    onCollectionChange
}) {
    const hasActiveFilters = selectedCategory || selectedSizes.length > 0 || selectedCollection

    return (
        <div className="space-y-8">
            {/* Coleções */}
            {collections.length > 0 && (
                <div className="space-y-3" role="group" aria-labelledby="collection-filter-label">
                    <h4 id="collection-filter-label" className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-[0.2em]">
                        Coleções
                    </h4>
                    <button
                        onClick={() => onCollectionChange?.(null)}
                        aria-pressed={!selectedCollection}
                        className={cn(
                            'block w-full text-left py-2 text-sm transition-colors',
                            !selectedCollection
                                ? 'text-[#C75D3B] font-medium'
                                : 'text-[#4A3B32]/60 hover:text-[#4A3B32]'
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
                                aria-label={`Filtrar por coleção: ${col.title}`}
                                className={cn(
                                    'block w-full text-left py-2 text-sm transition-colors',
                                    isSelected
                                        ? 'text-[#C75D3B] font-medium'
                                        : 'text-[#4A3B32]/60 hover:text-[#4A3B32]'
                                )}
                            >
                                {col.title}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Divider if collections exist */}
            {collections.length > 0 && <div className="h-px bg-[#4A3B32]/5" />}

            {/* Categorias */}
            <div className="space-y-3" role="group" aria-labelledby="category-filter-label">
                <h4 id="category-filter-label" className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-[0.2em]">
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
                            aria-label={`Filtrar por categoria: ${value === 'all' ? 'todas' : label}`}
                            className={cn(
                                'block w-full text-left py-2 text-sm transition-colors capitalize',
                                isSelected
                                    ? 'text-[#C75D3B] font-medium'
                                    : 'text-[#4A3B32]/60 hover:text-[#4A3B32]'
                            )}
                        >
                            {value === 'all' ? 'Ver todas' : label}
                        </button>
                    )
                })}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#4A3B32]/5" />

            {/* Tamanhos */}
            <div className="space-y-3" role="group" aria-labelledby="size-filter-label">
                <h4 id="size-filter-label" className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-[0.2em]">
                    Tamanhos
                </h4>
                <div className="flex flex-wrap gap-2">
                    {sortSizes(sizes).map((size) => {
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

            {/* Divider */}
            <div className="h-px bg-[#4A3B32]/5" />

            {/* Disponibilidade */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-[0.2em]">
                    Disponibilidade
                </h4>
                <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-[#4A3B32]/80 group-hover:text-[#4A3B32] transition-colors">
                        Ocultar esgotados
                    </span>
                    <button
                        onClick={() => onAvailabilityChange?.(!showOnlyAvailable)}
                        className={cn(
                            "relative w-10 h-5 rounded-full transition-colors duration-200",
                            showOnlyAvailable ? "bg-[#C75D3B]" : "bg-gray-300"
                        )}
                        role="switch"
                        aria-checked={showOnlyAvailable}
                    >
                        <span
                            className={cn(
                                "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                                showOnlyAvailable && "translate-x-5"
                            )}
                        />
                    </button>
                </label>
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
