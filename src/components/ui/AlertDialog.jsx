import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AlertDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "danger" // danger, warning, info
}) {
    if (!isOpen) return null

    const variants = {
        danger: {
            icon: AlertTriangle,
            iconClass: "text-red-500 bg-red-50",
            buttonClass: "bg-red-500 hover:bg-red-600 text-white shadow-red-200"
        },
        warning: {
            icon: AlertTriangle,
            iconClass: "text-amber-500 bg-amber-50",
            buttonClass: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
        },
        info: {
            icon: AlertTriangle,
            iconClass: "text-[#C75D3B] bg-[#FDF0ED]",
            buttonClass: "bg-[#C75D3B] hover:bg-[#A64D31] text-white shadow-[#C75D3B]/20"
        }
    }

    const { icon: Icon, iconClass, buttonClass } = variants[variant] || variants.info

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
                    >
                        <div className="p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div className={cn("p-4 rounded-2xl", iconClass)}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-2xl font-display font-bold text-[#4A3B32] tracking-tight">
                                    {title}
                                </h3>
                                <p className="text-gray-500 leading-relaxed font-medium">
                                    {description}
                                </p>
                            </div>

                            <div className="mt-10 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-[#4A3B32] border border-gray-100 hover:bg-gray-50 transition-all active:scale-95"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm()
                                        onClose()
                                    }}
                                    className={cn(
                                        "flex-1 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95",
                                        buttonClass
                                    )}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
