import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { LogIn, AlertTriangle, User } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { Input, PasswordInput } from '@/components/ui/Input'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { motion, AnimatePresence } from 'framer-motion'

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

export function AdminLogin() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [remainingTime, setRemainingTime] = useState(0)

    const loginAttemptsRef = useRef(0)
    const lockoutTimeRef = useRef(null)

    const { login, isAuthenticated, loginError, clearError } = useAuthStore()
    const toast = useToast()
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

    // Check lockout status
    useEffect(() => {
        const checkLockout = () => {
            if (lockoutTimeRef.current) {
                const now = Date.now()
                const timeLeft = lockoutTimeRef.current - now

                if (timeLeft > 0) {
                    setIsLocked(true)
                    setRemainingTime(Math.ceil(timeLeft / 1000))
                } else {
                    setIsLocked(false)
                    setRemainingTime(0)
                    lockoutTimeRef.current = null
                    loginAttemptsRef.current = 0
                }
            }
        }

        checkLockout()
        const interval = setInterval(checkLockout, 1000)
        return () => clearInterval(interval)
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (isLocked) {
            toast.error(`Conta temporariamente bloqueada. Tente novamente em ${Math.floor(remainingTime / 60)}min ${remainingTime % 60}s`)
            return
        }

        setIsSubmitting(true)

        // ✅ IMPORTANTE: Aguardar resultado da função assíncrona de login
        const result = await login(username, password)

        if (result && result.success) {
            loginAttemptsRef.current = 0
            lockoutTimeRef.current = null
            toast.success('Login realizado com sucesso!')
            navigate('/admin/dashboard')
        } else {
            loginAttemptsRef.current += 1

            if (loginAttemptsRef.current >= MAX_LOGIN_ATTEMPTS) {
                lockoutTimeRef.current = Date.now() + LOCKOUT_DURATION
                setIsLocked(true)
                setRemainingTime(LOCKOUT_DURATION / 1000)
                toast.error(`Muitas tentativas falhadas. Conta bloqueada por 15 minutos.`)
            } else {
                const attemptsLeft = MAX_LOGIN_ATTEMPTS - loginAttemptsRef.current
                toast.warning(`Credenciais inválidas. ${attemptsLeft} tentativa(s) restante(s)`)
            }
        }

        setIsSubmitting(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FDF0ED] via-[#FDFBF7] to-[#FAF3F0] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute -top-40 -right-40 w-96 h-96 bg-[#C75D3B]/10 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#4A3B32]/10 rounded-full blur-3xl"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 md:p-10 relative z-10 border border-white/20"
            >
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex justify-center mb-8"
                >
                    <img
                        src="/logomarca.PNG"
                        alt="Studio 30 Closet"
                        className="h-16 object-contain"
                    />
                </motion.div>

                {/* Título */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl font-display font-bold text-[#4A3B32] mb-2">
                        Admin Login
                    </h1>
                    <p className="text-[#4A3B32]/60 font-medium">
                        Acesse o painel administrativo
                    </p>
                </motion.div>

                {/* Formulário */}
                <motion.form
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                >
                    {/* Usuário */}
                    <Input
                        label="Usuário"
                        icon={User}
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="Digite seu usuário"
                        disabled={isSubmitting || isLocked}
                        variant="filled"
                    />

                    {/* Senha */}
                    <PasswordInput
                        label="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Digite sua senha"
                        disabled={isSubmitting || isLocked}
                    />

                    {/* Erro de bloqueio */}
                    <AnimatePresence>
                        {isLocked && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="bg-amber-50 border-2 border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-sm flex items-start gap-3 shadow-sm"
                            >
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Conta temporariamente bloqueada</p>
                                    <p className="text-xs mt-1 font-medium">
                                        Muitas tentativas falhadas. Tente novamente em {Math.floor(remainingTime / 60)}min {remainingTime % 60}s
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Erro */}
                        {loginError && !isLocked && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium shadow-sm"
                            >
                                {loginError}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Botão Submit */}
                    {isSubmitting ? (
                        <button
                            type="button"
                            disabled
                            className="w-full px-8 py-4 bg-[#C75D3B]/70 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                            Entrando...
                        </button>
                    ) : (
                        <ShimmerButton
                            type="submit"
                            disabled={isLocked}
                            className="w-full px-8 py-4 rounded-2xl font-bold shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                            shimmerColor="#ffffff"
                            shimmerSize="0.15em"
                            borderRadius="16px"
                            shimmerDuration="2s"
                            background="linear-gradient(135deg, #C75D3B 0%, #A64D31 100%)"
                        >
                            <LogIn className="w-5 h-5 mr-2" />
                            Entrar no Painel
                        </ShimmerButton>
                    )}
                </motion.form>

                {/* Rodapé */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="mt-8 text-center"
                >
                    <p className="text-xs text-[#4A3B32]/40 font-medium">
                        🔒 Área restrita - Apenas administradores
                    </p>
                </motion.div>
            </motion.div>
        </div>
    )
}
