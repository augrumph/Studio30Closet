import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Users, LogOut, DollarSign, Calendar, ChevronRight, BarChart3, Truck, ShoppingCart, Settings, X, TrendingDown, ChevronLeft, PackageCheck, Link as LinkIcon } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const fixedItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/vendas', label: 'Vendas', icon: DollarSign }
]

const menuSections = [
    {
        label: 'Operação',
        items: [
            { path: '/admin/products', label: 'Produtos', icon: Package },
            { path: '/admin/malinhas', label: 'Malinhas', icon: Calendar },
            { path: '/admin/entregas', label: 'Entregas', icon: PackageCheck }
        ]
    },
    {
        label: 'Gestão',
        items: [
            { path: '/admin/customers', label: 'Clientes', icon: Users },
            { path: '/admin/stock', label: 'Estoque', icon: BarChart3 },
            { path: '/admin/suppliers', label: 'Fornecedores', icon: Truck },
            { path: '/admin/purchases', label: 'Compras', icon: ShoppingCart },
            { path: '/admin/installments', label: 'Crediário', icon: DollarSign },
            { path: '/admin/expenses', label: 'Despesas', icon: TrendingDown }
        ]
    },
    {
        label: 'Plataforma',
        items: [
            { path: '/admin/integracoes', label: 'Integrações', icon: LinkIcon },
            { path: '/admin/site', label: 'Site', icon: BarChart3 }
        ]
    }
]

