import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    Plus,
    Search,
    Phone,
    Mail,
    MessageSquare,
    Trash2,
    Edit2,
    SearchX,
    Calendar,
    TrendingUp,
    User
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { EmptyState, LoadingState, TableWrapper } from '@/components/admin/shared'
import { cn } from '@/lib/utils'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { useAdminCustomers, useAdminCustomersMutations } from '@/hooks/useAdminCustomers'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/Pagination'

const SEGMENT_FILTERS = [
    { value: 'all', label: 'Todos' },
    { value: 'vip', label: 'VIP' },
    { value: 'active', label: 'Ativos' },
    { value: 'at_risk', label: 'Em risco' },
    { value: 'churned', label: 'Sumidos' },
    { value: 'inactive', label: 'Inativos' },
    { value: 'birthdays', label: 'Aniversariantes' },
    { value: 'birthday_today', label: 'Hoje' }
]

const SEGMENT_META = {
    vip: { label: 'VIP', className: 'bg-amber-50 text-amber-700 border-amber-100' },
    active: { label: 'Ativo', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    at_risk: { label: 'Em risco', className: 'bg-orange-50 text-orange-700 border-orange-100' },
    churned: { label: 'Sumido', className: 'bg-rose-50 text-rose-700 border-rose-100' },
    inactive: { label: 'Inativo', className: 'bg-gray-50 text-gray-600 border-gray-100' }
}

function formatDate(value) {
    if (!value) return 'Sem histórico'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Sem histórico'
    return date.toLocaleDateString('pt-BR')
}

function formatCurrency(value) {
    return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CustomersList() {
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')
    const [segmentFilter, setSegmentFilter] = useState('all')
    const [page, setPage] = useState(1)
    const limit = 20
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' })
    const { deleteCustomer } = useAdminCustomersMutations()

    const { customers, total, totalPages, summaryCounts, isLoading, isError, error } = useAdminCustomers(
        page,
        limit,
        searchTerm,
        segmentFilter
    )

    useEffect(() => {
        setPage(1)
    }, [searchTerm, segmentFilter])

    const activeFilterCount = useMemo(() => {
        return SEGMENT_FILTERS.reduce((acc, filter) => {
            if (filter.value === 'all') return acc
            return acc + Number(summaryCounts?.[filter.value] || 0)
        }, 0)
    }, [summaryCounts])

    const handleDelete = (id, name) => {
        setConfirmDelete({ isOpen: true, id, name })
    }

    const onConfirmDelete = async () => {
        try {
            await deleteCustomer(confirmDelete.id)
            toast.success('Cliente removido com sucesso')
            setConfirmDelete({ isOpen: false, id: null, name: '' })
        } catch (err) {
            toast.error(formatUserFriendlyError(err))
        }
    }

    const openWhatsApp = (phone) => {
        if (!phone) return
        const cleanPhone = phone.replace(/\D/g, '')
        window.open(`https://wa.me/55${cleanPhone}`, '_blank')
    }

    if (isLoading) return <LoadingState message="Carregando base de clientes..." />
    if (isError) {
        return (
            <EmptyState
                title="Erro ao carregar clientes"
                description={formatUserFriendlyError(error)}
                icon={SearchX}
            />
        )
    }

    return (
        <div className="p-3 sm:p-6 lg:p-8 space-y-4 md:space-y-6 bg-gray-50 min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 md:gap-5"
            >
                {/* Header — compacto no mobile */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-display font-semibold text-[#4A3B32] tracking-tight leading-none">
                            Clientes
                        </h2>
                        <p className="text-xs md:text-sm text-[#4A3B32]/40 font-medium mt-0.5 hidden md:block">
                            Base ordenada por maior comprador.
                        </p>
                    </div>
                    <Link
                        to="/admin/customers/new"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 md:px-5 md:py-3 bg-[#C75D3B] text-white rounded-2xl font-bold shadow-lg shadow-[#C75D3B]/20 hover:bg-[#A64D31] transition-all active:scale-95 text-sm shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Novo Cliente</span>
                        <span className="sm:hidden">Novo</span>
                    </Link>
                </div>

                {/* Busca */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                        type="text"
                        placeholder="Nome, telefone ou e-mail..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 md:py-4 bg-white border-none rounded-2xl text-sm shadow-sm focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all placeholder:text-gray-300"
                    />
                </div>

                {/* Segmentos — scroll horizontal no mobile, wrap no desktop */}
                <div className="flex flex-wrap gap-2">
                    {SEGMENT_FILTERS.map(filter => {
                        const count = filter.value === 'all' ? total : Number(summaryCounts?.[filter.value] || 0)
                        const isActive = segmentFilter === filter.value
                        return (
                            <button
                                key={filter.value}
                                onClick={() => setSegmentFilter(filter.value)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] md:text-sm font-semibold transition-all whitespace-nowrap shrink-0',
                                    isActive
                                        ? 'bg-[#4A3B32] text-white border-[#4A3B32]'
                                        : 'bg-white text-[#4A3B32] border-gray-100 hover:border-[#C75D3B]/20 hover:text-[#C75D3B]'
                                )}
                            >
                                {filter.label}
                                <span className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                                )}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                    <MetricCard icon={User}         label="Total"  value={total} />
                    <MetricCard icon={TrendingUp}   label="VIP"    value={summaryCounts?.vip || 0} />
                    <MetricCard icon={Calendar}     label="Ativos" value={summaryCounts?.active || 0} />
                    <MetricCard icon={MessageSquare} label="Risco" value={summaryCounts?.at_risk || 0} />
                </div>

                {activeFilterCount === 0 && segmentFilter !== 'all' && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 font-medium">
                        Este filtro não tem resultados no momento.
                    </div>
                )}
            </motion.div>

            <AnimatePresence mode="wait">
                {customers.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <EmptyState
                            title="Nenhum cliente encontrado"
                            description="Tente outro filtro ou cadastre um novo cliente."
                            icon={SearchX}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="space-y-4"
                    >
                        <div className="md:hidden space-y-3">
                            {customers.map((customer) => (
                                <CustomerCard
                                    key={customer.id}
                                    customer={customer}
                                    onEdit={() => navigate(`/admin/customers/${customer.id}`)}
                                    onDelete={() => handleDelete(customer.id, customer.name)}
                                    onWhatsApp={() => openWhatsApp(customer.phone)}
                                />
                            ))}
                        </div>

                        <div className="hidden md:block">
                            <TableWrapper>
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                                            <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Resumo</th>
                                            <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Contato</th>
                                            <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {customers.map((customer) => (
                                            <tr
                                                key={customer.id}
                                                className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                                onClick={() => navigate(`/admin/customers/${customer.id}`)}
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FDF0ED] to-[#FEFAF9] flex items-center justify-center text-[#C75D3B] font-bold shadow-sm">
                                                            {customer.name?.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-[#4A3B32] truncate">{customer.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">#{customer.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-bold text-[#4A3B32]">{formatCurrency(customer.lifetimeValue)}</span>
                                                        <span className="text-[10px] px-2 py-1 rounded-full bg-gray-50 text-gray-500 font-bold uppercase tracking-widest">
                                                            {customer.totalOrders || 0} pedidos
                                                        </span>
                                                        <span className={cn(
                                                            'text-[10px] px-2 py-1 rounded-full border font-bold uppercase tracking-widest',
                                                            SEGMENT_META[customer.segment]?.className || 'bg-gray-50 text-gray-500 border-gray-100'
                                                        )}>
                                                            {SEGMENT_META[customer.segment]?.label || customer.segment || 'Sem segmento'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                                            <Phone className="w-3.5 h-3.5 text-gray-300" />
                                                            {customer.phone || 'N/A'}
                                                        </div>
                                                        {customer.email && (
                                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                                <Mail className="w-3.5 h-3.5 text-gray-200" />
                                                                {customer.email}
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-gray-400 font-medium">
                                                            Última compra: {formatDate(customer.lastPurchaseDate)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button
                                                            onClick={() => openWhatsApp(customer.phone)}
                                                            className="p-2 hover:bg-emerald-50 rounded-xl text-emerald-500 transition-colors"
                                                            title="WhatsApp"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/admin/customers/${customer.id}`)}
                                                            className="p-2 hover:bg-[#FDF0ED] rounded-xl text-[#C75D3B] transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(customer.id, customer.name)}
                                                            className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableWrapper>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-gray-400 font-medium">
                        Mostrando <span className="text-[#4A3B32] font-bold">{customers.length}</span> de <span className="text-[#4A3B32] font-bold">{total}</span> clientes
                    </p>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
                            </PaginationItem>
                            <div className="flex items-center gap-2 mx-4 text-sm font-bold text-[#4A3B32]">
                                Página {page} de {totalPages}
                            </div>
                            <PaginationItem>
                                <PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}

            <AlertDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
                onConfirm={onConfirmDelete}
                title="Excluir Cliente?"
                description={`Tem certeza que deseja remover ${confirmDelete.name}? Esta ação não pode ser desfeita.`}
                confirmText="Excluir"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}

function MetricCard({ icon: Icon, label, value }) {
    return (
        <div className="bg-white rounded-2xl border border-[#EDE0D8] p-3 flex items-center gap-2.5">
            <div className="h-8 w-8 shrink-0 grid place-items-center rounded-xl bg-[#F0E6DF]">
                <Icon className="w-4 h-4 text-[#C75D3B]" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-[#A07060] uppercase tracking-[0.1em] truncate">{label}</p>
                <p className="text-[18px] font-black text-[#2C1810] leading-none mt-0.5">{value}</p>
            </div>
        </div>
    )
}

function CustomerCard({ customer, onEdit, onDelete, onWhatsApp }) {
    const seg = SEGMENT_META[customer.segment]

    return (
        <div className={cn(
            'bg-white rounded-2xl overflow-hidden border transition-all duration-150 active:scale-[0.99]',
            customer.isVip
                ? 'border-amber-200 shadow-sm shadow-amber-100'
                : 'border-[#EDE0D8] shadow-sm'
        )}>
            {/* Linha principal — toca abre o perfil */}
            <button
                type="button"
                onClick={onEdit}
                className="w-full flex items-center gap-3 px-4 pt-4 pb-3 text-left"
            >
                {/* Avatar com inicial */}
                <div className={cn(
                    'h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center text-[17px] font-black',
                    customer.isVip
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-[#F0E6DF] text-[#C75D3B]'
                )}>
                    {customer.name?.charAt(0)?.toUpperCase()}
                </div>

                {/* Info principal */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-[15px] text-[#2C1810] truncate leading-tight">
                            {customer.name}
                        </p>
                        {customer.isVip && (
                            <span className="shrink-0 text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">VIP</span>
                        )}
                    </div>

                    {/* LTV + pedidos + segmento */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[13px] font-black text-[#2C1810]">
                            {formatCurrency(customer.lifetimeValue)}
                        </span>
                        <span className="text-[10px] text-[#A07060] font-semibold">
                            {customer.totalOrders || 0} pedido{customer.totalOrders !== 1 ? 's' : ''}
                        </span>
                        {seg && !customer.isVip && (
                            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', seg.className)}>
                                {seg.label}
                            </span>
                        )}
                    </div>
                </div>

                {/* Última compra — alinhado à direita */}
                <div className="shrink-0 text-right">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#C4A090]">Última</p>
                    <p className="text-[11px] font-semibold text-[#8C6150] mt-0.5">
                        {formatDate(customer.lastPurchaseDate)}
                    </p>
                </div>
            </button>

            {/* Contato + ações numa linha só */}
            <div className="flex items-center gap-0 px-4 pb-3 border-t border-[#F5EBE4] pt-2.5">
                {/* Telefone / email */}
                <div className="flex-1 min-w-0">
                    {customer.phone ? (
                        <p className="text-[12px] font-semibold text-[#6B4030] truncate flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0 text-[#C4A090]" />
                            {customer.phone}
                        </p>
                    ) : customer.email ? (
                        <p className="text-[12px] font-semibold text-[#6B4030] truncate flex items-center gap-1.5">
                            <Mail className="h-3 w-3 shrink-0 text-[#C4A090]" />
                            {customer.email}
                        </p>
                    ) : (
                        <p className="text-[11px] text-[#C4A090] italic">Sem contato</p>
                    )}
                </div>

                {/* Ações compactas */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {customer.phone && (
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); onWhatsApp() }}
                            className="h-8 w-8 grid place-items-center rounded-xl bg-emerald-100 text-emerald-700 transition-colors active:scale-95"
                            title="WhatsApp"
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onEdit() }}
                        className="h-8 w-8 grid place-items-center rounded-xl bg-[#F0E6DF] text-[#C75D3B] transition-colors active:scale-95"
                        title="Ver perfil"
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onDelete() }}
                        className="h-8 w-8 grid place-items-center rounded-xl bg-red-50 text-red-500 transition-colors active:scale-95"
                        title="Excluir"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
