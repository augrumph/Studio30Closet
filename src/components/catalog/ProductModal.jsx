import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Plus, Check, MessageCircle } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatPrice, cn } from '@/lib/utils'
import { calculateAnchorPrice, calculateInstallment } from '@/lib/price-utils'
import { sortSizes } from '@/lib/sizes'
import { motion, AnimatePresence } from 'framer-motion'
import { getProductById } from '@/lib/api/products' // ✅ Backend API
import { triggerConfetti } from '@/components/magicui/confetti'
import { trackProductView } from '@/lib/api/analytics'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'

export function ProductModal({ product: initialProduct, isOpen, onClose }) {
    const [fullProduct, setFullProduct] = useState(initialProduct)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)

    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [selectedSize, setSelectedSize] = useState(null)
    const [isAdding, setIsAdding] = useState(false)
    const [isAdded, setIsAdded] = useState(false)
    const [touchStartX, setTouchStartX] = useState(0)
    const [touchEndX, setTouchEndX] = useState(0)
    const { addItem, items, isLimitReached } = useMalinhaStore()

    // 🔄 Sync fullProduct with initialProduct on open/change
    useEffect(() => {
        if (isOpen && initialProduct) {
            // Sempre resetar para o initialProduct ao abrir/trocar
            setFullProduct(initialProduct)
            setSelectedVariantIndex(0)
            setSelectedImageIndex(0)
            setSelectedSize(null)
            setIsLoadingDetails(true)
        } else if (!isOpen) {
            // Limpar ao fechar
            setFullProduct(null)
            setIsLoadingDetails(false)
        }
    }, [isOpen, initialProduct?.id])

    // SEMPRE usar initialProduct como fallback imediato
    const product = fullProduct || initialProduct

    // 🧠 Lógica centralizada de Preço
    const anchorPrice = product?.originalPrice || calculateAnchorPrice(product?.price)
    // Sempre mostrar desconto se o anchor for maior
    const hasDiscount = anchorPrice > (product?.price || 0)
    const discountPercent = hasDiscount && anchorPrice
        ? Math.round((1 - product.price / anchorPrice) * 100)
        : 0

    // 💳 Parcelamento Psicológico
    const installmentValue = calculateInstallment(product?.price)

    // 🔄 Carregar detalhes completos do Backend ao abrir
    useEffect(() => {
        if (!isOpen || !initialProduct?.id) return

        let isMounted = true
        const currentProductId = initialProduct.id

        const loadFullDetails = async () => {
            try {
                // Busca dados completos (incluindo variants e images atualizadas)
                const data = await getProductById(currentProductId)

                // Só atualizar se ainda for o mesmo produto e o componente estiver montado
                if (!isMounted || currentProductId !== initialProduct?.id) return

                if (data) {
                    console.log('✅ Detalhes do produto carregados:', data)
                    // Sobrescrever completamente com os novos dados
                    setFullProduct(data)
                }
            } catch (err) {
                console.error('❌ Erro ao carregar detalhes do produto:', err)
            } finally {
                if (isMounted && currentProductId === initialProduct?.id) {
                    setIsLoadingDetails(false)
                }
            }
        }

        loadFullDetails()

        return () => {
            isMounted = false
        }
    }, [isOpen, initialProduct?.id])


    // 📊 Analytics: Rastrear visualização de produto
    useEffect(() => {
        if (isOpen && product) {
            trackProductView(product)
        }
    }, [isOpen, product?.id])

    // Normalizar variantes (se não tiver, cria uma padrão)
    const variants = product?.variants && product.variants.length > 0
        ? product.variants
        : [{ colorName: product?.color || 'Padrão', images: product?.images || [] }]

    // Ensure currentVariant always has an images array
    const rawVariant = variants[selectedVariantIndex] || {}
    const currentVariant = {
        ...rawVariant,
        images: rawVariant.images || product?.images || []
    }

    // Safe images array for calculations
    const currentImages = currentVariant.images || []

    useEffect(() => {
        if (product && isOpen) { // Só reseta se modal abrir ou produto mudar
            // ✅ Verificação defensiva: garante que sizes existe e tem elementos
            const firstSize = product.sizes?.[0] || null

            // Só seta se não tiver selecionado ainda (preserva seleção se só atualizar dados)
            if (!selectedSize) setSelectedSize(firstSize)
        }
    }, [product, isOpen])

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

    // Verificar se a variante+tamanho selecionados tem estoque disponível
    const currentVariantHasStock = (() => {
        if (!selectedSize) return false
        if (!currentVariant.sizeStock || currentVariant.sizeStock.length === 0) return true // Sem dados de variante, assume disponível
        const sizeEntry = currentVariant.sizeStock.find(s =>
            (s.size || '').toLowerCase().trim() === (selectedSize || '').toLowerCase().trim()
        )
        return sizeEntry ? sizeEntry.quantity > 0 : false
    })()

    const handleAddToMalinha = () => {
        if (!selectedSize || isLimitReached() || !currentVariantHasStock) return

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
            triggerConfetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.5 },
                ticks: 200
            })
            setTimeout(() => {
                setIsAdded(false)
                onClose()
            }, 2000) // Aumentado para 2s para dar tempo de ver os confetes
        }, 300)
    }

    // Renderizar via Portal para evitar problemas de stacking context
    if (typeof document === 'undefined') return null

    // Detectar se é mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    return createPortal(
        <div
            className={cn(
                "fixed inset-0 z-[99999] flex",
                // Mobile: alinhar na parte inferior, Desktop: centralizar
                isMobile ? "items-end" : "items-center justify-center p-4 md:p-8"
            )}
        >
            {/* Backdrop escuro e desfocado */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Container Principal do Modal */}
            <div
                className={cn(
                    "relative bg-gradient-to-b from-brand-terracotta to-[#5D2E1F] w-full mx-auto shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]",
                    isMobile
                        ? "h-[96vh] rounded-t-[2.5rem] animate-slide-up overflow-y-auto scrollbar-hide flex flex-col"
                        : "flex flex-row max-w-4xl h-[75vh] min-h-[550px] rounded-[2rem] overflow-hidden"
                )}
            >
                {/* Drag Handle - Mobile Only */}
                {isMobile && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/30 rounded-full z-30" />
                )}

                {/* 1. SECTION DA IMAGEM (Hero Mobile / Left Column Desktop) */}
                <div
                    className={cn(
                        "relative flex-shrink-0 cursor-grab active:cursor-grabbing",
                        // Mobile escurece/arredonda na ponta, Desktop adiciona padding para suspender o espelho
                        isMobile
                            ? "w-full h-[65vh] rounded-b-[3rem] sm:rounded-b-[4rem] overflow-hidden shadow-[0_15px_40px_-5px_rgba(0,0,0,0.4)] z-20"
                            : "w-1/2 h-full p-4 lg:p-8 z-20"
                    )}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Moldura Espelho Exclusiva do Desktop */}
                    <div className={cn(
                        "relative w-full h-full",
                        !isMobile && "bg-[#FDF0ED] rounded-t-[10rem] lg:rounded-t-[14rem] rounded-b-[2rem] lg:rounded-b-[3rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] border-[4px] border-white/10"
                    )}>
                        {/* Header Flutuante (Back + Logo) - Apenas Mobile na aba de imagem */}
                        {isMobile && (
                            <div className="absolute top-6 inset-x-6 flex justify-between items-center z-20">
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-black/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/20 transition-colors shadow-sm"
                                    aria-label="Voltar"
                                >
                                    <ChevronLeft className="w-6 h-6 -ml-0.5" />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-black/10 backdrop-blur-md p-1.5 flex items-center justify-center border border-white/10 shadow-sm overflow-hidden">
                                    <img src="/marcacompleta.webp" alt="Logo" className="w-full h-full object-contain filter brightness-0 invert opacity-90" />
                                </div>
                            </div>
                        )}

                        {/* Fundo Desfocado (Desktop) para preencher espaços de imagens super estreitas ou horizontais */}
                        {!isMobile && currentImages[selectedImageIndex] && (
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={`blur-${selectedVariantIndex}-${selectedImageIndex}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.5 }}
                                    exit={{ opacity: 0 }}
                                    src={getOptimizedImageUrl(currentImages[selectedImageIndex], 200) || '/placeholder.png'}
                                    className="absolute inset-0 w-full h-full object-cover blur-3xl scale-125 pointer-events-none select-none"
                                    aria-hidden="true"
                                />
                            </AnimatePresence>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.img
                                key={`${selectedVariantIndex}-${selectedImageIndex}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                src={getOptimizedImageUrl(currentImages[selectedImageIndex], 800) || '/placeholder.png'}
                                alt={`${product.name} - Imagem ${selectedImageIndex + 1}`}
                                className={cn(
                                    "w-full h-full select-none pointer-events-none relative z-10",
                                    isMobile ? "object-cover" : "object-cover drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
                                )}
                                draggable="false"
                                fetchPriority="high"
                                loading="eager"
                            />
                        </AnimatePresence>

                        {/* Fade da imagem reduzido para revelar a foto melhor no Mobile */}
                        {isMobile && (
                            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-terracotta to-transparent pointer-events-none" />
                        )}

                        {/* Indicadores de Imagem */}
                        {currentImages.length > 1 && (
                            <div className={cn(
                                "absolute flex gap-1.5 z-10",
                                isMobile ? "bottom-4 left-1/2 -translate-x-1/2" : "bottom-6 left-1/2 -translate-x-1/2 bg-black/10 backdrop-blur-md px-3 py-2 rounded-full"
                            )}>
                                {currentImages.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={cn(
                                            'rounded-full transition-all duration-300',
                                            idx === selectedImageIndex
                                                ? (isMobile ? 'bg-white w-6 h-1.5 shadow-sm' : 'bg-brand-terracotta w-6 h-1.5')
                                                : (isMobile ? 'bg-white/40 w-1.5 h-1.5 hover:bg-white/80' : 'bg-brand-brown/30 w-1.5 h-1.5 hover:bg-brand-terracotta')
                                        )}
                                        aria-label={`Ver imagem ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Controles laterais Desktop */}
                        {!isMobile && currentImages.length > 1 && (
                            <>
                                <button
                                    onClick={() => setSelectedImageIndex(prev => prev === 0 ? currentImages.length - 1 : prev - 1)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/50 backdrop-blur-sm text-brand-brown hover:bg-white hover:shadow-lg transition-all z-10"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setSelectedImageIndex(prev => prev === currentImages.length - 1 ? 0 : prev + 1)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/50 backdrop-blur-sm text-brand-brown hover:bg-white hover:shadow-lg transition-all z-10"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. SECTION DE CONTEÚDO E DETALHES */}
                <div
                    className={cn(
                        "relative flex flex-col z-10",
                        isMobile
                            ? "w-full px-6 pt-8 pb-6 shrink-0" // Mais padding top para respirar sob a imagem ovalada
                            : "w-1/2 h-full overflow-y-auto scrollbar-hide p-8 lg:p-10"
                    )}
                >
                    {/* Botão de Fechar Desktop Header */}
                    {!isMobile && (
                        <div className="absolute top-6 right-6 z-20">
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-black/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/20 transition-colors shadow-sm"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    )}

                    {/* Badges */}
                    {!isMobile && (
                        <div className="flex gap-2 mb-4">
                            {product.isNew && (
                                <span className="bg-brand-peach text-brand-brown text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                    Lançamento
                                </span>
                            )}
                        </div>
                    )}

                    {/* Nome do Produto */}
                    <h2 className={cn(
                        "font-display text-white font-semibold leading-[1.1] mb-6 drop-shadow-sm",
                        isMobile ? "text-4xl sm:text-5xl mt-2 line-clamp-2" : "text-3xl lg:text-4xl"
                    )}>
                        {product.name}
                    </h2>

                    {/* Seleção de Cor */}
                    {variants.length > 1 && (
                        <div className="mb-6">
                            <h4 className="text-sm font-medium text-white/80 mb-3">
                                Cor: <span className="font-bold text-white shadow-sm">{currentVariant.colorName}</span>
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {variants.map((v, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedVariantIndex(idx)}
                                        className={cn(
                                            'px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border',
                                            selectedVariantIndex === idx
                                                ? 'bg-brand-peach text-brand-brown border-brand-peach shadow-[0_0_15px_rgba(248,196,180,0.3)]'
                                                : 'bg-transparent text-white/80 border-white/30 hover:border-white'
                                        )}
                                    >
                                        {v.colorName}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seleção de Tamanho */}
                    <div className="mb-6">
                        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                            {(() => {
                                const availableSizes = currentVariant.sizeStock
                                    ?.filter(s => s.quantity > 0)
                                    ?.map(s => s.size) || [];

                                // Enquanto carrega dados completos, não usar fallback com tamanhos potencialmente esgotados
                                const sizesToShow = isLoadingDetails
                                    ? []
                                    : availableSizes.length > 0
                                        ? availableSizes
                                        : (product.sizes || []);

                                if (isLoadingDetails) {
                                    return (
                                        <div className="flex gap-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-12 h-12 rounded-2xl bg-white/10 animate-pulse" />
                                            ))}
                                        </div>
                                    );
                                }

                                return sortSizes(sizesToShow).map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={cn(
                                            'w-[3rem] h-[3rem] sm:w-[3.25rem] sm:h-[3.25rem] rounded-2xl flex items-center justify-center text-base sm:text-lg font-medium transition-all duration-300 flex-shrink-0 border',
                                            selectedSize === size
                                                ? 'bg-brand-peach text-brand-brown border-brand-peach shadow-[0_0_15px_rgba(248,196,180,0.3)]'
                                                : 'bg-transparent text-brand-peach border-brand-peach/40 hover:border-brand-peach'
                                        )}
                                    >
                                        {size === 'U' ? 'UN' : size}
                                    </button>
                                ));
                            })()}
                        </div>
                        {/* Reviews fake / Social Proof per mockup */}
                        <p className={cn(
                            "text-[11px] text-white/60 font-medium tracking-wide mt-2 uppercase",
                            isMobile ? "text-center" : "text-left"
                        )}>

                        </p>

                        {(!currentVariant.sizeStock?.some(s => s.quantity > 0)) && (
                            <p className="text-sm text-red-300 mt-2 font-medium">
                                Esgotado nesta opção.
                            </p>
                        )}
                    </div>

                    {/* Descrição */}
                    <div className="mb-8 flex-1">
                        <h3 className="text-white font-medium text-lg mb-2">Descrição</h3>
                        <p className="text-white/70 text-sm leading-relaxed tracking-wide">
                            {product.description || 'Eleve seu estilo com esta peça sofisticada desenvolvida para quem aprecia uma moda atemporal. Apresenta corte sob medida, tecido premium e detalhes sutis que exalam luxo.'}
                        </p>
                    </div>

                    {/* Bottom Action Bar Desktop (Inflow position vs Absolute on Mobile) */}
                    {!isMobile && (
                        <div className="mt-auto pt-6 border-t border-white/10">
                            <div className="bg-[#482A1B]/90 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-2.5 flex items-center shadow-lg">
                                {/* Price Area */}
                                <div className="flex-1 flex flex-col justify-center pl-5 max-w-[45%]">
                                    <>
                                        <span className="text-white/60 text-[9px] uppercase tracking-widest">Investimento</span>
                                        <span className="text-brand-peach font-display text-[1.5rem] font-bold leading-none mt-1 shadow-sm">
                                            {formatPrice(product.price)}
                                        </span>
                                    </>
                                </div>

                                {/* Add Button */}
                                <button
                                    onClick={handleAddToMalinha}
                                    disabled={!selectedSize || isAdding || isLimitReached() || (!isLoadingDetails && !currentVariantHasStock)}
                                    className={cn(
                                        'flex-1 py-3 px-5 rounded-[1.25rem] text-[15px] font-bold flex items-center justify-center transition-all duration-300 shadow-md tracking-wide',
                                        isAdded
                                            ? 'bg-green-500 text-white animate-bounce-once'
                                            : (!isLoadingDetails && !currentVariantHasStock)
                                                ? 'bg-gray-500/50 text-white/50 cursor-not-allowed'
                                                : itemInMalinha
                                                    ? 'bg-white/20 text-white backdrop-blur-md'
                                                    : 'bg-brand-peach hover:bg-[#FDF0ED] text-brand-brown active:scale-95',
                                        (!selectedSize || isLimitReached() || (!isLoadingDetails && !currentVariantHasStock)) && 'opacity-60 cursor-not-allowed active:scale-100'
                                    )}
                                >
                                    {isAdding ? 'Aguarde...' : isAdded ? 'Feito!' : (!isLoadingDetails && !currentVariantHasStock && selectedSize) ? 'Esgotado' : itemInMalinha ? 'Na Malinha' : isLimitReached() ? 'Cheia' : 'Adicionar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Action Bar MOBILE (No final do scroll) */}
                {isMobile && (
                    <div className="mt-2 mb-8 px-6 w-full flex-shrink-0 z-20">
                        <div className="bg-[#482A1B]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2.5 flex items-center shadow-lg">
                            {/* Price Area */}
                            <div className="flex-1 flex flex-col justify-center pl-4 sm:pl-6 max-w-[45%]">
                                <>
                                    <span className="text-white/70 text-[10px] uppercase tracking-widest">Investimento</span>
                                    <span className="text-brand-peach font-display text-2xl font-bold leading-none mt-0.5">
                                        {formatPrice(product.price)}
                                    </span>
                                </>
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={handleAddToMalinha}
                                disabled={!selectedSize || isAdding || isLimitReached() || (!isLoadingDetails && !currentVariantHasStock)}
                                className={cn(
                                    'flex-1 py-4 rounded-3xl text-[15px] font-bold flex items-center justify-center transition-all duration-300 shadow-md tracking-wide',
                                    isAdded
                                        ? 'bg-green-500 text-white animate-bounce-once'
                                        : (!isLoadingDetails && !currentVariantHasStock)
                                            ? 'bg-gray-500/50 text-white/50 cursor-not-allowed'
                                            : itemInMalinha
                                                ? 'bg-white/20 text-white backdrop-blur-md'
                                                : 'bg-brand-peach hover:bg-[#FDF0ED] text-brand-brown active:scale-95',
                                    (!selectedSize || isLimitReached() || (!isLoadingDetails && !currentVariantHasStock)) && 'opacity-60 cursor-not-allowed active:scale-100'
                                )}
                            >
                                {isAdding ? 'Aguarde...' : isAdded ? 'Feito!' : (!isLoadingDetails && !currentVariantHasStock && selectedSize) ? 'Esgotado' : itemInMalinha ? 'Já adicionado' : isLimitReached() ? 'Cheia' : 'Adicionar à Malinha'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

