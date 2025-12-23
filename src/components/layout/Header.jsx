import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ShoppingBag, Menu, X, Shield, Cookie } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { cn } from '@/lib/utils'
import { useCookieContext } from '@/contexts/CookieContext'
import { CookiePreferencesModal } from '@/components/CookiePreferencesModal'

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
    const { setShowPreferencesModal } = useCookieContext()

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
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
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
                            src="/logomarca.PNG"
                            alt="Studio 30 Closet"
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
                        <button
                            onClick={() => setShowPreferencesModal(true)}
                            className="relative text-sm font-medium transition-all duration-500 py-1 group text-brand-brown/70 hover:text-brand-terracotta"
                            style={{ letterSpacing: '0.05em' }}
                            aria-label="Preferências de cookies"
                        >
                            <div className="flex items-center gap-1">
                                <Cookie className="w-4 h-4" />
                                <span>Cookies</span>
                            </div>
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-brand-terracotta to-brand-coral rounded-full group-hover:w-full transition-all duration-500" />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
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

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 text-brand-brown hover:text-brand-terracotta transition-colors"
                            aria-label="Menu"
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </button>
                    </div>
                </nav>
            </div>

            {/* Mobile Menu - Full Screen Overlay */}
            <div
                className={cn(
                    "lg:hidden fixed inset-0 top-0 bg-white z-40 transition-all duration-300 ease-in-out",
                    isMobileMenuOpen
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                )}
            >
                {/* Menu Header */}
                <div className="flex items-center justify-between p-4 border-b border-brand-peach/30">
                    <Link to="/" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                        <img
                            src="/logomarca.PNG"
                            alt="Studio 30 Closet"
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
                <div className="flex flex-col items-center justify-center gap-6 py-12">
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
            </div>
            <CookiePreferencesModal
                isOpen={showPreferencesModal}
                onClose={() => setShowPreferencesModal(false)}
            />
        </header>
    )
}
