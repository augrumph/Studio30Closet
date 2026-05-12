import { Link, useLocation } from 'react-router-dom'
import {
    BarChart3,
    Boxes,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    ClipboardList,
    CreditCard,
    Database,
    LayoutDashboard,
    Link as LinkIcon,
    LogOut,
    Package,
    PackageCheck,
    Receipt,
    Settings,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    Store,
    TrendingDown,
    Truck,
    Users,
    X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'

const fixedItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: 'from-[#C75D3B] to-[#A64D31]' },
    { path: '/admin/vendas', label: 'Vendas', icon: CircleDollarSign, accent: 'from-emerald-500 to-teal-600' }
]

const menuSections = [
    {
        id: 'commerce',
        label: 'Comercial',
        icon: ShoppingBag,
        hint: 'Produtos, malinhas e pedidos',
        items: [
            { path: '/admin/products', label: 'Produtos', icon: Package },
            { path: '/admin/malinhas', label: 'Malinhas', icon: Store },
            { path: '/admin/pedidos-online', label: 'Pedidos Online', icon: ClipboardList },
            { path: '/admin/entregas', label: 'Entregas', icon: PackageCheck }
        ]
    },
    {
        id: 'management',
        label: 'Gestão',
        icon: Database,
        hint: 'Clientes, estoque e fornecedores',
        items: [
            { path: '/admin/customers', label: 'Clientes', icon: Users },
            { path: '/admin/stock', label: 'Estoque', icon: Boxes },
            { path: '/admin/suppliers', label: 'Fornecedores', icon: Truck },
            { path: '/admin/purchases', label: 'Compras', icon: ShoppingCart }
        ]
    },
    {
        id: 'finance',
        label: 'Financeiro',
        icon: Receipt,
        hint: 'Recebíveis e despesas',
        items: [
            { path: '/admin/installments', label: 'Crediário', icon: CreditCard },
            { path: '/admin/expenses', label: 'Despesas', icon: TrendingDown }
        ]
    },
    {
        id: 'platform',
        label: 'Plataforma',
        icon: Settings,
        hint: 'Integrações e métricas do site',
        items: [
            { path: '/admin/integracoes', label: 'Integrações', icon: LinkIcon },
            { path: '/admin/site', label: 'Site & Analytics', icon: BarChart3 }
        ]
    }
]

