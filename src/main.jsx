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

// 🗑️ NUCLEAR CLEANUP: Forçar remoção de qualquer Service Worker e limpar CACHES (cache persistente)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister().then(() => {
                console.log('✅ Service Worker removido com sucesso');
            });
        }
    });
}

// Limpar todos os caches do navegador (Cache Storage API)
if ('caches' in window) {
    caches.keys().then(function (names) {
        for (let name of names) {
            caches.delete(name).then(() => {
                console.log('🗑️ Cache Storage "' + name + '" deletado');
            });
        }
    });
}

// Forçar limpeza de localStorage se houver versão corrompida (opcional, mas seguro)
// localStorage.clear(); // Não fazer isso pois apaga login, mas podemos apagar flags específicas
window.sessionStorage.removeItem('studio30_page_refreshed');


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
