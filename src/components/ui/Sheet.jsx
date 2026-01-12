import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sheet({ open, onOpenChange, children }) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onOpenChange(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
                    {children}
                </>
            )}
        </AnimatePresence>
    )
}

export function SheetContent({ children, side = "bottom", className, onClose }) {
    const variants = {
        bottom: {
            initial: { y: "100%" },
            animate: { y: 0 },
            exit: { y: "100%" }
        },
        right: {
            initial: { x: "100%" },
            animate: { x: 0 },
            exit: { x: "100%" }
        },
        left: {
            initial: { x: "-100%" },
            animate: { x: 0 },
            exit: { x: "-100%" }
        }
    }

    return (
        <motion.div
            variants={variants[side]}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
                "fixed z-50 bg-white shadow-2xl",
                side === "bottom" && "inset-x-0 bottom-0 rounded-t-3xl max-h-[90vh] overflow-y-auto",
                side === "right" && "inset-y-0 right-0 w-full sm:max-w-md",
                side === "left" && "inset-y-0 left-0 w-full sm:max-w-md",
                className
            )}
        >
            {/* Drag Handle for bottom sheet */}
            {side === "bottom" && (
                <div className="sticky top-0 z-10 bg-white pt-3 pb-2 px-6 flex justify-center border-b border-gray-100">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>
            )}

            {/* Close Button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-20"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            )}

            {children}
        </motion.div>
    )
}

export function SheetHeader({ children, className }) {
    return (
        <div className={cn("mb-6", className)}>
            {children}
        </div>
    )
}

export function SheetTitle({ children, className }) {
    return (
        <h2 className={cn("text-2xl font-display font-bold text-[#4A3B32]", className)}>
            {children}
        </h2>
    )
}

export function SheetDescription({ children, className }) {
    return (
        <p className={cn("text-sm text-gray-500 mt-2", className)}>
            {children}
        </p>
    )
}

export function SheetFooter({ children, className }) {
    return (
        <div className={cn("flex gap-3 mt-6 pt-6 border-t border-gray-100", className)}>
            {children}
        </div>
    )
}
