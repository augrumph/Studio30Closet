import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import { CookieProvider } from './contexts/CookieContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from 'sonner'
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


// ⚡ PREFETCH IMEDIATO: Carregar produtos em destaque ANTES de renderizar
// Usa query otimizada do Supabase (apenas 4 produtos, campos mínimos)
import { getFeaturedProducts } from './lib/api/products'

const prefetchHeroImages = async () => {
    try {
        const featured = await getFeaturedProducts()
        // Preload das imagens com prioridade máxima
        featured.forEach(product => {
            const imgUrl = product.images?.[0]
            if (imgUrl) {
                const img = new Image()
                img.src = imgUrl
            }
        })
    } catch (error) {
        // Silencioso - não bloquear renderização
    }
}

// Iniciar prefetch imediatamente (não bloqueia render)
prefetchHeroImages()

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <HelmetProvider>
                <Toaster
                    position="top-right"
                    expand={true}
                    richColors
                    closeButton
                    toastOptions={{
                        classNames: {
                            toast: 'group-[.toaster]:shadow-lg',
                            title: 'group-[.toast]:font-semibold',
                            description: 'group-[.toast]:text-sm',
                            actionButton: 'group-[.toast]:bg-[#C75D3B] group-[.toast]:text-white',
                            cancelButton: 'group-[.toast]:bg-gray-100',
                        },
                    }}
                />
                <CookieProvider>
                    <App />
                </CookieProvider>
            </HelmetProvider>
        </ErrorBoundary>
    </StrictMode>,
)
