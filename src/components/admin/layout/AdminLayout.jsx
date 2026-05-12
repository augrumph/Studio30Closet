import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Settings,
    Menu,
    X,
    LogOut,
    ChevronRight,
    Bell,
    Search,
    ShoppingBag,
    Briefcase,
    Store,
    Truck,
    CreditCard,
    DollarSign,
    Receipt,
    Wallet
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminTopbar } from './AdminTopbar'
import { AdminSidebar } from './AdminSidebar'
import { cn } from '@/lib/utils'

export function AdminLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    // Fechar menu mobile ao mudar de rota
    useEffect(() => {
        setIsMobileMenuOpen(false)
    }, [location.pathname])

    // Detectar screen size para fechar sidebar em telas pequenas
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false)
            } else {
                setIsSidebarOpen(true)
            }
        }

        window.addEventListener('resize', handleResize)
        handleResize() // Initial check

        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex overflow-hidden font-sans">
            {/* Sidebar para Desktop */}
            <div className={cn(
                "hidden lg:block fixed inset-y-0 left-0 z-50 bg-white border-r border-[#4A3B32]/5 transition-all duration-500 ease-in-out",
                isSidebarOpen ? "w-72" : "w-20"
            )}>
                <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            </div>

            {/* Sidebar para Mobile (Overlay) */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-[#4A3B32]/40 backdrop-blur-sm z-[60] lg:hidden"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-80 bg-white z-[70] lg:hidden"
                        >
                            <AdminSidebar isOpen={true} isMobile toggleSidebar={() => setIsMobileMenuOpen(false)} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out",
                isSidebarOpen ? "lg:pl-72" : "lg:pl-20"
            )}>
                {/* Topbar */}
                <AdminTopbar
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                    isSidebarOpen={isSidebarOpen}
                />

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-7xl mx-auto"
                    >
                        <Outlet />
                    </motion.div>
                </main>
            </div>
        </div>
    )
}
