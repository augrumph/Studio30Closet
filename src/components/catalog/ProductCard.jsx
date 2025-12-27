import { useState, memo } from 'react'
import { Plus, Check, Eye, Trash2 } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatPrice, cn } from '@/lib/utils'
import { triggerConfetti } from '@/components/magicui/confetti'
import { motion, AnimatePresence } from 'framer-motion'

function ProductCardComponent({ product, onQuickView }) {
    const [selectedColorIndex, setSelectedColorIndex] = useState(0)
    const [selectedSize, setSelectedSize] = useState(null)
    const [isAdding, setIsAdding] = useState(false)
    const [isAdded, setIsAdded] = useState(false)
    const [showActions, setShowActions] = useState(false)
    const [displayImageIndex, setDisplayImageIndex] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [imageDirection, setImageDirection] = useState(0) // 1 = próxima, -1 = anterior
    const { addItem, removeItem, items, isLimitReached } = useMalinhaStore()

    const hasDiscount = product.originalPrice && product.originalPrice > product.price
    const discountPercent = hasDiscount
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0

    // Obter variantes e dados da cor selecionada
    const hasVariants = product.variants && product.variants.length > 0
    const currentVariant = hasVariants ? product.variants[selectedColorIndex] : null
    const availableSizes = currentVariant?.sizeStock?.map(s => s.size) || product.sizes || []

    // Atualizar tamanho quando trocar cor
    const handleColorChange = (colorIndex) => {
        setSelectedColorIndex(colorIndex)
        setDisplayImageIndex(0) // Reset imagem ao trocar cor
        // Selecionar primeiro tamanho disponível da nova cor
        const sizes = product.variants[colorIndex]?.sizeStock?.map(s => s.size) || product.sizes || []
        setSelectedSize(sizes[0] || null)
    }

    // Lidar com drag/swipe de imagens
    const handleImageDragEnd = (event, info) => {
        const swipeDistance = info.offset.x
        const swipeVelocity = info.velocity.x

        // Se arrastou ou teve velocidade suficiente
        if (swipeDistance < -50 || swipeVelocity < -500) {
            // Próxima imagem (arrastar para esquerda)
            setImageDirection(1)
            setDisplayImageIndex(prev =>
                prev === totalImages - 1 ? 0 : prev + 1
            )
        } else if (swipeDistance > 50 || swipeVelocity > 500) {
            // Imagem anterior (arrastar para direita)
            setImageDirection(-1)
            setDisplayImageIndex(prev =>
                prev === 0 ? totalImages - 1 : prev - 1
            )
        }
    }

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
                // Passar produto com cor e tamanho selecionados
                const productWithColor = {
                    ...product,
                    selectedColor: hasVariants ? product.variants[selectedColorIndex].colorName : null,
                    images: variantImages.length > 0 ? variantImages : product.images
                }
                addItem(productWithColor, selectedSize)
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

    // Imagens: usa a cor selecionada se houver variantes, senão usa catálogo
    const variantImages = hasVariants ? product.variants[selectedColorIndex]?.images || [] : []
    const catalogImages = product.images || []
    const allImages = variantImages.length > 0 ? variantImages : catalogImages
    const displayImage = allImages[displayImageIndex] || allImages[0]
    const totalImages = allImages.length

    // Inicializar tamanho selecionado se estiver vazio
    if (selectedSize === null && availableSizes.length > 0) {
        setSelectedSize(availableSizes[0])
    }

    return (
        <div
            className="group cursor-pointer"
            onClick={handleCardClick}
        >
            <div
                className="relative aspect-[3/4] overflow-hidden bg-[#FDFBF7] rounded-2xl shadow-lg transition-shadow duration-300 hover:shadow-2xl"
            >
                <AnimatePresence mode="wait">
                    <motion.img
                        key={displayImageIndex}
                        src={displayImage}
                        alt={product.name}
                        width="300"
                        height="400"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        drag={totalImages > 1 ? 'x' : false}
                        dragElastic={0.2}
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={(event, info) => {
                            setIsDragging(false)
                            if (totalImages > 1) {
                                handleImageDragEnd(event, info)
                            }
                        }}
                        initial={{
                            opacity: 0,
                            scale: 0.95,
                            x: imageDirection > 0 ? 40 : -40
                        }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            x: 0
                        }}
                        exit={{
                            opacity: 0,
                            scale: 0.95,
                            x: imageDirection > 0 ? -40 : 40
                        }}
                        transition={{
                            duration: 0.35,
                            ease: 'easeOut'
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!isDragging) {
                                onQuickView?.(product)
                            }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 cursor-grab active:cursor-grabbing select-none"
                    />
                </AnimatePresence>

                {/* Indicador de múltiplas imagens */}
                {totalImages > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-5">
                        {Array.from({ length: Math.min(totalImages, 5) }).map((_, idx) => (
                            <motion.div
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setDisplayImageIndex(idx)
                                }}
                                animate={{
                                    width: idx === displayImageIndex ? 24 : 6,
                                    backgroundColor: idx === displayImageIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'
                                }}
                                transition={{ duration: 0.3 }}
                                className={cn(
                                    'h-1.5 rounded-full cursor-pointer'
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
                {/* Color Selector - Mobile */}
                {hasVariants && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {product.variants.map((variant, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleColorChange(idx)
                                }}
                                aria-label={`Selecionar cor ${variant.colorName}`}
                                className={cn(
                                    'px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 touch-target border-2',
                                    selectedColorIndex === idx
                                        ? 'border-brand-terracotta bg-brand-terracotta/10 text-brand-terracotta'
                                        : 'border-gray-200 bg-white text-[#4A3B32] active:bg-gray-50'
                                )}
                                type="button"
                            >
                                {variant.colorName}
                            </button>
                        ))}
                    </div>
                )}

                {/* Size Selector - Mobile */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {availableSizes.map((size) => (
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
