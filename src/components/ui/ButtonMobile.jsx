import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { forwardRef } from 'react'

/**
 * ButtonMobile - Mobile-first button with 48px minimum touch target
 * Includes active state scale and smooth transitions
 */
export const ButtonMobile = forwardRef(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            disabled = false,
            className,
            isLoading = false,
            ...props
        },
        ref
    ) => {
        const variants = {
            primary: 'bg-[#C75D3B] text-white hover:bg-[#A64D31] active:bg-[#8B3D26]',
            secondary:
                'bg-white text-[#C75D3B] border-2 border-[#C75D3B] hover:bg-[#FDF0ED] active:border-[#A64D31]',
            ghost: 'text-[#C75D3B] hover:bg-[#FDF0ED] active:bg-[#E8C4B0]',
            outline:
                'border-2 border-gray-200 text-[#4A3B32] hover:border-[#C75D3B] active:border-[#A64D31]'
        }

        const sizes = {
            xs: 'min-h-[40px] px-3 text-xs',
            sm: 'min-h-[44px] px-4 text-sm',
            md: 'min-h-[48px] px-6 text-base',
            lg: 'min-h-[56px] px-8 text-lg'
        }

        return (
            <motion.button
                ref={ref}
                disabled={disabled || isLoading}
                whileHover={{ scale: disabled ? 1 : 1.02 }}
                whileTap={{ scale: disabled ? 1 : 0.98 }}
                transition={{ duration: 0.15 }}
                className={cn(
                    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg',
                    'transition-all duration-200 touch-target',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <>
                        <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                        <span>Processando...</span>
                    </>
                ) : (
                    children
                )}
            </motion.button>
        )
    }
)

ButtonMobile.displayName = 'ButtonMobile'
