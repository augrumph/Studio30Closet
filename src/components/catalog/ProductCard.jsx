import { memo, useRef } from 'react'
import { Check, Eye } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatPrice, cn } from '@/lib/utils'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { getOptimizedImageUrl, generateSrcSet } from '@/lib/image-optimizer'


function ProductCardComponent({ product, onQuickView }) {
    if (!product) return null

    const swiperRef = useRef(null)
    const { items } = useMalinhaStore()

    const hasDiscount = product.originalPrice && product.originalPrice > product.price
    const discountPercent = hasDiscount
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0

    // Imagens: usa a cor selecionada se houver variantes, senão usa catálogo
    const hasVariants = product.variants && product.variants.length > 0
    const variantImages = hasVariants ? product.variants[0]?.images || [] : []
    const catalogImages = product.images || []
    const allImages = (variantImages.length > 0 ? variantImages : catalogImages).filter(Boolean)
    const totalImages = allImages.length

    const itemInMalinha = items.some(item => item.id === product.id)

    // Verificar se está esgotado (stock <= 0 ou sem variants com estoque)
    const isOutOfStock = product.stock <= 0 || (
        hasVariants && product.variants.every(v =>
            !v.sizeStock || v.sizeStock.every(s => s.quantity <= 0)
        )
    )

    return (
        <div
            className="group cursor-pointer"
            onClick={() => onQuickView?.(product)}
        >
            <div
                className="relative aspect-[3/4] overflow-hidden bg-[#FDFBF7] rounded-2xl shadow-lg transition-shadow duration-300 hover:shadow-2xl"
            >
                {/* Swiper Carousel */}
                <Swiper
                    ref={swiperRef}
                    modules={[Pagination]}
                    pagination={{
                        clickable: true,
                        dynamicBullets: true,
                        dynamicMainBullets: 1,
                    }}
                    speed={400}
                    spaceBetween={0}
                    slidesPerView={1}
                    onClick={(swiper) => {
                        // Abrir modal apenas se não estiver fazendo swipe
                        if (!swiper.isBeingDragged) {
                            onQuickView?.(product)
                        }
                    }}
                    className="w-full h-full"
                    style={{ cursor: totalImages > 1 ? 'grab' : 'pointer' }}
                >
                    {allImages.length > 0 ? (
                        allImages.map((image, idx) => (
                            image && (
                                <SwiperSlide key={idx} className="flex items-center justify-center">
                                    <img
                                        src={getOptimizedImageUrl(image, 300)}
                                        srcSet={generateSrcSet(image, [300, 600, 800])}
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                                        alt={`${product.name} - Imagem ${idx + 1}`}
                                        width="300"
                                        height="400"
                                        loading="lazy"
                                        decoding="async"
                                        fetchPriority={idx === 0 ? 'high' : 'low'}
                                        className="w-full h-full object-cover group-hover:scale-105 select-none pointer-events-none transition-transform duration-300"
                                        draggable="false"
                                    />
                                </SwiperSlide>
                            )
                        ))
                    ) : (
                        <SwiperSlide className="flex items-center justify-center bg-gray-200">
                            <div className="text-center text-gray-500">
                                <p>Sem imagem</p>
                            </div>
                        </SwiperSlide>
                    )}
                </Swiper>

                {/* Pagination customizado para aparecer por cima */}
                <style>{`
                    .swiper-pagination {
                        bottom: 16px !important;
                        z-index: 10 !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: center !important;
                        gap: 6px !important;
                    }

                    .swiper-pagination-bullet {
                        background: rgba(255, 255, 255, 0.5) !important;
                        width: 8px !important;
                        height: 8px !important;
                        margin: 0 !important;
                        border-radius: 50% !important;
                        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
                        cursor: pointer !important;
                        border: 2px solid transparent !important;
                    }

                    .swiper-pagination-bullet:hover {
                        background: rgba(255, 255, 255, 0.8) !important;
                        transform: scale(1.1) !important;
                    }

                    .swiper-pagination-bullet-active {
                        background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%) !important;
                        width: 28px !important;
                        height: 10px !important;
                        border-radius: 10px !important;
                        box-shadow: 0 4px 16px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.3) !important;
                        border: 2px solid rgba(255, 255, 255, 0.9) !important;
                    }
                `}</style>

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

                {/* Quick View Button - Desktop only hover */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onQuickView?.(product)
                    }}
                    aria-label="Visualização rápida"
                    className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-full bg-white/90 backdrop-blur-sm text-brand-brown transition-all duration-300 md:opacity-0 md:group-hover:opacity-100"
                >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Already in malinha indicator */}
                {itemInMalinha && !isOutOfStock && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-full bg-green-500 text-white">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                )}

                {/* 🚫 Overlay de Esgotado - Visual sutil e elegante */}
                {isOutOfStock && (
                    <>
                        {/* Overlay sutil sobre a imagem */}
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 pointer-events-none" />

                        {/* Badge elegante "Esgotado" */}
                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200">
                                <p className="text-[#4A3B32] font-medium text-xs sm:text-sm uppercase tracking-wide">
                                    Esgotado
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Product Info */}
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