export function AdminSidebar({
    onClose,
    isCollapsed,
    onToggleCollapse,
    isOpen,
    toggleSidebar,
    isMobile = false
}) {
    const location = useLocation()
    const logout = useAuthStore(state => state.logout)
    const [hoveredItem, setHoveredItem] = useState(null)
    const collapsed = typeof isCollapsed === 'boolean' ? isCollapsed : (typeof isOpen === 'boolean' ? !isOpen : false)
    const closeHandler = onClose || (isMobile ? toggleSidebar : undefined)
    const collapseHandler = onToggleCollapse || toggleSidebar
    const showCollapseToggle = !isMobile && Boolean(collapseHandler)
    const showCloseButton = Boolean(closeHandler)

    const isActive = (path) => {
        if (path === '/admin/dashboard') {
            return location.pathname === path
        }
        return location.pathname.startsWith(path)
    }

    const handleLinkClick = () => {
        if (closeHandler) closeHandler()
    }

    return (
        <motion.aside
            animate={{ width: collapsed ? 72 : 260 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="bg-[#FDFBF7] flex flex-col relative z-20 h-full border-r border-[#4A3B32]/5 shadow-[2px_0_12px_rgba(93,46,31,0.01)]"
        >
            {/* Elegant Header - More Compact */}
            <div className={cn(
                "select-none transition-all duration-500",
                collapsed ? "px-3 py-5" : "px-6 py-6"
            )}>
                <div className="flex items-center">
                    {!collapsed ? (
                        <Link to="/admin/dashboard" onClick={handleLinkClick} className="flex items-center gap-3 group">
                            <div className="relative shrink-0">
                                <img
                                    src="/logomarca.webp"
                                    alt="S30"
                                    className="h-8 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute -inset-1.5 bg-brand-terracotta/5 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[12px] font-black tracking-[0.05em] text-brand-brown leading-none mb-1 uppercase">Studio 30</span>
                                <span className="text-[8px] font-bold text-brand-terracotta uppercase tracking-[0.2em] opacity-70">Admin Panel</span>
                            </div>
                        </Link>
                    ) : (
                        <div className="mx-auto">
                            <img
                                src="/logomarca.webp"
                                alt="S"
                                className="h-7 w-auto object-contain"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Navigation Menu - Compact */}
            <nav className={cn(
                "flex-1 overflow-y-auto custom-scrollbar transition-all duration-500",
                collapsed ? "px-2" : "px-4"
            )}>
                {/* Main Items */}
                <div className="space-y-1 mb-6">
                    {fixedItems.map((item, idx) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={handleLinkClick}
                            className="block group relative"
                            title={collapsed ? item.label : undefined}
                        >
                            <motion.div
                                whileHover={{ x: collapsed ? 0 : 2 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                    'relative flex items-center rounded-lg transition-all duration-200',
                                    collapsed ? 'h-10 justify-center' : 'px-3 py-2 gap-3',
                                    isActive(item.path)
                                        ? 'bg-white text-brand-brown shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-[#4A3B32]/5'
                                        : 'text-brand-brown/40 hover:bg-white/40 hover:text-brand-brown'
                                )}
                            >
                                <item.icon className={cn(
                                    "w-[18px] h-[18px] transition-all duration-200",
                                    isActive(item.path) ? "text-brand-terracotta" : "text-brand-brown/20 group-hover:text-brand-terracotta"
                                )} />
                                
                                {!collapsed && (
                                    <span className={cn(
                                        "font-bold text-[13px] tracking-tight transition-colors",
                                        isActive(item.path) ? "text-brand-brown" : "group-hover:text-brand-brown"
                                    )}>
                                        {item.label}
                                    </span>
                                )}

                                {isActive(item.path) && (
                                    <motion.div 
                                        layoutId="active-indicator"
                                        className="absolute left-0 w-1 h-4 bg-brand-terracotta rounded-full -translate-x-1"
                                    />
                                )}
                            </motion.div>
                        </Link>
                    ))}
                </div>

                {/* Sections with Compact Modern Accordions */}
                <Accordion type="multiple" defaultValue={menuSections.map(section => section.label)} className="space-y-0.5">
                    {menuSections.map((section, sIdx) => (
                        <AccordionItem key={section.label} value={section.label} className="border-none">
                            {!collapsed ? (
                                <>
                                    <AccordionTrigger className="flex items-center gap-2 px-3 py-2 text-brand-brown/30 hover:text-brand-brown hover:no-underline group transition-all">
                                        <div className="flex items-center gap-2.5 flex-1">
                                            <div className="w-1 h-1 rounded-full bg-brand-terracotta/20 group-data-[state=open]:bg-brand-terracotta transition-colors" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.15em]">{section.label}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-1 border-l border-[#4A3B32]/5 ml-4.5 pl-1.5 space-y-0.5">
                                        {section.items.map((item, idx) => (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={handleLinkClick}
                                                className="block group relative"
                                            >
                                                <motion.div
                                                    whileHover={{ x: 2 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className={cn(
                                                        'relative flex items-center rounded-lg transition-all duration-200 px-2.5 py-1.5 gap-2.5',
                                                        isActive(item.path)
                                                            ? 'bg-white text-brand-brown shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-[#4A3B32]/5'
                                                            : 'text-brand-brown/40 hover:bg-white/40 hover:text-brand-brown'
                                                    )}
                                                >
                                                    <item.icon className={cn(
                                                        "w-[15px] h-[15px] transition-all duration-200",
                                                        isActive(item.path) ? "text-brand-terracotta" : "text-brand-brown/20 group-hover:text-brand-terracotta"
                                                    )} />
                                                    <span className={cn(
                                                        "font-bold text-[12.5px] tracking-tight",
                                                        isActive(item.path) ? "text-brand-brown" : "group-hover:text-brand-brown"
                                                    )}>
                                                        {item.label}
                                                    </span>
                                                </motion.div>
                                            </Link>
                                        ))}
                                    </AccordionContent>
                                </>
                            ) : (
                                <div className="space-y-1.5 py-2">
                                    {section.items.map((item) => (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={handleLinkClick}
                                            className="block group relative"
                                            title={item.label}
                                        >
                                            <motion.div
                                                className={cn(
                                                    'relative flex items-center justify-center rounded-lg transition-all duration-200 h-9',
                                                    isActive(item.path)
                                                        ? 'bg-white text-brand-brown shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-[#4A3B32]/5'
                                                        : 'text-brand-brown/40 hover:bg-white/40 hover:text-brand-brown'
                                                )}
                                            >
                                                <item.icon className={cn(
                                                    "w-[17px] h-[17px] transition-all duration-200",
                                                    isActive(item.path) ? "text-brand-terracotta" : "text-brand-brown/20 group-hover:text-brand-terracotta"
                                                )} />
                                            </motion.div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </AccordionItem>
                    ))}
                </Accordion>
            </nav>

            {/* Compact Premium Footer */}
            <div className={cn(
                "p-3 mt-auto border-t border-[#4A3B32]/5 transition-all duration-500",
                collapsed ? "items-center" : "items-stretch"
            )}>
                {!collapsed && (
                    <div className="px-3 py-2.5 mb-2 rounded-xl bg-white/30 border border-[#4A3B32]/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-brand-terracotta/10 border border-brand-terracotta/20 flex items-center justify-center text-brand-terracotta font-black text-[11px] shrink-0">
                                AL
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[12px] font-black text-brand-brown truncate leading-tight">Augusto Luzzi</span>
                                <span className="text-[8px] font-bold text-brand-brown/30 uppercase tracking-wider">Admin</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-1.5">
                    <motion.button
                        onClick={logout}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                            "flex items-center justify-center rounded-lg transition-all duration-200 group",
                            collapsed ? "w-9 h-9 hover:bg-red-50 text-brand-brown/30 hover:text-red-500" : "flex-1 h-9 gap-2 hover:bg-red-50 text-brand-brown/30 hover:text-red-500"
                        )}
                        title={collapsed ? "Sair do Painel" : undefined}
                    >
                        <LogOut className={cn("w-4 h-4 transition-transform", !collapsed && "group-hover:-translate-x-0.5")} />
                        {!collapsed && <span className="text-[12px] font-bold">Sair do Painel</span>}
                    </motion.button>

                    {showCollapseToggle && (
                        <motion.button
                            onClick={collapseHandler}
                            whileTap={{ scale: 0.9 }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/80 text-brand-brown/20 hover:text-brand-brown transition-all"
                        >
                            <motion.div animate={{ rotate: collapsed ? 180 : 0 }}>
                                <ChevronLeft className="w-4 h-4" />
                            </motion.div>
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.aside>

    )
}
