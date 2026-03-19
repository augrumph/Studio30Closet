import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'

export function ProtectedRoute({ children }) {
    const { isAuthenticated, validateSession } = useAuthStore()
    const [isValidating, setIsValidating] = useState(true)

    useEffect(() => {
        validateSession().finally(() => setIsValidating(false))
    }, [validateSession])

    if (isValidating) return null

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />
    }

    return children
}
