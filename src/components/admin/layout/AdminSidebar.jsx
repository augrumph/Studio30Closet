import { Link, useLocation } from 'react-router-dom'
import {
    BarChart3, Boxes, ChevronDown, ChevronLeft,
    CircleDollarSign, ClipboardList, CreditCard,
    LayoutDashboard, Link as LinkIcon, LogOut,
    Package, PackageCheck, ShoppingCart,
    Store, TrendingDown, Truck, Users, X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { ShimmerButton } from '@/components/magicui/shimmer-button'

// ── Data ────────────────────────────────────────────────────────────────────
const PINNED = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/vendas',    label: 'Vendas',    icon: CircleDollarSign },
]

const SECTIONS = [
    {
        id: 'comercial', label: 'Comercial',
        items: [
            { path: '/admin/products',       label: 'Produtos',       icon: Package },
            { path: '/admin/malinhas',       label: 'Malinhas',       icon: Store },
            { path: '/admin/pedidos-online', label: 'Pedidos Online', icon: ClipboardList },
            { path: '/admin/entregas',       label: 'Entregas',       icon: PackageCheck },
        ],
    },
    {
        id: 'gestao', label: 'Gestão',
        items: [
            { path: '/admin/customers',  label: 'Clientes',     icon: Users },
            { path: '/admin/stock',      label: 'Estoque',      icon: Boxes },
            { path: '/admin/returns',    label: 'Trocas & Devoluções', icon: PackageCheck },
            { path: '/admin/suppliers',  label: 'Fornecedores', icon: Truck },
            { path: '/admin/purchases',  label: 'Compras',      icon: ShoppingCart },
        ],
    },
    {
        id: 'financeiro', label: 'Financeiro',
        items: [
            { path: '/admin/installments', label: 'Crediário', icon: CreditCard },
            { path: '/admin/expenses',     label: 'Despesas',  icon: TrendingDown },
        ],
    },
    {
        id: 'plataforma', label: 'Plataforma',
        items: [
            { path: '/admin/integracoes', label: 'Integrações',      icon: LinkIcon },
            { path: '/admin/site',        label: 'Site & Analytics', icon: BarChart3 },
        ],
    },
]

function sectionHasActive(section, pathname) {
    return section.items.some(
        item => pathname === item.path || pathname.startsWith(`${item.path}/`)
    )
}

