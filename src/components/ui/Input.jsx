import { cn } from '@/lib/utils'

export function Input({
    label,
    error,
    className,
    required,
    ...props
}) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-[#4A3B32] mb-2">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                className={cn(
                    'w-full px-4 py-2.5 rounded-lg border transition-all outline-none',
                    error
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-[#E8C4B0] focus:border-[#C75D3B] focus:ring-2 focus:ring-[#C75D3B]/20',
                    className
                )}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    )
}
