import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Error Boundary - Captura erros de JavaScript e mostra UI amigável
 * Em vez de tela branca, mostra mensagem de erro com opções de recuperação
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null
        }
    }

    static getDerivedStateFromError(error) {
        // Gera ID único para o erro para facilitar debug
        const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`
        return { hasError: true, errorId }
    }

    componentDidCatch(error, errorInfo) {
        // Log detalhado do erro
        const errorData = {
            id: this.state.errorId,
            timestamp: new Date().toISOString(),
            message: error?.message || 'Erro desconhecido',
            stack: error?.stack,
            componentStack: errorInfo?.componentStack,
            url: window.location.href,
            userAgent: navigator.userAgent
        }

        // Salvar no localStorage para debug posterior
        try {
            const errors = JSON.parse(localStorage.getItem('studio30_errors') || '[]')
            errors.unshift(errorData)
            // Manter apenas os últimos 10 erros
            localStorage.setItem('studio30_errors', JSON.stringify(errors.slice(0, 10)))
        } catch (e) {
            console.error('Erro ao salvar log:', e)
        }

        // Console log com estilo
        console.group(`🚨 Erro Capturado [${this.state.errorId}]`)
        console.error('Mensagem:', error?.message)
        console.error('Stack:', error?.stack)
        console.error('Component Stack:', errorInfo?.componentStack)
        console.groupEnd()

        this.setState({ error, errorInfo })
    }

    handleReload = () => {
        window.location.reload()
    }

    handleGoHome = () => {
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-b from-[#FDF8F5] to-white flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                        {/* Icon */}
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-display text-[#4A3B32] mb-3">
                            Ops! Algo deu errado
                        </h1>

                        {/* Description */}
                        <p className="text-[#4A3B32]/70 mb-6">
                            Encontramos um problema inesperado. Não se preocupe, suas informações estão seguras.
                        </p>

                        {/* Error ID for support */}
                        <div className="bg-gray-100 rounded-lg px-4 py-2 mb-6 inline-block">
                            <span className="text-xs text-gray-500">Código: </span>
                            <span className="text-sm font-mono text-gray-700">{this.state.errorId}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#C75D3B] text-white font-medium rounded-lg hover:bg-[#A64D31] transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Tentar Novamente
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Início
                            </button>
                        </div>

                        {/* Dev mode: show error details */}
                        {import.meta.env.DEV && this.state.error && (
                            <details className="mt-8 text-left">
                                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                    Detalhes técnicos (dev)
                                </summary>
                                <div className="mt-3 p-4 bg-gray-900 rounded-lg overflow-x-auto">
                                    <pre className="text-xs text-red-400 whitespace-pre-wrap">
                                        {this.state.error.toString()}
                                        {'\n\n'}
                                        {this.state.errorInfo?.componentStack}
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
