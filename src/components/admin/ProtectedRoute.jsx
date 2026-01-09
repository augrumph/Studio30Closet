import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'

export function ProtectedRoute({ children }) {
    const { isAuthenticated, validateSession } = useAuthStore()
    const [isValidating, setIsValidating] = useState(true)

    useEffect(() => {
        const check = async () => {
            if (isAuthenticated) {
                // Timeout de segurança para não travar login
                try {
                    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000))
                    await Promise.race([validateSession(), timeoutPromise])
                } catch (error) {
                    console.warn('⚠️ Validação de sessão lenta ou falhou, prosseguindo...', error)
                }
            }
            setIsValidating(false)
        }
        check()
    }, [])

    if (isValidating) {
        // Loading state minimalista enquanto valida
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />
    }

    return children
}
