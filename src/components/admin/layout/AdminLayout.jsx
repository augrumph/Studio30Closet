import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminTopbar } from './AdminTopbar'
import { AdminSidebar } from './AdminSidebar'
import { cn } from '@/lib/utils'

export function AdminLayout() {
    const [isSidebarOpen,    setIsSidebarOpen]    = useState(true)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const location = useLocation()

    // Fechar mobile ao navegar
    useEffect(() => { setIsMobileMenuOpen(false) }, [location.pathname])

    // Colapsar em telas menores que lg
    useEffect(() => {
        const check = () => setIsSidebarOpen(window.innerWidth >= 1024)
        window.addEventListener('resize', check)
        check()
        return () => window.removeEventListener('resize', check)
    }, [])

    const closeMobile = useCallback(() => setIsMobileMenuOpen(false), [])

    return (
        <div className="flex min-h-screen overflow-hidden bg-[#FDFBF7] font-sans">

            {/* ── Desktop sidebar (fixed) ────────────────────── */}
            <div className={cn(
                'fixed inset-y-0 left-0 z-50 hidden lg:block',
                'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isSidebarOpen ? 'w-[236px]' : 'w-[64px]',
            )}>
                <AdminSidebar
                    isOpen={isSidebarOpen}
                    toggleSidebar={() => setIsSidebarOpen(v => !v)}
                />
            </div>

            {/* ── Mobile overlay + sidebar ───────────────────── */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            onClick={closeMobile}
                            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[3px] lg:hidden"
                        />

                        {/* Sidebar panel */}
                        <motion.div
                            key="mobile-sidebar"
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
                            className="fixed inset-y-0 left-0 z-[70] w-[272px] shadow-2xl lg:hidden"
                        >
                            <AdminSidebar
                                isOpen
                                isMobile
                                toggleSidebar={closeMobile}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Main content ───────────────────────────────── */}
            <div className={cn(
                'flex min-w-0 flex-1 flex-col',
                'transition-[padding-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isSidebarOpen ? 'lg:pl-[236px]' : 'lg:pl-[64px]',
            )}>
                <AdminTopbar
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                    isSidebarOpen={isSidebarOpen}
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="mx-auto max-w-7xl"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    )
}
