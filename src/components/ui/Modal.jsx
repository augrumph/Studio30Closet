import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    if (!isOpen) return null

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl'
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className={cn(
                        'relative bg-white rounded-xl shadow-xl w-full',
                        sizes[size]
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-display font-semibold text-[#4A3B32]">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-[#4A3B32]/40 hover:text-[#4A3B32] hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}

Modal.Body = function ModalBody({ children, className }) {
    return <div className={cn('space-y-4', className)}>{children}</div>
}

Modal.Footer = function ModalFooter({ children, className }) {
    return (
        <div className={cn('flex items-center justify-end gap-3 pt-4 border-t border-gray-200', className)}>
            {children}
        </div>
    )
}
