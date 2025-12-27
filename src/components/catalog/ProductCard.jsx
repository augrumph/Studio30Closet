import { useState, memo } from 'react'
import { Plus, Check, Eye, Trash2 } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatPrice, cn } from '@/lib/utils'
import { triggerConfetti } from '@/components/magicui/confetti'

function ProductCardComponent({ product, onQuickView }) {
    const [selectedSize, setSelectedSize] = useState(product.sizes[0])
    const [isAdding, setIsAdding] = useState(false)
    const [isAdded, setIsAdded] = useState(false)
    const [showActions, setShowActions] = useState(false)
    const { addItem, removeItem, items, isLimitReached } = useMalinhaStore()

    const hasDiscount = product.originalPrice && product.originalPrice > product.price
    const discountPercent = hasDiscount
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0

    const handleAddOrRemoveFromMalinha = (e) => {
        e.stopPropagation()

        const itemInMalinha = items.some(item => item.id === product.id)

        if (itemInMalinha) {
            // Remover da mala
            const itemToRemove = items.find(item => item.id === product.id)
            if (itemToRemove) {
                removeItem(itemToRemove.itemId)
                setIsAdded(true)
                setTimeout(() => {
                    setIsAdded(false)
                }, 1500)
            }
        } else {
            // Adicionar à mala
            if (isLimitReached()) return

            setIsAdding(true)
            setTimeout(() => {
                addItem(product, selectedSize)
                setIsAdding(false)
                setIsAdded(true)
                // Trigger confetti on add
                triggerConfetti({ particleCount: 30, spread: 50 })
                setTimeout(() => {
                    setIsAdded(false)
                    setShowActions(false)
                }, 1500)
            }, 300)
        }
    }

    const handleCardClick = () => {
        // On mobile, first tap shows actions, second tap opens quickview
        if (window.innerWidth < 768) {
            if (!showActions) {
                setShowActions(true)
                return
            }
        }
        onQuickView?.(product)
    }

    const itemInMalinha = items.some(item => item.id === product.id)

    // Imagens: tenta variants, depois images do catálogo
    const variantImages = product.variants?.[0]?.images || []
    const catalogImages = product.images || []
    const displayImage = variantImages[0] || catalogImages[0]
    const totalImages = variantImages.length || catalogImages.length

    return (
        <div
            className="group cursor-pointer"
            onClick={handleCardClick}
        >
            <div
                className="relative aspect-[3/4] overflow-hidden bg-[#FDFBF7] rounded-2xl shadow-lg transition-shadow duration-300 hover:shadow-2xl"
            >
                <img
                    src={displayImage}
                    alt={product.name}
                    width="300"
                    height="400"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    onClick={(e) => {
                        e.stopPropagation()
                        onQuickView?.(product)
                    }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                />

                {/* Indicador de múltiplas imagens */}
                {totalImages > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-5">
                        {Array.from({ length: Math.min(totalImages, 5) }).map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    'w-1.5 h-1.5 rounded-full transition-all duration-300',
                                    idx === 0
                                        ? 'bg-white w-2'
                                        : 'bg-white/60 hover:bg-white/80'
                                )}
                            />
                        ))}
                        {totalImages > 5 && (
                            <span className="text-[10px] text-white/70 ml-1">+{totalImages - 5}</span>
                        )}
                    </div>
                )}

                {/* Premium Badges */}
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1.5 sm:gap-2 z-10">
                    {product.isNew && (
                        <span className="bg-gradient-to-r from-brand-terracotta to-brand-rust text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg border border-white/30 backdrop-blur-sm" style={{ letterSpacing: '0.05em' }}>
                            NOVO
                        </span>
                    )}
                    {hasDiscount && (
                        <span className="bg-gradient-to-r from-brand-coral to-brand-terracotta text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg border border-white/30 backdrop-blur-sm" style={{ letterSpacing: '0.05em' }}>
                            -{discountPercent}%
                        </span>
                    )}
                </div>

                {/* Quick View Button - Desktop only hover, mobile tap */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onQuickView?.(product)
                    }}
                    aria-label="Visualização rápida"
                    className={cn(
                        "absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-full bg-white/90 backdrop-blur-sm text-brand-brown transition-all duration-300",
                        "md:opacity-0 md:group-hover:opacity-100",
                        showActions ? "opacity-100" : "opacity-0 md:opacity-0"
                    )}
                >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Already in malinha indicator */}
                {itemInMalinha && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-full bg-green-500 text-white">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                )}

                {/* Actions overlay - Desktop ONLY: Shows on hover */}
                <div className={cn(
                    "hidden md:flex absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-black/70 via-black/40 to-transparent transition-all duration-300 flex-col gap-3",
                    "md:opacity-0 md:group-hover:opacity-100 md:translate-y-2 md:group-hover:translate-y-0"
                )}>
                    {/* Size Selector - Desktop */}
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                        {product.sizes.map((size) => (
                            <button
                                key={size}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedSize(size)
                                }}
                                aria-label={`Selecionar tamanho ${size}`}
                                className={cn(
                                    'min-w-[44px] h-[44px] rounded-full text-xs font-bold transition-all duration-200',
                                    selectedSize === size
                                        ? 'bg-white text-brand-brown ring-2 ring-white'
                                        : 'bg-white/30 text-white hover:bg-white/50 active:bg-white/60'
                                )}
                                type="button"
                            >
                                {size}
                            </button>
                        ))}
                    </div>

                    {/* Add to Malinha Button - Desktop */}
                    <button
                        onClick={handleAddOrRemoveFromMalinha}
                        disabled={isAdding || (isLimitReached() && !itemInMalinha)}
                        className={cn(
                            'w-full min-h-[48px] rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95',
                            isAdded
                                ? 'bg-green-500 text-white'
                                : itemInMalinha
                                    ? 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700'
                                    : 'bg-white text-brand-brown hover:bg-brand-terracotta hover:text-white active:bg-brand-rust'
                        )}
                        type="button"
                    >
                        {isAdding ? (
                            <span className="animate-pulse">Adicionando...</span>
                        ) : isAdded ? (
                            <>
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Concluído!</span>
                            </>
                        ) : itemInMalinha ? (
                            <>
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Remover</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Adicionar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Actions - Below image */}
            <div className="md:hidden pt-3 pb-2 space-y-2">
                {/* Size Selector - Mobile */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {product.sizes.map((size) => (
                        <button
                            key={size}
                            onClick={(e) => {
                                e.stopPropagation()
                                setSelectedSize(size)
                            }}
                            aria-label={`Selecionar tamanho ${size}`}
                            className={cn(
                                'min-w-[40px] h-[40px] rounded-full text-xs font-bold transition-all duration-200 touch-target',
                                selectedSize === size
                                    ? 'bg-brand-terracotta text-white ring-2 ring-brand-terracotta'
                                    : 'bg-gray-100 text-[#4A3B32] active:bg-gray-200'
                            )}
                            type="button"
                        >
                            {size}
                        </button>
                    ))}
                </div>

                {/* Add to Malinha Button - Mobile */}
                <button
                    onClick={handleAddOrRemoveFromMalinha}
                    disabled={isAdding || (isLimitReached() && !itemInMalinha)}
                    className={cn(
                        'w-full min-h-[44px] rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 touch-target active:scale-95',
                        isAdded
                            ? 'bg-green-500 text-white'
                            : itemInMalinha
                                ? 'bg-red-500 text-white active:bg-red-600'
                                : 'bg-brand-terracotta text-white active:bg-brand-rust',
                        (isLimitReached() && !itemInMalinha) && 'opacity-50 cursor-not-allowed'
                    )}
                    type="button"
                >
                    {isAdding ? (
                        <span className="animate-pulse">Adicionando...</span>
                    ) : isAdded ? (
                        <>
                            <Check className="w-4 h-4" />
                            <span>Pronto!</span>
                        </>
                    ) : itemInMalinha ? (
                        <>
                            <Trash2 className="w-4 h-4" />
                            <span>Remover</span>
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" />
                            <span>Adicionar</span>
                        </>
                    )}
                </button>
            </div>

            {/* Info - Alinhado e Clean */}
            <div className="pt-4 pb-2">
                <h3 className="text-[10px] font-bold text-[#4A3B32]/60 uppercase tracking-[0.2em] mb-1">
                    {product.brand || 'Studio 30'}
                </h3>
                <h3 className="font-display text-lg text-[#4A3B32] mb-2 px-0 line-clamp-1">
                    {product.name}
                </h3>
                <div className="flex items-center gap-3">
                    <span className="text-xl font-light text-[#C75D3B]">
                        {formatPrice(product.price)}
                    </span>
                    {hasDiscount && (
                        <span className="text-xs text-[#4A3B32]/60 line-through mt-1">
                            {formatPrice(product.originalPrice)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export const ProductCard = memo(ProductCardComponent)