function sectionHasActive(section, pathname) {
    return section.items.some(item => pathname === item.path || pathname.startsWith(`${item.path}/`))
}

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
    const collapsed = typeof isCollapsed === 'boolean' ? isCollapsed : (typeof isOpen === 'boolean' ? !isOpen : false)
    const closeHandler = onClose || (isMobile ? toggleSidebar : undefined)
    const collapseHandler = onToggleCollapse || toggleSidebar
    const showCollapseToggle = !isMobile && Boolean(collapseHandler)
    const showCloseButton = isMobile && Boolean(closeHandler)

    const activeSectionIds = useMemo(
        () => menuSections.filter(section => sectionHasActive(section, location.pathname)).map(section => section.id),
        [location.pathname]
    )
    const [openSections, setOpenSections] = useState(() => activeSectionIds.length ? activeSectionIds : ['commerce', 'management'])

    useEffect(() => {
        if (!collapsed && activeSectionIds.length) {
            setOpenSections(prev => Array.from(new Set([...prev, ...activeSectionIds])))
        }
    }, [activeSectionIds, collapsed])

    const isActive = (path) => {
        if (path === '/admin/dashboard') return location.pathname === path
        return location.pathname === path || location.pathname.startsWith(`${path}/`)
    }

    const handleLinkClick = () => {
        if (closeHandler) closeHandler()
    }

    return (
        <motion.aside
            animate={{ width: collapsed ? 78 : 286 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 h-full overflow-hidden border-r border-[#E9DED6] bg-[#FBF8F4] text-[#33261F] shadow-[1px_0_0_rgba(255,255,255,0.7)_inset]"
        >
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#C75D3B]/20 to-transparent" />

            <div className={cn('flex h-full flex-col', collapsed ? 'px-2.5' : 'px-4')}>
                <header className={cn('shrink-0', collapsed ? 'py-4' : 'py-5')}>
                    <div className={cn(
                        'flex items-center rounded-2xl border border-white/80 bg-white/70 shadow-sm shadow-[#4A3B32]/5 backdrop-blur',
                        collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-3'
                    )}>
                        <Link to="/admin/dashboard" onClick={handleLinkClick} className={cn('flex min-w-0 items-center', collapsed ? 'justify-center' : 'gap-3')}>
                            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F4E8E1]">
                                <img src="/logomarca.webp" alt="Studio 30" className="max-h-7 max-w-7 object-contain" />
                            </div>
                            {!collapsed && (
                                <div className="min-w-0">
                                    <p className="truncate text-[13px] font-black uppercase tracking-[0.08em] text-[#33261F]">Studio 30</p>
                                    <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-[#C75D3B]">Mobile Admin</p>
                                </div>
                            )}
                        </Link>

                        {showCloseButton && (
                            <button
                                type="button"
                                onClick={closeHandler}
                                className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-[#33261F]/45 transition hover:bg-[#33261F]/5 hover:text-[#33261F]"
                                aria-label="Fechar menu"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </header>

                <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pb-4">
                    {!collapsed && (
                        <div className="mb-3 flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#33261F]/35">Essenciais</span>
                            <Sparkles className="h-3.5 w-3.5 text-[#C75D3B]/50" />
                        </div>
                    )}

                    <div className="space-y-2">
                        {fixedItems.map(item => {
                            const Icon = item.icon
                            const active = isActive(item.path)

                            return (
                                <Link key={item.path} to={item.path} onClick={handleLinkClick} title={collapsed ? item.label : undefined} className="block">
                                    <motion.div
                                        whileTap={{ scale: 0.98 }}
                                        className={cn(
                                            'group relative flex items-center overflow-hidden rounded-2xl border transition-all duration-200',
                                            collapsed ? 'h-12 justify-center' : 'h-12 gap-3 px-3',
                                            active
                                                ? 'border-[#C75D3B]/15 bg-white text-[#33261F] shadow-sm shadow-[#4A3B32]/5'
                                                : 'border-transparent text-[#33261F]/55 hover:border-[#E9DED6] hover:bg-white/65 hover:text-[#33261F]'
                                        )}
                                    >
                                        {active && <div className={cn('absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b', item.accent)} />}
                                        <span className={cn(
                                            'grid h-8 w-8 shrink-0 place-items-center rounded-xl transition',
                                            active ? 'bg-[#C75D3B]/10 text-[#C75D3B]' : 'bg-[#33261F]/5 text-[#33261F]/45 group-hover:text-[#C75D3B]'
                                        )}>
                                            <Icon className="h-[17px] w-[17px]" />
                                        </span>
                                        {!collapsed && (
                                            <>
                                                <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold">{item.label}</span>
                                                <ChevronRight className={cn('h-4 w-4 transition', active ? 'text-[#C75D3B]' : 'text-[#33261F]/20 group-hover:text-[#C75D3B]')} />
                                            </>
                                        )}
                                    </motion.div>
                                </Link>
                            )
                        })}
                    </div>

                    <div className={cn('mt-5', collapsed ? 'space-y-2' : '')}>
                        {!collapsed && (
                            <div className="mb-2 px-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#33261F]/35">Áreas</span>
                            </div>
                        )}

                        {collapsed ? (
                            <div className="space-y-2">
                                {menuSections.flatMap(section => section.items).map(item => {
                                    const Icon = item.icon
                                    const active = isActive(item.path)

                                    return (
                                        <Link key={item.path} to={item.path} onClick={handleLinkClick} title={item.label} className="block">
                                            <motion.div
                                                whileTap={{ scale: 0.96 }}
                                                className={cn(
                                                    'relative grid h-11 place-items-center rounded-2xl border transition',
                                                    active
                                                        ? 'border-[#C75D3B]/15 bg-white text-[#C75D3B] shadow-sm shadow-[#4A3B32]/5'
                                                        : 'border-transparent bg-transparent text-[#33261F]/40 hover:border-[#E9DED6] hover:bg-white/65 hover:text-[#C75D3B]'
                                                )}
                                            >
                                                {active && <span className="absolute left-0 h-5 w-1 rounded-r-full bg-[#C75D3B]" />}
                                                <Icon className="h-[18px] w-[18px]" />
                                            </motion.div>
                                        </Link>
                                    )
                                })}
                            </div>
                        ) : (
                            <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-2">
                                {menuSections.map(section => {
                                    const SectionIcon = section.icon
                                    const active = sectionHasActive(section, location.pathname)

                                    return (
                                        <AccordionItem key={section.id} value={section.id} className="overflow-hidden rounded-2xl border border-[#E9DED6]/70 bg-white/45 px-1 shadow-sm shadow-[#4A3B32]/[0.02]">
                                            <AccordionTrigger className="group px-2.5 py-3 hover:no-underline">
                                                <div className="flex min-w-0 items-center gap-3 text-left">
                                                    <span className={cn(
                                                        'grid h-8 w-8 shrink-0 place-items-center rounded-xl transition',
                                                        active ? 'bg-[#C75D3B] text-white' : 'bg-[#33261F]/5 text-[#33261F]/45 group-hover:text-[#C75D3B]'
                                                    )}>
                                                        <SectionIcon className="h-4 w-4" />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className={cn('truncate text-[12px] font-black uppercase tracking-[0.08em]', active ? 'text-[#33261F]' : 'text-[#33261F]/70')}>
                                                            {section.label}
                                                        </p>
                                                        <p className="mt-0.5 truncate text-[10px] font-semibold text-[#33261F]/35">{section.hint}</p>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-2">
                                                <div className="space-y-1.5 border-l border-[#E9DED6] pl-3 ml-[1.45rem]">
                                                    {section.items.map(item => {
                                                        const Icon = item.icon
                                                        const activeItem = isActive(item.path)

                                                        return (
                                                            <Link key={item.path} to={item.path} onClick={handleLinkClick} className="block">
                                                                <motion.div
                                                                    whileTap={{ scale: 0.98 }}
                                                                    className={cn(
                                                                        'group/item relative flex h-10 items-center gap-2.5 rounded-xl px-2.5 transition',
                                                                        activeItem
                                                                            ? 'bg-[#33261F] text-white shadow-sm shadow-[#33261F]/10'
                                                                            : 'text-[#33261F]/55 hover:bg-[#F7EFE9] hover:text-[#33261F]'
                                                                    )}
                                                                >
                                                                    <Icon className={cn('h-4 w-4 shrink-0', activeItem ? 'text-[#F2B097]' : 'text-[#33261F]/35 group-hover/item:text-[#C75D3B]')} />
                                                                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{item.label}</span>
                                                                    {activeItem && <span className="h-1.5 w-1.5 rounded-full bg-[#F2B097]" />}
                                                                </motion.div>
                                                            </Link>
                                                        )
                                                    })}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                            </Accordion>
                        )}
                    </div>
                </nav>

                <footer className="shrink-0 border-t border-[#E9DED6] py-3">
                    {!collapsed && (
                        <div className="mb-2 rounded-2xl border border-white/80 bg-white/60 p-3 shadow-sm shadow-[#4A3B32]/5">
                            <div className="flex items-center gap-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#33261F] text-[11px] font-black text-white">AD</div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-black text-[#33261F]">Administrador</p>
                                    <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[#33261F]/35">Painel Enterprise</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={logout}
                            title={collapsed ? 'Sair do painel' : undefined}
                            className={cn(
                                'flex h-10 items-center justify-center rounded-2xl font-bold text-[#33261F]/50 transition hover:bg-red-50 hover:text-red-600',
                                collapsed ? 'w-full' : 'flex-1 gap-2 text-[12px]'
                            )}
                        >
                            <LogOut className="h-4 w-4" />
                            {!collapsed && 'Sair'}
                        </button>

                        {showCollapseToggle && (
                            <button
                                type="button"
                                onClick={collapseHandler}
                                className="grid h-10 w-10 place-items-center rounded-2xl text-[#33261F]/40 transition hover:bg-white hover:text-[#33261F]"
                                aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                            >
                                <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronLeft className="h-4 w-4" />
                                </motion.span>
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </motion.aside>
    )
}
