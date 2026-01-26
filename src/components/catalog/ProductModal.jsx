import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Plus, Check, MessageCircle } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatPrice, cn } from '@/lib/utils'
import { calculateAnchorPrice, calculateInstallment } from '@/lib/price-utils'
import { sortSizes } from '@/lib/sizes'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { triggerConfetti } from '@/components/magicui/confetti'
import { trackProductView } from '@/lib/api/analytics'

export function ProductModal({ product, isOpen, onClose }) {
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [selectedSize, setSelectedSize] = useState(null)
    const [isAdding, setIsAdding] = useState(false)
    const [isAdded, setIsAdded] = useState(false)
    const [fullImages, setFullImages] = useState(null)
    const [touchStartX, setTouchStartX] = useState(0)
    const [touchEndX, setTouchEndX] = useState(0)
    const { addItem, items, isLimitReached } = useMalinhaStore()

    // 🧠 Lógica centralizada de Preço
    const anchorPrice = product?.originalPrice || calculateAnchorPrice(product?.price)
    // Sempre mostrar desconto se o anchor for maior
    const hasDiscount = anchorPrice > (product?.price || 0)
    const discountPercent = hasDiscount && anchorPrice
        ? Math.round((1 - product.price / anchorPrice) * 100)
        : 0

    // 💳 Parcelamento Psicológico
    const installmentValue = calculateInstallment(product?.price)

    // Carregar imagens completas quando modal abrir
    useEffect(() => {
        if (!isOpen || !product?.id) return

        let isMounted = true

        const loadImages = async () => {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('images')
                    .eq('id', product.id)
                    .single()

                if (!isMounted) return

                if (error) {
                    console.warn('Erro ao carregar imagens completas:', error)
                    return
                }

                if (data?.images) {
                    setFullImages(data.images)
                }
            } catch (err) {
                if (isMounted) {
                    console.warn('Erro ao carregar imagens completas:', err)
                }
            }
        }

        loadImages()

        return () => {
            isMounted = false
        }
    }, [isOpen, product?.id])

    // 📊 Analytics: Rastrear visualização de produto
    useEffect(() => {
        if (isOpen && product) {
            trackProductView(product)
        }
    }, [isOpen, product?.id])

    const variants = product?.variants || [
        { colorName: product?.color || 'Padrão', images: fullImages || product?.images || [] }
    ]

    // Ensure currentVariant always has an images array
    const rawVariant = variants[selectedVariantIndex] || {}
    const currentVariant = {
        ...rawVariant,
        images: rawVariant.images || fullImages || product?.images || []
    }

    // Safe images array for calculations
    const currentImages = currentVariant.images || []

    useEffect(() => {
        if (product) {
            // ✅ Verificação defensiva: garante que sizes existe e tem elementos
            const firstSize = product.sizes?.[0] || null
            setSelectedSize(firstSize)
            setSelectedVariantIndex(0)
            setSelectedImageIndex(0)
        }
    }, [product])

    // Resetar índice de imagem ao trocar variante
    useEffect(() => {
        setSelectedImageIndex(0)
    }, [selectedVariantIndex])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen || !product) return null

    // Helper for malinha check
    const itemInMalinha = items.some(item => item.id === product.id)

    const handleTouchStart = (e) => {
        setTouchStartX(e.targetTouches[0].clientX)
    }

    const handleTouchEnd = (e) => {
        const touchEnd = e.changedTouches[0].clientX
        handleSwipe(touchStartX, touchEnd)
    }

    const handleSwipe = (startX, endX) => {
        if (!startX || !endX) return

        const distance = startX - endX
        const isLeftSwipe = distance > 30 // Threshold reduzido para facilitar swipe mobile
        const isRightSwipe = distance < -30

        if (isLeftSwipe && currentImages.length > 0) {
            // Próxima imagem
            setSelectedImageIndex(prev =>
                prev === currentImages.length - 1 ? 0 : prev + 1
            )
        } else if (isRightSwipe && currentImages.length > 0) {
            // Imagem anterior
            setSelectedImageIndex(prev =>
                prev === 0 ? currentImages.length - 1 : prev - 1
            )
        }

        // Reset
        setTouchStartX(0)
        setTouchEndX(0)
    }

    const handleAddToMalinha = () => {
        if (!selectedSize || isLimitReached()) return

        setIsAdding(true)
        // Passamos a cor selecionada também para o checkout
        const productWithColor = {
            ...product,
            selectedColor: currentVariant.colorName,
            // Sobrescrevemos as imagens para que no checkout apareça a da cor escolhida
            images: currentImages
        }

        setTimeout(() => {
            // ✅ Passando cor explicitamente como 3º argumento para o store salvar corretamente
            addItem(productWithColor, selectedSize, currentVariant.colorName)
            setIsAdding(false)
            setIsAdded(true)
            // Trigger confetti when product is added to malinha
            triggerConfetti({ particleCount: 50, spread: 60 })
            setTimeout(() => {
                setIsAdded(false)
                onClose()
            }, 1500)
        }, 300)
    }

    // Renderizar via Portal para evitar problemas de stacking context
    if (typeof document === 'undefined') return null

    // Detectar se é mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    return createPortal(
        <div
            className={cn(
                "fixed inset-0",
                // Desktop: centralizado, Mobile: alinhado ao bottom
                isMobile ? "flex items-end" : "flex items-center justify-center p-4"
            )}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99999
            }}
        >
            {/* Backdrop - cobre TODA a tela */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                onClick={onClose}
            />

            {/* Modal - Bottom Sheet no Mobile, Centralizado no Desktop */}
            <div
                className={cn(
                    "relative bg-white shadow-2xl overflow-hidden",
                    // Mobile: bottom sheet full width, arredondado em cima
                    isMobile
                        ? "w-full max-h-[92vh] rounded-t-3xl animate-slide-up"
                        : "rounded-3xl max-w-4xl w-full max-h-[85vh]"
                )}
                style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : {}}
            >
                {/* Drag Handle - Mobile Only */}
                {isMobile && (
                    <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-20">
                        <div className="w-12 h-1 bg-gray-300 rounded-full" />
                    </div>
                )}

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm
                     text-brand-brown hover:bg-white hover:scale-110 transition-all duration-200"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-y-auto max-h-[85vh]">
                    {/* Image */}
                    <div className="relative w-full bg-[#FDFBF7] flex items-center justify-center py-4 md:py-0 md:h-full">
                        <div
                            className="w-full max-w-sm md:max-w-none h-auto md:h-full flex items-center justify-center relative group cursor-grab active:cursor-grabbing"
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={`${selectedVariantIndex} -${selectedImageIndex} `}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    src={currentImages[selectedImageIndex] || '/placeholder.png'}
                                    alt={`${product.name} - Imagem ${selectedImageIndex + 1} `}
                                    className="w-full h-auto max-h-[50vh] md:max-h-none md:h-full object-contain select-none pointer-events-none"
                                    draggable="false"
                                />
                            </AnimatePresence>

                            {/* Setas de navegação - mostrar apenas se houver múltiplas imagens */}
                            {currentVariant.images?.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSelectedImageIndex(prev =>
                                            prev === 0 ? currentImages.length - 1 : prev - 1
                                        )}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 backdrop-blur-sm text-brand-brown hover:bg-white transition-all shadow-lg z-10"
                                        aria-label="Imagem anterior"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>

                                    <button
                                        onClick={() => setSelectedImageIndex(prev =>
                                            prev === currentImages.length - 1 ? 0 : prev + 1
                                        )}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 backdrop-blur-sm text-brand-brown hover:bg-white transition-all shadow-lg z-10"
                                        aria-label="Próxima imagem"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>

                                    {/* Indicador de imagens - Maior e mais visível no mobile */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full">
                                        {currentImages.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedImageIndex(idx)}
                                                className={cn(
                                                    'rounded-full transition-all duration-200',
                                                    idx === selectedImageIndex
                                                        ? 'bg-white w-6 h-2'
                                                        : 'bg-white/50 w-2 h-2 hover:bg-white/80'
                                                )}
                                                aria-label={`Ver imagem ${idx + 1} `}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        {/* Badges */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                            {product.isNew && (
                                <span className="bg-brand-terracotta text-white text-xs font-medium px-3 py-1 rounded-full">
                                    Novo
                                </span>
                            )}
                            {hasDiscount && (
                                <span className="bg-brand-coral text-white text-xs font-medium px-3 py-1 rounded-full">
                                    -{discountPercent}%
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="p-4 sm:p-8 flex flex-col overflow-y-auto" style={{ paddingRight: 'max(2rem, calc(2rem + env(safe-area-inset-right)))' }}>
                        {/* Category */}
                        <span className="text-sm text-brand-coral uppercase tracking-wider font-medium mb-2">
                            {product.category}
                        </span>

                        {/* Name */}
                        <h2 className="font-display text-3xl font-semibold text-brand-brown mb-2">
                            {product.name}
                        </h2>

                        {/* Price Block - Optimized */}
                        <div className="mb-6 flex flex-col gap-1">
                            {hasDiscount && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-[#999] line-through">
                                        De {formatPrice(anchorPrice)}
                                    </span>
                                    <span className="text-xs font-bold text-[#E07850] bg-[#E07850]/10 px-2 py-0.5 rounded-full">
                                        -{discountPercent}% oFF
                                    </span>
                                </div>
                            )}

                            <div className="flex items-baseline gap-2">
                                <span className="font-display text-4xl font-bold text-[#E07850]">
                                    {formatPrice(product.price)}
                                </span>
                            </div>

                            <div className="flex flex-col gap-0.5">
                                {hasDiscount && (
                                    <span className="text-sm font-semibold text-[#2E7D32]">
                                        Economia de {formatPrice(anchorPrice - product.price)}
                                    </span>
                                )}
                                <span className="text-sm text-[#666]">
                                    ou 3x de {formatPrice(installmentValue)} sem juros
                                </span>
                            </div>
                        </div>

                        {/* Color Selector - Agora logo abaixo do preço */}
                        {variants.length > 0 && variants[0].colorName && (
                            <div className="mb-5">
                                <h4 className="text-sm font-medium text-brand-brown mb-2">
                                    Cor: <span className="font-bold">{currentVariant.colorName}</span>
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {variants.map((v, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedVariantIndex(idx)}
                                            className={cn(
                                                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border-2 min-h-[36px]',
                                                selectedVariantIndex === idx
                                                    ? 'border-brand-terracotta bg-brand-terracotta/5 text-brand-terracotta shadow-sm'
                                                    : 'border-brand-peach bg-white text-brand-brown/60 hover:border-brand-terracotta'
                                            )}
                                        >
                                            {v.colorName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <p className="text-brand-brown/70 leading-relaxed mb-5 text-sm sm:text-base">
                            {product.description}
                        </p>

                        {/* Size Selector */}
                        <div className="mb-8">
                            <h4 className="text-sm font-medium text-brand-brown mb-3">
                                Selecione o Tamanho
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {(() => {
                                    // 🔍 Calcular tamanhos disponíveis para a variante atual
                                    const availableSizes = currentVariant.sizeStock
                                        ?.filter(s => s.quantity > 0)
                                        ?.map(s => s.size) || [];

                                    // Se não tiver variants ou sizeStock (produtos antigos), fallback para product.sizes
                                    const sizesToShow = availableSizes.length > 0
                                        ? availableSizes
                                        : (product.sizes || []);

                                    return sortSizes(sizesToShow).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size)}
                                            className={cn(
                                                'min-w-[48px] h-12 px-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 flex items-center justify-center',
                                                selectedSize === size
                                                    ? 'border-brand-terracotta bg-brand-terracotta text-white'
                                                    : 'border-brand-peach bg-white text-brand-brown hover:border-brand-terracotta'
                                            )}
                                        >
                                            {size === 'U' ? 'TAMANHO ÚNICO' : size}
                                        </button>
                                    ));
                                })()}
                            </div>
                            {/* Mensagem se não houver tamanhos disponíveis para a cor */}
                            {(!currentVariant.sizeStock?.some(s => s.quantity > 0)) && (
                                <p className="text-sm text-red-500 mt-2 font-medium">
                                    Cor esgotada nesta opção.
                                </p>
                            )}
                        </div>

                        {/* Add Button */}
                        <div className="mt-auto pt-6">
                            <button
                                onClick={handleAddToMalinha}
                                disabled={!selectedSize || isAdding || isLimitReached()}
                                className={cn(
                                    'w-full py-4 rounded-full text-lg font-medium flex items-center justify-center gap-2 transition-all duration-300',
                                    isAdded
                                        ? 'bg-green-500 text-white animate-bounce-once'
                                        : itemInMalinha
                                            ? 'bg-brand-peach text-brand-brown'
                                            : 'btn-primary active:animate-feedback-pulse',
                                    (!selectedSize || isLimitReached()) && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                {isAdding ? (
                                    <span className="animate-pulse">Adicionando...</span>
                                ) : isAdded ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Adicionado à Malinha!
                                    </>
                                ) : itemInMalinha ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Já está na sua Malinha
                                    </>
                                ) : isLimitReached() ? (
                                    'Limite de 20 peças atingido'
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5" />
                                        Adicionar à Malinha
                                    </>
                                )}
                            </button>

                            {/* Items Count */}
                            <p className="text-center text-sm text-brand-brown/50 mt-3">
                                {items.length}/20 peças na sua malinha
                            </p>

                            {/* WhatsApp Button */}
                            <a
                                href={`https://wa.me/5541996863879?text=${encodeURIComponent(`Olá! Vi a peça ${product.name} no catálogo e gostaria de tirar uma dúvida.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 w-full py-3 rounded-full border border-[#25D366] text-[#25D366] font-medium flex items-center justify-center gap-2 hover:bg-[#25D366] hover:text-white transition-all duration-300"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Dúvidas ? Fale conosco
                            </a >
                        </div >
                    </div >
                </div >
            </div >
        </div >,
        document.body
    )
}
