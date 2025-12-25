import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * EmptyStateCard - Mobile-first empty state with icon, title, and action
 */
export function EmptyStateCard({
    icon: Icon,
    title,
    description,
    action,
    className
}) {
    return (
        <motion.div
            className={cn(
                'flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4',
                className
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {Icon && (
                <motion.div
                    className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mb-4 sm:mb-6 rounded-full bg-gray-100 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                >
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-gray-400" />
                </motion.div>
            )}

            <h3 className="font-display text-lg sm:text-xl md:text-2xl font-semibold text-[#4A3B32] mb-2 text-center">
                {title}
            </h3>

            {description && (
                <p className="text-sm sm:text-base text-[#4A3B32]/60 text-center mb-6 max-w-sm">
                    {description}
                </p>
            )}

            {action && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {action}
                </motion.div>
            )}
        </motion.div>
    )
}
