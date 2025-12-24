import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
    const { pathname, search, hash } = useLocation()

    useEffect(() => {
        // Scroll para o topo quando a rota muda
        // Adiciona um pequeno delay para garantir que a página foi renderizada
        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'auto' // Instant scroll, não smooth
            })
        }

        // Scroll imediato
        scrollToTop()

        // Também faz scroll em um timing ligeiramente diferente
        // para garantir que funciona em todas as situações
        const timer = setTimeout(scrollToTop, 50)

        return () => clearTimeout(timer)
    }, [pathname, search, hash])

    return null
}
