import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { forwardRef } from 'react'

/**
 * Premium Alert Component with variants and animations
 */
export const Alert = forwardRef(({
    className,
    variant = 'info', // info | success | warning | error
    title,
    children,
    icon: CustomIcon,
    onClose,
    ...props
}, ref) => {
    const icons = {
        info: Info,
        success: CheckCircle2,
        warning: AlertTriangle,
        error: AlertCircle,
    }

    const Icon = CustomIcon || icons[variant]

    const variantStyles = {
        info: 'bg-blue-50 border-blue-200 text-blue-900',
        success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        warning: 'bg-amber-50 border-amber-200 text-amber-900',
        error: 'bg-red-50 border-red-200 text-red-900',
    }

    const iconStyles = {
        info: 'text-blue-600',
        success: 'text-emerald-600',
        warning: 'text-amber-600',
        error: 'text-red-600',
    }

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
                "relative rounded-2xl border-2 p-4 md:p-5",
                variantStyles[variant],
                className
            )}
            {...props}
        >
            <div className="flex gap-3 md:gap-4">
                <div className={cn("flex-shrink-0", iconStyles[variant])}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex-1 space-y-1">
                    {title && (
                        <h4 className="font-bold text-sm md:text-base">
                            {title}
                        </h4>
                    )}
                    {children && (
                        <div className="text-xs md:text-sm font-medium opacity-90">
                            {children}
                        </div>
                    )}
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                        aria-label="Fechar"
                    >
                        <X className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                )}
            </div>
        </motion.div>
    )
})

Alert.displayName = 'Alert'

/**
 * Animated Alert List Container
 */
export function AlertList({ children, className }) {
    return (
        <AnimatePresence mode="popLayout">
            <div className={cn("space-y-3 md:space-y-4", className)}>
                {children}
            </div>
        </AnimatePresence>
    )
}
