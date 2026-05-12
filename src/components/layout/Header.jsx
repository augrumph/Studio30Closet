import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { cn } from '@/lib/utils'
import { trackWhatsAppClick, trackInstagramClick } from '@/lib/api/analytics'

const navLinks = [
    { name: 'Início', href: '/' },
    { name: 'Catálogo', href: '/catalogo' },
    { name: 'Como Funciona', href: '/como-funciona' },
    { name: 'Sobre Nós', href: '/sobre' },
]

export function Header() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const location = useLocation()
    const itemsCount = useMalinhaStore((state) => state.items.length)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        setIsMobileMenuOpen(false)
    }, [location])

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
            document.body.style.overflow = 'hidden'
            document.body.style.paddingRight = `${scrollbarWidth}px`
        } else {
            document.body.style.overflow = ''
            document.body.style.paddingRight = ''
        }

        // Cleanup on unmount or navigation
        return () => {
            document.body.style.overflow = ''
            document.body.style.paddingRight = ''
        }
    }, [isMobileMenuOpen])

    return (
        <header
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
                isScrolled
                    ? 'py-3 sm:py-4 glass shadow-lg border-b border-brand-peach/20'
                    : 'py-4 sm:py-5 bg-transparent'
            )}
        >
            <div className="container-custom px-4">
                <nav className="flex items-center justify-between">
                    {/* Logo - Usando logomarca */}
                    <Link to="/" className="flex items-center group flex-shrink-0">
                        <img
                            src="/logomarca.webp"
                            alt="Studio 30 Closet"
                            width="48"
                            height="48"
                            className={cn(
                                "object-contain transition-all duration-300 group-hover:scale-105",
                                isScrolled ? "h-10 w-auto" : "h-12 w-auto"
                            )}
                        />
                    </Link>

                    {/* Desktop Navigation - Enhanced */}
                    <div className="hidden lg:flex items-center gap-8 xl:gap-10">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                to={link.href}
                                className={cn(
                                    'relative text-sm font-medium transition-all duration-500 py-1 group',
                                    location.pathname === link.href
                                        ? 'text-brand-terracotta'
                                        : 'text-brand-brown/70 hover:text-brand-terracotta'
                                )}
                                style={{ letterSpacing: '0.05em' }}
                            >
                                {link.name}
                                {location.pathname === link.href ? (
                                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-brand-terracotta via-brand-coral to-brand-terracotta rounded-full" />
                                ) : (
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-brand-terracotta to-brand-coral rounded-full group-hover:w-full transition-all duration-500" />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* WhatsApp Icon - Subtle Brand Style */}
                        <a
                            href="https://wa.me/5541996863879?text=Oii%2C%20Studio%2030!%20Estava%20olhando%20o%20site%20e%20gostaria%20de%20ajuda%20para%20escolher%20algumas%20pe%C3%A7as%20para%20minha%20Malinha."
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Fale conosco no WhatsApp"
                            onClick={() => trackWhatsAppClick('navbar')}
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-brand-peach hover:border-brand-terracotta hover:bg-brand-rose/30 transition-all duration-300 hover:scale-105 shadow-sm"
                        >
                            <svg className="w-4 h-4 text-brand-terracotta" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                        </a>

                        {/* Instagram Icon - Subtle Brand Style */}
                        <a
                            href="https://instagram.com/studio30closet"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Siga-nos no Instagram"
                            onClick={() => trackInstagramClick('navbar')}
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-brand-peach hover:border-brand-terracotta hover:bg-brand-rose/30 transition-all duration-300 hover:scale-105 shadow-sm"
                        >
                            <svg className="w-4 h-4 text-brand-terracotta" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                        </a>

                        {/* Malinha Button - Premium Design */}
                        <Link
                            to="/malinha"
                            aria-label="Minha Malinha"
                            className={cn(
                                'relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all duration-500 shadow-md hover:shadow-lg hover:-translate-y-0.5',
                                itemsCount > 0
                                    ? 'bg-gradient-to-r from-brand-terracotta to-brand-rust text-white hover:shadow-terracotta'
                                    : 'bg-white/95 backdrop-blur-sm text-brand-brown border border-brand-peach hover:border-brand-terracotta hover:bg-white'
                            )}
                            style={{ letterSpacing: '0.05em' }}
                        >
                            <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                            <span className="hidden sm:inline font-semibold">Malinha</span>
                            {itemsCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-[#FDFBF7] text-[#C75D3B] text-[10px] sm:text-xs rounded-full font-bold shadow-lg border-2 border-[#E8C4B0] animate-pulse opacity-100">
                                    {itemsCount}
                                </span>
                            )}
                        </Link>

                        {/* Mobile Menu Button - Touch Optimized */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="touch-target lg:hidden flex items-center justify-center text-brand-brown hover:text-brand-terracotta transition-all active:scale-90"
                            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                            aria-expanded={isMobileMenuOpen}
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </button>
                    </div>
                </nav>
            </div>

            {/* Mobile Menu - Renderizado via Portal para evitar problemas de stacking context */}
            {typeof document !== 'undefined' && createPortal(
                <div
                    className={cn(
                        "lg:hidden fixed inset-0 transition-all duration-300 ease-in-out",
                        isMobileMenuOpen
                            ? "opacity-100 pointer-events-auto"
                            : "opacity-0 pointer-events-none"
                    )}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 99999
                    }}
                >
                    {/* Backdrop sólido para cobrir todo o conteúdo */}
                    <div
                        className="absolute inset-0 bg-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    {/* Menu Header */}
                    <div className="relative flex items-center justify-between p-4 border-b border-brand-peach/30 bg-white">
                        <Link to="/" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                            <img
                                src="/logomarca.webp"
                                alt="Studio 30 Closet"
                                width="40"
                                height="40"
                                className="h-10 w-auto object-contain"
                            />
                        </Link>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-2 text-brand-brown hover:text-brand-terracotta"
                            aria-label="Fechar menu"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Menu Links */}
                    <div className="relative flex flex-col items-center justify-center gap-6 py-12 bg-white">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                to={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    'text-xl font-medium py-2 px-6 rounded-full transition-all duration-300',
                                    location.pathname === link.href
                                        ? 'text-brand-terracotta bg-brand-rose'
                                        : 'text-brand-brown/70 hover:text-brand-terracotta'
                                )}
                            >
                                {link.name}
                            </Link>
                        ))}

                        {/* Mobile CTA */}
                        <Link
                            to="/malinha"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="mt-4 btn-primary flex items-center gap-2"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            Ver Malinha
                            {itemsCount > 0 && (
                                <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                                    {itemsCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>,
                document.body
            )}
        </header>
    )
}
