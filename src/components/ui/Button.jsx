import { cn } from '@/lib/utils'

const variants = {
    primary: 'bg-[#C75D3B] text-white hover:bg-[#A64D31] shadow-md hover:shadow-lg',
    secondary: 'bg-white text-[#4A3B32] border border-[#E8C4B0] hover:border-[#C75D3B] hover:bg-[#FDF0ED]',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg',
    ghost: 'text-[#4A3B32] hover:bg-[#FDF0ED]'
}

const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    ...props
}) {
    return (
        <button
            className={cn(
                'rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    )
}
