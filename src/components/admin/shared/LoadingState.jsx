import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingState({
  text = 'Carregando...',
  className
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      <Loader2 className="w-8 h-8 text-[#C75D3B] animate-spin mb-4" />
      <p className="text-sm text-gray-400 animate-pulse">
        {text}
      </p>
    </div>
  )
}
