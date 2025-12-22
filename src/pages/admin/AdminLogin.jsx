import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { LogIn } from 'lucide-react'

export function AdminLogin() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { login, isAuthenticated, loginError, clearError } = useAuthStore()
    const navigate = useNavigate()

    // Redirecionar se já estiver autenticado
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/admin/dashboard')
        }
    }, [isAuthenticated, navigate])

    // Limpar erro ao desmontar
    useEffect(() => {
        return () => clearError()
    }, [clearError])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        const result = login(username, password)

        if (result.success) {
            navigate('/admin/dashboard')
        }

        setIsSubmitting(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FDF0ED] to-[#FDFBF7] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <img
                        src="/logomarca.PNG"
                        alt="Studio 30 Closet"
                        className="h-16 object-contain"
                    />
                </div>

                {/* Título */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-display font-semibold text-[#4A3B32] mb-2">
                        Admin Login
                    </h1>
                    <p className="text-[#4A3B32]/60">
                        Acesse o painel administrativo
                    </p>
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Usuário */}
                    <div>
                        <label className="block text-sm font-medium text-[#4A3B32] mb-2">
                            Usuário
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-[#E8C4B0] focus:border-[#C75D3B] focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                            placeholder="Digite seu usuário"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Senha */}
                    <div>
                        <label className="block text-sm font-medium text-[#4A3B32] mb-2">
                            Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-[#E8C4B0] focus:border-[#C75D3B] focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                            placeholder="Digite sua senha"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Erro */}
                    {loginError && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            {loginError}
                        </div>
                    )}

                    {/* Botão Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full px-8 py-3 bg-[#C75D3B] text-white rounded-full font-medium tracking-wide hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Entrando...</span>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                Entrar
                            </>
                        )}
                    </button>
                </form>

                {/* Rodapé */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-[#4A3B32]/40">
                        🔒 Área restrita - Apenas administradores
                    </p>
                </div>
            </div>
        </div>
    )
}
