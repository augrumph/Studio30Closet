import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, DollarSign, Calendar, CreditCard, ChevronRight, MoreHorizontal, TrendingUp, Trash2, Edit2, ShoppingCart, AlertTriangle } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { toast } from 'sonner'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import { Info } from 'lucide-react'
import { VendasListSkeleton } from '@/components/admin/PageSkeleton'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/Pagination"

import { useAdminSalesMutations } from '@/hooks/useAdminSales'
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData'
import { useAdminVendas } from '@/hooks/useAdminVendas'

export function VendasList() {
    // Estado de filtros
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('all')
    const [page, setPage] = useState(1)
    const [itemsPerPage] = useState(20)
    const [dateFilter, setDateFilter] = useState('all')
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, vendaId: null, customerName: '' })

    // ⚡ BFF DATA: Hooks
    // 1. Dados para métricas (Dashboard Stats - BFF)
    const {
        dashboardMetricsRaw: backendMetrics,
        isLoading: isLoadingMetrics,
    } = useAdminDashboardData()

    const {
        data: vendasData,
        isLoading: isLoadingVendas,
        isError,
        error
    } = useAdminVendas({
        page,
        pageSize: itemsPerPage,
        status: filterPaymentStatus,
        method: filterType,
        dateFilter: dateFilter,
        search: searchTerm
    })

    const { deleteSale } = useAdminSalesMutations()

    // Error handling debug
    useEffect(() => {
        if (isError) {
            console.error("VendasList Error:", error)
            toast.error("Erro ao carregar vendas. Tente fazer login novamente.")
        }
    }, [isError, error])

    // Reset page quando filtros mudam
    useEffect(() => {
        setPage(1)
    }, [searchTerm, filterType, filterPaymentStatus, dateFilter])

    // Mapeamento de dados da API
    const paginatedVendas = vendasData?.items || []
    const totalItems = vendasData?.total || 0
    const totalPages = vendasData?.totalPages || 0

    // Usar as métricas calculadas no servidor
    const metrics = useMemo(() => {
        if (!backendMetrics?.summary) return { totalRevenue: 0, pendingCrediario: 0, totalDevedores: 0, valorDevedores: 0, averageTicket: 0 }

        return {
            totalRevenue: backendMetrics.summary.grossRevenue || 0,
            pendingCrediario: backendMetrics.cashFlow?.receivedAmount || 0, // Ajustar conforme campos reais
            totalDevedores: backendMetrics.operational?.costWarnings || 0,
            valorDevedores: backendMetrics.summary.netRevenue - (backendMetrics.cashFlow?.receivedAmount || 0),
            averageTicket: backendMetrics.operational?.averageTicket || 0
        }
    }, [backendMetrics])

    const paymentMethods = {
        pix: { label: 'PIX', color: 'bg-emerald-100 text-emerald-700' },
        debit: { label: 'Débito', color: 'bg-blue-100 text-blue-700' },
        card_machine: { label: 'Crédito', color: 'bg-blue-100 text-blue-700' },
        credito_parcelado: { label: 'Créd. Parc.', color: 'bg-indigo-100 text-indigo-700' },
        fiado: { label: 'Crediário', color: 'bg-amber-100 text-amber-700' },
        fiado_parcelado: { label: 'Crediário', color: 'bg-orange-100 text-orange-700' },
        cash: { label: 'Dinheiro', color: 'bg-gray-100 text-gray-700' },
        card: { label: 'Cartão', color: 'bg-blue-100 text-blue-700' }
    }

    const handleDelete = (id, customer) => {
        setConfirmDelete({ isOpen: true, vendaId: id, customerName: customer })
    }

    const onConfirmDelete = async () => {
        try {
            await deleteSale(confirmDelete.vendaId)
            toast.success('Venda removida com sucesso.')
        } catch (error) {
            toast.error(formatUserFriendlyError(error))
        }
        setConfirmDelete({ ...confirmDelete, isOpen: false })
    }

    // Show skeleton while loading
    if (isLoadingVendas && paginatedVendas.length === 0) {
        return <VendasListSkeleton />
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
                        <div className="p-3 bg-gradient-to-br from-[#C75D3B] to-[#A64D31] rounded-2xl shadow-lg">
                            <ShoppingCart className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Vendas</h2>
                    </div>
                    <p className="text-[#4A3B32]/60 font-medium">Histórico completo de faturamento e recebimentos.</p>
                </div>

                <ShimmerButton
                    onClick={() => window.location.href = '/admin/vendas/new'}
                    className="px-8 py-4 rounded-2xl font-bold shadow-2xl"
                    shimmerColor="#ffffff"
                    shimmerSize="0.15em"
                    borderRadius="16px"
                    shimmerDuration="2s"
                    background="linear-gradient(135deg, #C75D3B 0%, #A64D31 100%)"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nova Venda
                </ShimmerButton>
            </motion.div>

            {/* Quick Insights - Bento Style Cards */}
            <TooltipProvider delayDuration={200}>
                <div className="grid md:grid-cols-4 gap-6">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border-emerald-50 bg-white group overflow-hidden relative">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-xl"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Faturamento</span>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                                <Info className="w-4 h-4 text-gray-300" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                            <p>Soma total de todas as vendas registradas (Pagas e Pendentes).</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-display font-bold text-[#4A3B32]">
                                    R$ {(metrics.totalRevenue || 0).toLocaleString('pt-BR')}
                                </div>
                                <p className="text-xs text-emerald-600 font-medium mt-1">Total bruto acumulado</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="border-indigo-50 bg-white group overflow-hidden relative">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 rounded-xl"><DollarSign className="w-5 h-5 text-indigo-600" /></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ticket Médio</span>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                                <Info className="w-4 h-4 text-gray-300" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                            <p>Valor médio gasto por venda (Faturamento Total / Quantidade de Vendas).</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-display font-bold text-[#4A3B32]">
                                    R$ {(metrics.averageTicket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-xs text-indigo-600 font-medium mt-1">Média por venda</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="border-[#FDF0ED] bg-white group overflow-hidden relative">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-[#FDF0ED] rounded-xl"><TrendingUp className="w-5 h-5 text-[#C75D3B]" /></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Performance Hoje</span>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                                <Info className="w-4 h-4 text-gray-300" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                            <p>Quantidade total de vendas realizadas no dia de hoje.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-display font-bold text-[#4A3B32]">
                                    {backendMetrics?.summary?.todaySalesCount || 0}
                                    <span className="text-sm font-medium text-gray-400 ml-2">vendas hoje</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Card de Devedores - DESTAQUE */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Card className="border-red-100 bg-gradient-to-br from-red-50 to-white cursor-pointer hover:shadow-lg transition-all group overflow-hidden relative"
                            onClick={() => setFilterPaymentStatus('pending')}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-100 rounded-xl"><CreditCard className="w-5 h-5 text-red-600" /></div>
                                            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">⚠️ Devedores</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {metrics.totalDevedores > 0 && (
                                                <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                                    {metrics.totalDevedores}
                                                </span>
                                            )}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button className="p-1.5 hover:bg-red-200/50 rounded-full transition-colors">
                                                        <Info className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                                    <p>Soma total de TODAS as vendas pendentes (Crediário e outros métodos aguardando pagamento).</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-display font-bold text-red-600">
                                    R$ {(metrics.valorDevedores || 0).toLocaleString('pt-BR')}
                                </div>
                                <p className="text-xs text-red-500 font-medium mt-1">
                                    {metrics.totalDevedores} {metrics.totalDevedores === 1 ? 'venda pendente' : 'vendas pendentes'}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </TooltipProvider>

            {/* Premium Table Area */}
            <Card className="overflow-hidden border-none shadow-xl">
                <CardHeader className="bg-white border-b border-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between p-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <CardTitle className="hidden md:block">Registros</CardTitle>
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Procurar por cliente..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        {/* Filtro de Período */}
                        <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl">
                            {[
                                { id: 'all', label: 'Tudo' },
                                { id: 'today', label: 'Hoje' },
                                { id: 'month', label: 'Mês' }
                            ].map(period => (
                                <button
                                    key={period.id}
                                    onClick={() => setDateFilter(period.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                        dateFilter === period.id
                                            ? "bg-[#4A3B32] text-white shadow-sm"
                                            : "text-[#4A3B32]/40 hover:text-[#4A3B32]"
                                    )}
                                >
                                    {period.label}
                                </button>
                            ))}
                        </div>

                        {/* Filtro de Método de Pagamento */}
                        <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl">
                            {['all', 'pix', 'card', 'fiado_parcelado'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                        filterType === type
                                            ? "bg-white text-[#4A3B32] shadow-sm"
                                            : "text-[#4A3B32]/40 hover:text-[#4A3B32]"
                                    )}
                                >
                                    {type === 'all' ? 'Método' : type === 'fiado_parcelado' ? 'Crediário' : type.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Filtro de Status de Pagamento */}
                        <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl">
                            <button
                                onClick={() => setFilterPaymentStatus('all')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                    filterPaymentStatus === 'all'
                                        ? "bg-white text-[#4A3B32] shadow-sm"
                                        : "text-[#4A3B32]/40 hover:text-[#4A3B32]"
                                )}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilterPaymentStatus('paid')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                    filterPaymentStatus === 'paid'
                                        ? "bg-emerald-500 text-white shadow-sm"
                                        : "text-emerald-600/40 hover:text-emerald-600"
                                )}
                            >
                                ✓ Pagos
                            </button>
                            <button
                                onClick={() => setFilterPaymentStatus('pending')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                    filterPaymentStatus === 'pending'
                                        ? "bg-red-500 text-white shadow-sm"
                                        : "text-red-600/40 hover:text-red-600"
                                )}
                            >
                                ⚠ Pendentes
                            </button>
                        </div>
                    </div>
                </CardHeader>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#FAF8F5]/50 text-[#4A3B32]/40 text-[10px] uppercase font-bold tracking-[0.2em]">
                                <th className="px-8 py-5">Data / Horário</th>
                                <th className="px-8 py-5">Cliente</th>
                                <th className="px-8 py-5">Método</th>
                                <th className="px-8 py-5 text-right">Lcr Bruto</th>
                                <th className="px-8 py-5 text-right">Valor Final</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {isLoadingVendas ? (
                                    <tr><td colSpan="6" className="py-24 text-center text-gray-300 italic font-medium">Sincronizando registros da Studio 30...</td></tr>
                                ) : paginatedVendas.length > 0 ? (
                                    paginatedVendas.map((venda, idx) => (
                                        <motion.tr
                                            key={venda.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                            className="hover:bg-[#FDFBF7]/40 transition-colors group cursor-default"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-[#4A3B32]">
                                                        {new Date(venda.createdAt).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium">Ref: #{venda.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#FAF3F0] flex items-center justify-center text-[#C75D3B] font-bold text-xs">
                                                        {(venda.customerName || 'C')[0]}
                                                    </div>
                                                    <p className="font-bold text-[#4A3B32] text-sm">{venda.customerName || 'Cliente não identificado'}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={cn(
                                                    "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                                                    paymentMethods[venda.paymentMethod]?.color || "bg-gray-100 text-gray-600"
                                                )}>
                                                    {paymentMethods[venda.paymentMethod]?.label}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn(
                                                        "text-sm font-bold",
                                                        (venda.totalValue - (venda.costPrice || 0)) > 0 ? "text-emerald-600" : "text-gray-400"
                                                    )}>
                                                        R$ {(venda.totalValue - (venda.costPrice || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    {(venda.costPrice || 0) === 0 && (
                                                        <span className="text-[8px] text-amber-500 font-black uppercase flex items-center gap-0.5">
                                                            <AlertTriangle className="w-2 h-2" /> Est.
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="font-bold text-[#4A3B32] text-sm">
                                                    R$ {(venda.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center md:text-left">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        venda.paymentStatus === 'paid' ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                                                    )} />
                                                    <span className={cn(
                                                        "text-[10px] uppercase font-bold tracking-widest",
                                                        venda.paymentStatus === 'paid' ? "text-emerald-500" : "text-amber-500"
                                                    )}>
                                                        {venda.paymentStatus === 'paid' ? 'Liquidado' : 'Aguardando'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        to={`/admin/vendas/${venda.id}`}
                                                        className="p-2.5 bg-white border border-gray-100 text-[#4A3B32] hover:bg-[#4A3B32] hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                        title="Editar Venda"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(venda.id, venda.customerName || 'Cliente não identificado')}
                                                        className="p-2.5 bg-white border border-gray-100 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all shadow-sm active:scale-95"
                                                        title="Excluir Registro"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Search className="w-12 h-12 text-gray-100" />
                                                <p className="text-gray-400 font-medium font-display text-lg">Nenhum registro encontrado.</p>
                                                <p className="text-xs text-gray-300">Tente ajustar seus filtros para localizar as vendas.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                <CardFooter className="bg-white border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4 p-6">
                    <p className="text-xs text-gray-400 font-medium">
                        Mostrando <span className="text-[#4A3B32] font-bold">{paginatedVendas.length}</span> de <span className="text-[#4A3B32] font-bold">{totalItems}</span> registros
                    </p>

                    {totalPages > 1 && (
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="cursor-pointer"
                                    />
                                </PaginationItem>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                    // Lógica básica para não mostrar todas as páginas se forem muitas
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= page - 1 && page <= page + 1)
                                    ) {
                                        return (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    onClick={() => setPage(page)}
                                                    isActive={page === page}
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        )
                                    } else if (
                                        page === page - 2 ||
                                        page === page + 2
                                    ) {
                                        return <PaginationEllipsis key={page} />
                                    }
                                    return null
                                })}

                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="cursor-pointer"
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    )}
                </CardFooter>
            </Card>

            <AlertDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ ...confirmDelete, isOpen: false })}
                onConfirm={onConfirmDelete}
                title="Excluir Venda?"
                description={`Tem certeza que deseja excluir o registro de venda de ${confirmDelete.customerName}? Esta ação estornará o estoque dos produtos.`}
                confirmText="Excluir Registro"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}
