import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Users, LogOut, DollarSign, Calendar, ChevronRight, Percent, Truck, ShoppingCart, Settings, X, TrendingDown } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const menuItems = [
    {
        path: '/admin/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard
    },
    {
        path: '/admin/products',
        label: 'Produtos',
        icon: Package
    },
    {
        path: '/admin/malinhas',
        label: 'Malinhas',
        icon: Calendar
    },
    {
        path: '/admin/vendas',
        label: 'Vendas',
        icon: DollarSign
    },
    {
        path: '/admin/customers',
        label: 'Clientes',
        icon: Users
    },
    {
        path: '/admin/coupons',
        label: 'Cupons',
        icon: Percent
    },
    {
        path: '/admin/suppliers',
        label: 'Fornecedores',
        icon: Truck
    },
    {
        path: '/admin/purchases',
        label: 'Compras',
        icon: ShoppingCart
    },
    {
        path: '/admin/operational-costs',
        label: 'Taxas de Pagamento',
        icon: DollarSign
    },
    {
        path: '/admin/expenses',
        label: 'Despesas Fixas',
        icon: TrendingDown
    }
]

export function AdminSidebar({ onClose }) {
    const location = useLocation()
    const logout = useAuthStore(state => state.logout)

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
        <aside className="w-72 bg-white border-r border-gray-100 flex flex-col relative z-20 h-full">
            {/* Elegant Header with Logo */}
            <div className="px-6 py-4 border-b border-gray-100 select-none">
                <div className="flex items-center justify-between">
                    <Link to="/admin/dashboard" onClick={handleLinkClick} className="flex items-center gap-3">
                        <img
                            src="/logomarca.PNG"
                            alt="Studio 30 Closet"
                            className="h-12 object-contain"
                        />
                        <div className="px-3 py-1 bg-[#FAF3F0] rounded-full">
                            <span className="text-[9px] font-bold text-[#C75D3B] uppercase tracking-[0.15em]">Painel</span>
                        </div>
                    </Link>
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
            <nav className="flex-1 px-5 py-3 space-y-1.5 overflow-y-auto custom-scrollbar">
                {menuItems.map((item, idx) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={handleLinkClick}
                        className="block group"
                    >
                        <motion.div
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                                'relative flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300',
                                isActive(item.path)
                                    ? 'bg-[#4A3B32] text-white shadow-lg shadow-[#4A3B32]/10'
                                    : 'text-[#4A3B32]/60 hover:bg-[#FDFBF7] hover:text-[#4A3B32]'
                            )}
                        >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                <item.icon className={cn(
                                    "w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110 flex-shrink-0",
                                    isActive(item.path) ? "text-white" : "text-[#4A3B32]/40 group-hover:text-[#C75D3B]"
                                )} />
                                <span className="font-bold text-[15px] tracking-tight truncate">{item.label}</span>
                            </div>

                            {isActive(item.path) && (
                                <motion.div layoutId="active-pill" className="w-2 h-2 rounded-full bg-[#C75D3B] flex-shrink-0" />
                            )}
                        </motion.div>
                    </Link>
                ))}
            </nav>

            {/* Refined Footer - Logout with Profile Feel */}
            <div className="px-5 py-3.5 border-t border-gray-100 bg-[#FDFBF7]/30">
                <button
                    onClick={logout}
                    className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-red-500 hover:bg-red-50 w-full transition-all duration-200 font-bold text-[15px] group"
                >
                    <LogOut className="w-[22px] h-[22px] transition-transform group-hover:-translate-x-1" />
                    <span>Sair do Painel</span>
                </button>
            </div>
        </aside>
    )
}
