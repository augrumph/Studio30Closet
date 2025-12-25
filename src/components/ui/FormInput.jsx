import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

/**
 * FormInput - Mobile-first form input component
 * Ensures 44px minimum touch target and accessibility features
 */
export const FormInput = forwardRef(
    (
        {
            label,
            error,
            icon: Icon,
            required = false,
            className,
            containerClassName,
            ...props
        },
        ref
    ) => {
        const inputId = props.id || props.name

        return (
            <div className={cn('w-full', containerClassName)}>
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-semibold text-[#4A3B32] mb-2"
                    >
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}

                <div className="relative">
                    {Icon && (
                        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        {...props}
                        aria-required={required}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${inputId}-error` : undefined}
                        className={cn(
                            'w-full min-h-[48px] px-4 sm:px-5 py-3 sm:py-3.5 text-base rounded-lg',
                            'border-2 transition-all duration-200',
                            'focus:outline-none focus:ring-0 focus:border-[#C75D3B]',
                            'placeholder-gray-400 font-medium',
                            Icon && 'pl-12 sm:pl-14',
                            error
                                ? 'border-red-400 bg-red-50 focus:border-red-500'
                                : 'border-gray-200 bg-white hover:border-gray-300 focus:bg-white',
                            className
                        )}
                    />
                </div>

                {error && (
                    <p
                        id={`${inputId}-error`}
                        className="mt-2 text-sm font-medium text-red-600"
                    >
                        {error}
                    </p>
                )}
            </div>
        )
    }
)

FormInput.displayName = 'FormInput'
