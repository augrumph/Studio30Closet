import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { CookieProvider } from './contexts/CookieContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import logger from './utils/logger'
import './index.css'

// 🔒 SECURITY: Desabilitar logs em produção para evitar vazamento de dados
if (import.meta.env.PROD) {
    console.log = () => { }
    console.warn = () => { }
    console.error = () => { }
    console.info = () => { }
    console.debug = () => { }
}

// 🗑️ CLEANUP: Forçar remoção de qualquer Service Worker antigo (cache persistente)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister()
            // logger.info só funciona se não estivermos em prod (ou se o logger usar console original salvo, mas aqui é seguro remover)
        }
    })
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ⚡ REACT QUERY: Configuração Otimizada
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos de cache (dados considerados frescos)
            gcTime: 1000 * 60 * 30,   // 30 minutos na memória (Garbage Collection)
            refetchOnWindowFocus: false, // Não recarregar ao trocar de aba (evita flash)
            retry: 1, // Tentar apenas 1 vez se falhar
        },
    },
})

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <CookieProvider>
                    <App />
                </CookieProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    </StrictMode>,
)
