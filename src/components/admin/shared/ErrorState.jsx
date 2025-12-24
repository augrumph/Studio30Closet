import { AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ErrorState({
  title = 'Erro ao carregar dados',
  description = 'Não foi possível carregar as informações. Tente novamente.',
  onRetry,
  className
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="font-display text-xl text-gray-700 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-md mb-6">
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-3 bg-[#C75D3B] text-white rounded-lg hover:bg-[#A64D31] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      )}
    </div>
  )
}
