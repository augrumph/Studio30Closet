import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { CookieProvider } from './contexts/CookieContext'
import './index.css'

// 🗑️ CLEANUP: Forçar remoção de qualquer Service Worker antigo (cache persistente)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister()
            console.log('🧹 Service Worker antigo removido para garantir atualização.')
        }
    })
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <CookieProvider>
            <App />
        </CookieProvider>
    </StrictMode>,
)
