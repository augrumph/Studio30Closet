import { cn } from '@/lib/utils'

export function SkeletonCard() {
    return (
        <div className="animate-pulse">
            {/* Imagem do produto */}
            <div className="relative aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                    <div className="bg-gray-300 h-5 w-12 rounded-full" />
                    <div className="bg-gray-300 h-5 w-10 rounded-full" />
                </div>
                
                {/* Botão de visualização rápida */}
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-300" />
            </div>
            
            {/* Informações do produto */}
            <div className="pt-4 pb-2 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="flex items-center gap-3 pt-1">
                    <div className="h-5 bg-gray-200 rounded w-16" />
                    <div className="h-4 bg-gray-200 rounded w-12 opacity-60" />
                </div>
            </div>
        </div>
    )
}