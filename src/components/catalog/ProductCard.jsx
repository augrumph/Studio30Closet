import { useState } from 'react'
import { Plus, Check, Eye, ShoppingBag } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatPrice, cn } from '@/lib/utils'

export function ProductCard({ product, onQuickView }) {
    const [selectedSize, setSelectedSize] = useState(product.sizes[0])
    const [isAdding, setIsAdding] = useState(false)
    const [isAdded, setIsAdded] = useState(false)
    const [showActions, setShowActions] = useState(false)
    const { addItem, items, isLimitReached } = useMalinhaStore()

    const hasDiscount = product.originalPrice && product.originalPrice > product.price
    const discountPercent = hasDiscount
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0

    const handleAddToMalinha = (e) => {
        e.stopPropagation()
        if (isLimitReached()) return

        setIsAdding(true)
        setTimeout(() => {
            addItem(product, selectedSize)
            setIsAdding(false)
            setIsAdded(true)
            setTimeout(() => {
                setIsAdded(false)
                setShowActions(false)
            }, 1500)
        }, 300)
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

    // Fallback para a primeira imagem da primeira variante
    const displayImage = product.variants?.[0]?.images?.[0] || product.images?.[0]

    return (
        <div
            className="group cursor-pointer"
            onClick={handleCardClick}
        >
            <div className="relative aspect-[3/4] overflow-hidden bg-[#FDFBF7]">
                <img
                    src={displayImage}
                    alt={product.name}
                    width="300"
                    height="400"
                    loading="lazy"
                    decoding="async"
                    fetchpriority="low"
                    className="w-full h-full object-cover transition-all duration-700 ease-luxury"
                />

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

                {/* Actions overlay - Shows on hover (desktop) or tap (mobile) */}
                <div className={cn(
                    "absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4 bg-gradient-to-t from-black/70 via-black/40 to-transparent transition-all duration-300",
                    "md:opacity-0 md:group-hover:opacity-100 md:translate-y-2 md:group-hover:translate-y-0",
                    showActions ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 md:opacity-0"
                )}>
                    {/* Size Selector */}
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3">
                        {product.sizes.map((size) => (
                            <button
                                key={size}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedSize(size)
                                }}
                                aria-label={`Selecionar tamanho ${size}`}
                                className={cn(
                                    'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-200',
                                    selectedSize === size
                                        ? 'bg-white text-brand-brown'
                                        : 'bg-white/30 text-white hover:bg-white/50'
                                )}
                            >
                                {size}
                            </button>
                        ))}
                    </div>

                    {/* Add to Malinha Button */}
                    <button
                        onClick={handleAddToMalinha}
                        disabled={isAdding || isLimitReached() || itemInMalinha}
                        className={cn(
                            'w-full py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-1 sm:gap-2 transition-all duration-300',
                            isAdded
                                ? 'bg-green-500 text-white'
                                : itemInMalinha
                                    ? 'bg-brand-peach text-brand-brown cursor-default'
                                    : 'bg-white text-brand-brown hover:bg-brand-terracotta hover:text-white active:bg-brand-rust',
                            (isLimitReached() && !itemInMalinha) && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        {isAdding ? (
                            <span className="animate-pulse">Adicionando...</span>
                        ) : isAdded ? (
                            <>
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Adicionado!</span>
                                <span className="sm:hidden">OK!</span>
                            </>
                        ) : itemInMalinha ? (
                            <>
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Na Malinha</span>
                                <span className="sm:hidden">✓</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Adicionar</span>
                                <span className="sm:hidden">+</span>
                            </>
                        )}
                    </button>
                </div>
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
