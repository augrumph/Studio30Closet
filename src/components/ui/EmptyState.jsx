import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    actionLabel = "Adicionar",
    onAction
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 md:py-16 px-4 text-center"
        >
            {Icon && (
                <div className="w-16 h-16 md:w-20 md:h-20 mb-4 md:mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
                </div>
            )}

            <h3 className="text-lg md:text-xl font-bold text-[#4A3B32] mb-2">
                {title}
            </h3>

            {description && (
                <p className="text-sm md:text-base text-gray-500 max-w-md mb-6 md:mb-8">
                    {description}
                </p>
            )}

            {action && onAction && (
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onAction}
                    className="flex items-center gap-2 px-6 py-3 bg-[#C75D3B] text-white rounded-xl font-bold shadow-lg hover:bg-[#B84830] transition-all"
                >
                    <Plus className="w-5 h-5" />
                    {actionLabel}
                </motion.button>
            )}
        </motion.div>
    )
}
