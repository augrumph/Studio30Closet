import { memo } from 'react'

export function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 skeleton-bounce">
            {/* Imagem do produto com shimmer */}
            <div className="relative aspect-[3/4] skeleton-shimmer rounded-t-2xl overflow-hidden">
                {/* Badges - com stagger animation */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                    <div className="skeleton-pulse h-5 w-12 rounded-full" style={{ animationDelay: '0.1s' }} />
                    <div className="skeleton-pulse h-5 w-10 rounded-full" style={{ animationDelay: '0.2s' }} />
                </div>

                {/* Botão de visualização rápida */}
                <div className="absolute top-3 right-3 w-9 h-9 rounded-full skeleton-pulse" style={{ animationDelay: '0.15s' }} />
            </div>

            {/* Informações do produto */}
            <div className="p-4 space-y-3">
                {/* Categoria */}
                <div className="skeleton-pulse h-3 w-1/3 rounded" style={{ animationDelay: '0.3s' }} />

                {/* Nome do produto */}
                <div className="space-y-1.5">
                    <div className="skeleton-pulse h-4 w-full rounded" style={{ animationDelay: '0.35s' }} />
                    <div className="skeleton-pulse h-4 w-4/5 rounded" style={{ animationDelay: '0.4s' }} />
                </div>

                {/* Preço e preço original */}
                <div className="flex items-center gap-2 pt-1.5">
                    <div className="skeleton-pulse h-5 w-20 rounded" style={{ animationDelay: '0.45s' }} />
                    <div className="skeleton-pulse h-4 w-16 rounded opacity-60" style={{ animationDelay: '0.5s' }} />
                </div>
            </div>
        </div>
    )
}

export default memo(SkeletonCard)