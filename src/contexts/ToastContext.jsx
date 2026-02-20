import { createContext, useContext } from 'react'
import { toast as sonnerToast } from 'sonner'

/**
 * Toast Context using Sonner
 * Beautiful, accessible toast notifications
 * Docs: https://sonner.emilkowal.ski/
 */

const ToastContext = createContext(null)

// Enhanced toast API with Sonner
const toast = {
  success: (message, options = {}) => {
    return sonnerToast.success(message, {
      duration: options.duration || 4000,
      ...options
    })
  },

  error: (message, options = {}) => {
    return sonnerToast.error(message, {
      duration: options.duration || 5000,
      ...options
    })
  },

  warning: (message, options = {}) => {
    return sonnerToast.warning(message, {
      duration: options.duration || 4000,
      ...options
    })
  },

  info: (message, options = {}) => {
    return sonnerToast.info(message, {
      duration: options.duration || 4000,
      ...options
    })
  },

  // Loading state
  loading: (message, options = {}) => {
    return sonnerToast.loading(message, options)
  },

  // Promise toast - shows loading, then success/error
  promise: (promise, messages) => {
    return sonnerToast.promise(promise, messages)
  },

  // Custom toast with action button
  custom: (message, options = {}) => {
    return sonnerToast(message, options)
  },

  // Dismiss specific toast
  dismiss: (id) => {
    sonnerToast.dismiss(id)
  }
}

export function ToastProvider({ children }) {
  return (
    <ToastContext.Provider value={toast}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
