import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  suggestedActions, // Array de ações sugeridas: [{ label, onClick, icon: IconComponent }]
  className
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("flex flex-col items-center justify-center py-16 px-4", className)}
    >
      {Icon && (
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-6 shadow-inner">
          <Icon className="w-10 h-10 text-gray-300" aria-hidden="true" />
        </div>
      )}
      <h3 className="font-display text-xl text-gray-500 mb-2 text-center">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-400 text-center max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Ação principal */}
      {action}

      {/* Ações sugeridas secundárias */}
      {suggestedActions && suggestedActions.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {suggestedActions.map((suggestedAction, index) => {
            const SuggestedIcon = suggestedAction.icon
            return (
              <button
                key={index}
                type="button"
                onClick={suggestedAction.onClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                aria-label={suggestedAction.ariaLabel || suggestedAction.label}
              >
                {SuggestedIcon && <SuggestedIcon className="w-4 h-4" aria-hidden="true" />}
                {suggestedAction.label}
              </button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
