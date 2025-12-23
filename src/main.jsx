import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { CookieProvider } from './contexts/CookieContext'
import './index.css'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <CookieProvider>
            <App />
        </CookieProvider>
    </StrictMode>,
)
