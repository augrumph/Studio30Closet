import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
    const { pathname, search, hash } = useLocation()
    const prevPathRef = useRef(pathname)
    const prevSearchRef = useRef(search)

    useEffect(() => {
        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'auto'
            })
        }

        // Detectar se a mudança no search foi apenas o productId
        const currentParams = new URLSearchParams(search)
        const prevParams = new URLSearchParams(prevSearchRef.current)
        
        currentParams.delete('productId')
        prevParams.delete('productId')
        
        const hasPathnameChanged = pathname !== prevPathRef.current
        const hasSearchChanged = currentParams.toString() !== prevParams.toString()

        // Só scrolla se o pathname mudou ou se outros filtros (além de productId) mudaram
        if (hasPathnameChanged || hasSearchChanged) {
            scrollToTop()
            const timer = setTimeout(scrollToTop, 50)
            
            prevPathRef.current = pathname
            prevSearchRef.current = search
            
            return () => clearTimeout(timer)
        }

        // Atualiza as refs para a próxima comparação sem scrollar
        prevPathRef.current = pathname
        prevSearchRef.current = search
    }, [pathname, search, hash])

    return null
}
