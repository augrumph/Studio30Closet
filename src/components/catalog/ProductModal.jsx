import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatPrice, cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

export function ProductModal({ product, isOpen, onClose }) {
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [selectedSize, setSelectedSize] = useState(null)
    const [isAdding, setIsAdding] = useState(false)
    const [isAdded, setIsAdded] = useState(false)
    const [fullImages, setFullImages] = useState(null)
    const { addItem, items, isLimitReached } = useMalinhaStore()

    // Carregar imagens completas quando modal abrir
    useEffect(() => {
        if (isOpen && product?.id) {
            supabase
                .from('products')
                .select('images')
                .eq('id', product.id)
                .single()
                .then(({ data }) => {
                    if (data?.images) {
                        setFullImages(data.images)
                    }
                })
                .catch(err => console.warn('Erro ao carregar imagens completas:', err))
        }
    }, [isOpen, product?.id])

    const variants = product?.variants || [
        { colorName: product?.color || 'Padrão', images: fullImages || product?.images || [] }
    ]

    const currentVariant = variants[selectedVariantIndex]

    useEffect(() => {
        if (product) {
            setSelectedSize(product.sizes[0])
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

    const hasDiscount = product.originalPrice && product.originalPrice > product.price
    const itemInMalinha = items.some(item => item.id === product.id)

    const handleAddToMalinha = () => {
        if (!selectedSize || isLimitReached()) return

        setIsAdding(true)
        // Passamos a cor selecionada também para o checkout
        const productWithColor = {
            ...product,
            selectedColor: currentVariant.colorName,
            // Sobrescrevemos as imagens para que no checkout apareça a da cor escolhida
            images: currentVariant.images
        }

        setTimeout(() => {
            addItem(productWithColor, selectedSize)
            setIsAdding(false)
            setIsAdded(true)
            setTimeout(() => {
                setIsAdded(false)
                onClose()
            }, 1500)
        }, 300)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden animate-slide-up">
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
                        <div className="w-full max-w-sm md:max-w-none h-auto md:h-full flex items-center justify-center relative group">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={`${selectedVariantIndex}-${selectedImageIndex}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    src={currentVariant.images[selectedImageIndex]}
                                    alt={`${product.name} - Imagem ${selectedImageIndex + 1}`}
                                    className="w-full h-auto max-h-[50vh] md:max-h-none md:h-full object-contain"
                                />
                            </AnimatePresence>

                            {/* Setas de navegação - mostrar apenas se houver múltiplas imagens */}
                            {currentVariant.images?.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSelectedImageIndex(prev =>
                                            prev === 0 ? currentVariant.images.length - 1 : prev - 1
                                        )}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm text-brand-brown hover:bg-white transition-all opacity-0 group-hover:opacity-100 md:opacity-100 z-10"
                                        aria-label="Imagem anterior"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={() => setSelectedImageIndex(prev =>
                                            prev === currentVariant.images.length - 1 ? 0 : prev + 1
                                        )}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm text-brand-brown hover:bg-white transition-all opacity-0 group-hover:opacity-100 md:opacity-100 z-10"
                                        aria-label="Próxima imagem"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>

                                    {/* Indicador de imagens */}
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                                        {currentVariant.images.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedImageIndex(idx)}
                                                className={cn(
                                                    'w-2 h-2 rounded-full transition-all duration-200',
                                                    idx === selectedImageIndex
                                                        ? 'bg-brand-terracotta w-3'
                                                        : 'bg-white/50 hover:bg-white/80'
                                                )}
                                                aria-label={`Ver imagem ${idx + 1}`}
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
                                    -{Math.round((1 - product.price / product.originalPrice) * 100)}%
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

                        {/* Price */}
                        <div className="flex items-baseline gap-3 mb-6">
                            <span className="text-3xl font-bold text-brand-terracotta">
                                {formatPrice(product.price)}
                            </span>
                            {hasDiscount && (
                                <span className="text-lg text-brand-brown/40 line-through">
                                    {formatPrice(product.originalPrice)}
                                </span>
                            )}
                        </div>

                        {/* Description */}
                        <p className="text-brand-brown/70 leading-relaxed mb-8">
                            {product.description}
                        </p>

                        {/* Color Selector */}
                        {variants.length > 0 && variants[0].colorName && (
                            <div className="mb-8">
                                <h4 className="text-sm font-medium text-brand-brown mb-3">
                                    Cor: <span className="font-bold">{currentVariant.colorName}</span>
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                    {variants.map((v, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedVariantIndex(idx)}
                                            className={cn(
                                                'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border-2',
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

                        {/* Size Selector */}
                        <div className="mb-8">
                            <h4 className="text-sm font-medium text-brand-brown mb-3">
                                Selecione o Tamanho
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {product.sizes.map((size) => (
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
                                ))}
                            </div>
                        </div>

                        {/* Add Button */}
                        <div className="mt-auto pt-6">
                            <button
                                onClick={handleAddToMalinha}
                                disabled={!selectedSize || isAdding || isLimitReached()}
                                className={cn(
                                    'w-full py-4 rounded-full text-lg font-medium flex items-center justify-center gap-2 transition-all duration-300',
                                    isAdded
                                        ? 'bg-green-500 text-white'
                                        : itemInMalinha
                                            ? 'bg-brand-peach text-brand-brown'
                                            : 'btn-primary',
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