// ── Item de nav (pinned e rail colapsado) ───────────────────────────────────
function NavItem({ path, label, icon: Icon, active, onClick, collapsed, mobile }) {
    return (
        <Link to={path} onClick={onClick} title={collapsed ? label : undefined}>
            <div className={cn(
                'relative flex items-center rounded-xl transition-all duration-200',
                mobile   ? 'h-[52px]' : 'h-[42px]',
                collapsed ? 'justify-center' : 'gap-3 px-3',
                active
                    ? 'bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}>
                {/* Indicador Ativo Lateral */}
                <span className={cn(
                    'absolute left-0 w-[4px] rounded-r-full bg-[#E87D4F] transition-all duration-300 shadow-[0_0_12px_rgba(232,125,79,0.5)]',
                    mobile ? 'h-[24px]' : 'h-[20px]',
                    active ? 'opacity-100' : 'opacity-0 scale-y-0',
                )} />
                
                <div className={cn(
                    'flex items-center justify-center rounded-lg transition-colors',
                    active ? 'text-white' : 'text-white/30'
                )}>
                    <Icon className={cn(
                        'shrink-0',
                        mobile ? 'h-[20px] w-[20px]' : 'h-[18px] w-[18px]',
                    )} />
                </div>

                {!collapsed && (
                    <span className={cn(
                        'flex-1 truncate font-medium tracking-wide',
                        mobile ? 'text-[15px]' : 'text-[14px]',
                    )}>
                        {label}
                    </span>
                )}
                
                {active && !collapsed && (
                    <motion.div 
                        layoutId="active-glow"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#E87D4F]/10 to-transparent pointer-events-none" 
                    />
                )}
            </div>
        </Link>
    )
}

// ── Item dentro do acordeão ──────────────────────────────────────────────────
function AccordionItem({ path, label, icon: Icon, active, onClick, mobile }) {
    return (
        <Link to={path} onClick={onClick}>
            <div className={cn(
                'group flex items-center gap-3 rounded-lg px-3 transition-all duration-200',
                mobile ? 'h-[48px]' : 'h-[38px]',
                active
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white',
            )}>
                <Icon className={cn(
                    'shrink-0 transition-colors',
                    mobile ? 'h-[16px] w-[16px]' : 'h-[15px] w-[15px]',
                    active ? 'text-white' : 'text-white/20 group-hover:text-white/50',
                )} />
                <span className={cn(
                    'flex-1 truncate tracking-wide',
                    mobile ? 'text-[14px]' : 'text-[13.5px]',
                    active ? 'font-semibold' : 'font-medium',
                )}>
                    {label}
                </span>
                {active && (
                    <motion.span 
                        layoutId="dot"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E87D4F] shadow-[0_0_8px_rgba(232,125,79,0.8)]" 
                    />
                )}
            </div>
        </Link>
    )
}

// ── Seção acordeão ───────────────────────────────────────────────────────────
function Section({ section, isOpen, hasActive, onToggle, onLinkClick, activeCheck, mobile }) {
    return (
        <div>
            {/* Trigger */}
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    'relative flex w-full items-center rounded-xl px-3 text-left transition-all duration-200',
                    mobile ? 'h-[50px] gap-3' : 'h-[40px] gap-2.5',
                    isOpen
                        ? 'text-white'
                        : 'text-white/50 hover:text-white/90',
                )}
            >
                <span className={cn(
                    'flex-1 truncate font-bold uppercase tracking-[0.15em]',
                    mobile ? 'text-[11.5px]' : 'text-[10px]',
                )}>
                    {section.label}
                </span>

                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: 'backOut' }}
                    className={cn('shrink-0', isOpen ? 'text-[#E87D4F]' : 'text-white/20')}
                >
                    <ChevronDown className={mobile ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
                </motion.span>
            </button>

            {/* Items */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="relative ml-[15px] mt-1 space-y-1 pb-2 pl-[16px] before:absolute before:left-0 before:top-1 before:h-[calc(100%-12px)] before:w-px before:bg-white/10">
                            {section.items.map(item => (
                                <AccordionItem
                                    key={item.path}
                                    {...item}
                                    active={activeCheck(item.path)}
                                    onClick={onLinkClick}
                                    mobile={mobile}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── AdminSidebar ─────────────────────────────────────────────────────────────
export function AdminSidebar({
    onClose, isCollapsed, onToggleCollapse,
    isOpen, toggleSidebar, isMobile = false,
}) {
    const location        = useLocation()
    const logout          = useAuthStore(s => s.logout)
    const collapsed       = isMobile ? false
                          : typeof isCollapsed === 'boolean' ? isCollapsed
                          : typeof isOpen      === 'boolean' ? !isOpen
                          : false
    const closeHandler    = onClose || (isMobile ? toggleSidebar : undefined)
    const collapseHandler = onToggleCollapse || toggleSidebar
    const showCollapse    = !isMobile && Boolean(collapseHandler)

    const [openSection, setOpenSection] = useState(() => {
        const f = SECTIONS.find(s => sectionHasActive(s, location.pathname))
        return f?.id ?? null
    })

    useEffect(() => {
        const f = SECTIONS.find(s => sectionHasActive(s, location.pathname))
        if (f) setOpenSection(f.id)
    }, [location.pathname])

    const isActive   = p => p === '/admin/dashboard'
        ? location.pathname === p
        : location.pathname === p || location.pathname.startsWith(`${p}/`)
    const handleLink = () => closeHandler?.()
    const toggle     = id => setOpenSection(prev => prev === id ? null : id)

    const allFlat = [...PINNED, ...SECTIONS.flatMap(s => s.items)]

    return (
        <motion.aside
            animate={{ width: collapsed ? 64 : (isMobile ? '100%' : 236) }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 flex h-full flex-col overflow-hidden bg-[#0D0805] shadow-2xl"
        >
            {/* ── Header ──────────────────────────── */}
            <div className="shrink-0 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
                <div className={cn(
                    'flex items-center',
                    isMobile    ? 'px-5 py-5'
                    : collapsed ? 'justify-center py-5'
                    : 'gap-3 px-4 py-[18px]',
                )}>
                    <Link to="/admin/dashboard" onClick={handleLink} className="flex shrink-0 items-center gap-3">
                        <div className={cn(
                            'grid shrink-0 place-items-center rounded-xl bg-[#F0DDD5] shadow-sm ring-1 ring-[#C75D3B]/20',
                            isMobile ? 'h-10 w-10' : 'h-9 w-9',
                        )}>
                            <img src="/logomarca.webp" alt="Studio 30"
                                className={isMobile ? 'h-6 w-6 object-contain' : 'h-[22px] w-[22px] object-contain'} />
                        </div>
                        {!collapsed && (
                            <div className="leading-none">
                                <p className={cn('font-black uppercase tracking-[0.15em] text-white',
                                    isMobile ? 'text-[15px]' : 'text-[14px]')}>
                                    Studio 30
                                </p>
                                <p className={cn('mt-[3px] font-bold uppercase tracking-[0.25em] text-[#E87D4F]',
                                    isMobile ? 'text-[10px]' : 'text-[9px]')}>
                                    Admin
                                </p>
                            </div>
                        )}
                    </Link>

                    {isMobile && closeHandler && (
                        <button type="button" onClick={closeHandler}
                            className="ml-auto grid h-10 w-10 place-items-center rounded-xl text-[#A07060] transition-colors duration-150 hover:bg-[#F0DDD5] hover:text-[#3D1F10]">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Nav ─────────────────────────────── */}
            <nav className={cn(
                'min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                isMobile ? 'p-3' : 'p-2',
            )}>
                {collapsed ? (
                    // Rail de ícones
                    <div className="space-y-0.5">
                        {allFlat.map(item => (
                            <NavItem
                                key={item.path}
                                {...item}
                                active={isActive(item.path)}
                                onClick={handleLink}
                                collapsed
                                mobile={false}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {/* Pinned */}
                        {PINNED.map(item => (
                            <NavItem
                                key={item.path}
                                {...item}
                                active={isActive(item.path)}
                                onClick={handleLink}
                                collapsed={false}
                                mobile={isMobile}
                            />
                        ))}

                        {/* Divisor */}
                        <div className={cn('h-px bg-white/5', isMobile ? 'my-4' : 'my-3')} />

                        {/* Acordeões */}
                        {SECTIONS.map(section => (
                            <Section
                                key={section.id}
                                section={section}
                                isOpen={openSection === section.id}
                                hasActive={sectionHasActive(section, location.pathname)}
                                onToggle={() => toggle(section.id)}
                                onLinkClick={handleLink}
                                activeCheck={isActive}
                                mobile={isMobile}
                            />
                        ))}
                    </div>
                )}
            </nav>

            {/* ── Footer ──────────────────────────── */}
            <div className={cn(
                'shrink-0 border-t border-white/5 bg-[#1A0F0A]/50 backdrop-blur-md',
                isMobile ? 'p-4' : 'p-3',
            )}>
                <div className={cn('flex items-center gap-1.5', collapsed && 'flex-col')}>
                    <ShimmerButton
                        onClick={logout}
                        title={collapsed ? 'Sair' : undefined}
                        background="rgba(255, 255, 255, 0.03)"
                        shimmerColor="rgba(232, 125, 79, 0.3)"
                        shimmerSize="0.05em"
                        shimmerDuration="3s"
                        borderRadius="12px"
                        className={cn(
                            'gap-2.5 border-white/10 px-0 font-bold tracking-wide',
                            'text-white/70 hover:text-white hover:scale-[1.02] active:scale-[0.98]',
                            isMobile ? 'h-[52px] text-[14px]' : 'h-[42px] text-[13px]',
                            collapsed ? 'w-full justify-center' : 'flex-1',
                        )}
                    >
                        <LogOut className={cn('shrink-0', isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
                        {!collapsed && 'Sair da Conta'}
                    </ShimmerButton>

                    {showCollapse && (
                        <button type="button" onClick={collapseHandler}
                            aria-label={collapsed ? 'Expandir' : 'Recolher'}
                            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white">
                            <motion.span
                                animate={{ rotate: collapsed ? 180 : 0 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </motion.span>
                        </button>
                    )}
                </div>
            </div>
        </motion.aside>
    )
}
