import { createContext, useContext, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const TabsContext = createContext()

export function Tabs({ defaultValue, value: controlledValue, onValueChange, children, className }) {
    const [internalValue, setInternalValue] = useState(defaultValue)
    const isControlled = controlledValue !== undefined
    const value = isControlled ? controlledValue : internalValue

    const handleValueChange = (newValue) => {
        if (!isControlled) {
            setInternalValue(newValue)
        }
        onValueChange?.(newValue)
    }

    return (
        <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div className={cn('w-full', className)}>
                {children}
            </div>
        </TabsContext.Provider>
    )
}

export function TabsList({ children, className }) {
    return (
        <div
            className={cn(
                'inline-flex h-12 items-center justify-start rounded-2xl bg-gray-50 p-1.5 text-[#4A3B32] gap-1 overflow-x-auto scrollbar-hide w-full',
                className
            )}
            role="tablist"
        >
            {children}
        </div>
    )
}

export function TabsTrigger({ value, children, className }) {
    const context = useContext(TabsContext)
    const isActive = context.value === value

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => context.onValueChange(value)}
            className={cn(
                'relative inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C75D3B]/20 disabled:pointer-events-none disabled:opacity-50',
                'min-w-[100px]',
                isActive
                    ? 'text-[#4A3B32] shadow-sm'
                    : 'text-[#4A3B32]/40 hover:text-[#4A3B32]/70',
                className
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-xl shadow-md"
                    transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30
                    }}
                />
            )}
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>
        </button>
    )
}

export function TabsContent({ value, children, className }) {
    const context = useContext(TabsContext)
    const isActive = context.value === value

    if (!isActive) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn('mt-6 focus-visible:outline-none', className)}
            role="tabpanel"
        >
            {children}
        </motion.div>
    )
}
