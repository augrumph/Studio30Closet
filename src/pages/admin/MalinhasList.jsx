import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, ShoppingBag, Clock, CheckCircle, XCircle, Truck, Calendar, ChevronRight, Plus, Trash2, Package, Pencil, Info } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/Pagination"
import { MalinhasListSkeleton } from '@/components/admin/PageSkeleton'
import { useAdminMalinhas, useAdminMalinhasMutations } from '@/hooks/useAdminMalinhas'

export function MalinhasList() {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [dateFilter, setDateFilter] = useState('all') // 'all', 'today', 'month'
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    // ⚡ REACT QUERY HOOK (BFF Paginado)
    const {
        malinhas: paginatedOrders,
        total: totalItems,
        totalPages,
        isLoading: ordersLoading,
        isError,
        error,
        refetch
    } = useAdminMalinhas({
        page: currentPage,
        pageSize: itemsPerPage,
        status: statusFilter,
        search: searchTerm,
        dateFilter: dateFilter
    })

    const { deleteMalinha: deleteOrder } = useAdminMalinhasMutations()
    const [deleteAlert, setDeleteAlert] = useState({ isOpen: false, orderId: null })

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, statusFilter, dateFilter])

    // Metrics Calculation - Ideally from Dashboard API, but using query data for now
    const metrics = useMemo(() => {
        if (!paginatedOrders) return { totalActive: 0, pending: 0, completedMonth: 0, totalItems: 0 }

        return {
            totalActive: totalItems, // Approximation or we can use more precise backend field
            pending: paginatedOrders.filter(o => o.status === 'pending').length, // Limited to current page
            completedMonth: paginatedOrders.filter(o => {
                const date = new Date(o.createdAt)
                const now = new Date()
                return o.status === 'completed' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
            }).length,
            totalItems: paginatedOrders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + (o.itemsCount || 0), 0)
        }
    }, [paginatedOrders, totalItems])

    // Handlers
    const handleDelete = (id, e) => {
        e.preventDefault()
        e.stopPropagation()
        setDeleteAlert({ isOpen: true, orderId: id })
    }

    const confirmDelete = async () => {
        const id = deleteAlert.orderId
        try {
            await deleteOrder(id)
            toast.success('Malinha removida com sucesso.')
            setDeleteAlert({ isOpen: false, orderId: null })
        } catch (err) {
            toast.error(formatUserFriendlyError(err))
        }
    }

    const statusMap = {
        pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
        shipped: { label: 'Enviado', color: 'bg-blue-100 text-blue-700', icon: Truck },
        delivered: { label: 'Entregue', color: 'bg-indigo-100 text-indigo-700', icon: Package },
        pickup_scheduled: { label: 'Coleta Agendada', color: 'bg-purple-100 text-purple-700', icon: Calendar },
        returned: { label: 'Devolvido', color: 'bg-amber-100 text-amber-700', icon: Clock },
        completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
        cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
    }

    // Skeleton View
    if (ordersLoading && paginatedOrders.length === 0) {
        return <MalinhasListSkeleton />
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header Premium */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Malinhas</h2>
                    </div>
                    <p className="text-[#4A3B32]/60 font-medium">Gestão logística de malas delivery.</p>
                </div>

                <ShimmerButton
                    onClick={() => window.location.href = '/admin/malinhas/new'}
                    className="px-8 py-4 rounded-2xl font-bold shadow-2xl"
                    shimmerColor="#ffffff"
                    shimmerSize="0.15em"
                    borderRadius="16px"
                    shimmerDuration="2s"
                    background="linear-gradient(135deg, #a855f7 0%, #4f46e5 100%)"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nova Malinha
                </ShimmerButton>
            </motion.div>

            {/* Quick Insights - Bento Style Cards */}
            <TooltipProvider delayDuration={200}>
                <div className="grid md:grid-cols-4 gap-6">
                    <KPI_Card
                        title="Ativas" value={metrics.totalActive} subtitle="Total em circulação"
                        icon={Package} color="text-purple-600" bg="bg-purple-50" border="border-purple-50"
                        tooltip="Malinhas em trânsito, com cliente ou aguardando envio/coleta."
                        delay={0.1}
                    />
                    <KPI_Card
                        title="Pendentes" value={metrics.pending} subtitle="Aguardando início"
                        icon={Clock} color="text-amber-600" bg="bg-amber-50" border="border-amber-50"
                        tooltip="Malinhas criadas que ainda aguardam o primeiro passo logístico."
                        delay={0.2}
                    />
                    <KPI_Card
                        title="Concluídas" value={metrics.completedMonth} subtitle="Este mês"
                        icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-50"
                        tooltip="Malinhas concluídas com sucesso no mês atual."
                        delay={0.3}
                    />
                    <KPI_Card
                        title="Total Peças" value={metrics.totalItems} subtitle="Volume em circulação"
                        icon={ShoppingBag} color="text-blue-600" bg="bg-blue-50" border="border-blue-50"
                        tooltip="Soma total de peças enviadas em todas as malinhas (exceto canceladas)."
                        delay={0.4}
                    />
                </div>
            </TooltipProvider>

            {/* Premium Filtering Area */}
            <Card className="border-none shadow-xl overflow-visible">
                <CardHeader className="bg-white p-6 border-b border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Nº Pedido ou Nome da Cliente..."
                            className="w-full pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl overflow-x-auto">
                            {[
                                { id: 'all', label: 'Tudo' },
                                { id: 'today', label: 'Hoje' },
                                { id: 'month', label: 'Mês' }
                            ].map(period => (
                                <button
                                    key={period.id}
                                    onClick={() => setDateFilter(period.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                        dateFilter === period.id
                                            ? "bg-[#4A3B32] text-white shadow-sm"
                                            : "text-[#4A3B32]/40 hover:text-[#4A3B32]"
                                    )}
                                >
                                    {period.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl overflow-x-auto">
                            {['all', 'pending', 'shipped', 'delivered', 'completed'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                        statusFilter === status
                                            ? "bg-white text-[#4A3B32] shadow-sm"
                                            : "text-[#4A3B32]/40 hover:text-[#4A3B32]"
                                    )}
                                >
                                    {status === 'all' ? 'Status' :
                                        status === 'pending' ? 'Pendentes' :
                                            status === 'shipped' ? 'Enviados' :
                                                status === 'delivered' ? 'Entregues' :
                                                    'Concluídos'}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#FAF8F5]/50 text-[#4A3B32]/40 text-[10px] uppercase font-bold tracking-[0.2em]">
                                <th className="px-8 py-5">Malinha / Itens</th>
                                <th className="px-8 py-5">Cliente</th>
                                <th className="px-8 py-5">Agendamento</th>
                                <th className="px-8 py-5">Status Logístico</th>
                                <th className="px-8 py-5 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {isError ? (
                                    <tr><td colSpan="5" className="py-24 text-center text-red-500 italic">Erro ao carregar malinhas. Tente recarregar.</td></tr>
                                ) : paginatedOrders.length > 0 ? (
                                    paginatedOrders.map((order, idx) => {
                                        const status = statusMap[order.status] || statusMap.pending
                                        return (
                                            <motion.tr
                                                key={order.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="hover:bg-[#FDFBF7]/40 transition-colors group"
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-[#C75D3B]">{order.orderNumber}</span>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <ShoppingBag className="w-3 h-3 text-gray-300" />
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{order.itemsCount} Peças</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {order.customer ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-[#FAF3F0] flex items-center justify-center text-[#4A3B32] font-bold text-xs border border-[#C75D3B]/10">
                                                                {order.customer.name ? order.customer.name.charAt(0) : '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-[#4A3B32] text-sm">{order.customer.name || 'Cliente desconhecido'}</p>
                                                                <p className="text-[10px] text-gray-400">{order.customer.phone || 'Telefone indisponível'}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p className="font-bold text-red-500 text-sm">Cliente não associado</p>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-3 h-3 text-[#C75D3B]/40" />
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] text-gray-300 font-bold uppercase tracking-tighter leading-none">Entrega:</span>
                                                                <span className={cn("text-[11px] font-bold", order.deliveryDate ? "text-[#4A3B32]" : "text-amber-500 italic")}>
                                                                    {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('pt-BR') : 'A DEFINIR'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-3 h-3 text-gray-300" />
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] text-gray-300 font-bold uppercase tracking-tighter leading-none">Coleta:</span>
                                                                <span className={cn("text-[11px] font-bold", order.pickupDate ? "text-[#4A3B32]" : "text-gray-300 italic")}>
                                                                    {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('pt-BR') : 'PENDENTE'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm",
                                                        status.color
                                                    )}>
                                                        <status.icon className="w-3.5 h-3.5" />
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <Link
                                                            to={`/admin/malinhas/${order.id}`}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl text-[10px] font-bold text-[#4A3B32] hover:bg-[#4A3B32] hover:text-white transition-all shadow-sm group-hover:shadow-md active:scale-95"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            VER
                                                        </Link>
                                                        <Link
                                                            to={`/admin/malinhas/${order.id}/edit`}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-100 rounded-2xl text-[10px] font-bold text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm group-hover:shadow-md active:scale-95"
                                                            title="Editar Malinha"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                            EDITAR
                                                        </Link>
                                                        <button
                                                            onClick={(e) => handleDelete(order.id, e)}
                                                            className="p-2 bg-white border border-gray-100 rounded-2xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm group-hover:shadow-md active:scale-95"
                                                            title="Excluir Malinha"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Calendar className="w-12 h-12 text-gray-100" />
                                                <div className="text-gray-400 font-medium font-display text-lg">
                                                    {searchTerm ? "Nenhuma malinha encontrada." : "Nenhuma malinha ativa."}
                                                </div>
                                                <p className="text-xs text-gray-300">Todas as malinhas estão em dia!</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div >

                <CardFooter className="bg-white border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4 p-6">
                    <p className="text-xs text-gray-400 font-medium">
                        Mostrando <span className="text-[#4A3B32] font-bold">{paginatedOrders.length}</span> de <span className="text-[#4A3B32] font-bold">{totalItems}</span> malinhas
                    </p>

                    {totalPages > 1 && (
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="cursor-pointer"
                                    />
                                </PaginationItem>
                                {/* Pagination simplified */}
                                <span className="mx-2 text-sm text-gray-500">Página {currentPage} de {totalPages}</span>
                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="cursor-pointer"
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    )}
                </CardFooter>
            </Card >

            <AlertDialog
                isOpen={deleteAlert.isOpen}
                onClose={() => setDeleteAlert({ isOpen: false, orderId: null })}
                onConfirm={confirmDelete}
                title="Remover Malinha?"
                description="Tem certeza que deseja remover esta malinha? Se houver peças enviadas, o estoque reservado será perdido e não estornado automaticamente."
                confirmText="Sim, Remover"
                cancelText="Manter Malinha"
                variant="danger"
            />
        </div >
    )
}

function KPI_Card({ title, value, subtitle, icon: Icon, color, bg, border, tooltip, delay }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
            <Card className={`${border} ${bg} bg-opacity-10(for white) bg-white group overflow-hidden relative h-full`}>
                <CardHeader className="pb-2 text-left">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 ${bg} rounded-xl`}><Icon className={`w-5 h-5 ${color}`} /></div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</span>
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                    <Info className="w-4 h-4 text-gray-300" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                <p>{tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </CardHeader>
                <CardContent className="text-left">
                    <div className="text-3xl font-display font-bold text-[#4A3B32]">{value}</div>
                    <p className={`text-xs ${color} font-medium mt-1`}>{subtitle}</p>
                </CardContent>
            </Card>
        </motion.div>
    )
}
