import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'

export function ProtectedRoute({ children }) {
    const { isAuthenticated, validateSession } = useAuthStore()
    // If already authenticated from persisted state, don't block rendering
    const [isValidating, setIsValidating] = useState(!isAuthenticated)

    useEffect(() => {
        // Always validate in background to catch expired tokens
        validateSession().finally(() => setIsValidating(false))
    }, []) // Only on mount — validateSession is a stable Zustand reference

    // Block only if we have no persisted auth AND haven't validated yet
    if (isValidating && !isAuthenticated) return null

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />
    }

    return children
}
