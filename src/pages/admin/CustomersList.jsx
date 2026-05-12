import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    Plus,
    Search,
    Phone,
    Mail,
    MessageSquare,
    Filter,
    Download,
    LayoutGrid,
    List,
    Trash2,
    Edit2,
    SearchX,
    Calendar,
    TrendingUp,
    User
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/Card'
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
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-5"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-display font-semibold text-[#4A3B32] tracking-tight">
                            Clientes
                        </h2>
                        <p className="text-sm text-[#4A3B32]/40 font-medium">
                            Base ordenada por maior comprador. Toque em um card para abrir o cadastro.
                        </p>
                    </div>

                    <Link
                        to="/admin/customers/new"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#C75D3B] text-white rounded-2xl font-bold shadow-lg shadow-[#C75D3B]/20 hover:bg-[#A64D31] transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Cliente
                    </Link>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, telefone ou e-mail..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl text-sm shadow-sm focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all placeholder:text-gray-300"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-semibold text-[#4A3B32] shadow-sm hover:bg-gray-50 transition-all">
                            <Filter className="w-4 h-4 text-gray-400" />
                            Filtros
                        </button>
                        <button className="px-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-semibold text-[#4A3B32] shadow-sm hover:bg-gray-50 transition-all">
                            <Download className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {SEGMENT_FILTERS.map(filter => {
                        const count = filter.value === 'all' ? total : Number(summaryCounts?.[filter.value] || 0)
                        return (
                            <button
                                key={filter.value}
                                onClick={() => setSegmentFilter(filter.value)}
                                className={cn(
                                    'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all',
                                    segmentFilter === filter.value
                                        ? 'bg-[#4A3B32] text-white border-[#4A3B32]'
                                        : 'bg-white text-[#4A3B32] border-gray-100 hover:border-[#C75D3B]/20 hover:text-[#C75D3B]'
                                )}
                            >
                                {filter.label}
                                <span className={cn(
                                    'text-[10px] px-2 py-0.5 rounded-full',
                                    segmentFilter === filter.value ? 'bg-white/15 text-white' : 'bg-gray-50 text-gray-400'
                                )}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MetricCard icon={User} label="Total" value={total} />
                    <MetricCard icon={TrendingUp} label="VIP" value={summaryCounts?.vip || 0} />
                    <MetricCard icon={Calendar} label="Ativos" value={summaryCounts?.active || 0} />
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
        <Card className="border-none bg-white shadow-sm overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#FDF0ED]">
                        <Icon className="w-5 h-5 text-[#C75D3B]" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                        <p className="text-lg font-black text-[#4A3B32] leading-none mt-1">{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function CustomerCard({ customer, onEdit, onDelete, onWhatsApp }) {
    return (
        <Card className="group border-none bg-white shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <button
                        onClick={onEdit}
                        className="flex items-start gap-3 text-left min-w-0 flex-1"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FDF0ED] to-[#FEFAF9] flex items-center justify-center text-[#C75D3B] font-bold shadow-sm flex-shrink-0">
                            {customer.name?.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-[#4A3B32] text-base leading-tight truncate">
                                {customer.name}
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                #{customer.id}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="text-sm font-black text-[#4A3B32]">{formatCurrency(customer.lifetimeValue)}</span>
                                <span className="text-[10px] px-2 py-1 rounded-full bg-gray-50 text-gray-500 font-bold uppercase tracking-widest">
                                    {customer.totalOrders || 0} pedidos
                                </span>
                            </div>
                        </div>
                    </button>

                    <span className={cn(
                        'text-[10px] px-2 py-1 rounded-full border font-bold uppercase tracking-widest flex-shrink-0',
                        SEGMENT_META[customer.segment]?.className || 'bg-gray-50 text-gray-500 border-gray-100'
                    )}>
                        {SEGMENT_META[customer.segment]?.label || customer.segment || 'Sem segmento'}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-4 mt-4 border-t border-gray-50">
                    {customer.phone && (
                        <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                <Phone className="w-4 h-4" />
                            </div>
                            <span className="truncate">{customer.phone}</span>
                        </div>
                    )}
                    {customer.email && (
                        <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                <Mail className="w-4 h-4" />
                            </div>
                            <span className="truncate">{customer.email}</span>
                        </div>
                    )}
                    <div className="text-xs text-gray-400 font-medium">
                        Última compra: {formatDate(customer.lastPurchaseDate)}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                    <button
                        onClick={onWhatsApp}
                        className="inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/10 active:scale-95"
                    >
                        <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onEdit}
                        className="inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#FDF0ED] text-[#C75D3B] font-bold text-sm active:scale-95"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 text-red-500 font-bold text-sm active:scale-95"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </CardContent>
        </Card>
    )
}
