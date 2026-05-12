import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Plus, Check, ShoppingBag, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatPrice, cn } from '@/lib/utils'
import { calculateInstallment } from '@/lib/price-utils'
import { sortSizes } from '@/lib/sizes'
import { motion, AnimatePresence } from 'framer-motion'
import { getProductById } from '@/lib/api/products'
import { triggerConfetti } from '@/components/magicui/confetti'
import { trackProductView } from '@/lib/api/analytics'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'

export function ProductModal({ product: initialProduct, isOpen, onClose }) {
    const navigate = useNavigate()
    const [fullProduct, setFullProduct] = useState(initialProduct)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [selectedSize, setSelectedSize] = useState(null)
    const [isAdding, setIsAdding] = useState(false)
    const [isAdded, setIsAdded] = useState(false)
    const [imageDirection, setImageDirection] = useState(0) // -1 | 0 | 1
    const dragStartX = useRef(0)
    const { addItem, items, isLimitReached } = useMalinhaStore()

    // Sync on open/change
    useEffect(() => {
        if (isOpen && initialProduct) {
            setFullProduct(initialProduct)
            setSelectedVariantIndex(0)
            setSelectedImageIndex(0)
            setSelectedSize(null)
            setIsLoadingDetails(true)
        } else if (!isOpen) {
            setFullProduct(null)
            setIsLoadingDetails(false)
        }
    }, [isOpen, initialProduct?.id])

    const product = fullProduct || initialProduct

    const installmentValue = calculateInstallment(product?.price)

    // Load full product details
    useEffect(() => {
        if (!isOpen || !initialProduct?.id) return
        let mounted = true
        const id = initialProduct.id

        getProductById(id).then(data => {
            if (!mounted || id !== initialProduct?.id) return
            if (data) setFullProduct(data)
        }).catch(err => {
            console.error('Erro ao carregar produto:', err)
        }).finally(() => {
            if (mounted && id === initialProduct?.id) setIsLoadingDetails(false)
        })

        return () => { mounted = false }
    }, [isOpen, initialProduct?.id])

    // Analytics
    useEffect(() => {
        if (isOpen && product) trackProductView(product)
    }, [isOpen, product?.id])

    // Lock scroll
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : 'unset'
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    // Auto-select first available size
    useEffect(() => {
        if (product && isOpen && !selectedSize) {
            setSelectedSize(product.sizes?.[0] || null)
        }
    }, [product, isOpen])

    // Reset imagem e direção ao trocar variante
    useEffect(() => { setSelectedImageIndex(0); setImageDirection(0) }, [selectedVariantIndex])

    const variants = product?.variants?.length > 0
        ? product.variants
        : [{ colorName: product?.color || 'Padrão', images: product?.images || [] }]

    const rawVariant = variants[selectedVariantIndex] || {}
    const currentVariant = { ...rawVariant, images: rawVariant.images || product?.images || [] }
    const currentImages = currentVariant.images || []

    // All sizes (in + out of stock) for this variant
    const allSizesForVariant = (() => {
        const fromStock = currentVariant.sizeStock?.map(s => s.size) || []
        const fromProduct = product?.sizes || []
        const merged = [...new Set([...fromStock, ...fromProduct])].filter(Boolean)
        return sortSizes(merged)
    })()

    const isSizeInStock = (size) => {
        if (!currentVariant.sizeStock?.length) return Number(product?.stock ?? 0) > 0
        const entry = currentVariant.sizeStock.find(s =>
            (s.size || '').toLowerCase() === (size || '').toLowerCase()
        )
        return entry ? entry.quantity > 0 : false
    }

    const currentVariantHasStock = selectedSize ? isSizeInStock(selectedSize) : false
    const itemInMalinha = items.some(item => String(item.productId) === String(product?.id))

    const nextImage = useCallback(() => {
        if (!currentImages.length) return
        setImageDirection(1)
        setSelectedImageIndex(i => (i + 1) % currentImages.length)
    }, [currentImages.length])

    const prevImage = useCallback(() => {
        if (!currentImages.length) return
        setImageDirection(-1)
        setSelectedImageIndex(i => (i === 0 ? currentImages.length - 1 : i - 1))
    }, [currentImages.length])

    const gotoImage = (idx) => {
        setImageDirection(idx > selectedImageIndex ? 1 : -1)
        setSelectedImageIndex(idx)
    }

    // Slide variants — spring suave com direção
    const slideVariants = {
        enter: (dir) => ({ x: dir >= 0 ? '100%' : '-100%', opacity: 0 }),
        center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 380, damping: 36, mass: 0.75 } },
        exit: (dir) => ({ x: dir >= 0 ? '-25%' : '25%', opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } }),
    }

    const handleAddToMalinha = () => {
        if (!selectedSize || isAdding || isLimitReached() || (!isLoadingDetails && !currentVariantHasStock)) return
        setIsAdding(true)
        const productWithColor = { ...product, selectedColor: currentVariant.colorName, images: currentImages }
        setTimeout(() => {
            addItem(productWithColor, selectedSize, currentVariant.colorName)
            setIsAdding(false)
            setIsAdded(true)
            triggerConfetti({ particleCount: 120, spread: 90, origin: { y: 0.5 }, ticks: 180 })
            setTimeout(() => { setIsAdded(false); onClose() }, 1800)
        }, 300)
    }

    const handleBuyNow = () => {
        if (!selectedSize || (!isLoadingDetails && !currentVariantHasStock)) return
        const productWithColor = { ...product, selectedColor: currentVariant.colorName, images: currentImages }
        if (!itemInMalinha) addItem(productWithColor, selectedSize, currentVariant.colorName)
        onClose()
        navigate('/malinha')
    }

    if (!isOpen || !product || typeof document === 'undefined') return null

    // ── Desktop image area (mobile usa implementação própria abaixo) ───────────
    const DesktopImageArea = () => (
        <div className="relative w-full h-full">
            {/* Blur de fundo */}
            {currentImages[selectedImageIndex] && (
                <AnimatePresence mode="wait">
                    <motion.img
                        key={`blur-${selectedVariantIndex}-${selectedImageIndex}`}
                        initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                        src={getOptimizedImageUrl(currentImages[selectedImageIndex], 200)}
                        className="absolute inset-0 w-full h-full object-cover blur-3xl scale-125 pointer-events-none select-none"
                        aria-hidden="true"
                    />
                </AnimatePresence>
            )}

            {/* Imagem principal com slide direcional */}
            <AnimatePresence custom={imageDirection} mode="wait" initial={false}>
                <motion.img
                    key={`${selectedVariantIndex}-${selectedImageIndex}`}
                    custom={imageDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    src={getOptimizedImageUrl(currentImages[selectedImageIndex] || product?.images?.[0], 900)}
                    alt={`${product.name} - Imagem ${selectedImageIndex + 1}`}
                    className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-10"
                    draggable={false}
                    fetchPriority="high"
                    loading="eager"
                />
            </AnimatePresence>

            {/* Dots */}
            {currentImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 bg-black/15 backdrop-blur-md px-3 py-1.5 rounded-full">
                    {currentImages.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => gotoImage(idx)}
                            className={cn('rounded-full transition-all duration-300', idx === selectedImageIndex ? 'bg-brand-terracotta w-5 h-1.5' : 'bg-white/40 w-1.5 h-1.5 hover:bg-white/70')}
                            aria-label={`Imagem ${idx + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Setas desktop */}
            {currentImages.length > 1 && (
                <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/25 backdrop-blur-sm hover:bg-white/50 transition-all active:scale-90">
                        <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/25 backdrop-blur-sm hover:bg-white/50 transition-all active:scale-90">
                        <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                </>
            )}
        </div>
    )

    // ── Content section internals ───────────────────────────────────────────────
    const ContentArea = ({ mobile = false }) => (
        <div className={cn(
            "relative flex flex-col z-10",
            mobile ? "w-full px-5 pt-6 pb-4 flex-shrink-0" : "w-1/2 h-full overflow-y-auto scrollbar-hide px-8 py-8"
        )}>
            {/* Close — desktop */}
            {!mobile && (
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-black/15 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/30 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            )}

            {/* Name */}
            <h2 className={cn(
                "font-display text-white font-semibold leading-tight drop-shadow-sm",
                mobile ? "text-3xl sm:text-4xl mt-1 mb-4" : "text-2xl lg:text-3xl mb-5 pr-10"
            )}>
                {product.name}
            </h2>

            {/* Color selector */}
            {variants.length > 1 && (
                <div className="mb-5">
                    <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2.5">
                        Cor — <span className="text-white font-bold">{currentVariant.colorName}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {variants.map((v, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedVariantIndex(idx)}
                                className={cn(
                                    'px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all border',
                                    selectedVariantIndex === idx
                                        ? 'bg-brand-peach text-brand-brown border-brand-peach shadow-sm'
                                        : 'bg-transparent text-white/70 border-white/25 hover:border-white/60'
                                )}
                            >
                                {v.colorName}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Size selector */}
            <div className="mb-5">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2.5">
                    Tamanho {selectedSize && <span className="text-white font-bold">— {selectedSize === 'U' ? 'Único' : selectedSize}</span>}
                </p>

                {isLoadingDetails ? (
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-11 h-11 rounded-xl bg-white/10 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {allSizesForVariant.map(size => {
                            const inStock = isSizeInStock(size)
                            const isSelected = selectedSize === size
                            return (
                                <button
                                    key={size}
                                    onClick={() => inStock && setSelectedSize(size)}
                                    title={!inStock ? 'Esgotado' : undefined}
                                    className={cn(
                                        'w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold transition-all border relative',
                                        isSelected
                                            ? 'bg-brand-peach text-brand-brown border-brand-peach shadow-sm'
                                            : inStock
                                                ? 'bg-transparent text-white border-white/30 hover:border-white'
                                                : 'bg-transparent text-white/20 border-white/10 cursor-not-allowed'
                                    )}
                                >
                                    {size === 'U' ? 'UN' : size}
                                    {/* Cross-out line for out of stock */}
                                    {!inStock && (
                                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="w-full h-px bg-white/20 rotate-45 absolute" />
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}

                {selectedSize && !currentVariantHasStock && !isLoadingDetails && (
                    <p className="text-xs text-red-300 mt-2 font-medium">Este tamanho está esgotado.</p>
                )}
            </div>

            {/* Description */}
            {product.description && (
                <div className="mb-6 flex-1">
                    <p className="text-sm text-white/65 leading-relaxed">
                        {product.description}
                    </p>
                </div>
            )}

            {/* CTA bar */}
            <div className={cn(
                "mt-auto",
                mobile ? "" : "pt-5 border-t border-white/10"
            )}>
                {/* Price */}
                <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-brand-peach font-display text-2xl font-bold">
                        {formatPrice(product.price)}
                    </span>
                    <span className="text-white/50 text-sm">
                        3× {formatPrice(installmentValue)} s/ juros
                    </span>
                </div>

                {/* Add to selection */}
                <button
                    onClick={handleAddToMalinha}
                    disabled={!selectedSize || isAdding || isLimitReached() || (!isLoadingDetails && !currentVariantHasStock)}
                    className={cn(
                        'w-full py-3.5 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-md',
                        isAdded
                            ? 'bg-green-500 text-white'
                            : (!isLoadingDetails && !currentVariantHasStock && selectedSize)
                                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                : itemInMalinha
                                    ? 'bg-white/20 text-white border border-white/20'
                                    : 'bg-brand-peach hover:bg-[#FDF0ED] text-brand-brown active:scale-[0.98]',
                        (!selectedSize || isLimitReached() || (!isLoadingDetails && !currentVariantHasStock)) && !isAdded && 'opacity-60 cursor-not-allowed'
                    )}
                >
                    {isAdding ? (
                        <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-brand-brown/30 border-t-brand-brown rounded-full animate-spin" /> Adicionando...</span>
                    ) : isAdded ? (
                        <span className="flex items-center gap-2"><Check className="w-5 h-5" strokeWidth={3} /> Adicionado!</span>
                    ) : (!isLoadingDetails && !currentVariantHasStock && selectedSize) ? (
                        'Tamanho esgotado'
                    ) : itemInMalinha ? (
                        <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Já na seleção</span>
                    ) : isLimitReached() ? (
                        'Seleção cheia (20 peças)'
                    ) : (
                        <span className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Adicionar à seleção</span>
                    )}
                </button>

                {/* Comprar agora */}
                {!isAdded && selectedSize && currentVariantHasStock && (
                    <button
                        onClick={handleBuyNow}
                        className="w-full mt-2 py-3 rounded-2xl text-sm font-bold text-white/80 hover:text-white flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                    >
                        <Zap className="w-4 h-4" />
                        Comprar agora
                    </button>
                )}
            </div>
        </div>
    )

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-end md:items-center md:justify-center md:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-md"
                onClick={onClose}
            />

            {/* ── MOBILE: bottom sheet ─────────────────────────── */}
            <div
                className="relative w-full md:hidden bg-gradient-to-b from-brand-terracotta to-[#5D2E1F] rounded-t-[2rem] flex flex-col overflow-hidden animate-slide-up"
                style={{ height: '96svh' }}
            >
                {/* Handle — tap fecha */}
                <button onClick={onClose} aria-label="Fechar" className="flex-shrink-0 flex justify-center py-3">
                    <div className="w-12 h-1.5 bg-white/30 rounded-full" />
                </button>

                {/* ── SCROLL — imagem + conteúdo, tudo junto ─── */}
                <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide">

                    {/* Carrossel de imagens — dentro do scroll, aspect ratio natural */}
                    <div className="relative overflow-hidden bg-[#FDF0ED]" style={{ aspectRatio: '3/4' }}>

                        {/* Botão voltar sobreposto */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 left-4 z-30 w-11 h-11 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
                        >
                            <ChevronLeft className="w-5 h-5 -ml-0.5" />
                        </button>

                        {/* Contador de imagens */}
                        {currentImages.length > 1 && (
                            <div className="absolute top-4 right-4 z-30 bg-black/25 backdrop-blur-sm rounded-full px-2.5 py-1 text-white text-xs font-bold tabular-nums">
                                {selectedImageIndex + 1}/{currentImages.length}
                            </div>
                        )}

                        {/* Área de swipe — touchAction pan-y: scroll vertical livre, swipe horizontal capturado */}
                        <div
                            className="absolute inset-0"
                            style={{ touchAction: 'pan-y' }}
                            onTouchStart={e => { dragStartX.current = e.touches[0].clientX }}
                            onTouchEnd={e => {
                                const diff = dragStartX.current - e.changedTouches[0].clientX
                                if (Math.abs(diff) > 40) diff > 0 ? nextImage() : prevImage()
                            }}
                        >
                            <AnimatePresence custom={imageDirection} mode="wait" initial={false}>
                                <motion.img
                                    key={`${selectedVariantIndex}-${selectedImageIndex}`}
                                    custom={imageDirection}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    src={getOptimizedImageUrl(currentImages[selectedImageIndex] || product?.images?.[0], 800)}
                                    alt={product.name}
                                    className="absolute inset-0 w-full h-full object-cover select-none"
                                    draggable={false}
                                    fetchPriority="high"
                                />
                            </AnimatePresence>
                        </div>

                        {/* Gradiente inferior para transição suave com o conteúdo */}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#5D2E1F] to-transparent pointer-events-none z-10" />

                        {/* Dots indicadores */}
                        {currentImages.length > 1 && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                                {currentImages.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => gotoImage(i)}
                                        className={cn(
                                            'rounded-full transition-all duration-300',
                                            i === selectedImageIndex
                                                ? 'w-5 h-1.5 bg-white shadow-sm'
                                                : 'w-1.5 h-1.5 bg-white/35 hover:bg-white/60'
                                        )}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Conteúdo — rola naturalmente após a imagem */}
                    <div className="px-5 pt-5 pb-4 space-y-5">

                        {/* Nome */}
                        <h2 className="text-[1.875rem] font-display font-semibold text-white leading-tight">
                            {product.name}
                        </h2>

                        {/* Cor */}
                        {variants.length > 1 && (
                            <div>
                                <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">
                                    Cor — <span className="text-white">{currentVariant.colorName}</span>
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {variants.map((v, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedVariantIndex(idx)}
                                            className={cn(
                                                'min-h-[48px] px-5 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all active:scale-95',
                                                selectedVariantIndex === idx
                                                    ? 'bg-brand-peach text-brand-brown border-brand-peach'
                                                    : 'bg-white/10 text-white border-white/20 active:border-white'
                                            )}
                                        >
                                            {v.colorName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tamanho */}
                        <div>
                            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">
                                Tamanho {selectedSize && <span className="text-white">— {selectedSize === 'U' ? 'Único' : selectedSize}</span>}
                            </p>
                            {isLoadingDetails ? (
                                <div className="flex flex-wrap gap-2">
                                    {[1,2,3,4].map(i => <div key={i} className="w-16 h-16 rounded-2xl bg-white/10 animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {allSizesForVariant.map(size => {
                                        const inStock = isSizeInStock(size)
                                        const isSelected = selectedSize === size
                                        return (
                                            <button
                                                key={size}
                                                onClick={() => inStock && setSelectedSize(size)}
                                                className={cn(
                                                    'w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-black border-2 relative transition-all active:scale-90',
                                                    isSelected
                                                        ? 'bg-brand-peach text-brand-brown border-brand-peach shadow-lg scale-105'
                                                        : inStock
                                                            ? 'bg-transparent text-white border-white/30'
                                                            : 'bg-transparent text-white/20 border-white/10 cursor-not-allowed'
                                                )}
                                            >
                                                {size === 'U' ? 'UN' : size}
                                                {!inStock && (
                                                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <span className="w-full h-px bg-white/25 rotate-45 absolute" />
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {selectedSize && !currentVariantHasStock && !isLoadingDetails && (
                                <p className="text-xs text-red-300 mt-2 font-medium">Esgotado nesta opção.</p>
                            )}
                        </div>

                        {/* Descrição */}
                        {product.description && (
                            <p className="text-sm text-white/60 leading-relaxed">
                                {product.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── CTA STICKY — sempre visível, nunca rola ─── */}
                <div
                    className="flex-shrink-0 bg-[#3B1A0C]/95 backdrop-blur-2xl border-t border-white/10 px-5 pt-4"
                    style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
                >
                    {/* Preço */}
                    <div className="flex items-baseline justify-between mb-3">
                        <span className="text-brand-peach font-display text-2xl font-bold">
                            {formatPrice(product.price)}
                        </span>
                        <span className="text-white/40 text-xs">
                            3× {formatPrice(calculateInstallment(product.price))} s/juros
                        </span>
                    </div>

                    {/* Botão adicionar */}
                    <button
                        onClick={handleAddToMalinha}
                        disabled={!selectedSize || isAdding || isLimitReached() || (!isLoadingDetails && !currentVariantHasStock)}
                        className={cn(
                            'w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]',
                            isAdded
                                ? 'bg-green-500 text-white'
                                : (!isLoadingDetails && !currentVariantHasStock && selectedSize)
                                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                    : itemInMalinha
                                        ? 'bg-white/20 text-white border border-white/20'
                                        : 'bg-brand-peach text-brand-brown',
                            (!selectedSize || isLimitReached()) && !isAdded && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        {isAdding ? (
                            <><span className="w-4 h-4 border-2 border-brand-brown/30 border-t-brand-brown rounded-full animate-spin" /> Adicionando...</>
                        ) : isAdded ? (
                            <><Check className="w-5 h-5" strokeWidth={3} /> Adicionado!</>
                        ) : (!isLoadingDetails && !currentVariantHasStock && selectedSize) ? (
                            'Esgotado'
                        ) : itemInMalinha ? (
                            <><Check className="w-4 h-4" /> Já na seleção</>
                        ) : isLimitReached() ? (
                            'Seleção cheia'
                        ) : (
                            <><ShoppingBag className="w-4 h-4" /> Adicionar à seleção</>
                        )}
                    </button>

                    {/* Comprar agora */}
                    {!isAdded && selectedSize && currentVariantHasStock && (
                        <button
                            onClick={handleBuyNow}
                            className="w-full mt-2 py-3 rounded-xl text-sm font-bold text-white/65 flex items-center justify-center gap-2 active:bg-white/10 transition-colors"
                        >
                            <Zap className="w-4 h-4" /> Comprar agora
                        </button>
                    )}
                </div>
            </div>

            {/* ── DESKTOP: centered split panel ───────────────── */}
            <div className="relative hidden md:flex bg-gradient-to-b from-brand-terracotta to-[#5D2E1F] w-full max-w-4xl rounded-[2rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]" style={{ height: 'min(78vh, 680px)' }}>

                {/* Left: image + thumbnail strip */}
                <div className="relative w-1/2 h-full flex flex-col p-4 gap-3 z-10">
                    {/* Main image — mirror frame */}
                    <div className="relative flex-1 bg-[#FDF0ED] rounded-t-[10rem] rounded-b-[2rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55)] border-[3px] border-white/10">
                        <DesktopImageArea />
                    </div>

                    {/* Thumbnail strip */}
                    {currentImages.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 px-0.5">
                            {currentImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => gotoImage(idx)}
                                    className={cn(
                                        "w-12 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200",
                                        idx === selectedImageIndex
                                            ? "border-brand-peach opacity-100 shadow-md"
                                            : "border-transparent opacity-40 hover:opacity-70"
                                    )}
                                >
                                    <img src={getOptimizedImageUrl(img, 120)} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: content */}
                <ContentArea />
            </div>
        </div>,
        document.body
    )
}
