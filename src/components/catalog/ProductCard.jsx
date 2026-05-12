import { memo, useRef } from 'react'
import { Check, Star, ShoppingBag } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatPrice, cn } from '@/lib/utils'
import { calculateInstallment } from '@/lib/price-utils'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { getOptimizedImageUrl, generateSrcSet, getBlurPlaceholder } from '@/lib/image-optimizer'

function ProductCardComponent({ product, onQuickView, index = 0, priority = false }) {
    if (!product) return null

    const swiperRef = useRef(null)
    const { items } = useMalinhaStore()

    const installmentValue = calculateInstallment(product.price)

    const hasVariants = product.variants && product.variants.length > 0
    const allImages = (() => {
        const variantImgs = hasVariants ? product.variants[0]?.images || [] : []
        const catalogImgs = product.images || []
        return (variantImgs.length > 0 ? variantImgs : catalogImgs).filter(Boolean)
    })()
    const totalImages = allImages.length

    const itemInMalinha = items.some(item => String(item.productId) === String(product.id))

    const colorCount = hasVariants ? product.variants.filter(v => v.colorName).length : 0

    const isOutOfStock = (() => {
        const productStock = Number(product.stock ?? 0)
        if (!hasVariants) return productStock <= 0
        const hasAnyVariantStock = product.variants.some(v =>
            v.sizeStock?.some(s => Number(s.quantity || 0) > 0)
        )
        if (!hasAnyVariantStock) return productStock <= 0
        return product.variants.every(v =>
            !v.sizeStock || v.sizeStock.every(s => Number(s.quantity || 0) <= 0)
        )
    })()

    return (
        <div
            className={cn(
                "group cursor-pointer flex flex-col h-full",
                "active:scale-[0.97] transition-transform duration-100",
                isOutOfStock && "opacity-60"
            )}
            onClick={() => onQuickView?.(product)}
        >
            {/* Image */}
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#F5F0EC] shadow-sm">
                <Swiper
                    ref={swiperRef}
                    modules={[Pagination]}
                    pagination={{ clickable: true, dynamicBullets: true, dynamicMainBullets: 1 }}
                    speed={400}
                    spaceBetween={0}
                    slidesPerView={1}
                    onClick={(swiper) => {
                        if (!swiper.isBeingDragged) onQuickView?.(product)
                    }}
                    className="w-full h-full"
                    style={{ cursor: totalImages > 1 ? 'grab' : 'pointer' }}
                >
                    {allImages.length > 0 ? (
                        allImages.map((image, idx) => image && (
                            <SwiperSlide key={idx} className="flex items-center justify-center">
                                <img
                                    src={getOptimizedImageUrl(image, 400)}
                                    srcSet={generateSrcSet(image, [300, 600, 800])}
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    alt={`${product.name} - Imagem ${idx + 1}`}
                                    width="400"
                                    height="533"
                                    loading={priority && idx === 0 ? "eager" : "lazy"}
                                    decoding="async"
                                    fetchPriority={priority && idx === 0 ? 'high' : 'auto'}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04] select-none pointer-events-none"
                                    draggable="false"
                                    style={{
                                        backgroundImage: `url(${getBlurPlaceholder(image)})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                />
                            </SwiperSlide>
                        ))
                    ) : (
                        <SwiperSlide className="flex items-center justify-center">
                            <ShoppingBag className="w-12 h-12 text-[#C75D3B]/20" />
                        </SwiperSlide>
                    )}
                </Swiper>

                <style>{`
                    .swiper-pagination {
                        bottom: 12px !important;
                        z-index: 10 !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: center !important;
                        gap: 5px !important;
                    }
                    .swiper-pagination-bullet {
                        background: rgba(255,255,255,0.55) !important;
                        width: 6px !important; height: 6px !important;
                        margin: 0 !important;
                        border-radius: 50% !important;
                        transition: all 0.3s ease !important;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.18) !important;
                        cursor: pointer !important;
                    }
                    .swiper-pagination-bullet-active {
                        background: white !important;
                        width: 20px !important; height: 6px !important;
                        border-radius: 6px !important;
                        box-shadow: 0 2px 8px rgba(255,255,255,0.4) !important;
                    }
                `}</style>

                {/* Badges */}
                {product.isBestSeller && !isOutOfStock && (
                    <div className="absolute top-2 left-2 z-10">
                        <span className="inline-flex items-center gap-1 bg-[#4A3B32]/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Mais vendido
                        </span>
                    </div>
                )}

                {/* In-cart */}
                {itemInMalinha && !isOutOfStock && (
                    <div className="absolute top-2.5 right-2.5 z-20 w-8 h-8 bg-[#4A3B32] rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                        <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                )}

                {/* Out of stock */}
                {isOutOfStock && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                        <span className="bg-white/95 px-4 py-1.5 rounded-full text-[11px] font-bold text-[#4A3B32] uppercase tracking-widest shadow-sm border border-gray-200">
                            Esgotado
                        </span>
                    </div>
                )}

                {/* Desktop hover CTA — slide up from bottom */}
                {!isOutOfStock && (
                    <div className={cn(
                        "hidden md:flex absolute inset-x-0 bottom-0 z-20",
                        "items-end pb-3 px-3 pt-14",
                        "bg-gradient-to-t from-black/55 via-black/10 to-transparent",
                        "translate-y-full group-hover:translate-y-0",
                        "transition-transform duration-300 ease-out"
                    )}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onQuickView?.(product) }}
                            className="w-full py-2.5 bg-white/95 backdrop-blur-sm text-[#4A3B32] text-sm font-bold rounded-xl shadow-md hover:bg-white transition-colors"
                        >
                            {itemInMalinha ? '✓ Na seleção' : 'Ver detalhes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="pt-2.5 pb-0.5 flex-1 flex flex-col">
                <h3 className="font-medium text-[#4A3B32] leading-snug line-clamp-2 text-sm">
                    {product.name}
                </h3>

                {colorCount > 1 && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{colorCount} cores</p>
                )}

                <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-bold text-[#4A3B32] text-sm sm:text-base">
                        {formatPrice(product.price)}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                        3× {formatPrice(installmentValue)}
                    </span>
                </div>
            </div>
        </div>
    )
}

export const ProductCard = memo(ProductCardComponent)
