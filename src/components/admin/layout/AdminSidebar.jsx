import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Users, LogOut, DollarSign, Calendar, ChevronRight, BarChart3, Truck, ShoppingCart, Settings, X, TrendingDown, ChevronLeft, PackageCheck } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useState } from 'react'

const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/products', label: 'Produtos', icon: Package },
    { path: '/admin/malinhas', label: 'Malinhas', icon: Calendar },
    { path: '/admin/vendas', label: 'Vendas', icon: DollarSign },
    { path: '/admin/entregas', label: 'Entregas', icon: PackageCheck },
    { path: '/admin/customers', label: 'Clientes', icon: Users },
    { path: '/admin/stock', label: 'Estoque', icon: BarChart3 },
    { path: '/admin/suppliers', label: 'Fornecedores', icon: Truck },
    { path: '/admin/purchases', label: 'Compras', icon: ShoppingCart },
    { path: '/admin/installments', label: 'Crediário', icon: DollarSign },
    { path: '/admin/expenses', label: 'Despesas', icon: TrendingDown },
    { path: '/admin/site', label: 'Site', icon: BarChart3 },
    { path: '/admin/bingo', label: 'Bingo', icon: Calendar }
]

export function AdminSidebar({ onClose, isCollapsed = false, onToggleCollapse }) {
    const location = useLocation()
    const logout = useAuthStore(state => state.logout)
    const [hoveredItem, setHoveredItem] = useState(null)

    const isActive = (path) => {
        if (path === '/admin/dashboard') {
            return location.pathname === path
        }
        return location.pathname.startsWith(path)
    }

    const handleLinkClick = () => {
        if (onClose) onClose()
    }

    return (
        <motion.aside
            animate={{ width: isCollapsed ? 80 : 288 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-white flex flex-col relative z-20 h-full shadow-[2px_0_8px_-2px_rgba(0,0,0,0.05)]"
        >
            {/* Elegant Header with Logo */}
            <div className={cn("border-b border-gray-200 select-none transition-all", isCollapsed ? "px-3 py-3 md:py-4" : "px-6 py-3 md:py-4")}>
                <div className="flex items-center justify-between">
                    {!isCollapsed && (
                        <Link to="/admin/dashboard" onClick={handleLinkClick} className="flex items-center gap-3 flex-1">
                            <img
                                src="/logomarca.webp"
                                alt="Studio 30 Closet"
                                className="h-12 object-contain"
                            />
                            <div className="px-3 py-1 bg-[#FAF3F0] rounded-full">
                                <span className="text-[9px] font-bold text-[#C75D3B] uppercase tracking-[0.15em]">Painel</span>
                            </div>
                        </Link>
                    )}

                    {/* Toggle Button */}
                    {onToggleCollapse && (
                        <motion.button
                            onClick={onToggleCollapse}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
                            title={isCollapsed ? "Expandir" : "Retrair"}
                        >
                            <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }}>
                                <ChevronLeft className="w-5 h-5 text-[#4A3B32]" />
                            </motion.div>
                        </motion.button>
                    )}

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <X className="w-6 h-6 text-[#4A3B32]" />
                        </button>
                    )}
                </div>
            </div>

            {/* Premium Navigation Menu */}
            <nav className={cn("flex-1 py-2 space-y-1 overflow-y-auto custom-scrollbar transition-all", isCollapsed ? "px-2" : "px-4")}>
                {menuItems.map((item, idx) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={handleLinkClick}
                        className="block group relative"
                        title={isCollapsed ? item.label : undefined}
                    >
                        <motion.div
                            onHoverStart={() => setHoveredItem(idx)}
                            onHoverEnd={() => setHoveredItem(null)}
                            whileHover={{ x: isCollapsed ? 0 : 3 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                                'relative flex items-center justify-center rounded-xl transition-all duration-300',
                                isCollapsed ? 'px-3 py-2.5' : 'px-3 py-2.5 justify-between',
                                isActive(item.path)
                                    ? 'bg-[#4A3B32] text-white shadow-lg shadow-[#4A3B32]/10'
                                    : 'text-[#4A3B32]/60 hover:bg-[#FDFBF7] hover:text-[#4A3B32]'
                            )}
                        >
                            <div className={cn("flex items-center flex-1", isCollapsed ? "justify-center" : "gap-3.5 min-w-0")}>
                                <item.icon className={cn(
                                    "w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110 flex-shrink-0",
                                    isActive(item.path) ? "text-white" : "text-[#4A3B32]/40 group-hover:text-[#C75D3B]"
                                )} />
                                {!isCollapsed && (
                                    <span className="font-bold text-[15px] tracking-tight truncate">{item.label}</span>
                                )}
                            </div>

                            {!isCollapsed && isActive(item.path) && (
                                <motion.div layoutId="active-pill" className="w-2 h-2 rounded-full bg-[#C75D3B] flex-shrink-0" />
                            )}

                            {/* Tooltip quando colapsado */}
                            {isCollapsed && hoveredItem === idx && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-full ml-2 px-3 py-2 bg-[#4A3B32] text-white text-sm font-bold rounded-lg whitespace-nowrap pointer-events-none z-50"
                                >
                                    {item.label}
                                    <div className="absolute right-full w-2 h-2 bg-[#4A3B32] transform rotate-45" />
                                </motion.div>
                            )}


                        </motion.div>
                    </Link>
                ))}
            </nav>

            {/* Refined Footer - Logout with Profile Feel */}
            <div className={cn("py-3.5 border-t border-gray-100 bg-[#FDFBF7]/30 transition-all", isCollapsed ? "px-2" : "px-5")}>
                <motion.button
                    onClick={logout}
                    onHoverStart={() => setHoveredItem('logout')}
                    onHoverEnd={() => setHoveredItem(null)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                        "flex items-center rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200 font-bold group relative",
                        isCollapsed ? "justify-center px-4 py-3.5" : "gap-3.5 px-4 py-3.5 w-full text-[15px]"
                    )}
                    title={isCollapsed ? "Sair do Painel" : undefined}
                >
                    <LogOut className="w-[22px] h-[22px] transition-transform group-hover:-translate-x-1" />
                    {!isCollapsed && <span>Sair do Painel</span>}

                    {/* Tooltip quando colapsado */}
                    {isCollapsed && hoveredItem === 'logout' && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-full ml-2 px-3 py-2 bg-red-500 text-white text-sm font-bold rounded-lg whitespace-nowrap pointer-events-none z-50"
                        >
                            Sair
                            <div className="absolute right-full w-2 h-2 bg-red-500 transform rotate-45" />
                        </motion.div>
                    )}
                </motion.button>
            </div>
        </motion.aside>
    )
}
