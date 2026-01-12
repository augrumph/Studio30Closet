import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'
import { Toaster } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { CommandPalette } from '../CommandPalette'
import { PageSkeleton } from '../PageSkeleton'
import { useAdminStore } from '@/store/admin-store'
import { AIChatSidebar } from '../ai/AIChatSidebar'

export function AdminLayout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [chatOpen, setChatOpen] = useState(false)
    const location = useLocation()
    const lastLoadRef = useRef(0)

    const isInitialLoading = useAdminStore(state => state.isInitialLoading)
    const reloadAll = useAdminStore(state => state.reloadAll)
    const hasData = useAdminStore(state =>
        state.products.length > 0 || state.vendas.length > 0 || state.customers.length > 0
    )

    // ⚡ PERFORMANCE: Só recarrega se não houver dados OU se passaram 2 minutos
    useEffect(() => {
        const now = Date.now()
        const timeSinceLastLoad = now - lastLoadRef.current
        const shouldReload = !hasData || timeSinceLastLoad > 120000 // 2 minutos

        if (shouldReload) {
            lastLoadRef.current = now
            reloadAll()
        }
    }, []) // Sem dependências - só na montagem

    // Determine skeleton variant based on route
    const getSkeletonVariant = () => {
        const path = location.pathname
        if (path === '/admin' || path === '/admin/') return 'dashboard'
        if (path.includes('/products') && !path.includes('/new') && !path.includes('/edit')) return 'products'
        if (path.includes('/customers') && !path.includes('/new') && !path.includes('/edit')) return 'customers'
        if (path.includes('/vendas') && !path.includes('/new') && !path.includes('/edit')) return 'vendas'
        if (path.includes('/malinhas') && !path.includes('/new') && !path.includes('/edit')) return 'malinhas'
        if (path.includes('/new') || path.includes('/edit')) return 'form'
        return 'list'
    }

    return (
        <div className="flex h-screen bg-[#FAF8F5] overflow-hidden max-w-screen">
            <CommandPalette />
            <Toaster
                richColors
                position="top-center"
                toastOptions={{
                    className: 'shadow-xl border border-gray-100 rounded-2xl',
                    style: {
                        background: 'white',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#4A3B32',
                    },
                    duration: 4000,
                }}
            />

            {/* Desktop Sidebar - Collapsible */}
            <div className="hidden lg:block">
                <AdminSidebar isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
            </div>

            {/* Mobile Drawer Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        />
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[280px] z-50 lg:hidden"
                        >
                            <AdminSidebar onClose={() => setMobileMenuOpen(false)} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Topbar */}
                <AdminTopbar
                    onMenuClick={() => setMobileMenuOpen(true)}
                    onChatClick={() => setChatOpen(true)}
                />

                {/* Page Content with Transition */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
                    <AnimatePresence mode="wait">
                        {isInitialLoading ? (
                            <PageSkeleton variant={getSkeletonVariant()} />
                        ) : (
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Outlet />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {/* AI Chat Sidebar */}
            <AIChatSidebar isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    )
}

