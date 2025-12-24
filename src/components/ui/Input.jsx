import { forwardRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'

/**
 * Premium Input Component with enhanced validation and states
 */
export const Input = forwardRef(({
    className,
    label,
    error,
    success,
    hint,
    icon: Icon,
    required,
    showValidation = true,
    variant = 'default', // default | outline | filled
    size = 'default', // sm | default | lg
    ...props
}, ref) => {
    const hasValue = props.value && props.value !== ''
    const showSuccess = showValidation && success && hasValue
    const showError = showValidation && error

    return (
        <div className="space-y-2 w-full">
            {label && (
                <label
                    htmlFor={props.id}
                    className={cn(
                        "text-xs font-bold uppercase tracking-widest pl-1 block",
                        showError ? "text-red-500" : "text-gray-400"
                    )}
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Icon className="w-5 h-5" />
                    </div>
                )}

                <input
                    ref={ref}
                    className={cn(
                        "w-full transition-all duration-200 outline-none font-medium",
                        // Size variants
                        size === 'sm' && "px-4 py-2.5 text-sm",
                        size === 'default' && "px-5 py-4 text-base",
                        size === 'lg' && "px-6 py-5 text-lg",
                        // Style variants
                        variant === 'default' && "bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20",
                        variant === 'outline' && "bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/30 focus:border-[#C75D3B]",
                        variant === 'filled' && "bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 focus:border-[#C75D3B]/30",
                        // Icon padding
                        Icon && "pl-12",
                        // Error state
                        showError && "border-red-200 focus:border-red-500 focus:ring-red-500/20",
                        // Success state
                        showSuccess && "border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20",
                        // Validation icon padding
                        (showSuccess || showError) && "pr-12",
                        className
                    )}
                    aria-invalid={showError ? 'true' : 'false'}
                    aria-required={required ? 'true' : 'false'}
                    {...props}
                />

                {/* Validation Icons */}
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </motion.div>
                    )}
                    {showError && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Error/Success/Hint Messages */}
            <AnimatePresence mode="wait">
                {showError && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-xs text-red-500 font-medium pl-1 flex items-center gap-1.5"
                    >
                        <AlertCircle className="w-3 h-3" />
                        {error}
                    </motion.p>
                )}
                {!showError && success && showSuccess && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-xs text-emerald-500 font-medium pl-1 flex items-center gap-1.5"
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        {typeof success === 'string' ? success : 'Válido'}
                    </motion.p>
                )}
                {!showError && !showSuccess && hint && (
                    <p className="text-xs text-gray-400 pl-1">
                        {hint}
                    </p>
                )}
            </AnimatePresence>
        </div>
    )
})

Input.displayName = 'Input'

/**
 * Password Input with show/hide toggle
 */
export const PasswordInput = forwardRef(({ label, hint, required, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="space-y-2 w-full">
            {label && (
                <label
                    htmlFor={props.id}
                    className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1 block"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                <input
                    ref={ref}
                    type={showPassword ? 'text' : 'password'}
                    className={cn(
                        "w-full px-5 py-4 pr-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-base font-medium transition-all",
                        className
                    )}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#C75D3B] transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                    {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                    ) : (
                        <Eye className="w-5 h-5" />
                    )}
                </button>
            </div>

            {hint && (
                <p className="text-xs text-gray-400 pl-1">
                    {hint}
                </p>
            )}
        </div>
    )
})

PasswordInput.displayName = 'PasswordInput'

/**
 * Textarea with character count
 */
export const Textarea = forwardRef(({
    className,
    label,
    error,
    hint,
    maxLength,
    showCount = true,
    required,
    rows = 4,
    ...props
}, ref) => {
    const currentLength = props.value?.length || 0

    return (
        <div className="space-y-2 w-full">
            {label && (
                <div className="flex items-center justify-between">
                    <label
                        htmlFor={props.id}
                        className={cn(
                            "text-xs font-bold uppercase tracking-widest pl-1",
                            error ? "text-red-500" : "text-gray-400"
                        )}
                    >
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {maxLength && showCount && (
                        <span className={cn(
                            "text-xs font-medium",
                            currentLength > maxLength ? "text-red-500" : "text-gray-400"
                        )}>
                            {currentLength}/{maxLength}
                        </span>
                    )}
                </div>
            )}

            <textarea
                ref={ref}
                rows={rows}
                maxLength={maxLength}
                className={cn(
                    "w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-base font-medium transition-all resize-none",
                    error && "border-red-200 focus:border-red-500 focus:ring-red-500/20",
                    className
                )}
                aria-invalid={error ? 'true' : 'false'}
                aria-required={required ? 'true' : 'false'}
                {...props}
            />

            <AnimatePresence mode="wait">
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-xs text-red-500 font-medium pl-1 flex items-center gap-1.5"
                    >
                        <AlertCircle className="w-3 h-3" />
                        {error}
                    </motion.p>
                )}
                {!error && hint && (
                    <p className="text-xs text-gray-400 pl-1">
                        {hint}
                    </p>
                )}
            </AnimatePresence>
        </div>
    )
})

Textarea.displayName = 'Textarea'

/**
 * Select dropdown with custom styling
 */
export const Select = forwardRef(({
    className,
    label,
    error,
    hint,
    required,
    children,
    ...props
}, ref) => {
    return (
        <div className="space-y-2 w-full">
            {label && (
                <label
                    htmlFor={props.id}
                    className={cn(
                        "text-xs font-bold uppercase tracking-widest pl-1 block",
                        error ? "text-red-500" : "text-gray-400"
                    )}
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <select
                ref={ref}
                className={cn(
                    "w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-base font-medium transition-all appearance-none cursor-pointer pr-12",
                    "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUgNy41TDEwIDEyLjVMMTUgNy41IiBzdHJva2U9IiM5CA4OThBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:20px] bg-[right_1rem_center] bg-no-repeat",
                    error && "border-red-200 focus:border-red-500 focus:ring-red-500/20",
                    className
                )}
                aria-invalid={error ? 'true' : 'false'}
                aria-required={required ? 'true' : 'false'}
                {...props}
            >
                {children}
            </select>

            <AnimatePresence mode="wait">
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-xs text-red-500 font-medium pl-1 flex items-center gap-1.5"
                    >
                        <AlertCircle className="w-3 h-3" />
                        {error}
                    </motion.p>
                )}
                {!error && hint && (
                    <p className="text-xs text-gray-400 pl-1">
                        {hint}
                    </p>
                )}
            </AnimatePresence>
        </div>
    )
})

Select.displayName = 'Select'
