import { memo } from 'react'

function SkeletonCardComponent() {
    return (
        <div className="flex flex-col">
            {/* Imagem — mesma proporção do ProductCard real */}
            <div className="aspect-[3/4] rounded-xl bg-gray-100 overflow-hidden relative">
                {/* Shimmer sweep */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)' }} />

                {/* Badge placeholder */}
                <div className="absolute top-2.5 left-2.5 h-5 w-20 bg-white/60 rounded-full animate-pulse" />
            </div>

            {/* Info abaixo da imagem */}
            <div className="pt-2.5 space-y-1.5">
                {/* Nome — duas linhas */}
                <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-full" />
                <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />

                {/* Preço */}
                <div className="flex items-center gap-2 pt-0.5">
                    <div className="h-4 bg-gray-100 rounded-md animate-pulse w-20" />
                    <div className="h-3 bg-gray-100 rounded-md animate-pulse w-16 opacity-60" />
                </div>
            </div>
        </div>
    )
}

export const SkeletonCard = memo(SkeletonCardComponent)
export default SkeletonCard
