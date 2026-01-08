import React from 'react'
import { RefreshCw, Home, Frown } from 'lucide-react'

/**
 * Error Boundary - Captura erros de JavaScript e mostra UI amigável
 * 
 * Comportamento:
 * 1. Primeiro erro: Tenta refresh automático
 * 2. Se o erro persistir: Mostra página amigável com opção de refresh manual
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null,
            hasTriedAutoRefresh: false
        }
    }

    static getDerivedStateFromError(error) {
        const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`
        return { hasError: true, errorId }
    }

    componentDidCatch(error, errorInfo) {
        // Verificar se já tentou auto-refresh
        const refreshKey = 'studio30_auto_refresh_attempted'
        const lastRefreshTime = sessionStorage.getItem(refreshKey)
        const now = Date.now()

        // Se nunca tentou ou faz mais de 30 segundos, tenta auto-refresh
        if (!lastRefreshTime || (now - parseInt(lastRefreshTime)) > 30000) {
            // Marcar que tentou refresh
            sessionStorage.setItem(refreshKey, now.toString())

            // Log do erro antes do refresh
            console.error('🔄 Erro detectado. Tentando refresh automático...', error?.message)

            // Aguardar um momento e fazer refresh
            setTimeout(() => {
                window.location.reload()
            }, 500)

            return
        }

        // Se já tentou refresh recentemente, mostrar página de erro
        this.setState({
            error,
            errorInfo,
            hasTriedAutoRefresh: true
        })

        // Limpar a flag após 30 segundos para permitir nova tentativa futura
        setTimeout(() => {
            sessionStorage.removeItem(refreshKey)
        }, 30000)

        // Log do erro
        const errorData = {
            id: this.state.errorId,
            timestamp: new Date().toISOString(),
            message: error?.message || 'Erro desconhecido',
            url: window.location.href
        }

        console.group(`🚨 Erro Capturado [${this.state.errorId}]`)
        console.error('Mensagem:', error?.message)
        console.error('Stack:', error?.stack)
        console.groupEnd()

        // Salvar no localStorage para debug
        try {
            const errors = JSON.parse(localStorage.getItem('studio30_errors') || '[]')
            errors.unshift(errorData)
            localStorage.setItem('studio30_errors', JSON.stringify(errors.slice(0, 10)))
        } catch (e) {
            // Silently fail
        }
    }

    handleReload = () => {
        // Limpar flag para permitir nova tentativa de auto-refresh
        sessionStorage.removeItem('studio30_auto_refresh_attempted')
        window.location.reload()
    }

    handleGoHome = () => {
        sessionStorage.removeItem('studio30_auto_refresh_attempted')
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError && this.state.hasTriedAutoRefresh) {
            return (
                <div className="min-h-screen bg-gradient-to-b from-[#FDF8F5] to-white flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center">
                        {/* Ilustração amigável */}
                        <div className="mb-8">
                            <div className="relative inline-block">
                                {/* Círculo de fundo */}
                                <div className="w-32 h-32 mx-auto rounded-full bg-[#FDF0ED] flex items-center justify-center">
                                    {/* Emoji/Icon triste mas fofo */}
                                    <div className="text-6xl">😅</div>
                                </div>
                                {/* Decoração */}
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#E8C4B0] rounded-full animate-pulse" />
                                <div className="absolute -bottom-1 -left-3 w-5 h-5 bg-[#C75D3B]/30 rounded-full" />
                            </div>
                        </div>

                        {/* Título amigável */}
                        <h1 className="text-2xl sm:text-3xl font-display text-[#4A3B32] mb-4">
                            Opa! Tivemos um probleminha
                        </h1>

                        {/* Descrição simples e acolhedora */}
                        <p className="text-base sm:text-lg text-[#4A3B32]/70 mb-8 leading-relaxed">
                            Algo inesperado aconteceu, mas não se preocupe!
                            <br className="hidden sm:block" />
                            Basta atualizar a página para continuar.
                        </p>

                        {/* Botão principal de refresh */}
                        <button
                            onClick={this.handleReload}
                            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#C75D3B] text-white font-semibold text-lg rounded-full hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20 hover:shadow-xl hover:scale-105 active:scale-95 min-h-[56px]"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Atualizar Página
                        </button>

                        {/* Link secundário para home */}
                        <div className="mt-6">
                            <button
                                onClick={this.handleGoHome}
                                className="inline-flex items-center gap-2 text-[#4A3B32]/60 hover:text-[#C75D3B] transition-colors text-sm font-medium"
                            >
                                <Home className="w-4 h-4" />
                                Ou voltar para o início
                            </button>
                        </div>

                        {/* Mensagem de suporte (sutil) */}
                        <p className="mt-10 text-xs text-[#4A3B32]/40">
                            Se o problema persistir, entre em contato pelo WhatsApp
                        </p>

                        {/* Dev mode: show error details */}
                        {import.meta.env.DEV && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                                    Detalhes técnicos (dev only)
                                </summary>
                                <div className="mt-2 p-3 bg-gray-900 rounded-lg overflow-x-auto">
                                    <pre className="text-xs text-red-400 whitespace-pre-wrap">
                                        {this.state.error.toString()}
                                    </pre>
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

// Hook para ver erros salvos (útil para debug)
export function getStoredErrors() {
    try {
        return JSON.parse(localStorage.getItem('studio30_errors') || '[]')
    } catch {
        return []
    }
}

// Limpar erros salvos
export function clearStoredErrors() {
    localStorage.removeItem('studio30_errors')
}

export { ErrorBoundary }
