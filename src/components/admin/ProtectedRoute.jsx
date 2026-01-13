import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'

export function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuthStore()

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />
    }

    return children
}
