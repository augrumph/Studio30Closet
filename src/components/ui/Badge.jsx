import { cn } from '@/lib/utils'

const badgeVariants = {
    default: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200",
    primary: "bg-[#C75D3B] text-white border-[#C75D3B] hover:bg-[#B84830]",
    secondary: "bg-[#FAF3F0] text-[#C75D3B] border-[#F5E6DF] hover:bg-[#F5E6DF]",
    success: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
    danger: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
    info: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
    outline: "border-2 border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50"
}

const badgeSizes = {
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-2.5 py-1 text-[10px]",
    lg: "px-3 py-1.5 text-xs"
}

export function Badge({
    children,
    variant = "default",
    size = "md",
    className,
    ...props
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center font-bold uppercase tracking-wider rounded-full border transition-colors",
                badgeVariants[variant],
                badgeSizes[size],
                className
            )}
            {...props}
        >
            {children}
        </span>
    )
}
