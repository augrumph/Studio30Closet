import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Plus, DollarSign, Calendar, User, AlertCircle, Check, Clock, Trash2, Edit2, ChevronDown, ChevronUp, ArrowUpDown, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/admin/PageSkeleton'
import { KpiCard } from '@/components/admin/shared'
import { useAdminInstallmentSales, useAdminInstallmentDetails, useAdminInstallmentsMutations, useAdminInstallmentsMetrics } from '@/hooks/useAdminInstallments'

// Sub-component for Details
export function InstallmentDetails({ vendaId }) {
    const { data: detailsData, isLoading } = useAdminInstallmentDetails(vendaId)
    const { registerPayment, isRegistering, payFullSale, isPayingFull } = useAdminInstallmentsMutations()
    const [selectedInstallment, setSelectedInstallment] = useState(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'dinheiro'
    })

    const [sortConfig, setSortConfig] = useState({ key: 'installmentNumber', direction: 'asc' })

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }

    const installments = detailsData?.installments || []

    const sortedInstallments = useMemo(() => {
        const sortableItems = [...installments]
        sortableItems.sort((a, b) => {
            let aValue, bValue;

            if (['originalAmount', 'paidAmount', 'remainingAmount', 'installmentNumber', 'id'].includes(sortConfig.key)) {
                aValue = parseFloat(a[sortConfig.key]) || 0;
                bValue = parseFloat(b[sortConfig.key]) || 0;
            } else if (sortConfig.key === 'dueDate') {
                aValue = new Date(a.dueDate).getTime();
                bValue = new Date(b.dueDate).getTime();
            } else {
                aValue = (a[sortConfig.key] || '').toString().toLowerCase();
                bValue = (b[sortConfig.key] || '').toString().toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        })
        return sortableItems
    }, [installments, sortConfig])

    const handlePayFull = async () => {
        try {
            await payFullSale({ vendaId })
        } catch (error) {
            // Toast handled by hook
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid': return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Pago</span>
            case 'pending': return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Pendente</span>
            case 'overdue': return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Vencido</span>
            default: return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{status}</span>
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'paid': return <Check className="w-4 h-4 text-emerald-600" />
            case 'pending': return <Clock className="w-4 h-4 text-amber-600" />
            case 'overdue': return <AlertCircle className="w-4 h-4 text-red-600" />
            default: return null
        }
    }

    const handleRegisterPayment = async (e) => {
        e.preventDefault()
        if (!selectedInstallment || !paymentForm.amount) return

        try {
            await registerPayment({
                installmentId: selectedInstallment.id,
                amount: parseFloat(paymentForm.amount),
                date: paymentForm.date,
                method: paymentForm.method,
                vendaId: vendaId // Pass vendaId for optimistic update
            })
            setShowPaymentModal(false)
            setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'dinheiro' })
            setSelectedInstallment(null)
        } catch (error) {
            // Toast handled by hook
        }
    }

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C75D3B] mx-auto"></div>
                <p className="text-sm text-[#4A3B32]/60 mt-2">Carregando parcelas...</p>
            </div>
        )
    }

    if (installments.length === 0) {
        return (
            <div className="text-center py-10 px-4 bg-amber-50/50">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="font-bold text-[#4A3B32] mb-1">Venda sem parcelas registradas</p>
                <p className="text-sm text-[#4A3B32]/60 mb-6">Esta venda não possui parcelas no sistema (Ex: Venda 1x ou legada).</p>
                <button
                    onClick={handlePayFull}
                    disabled={isPayingFull}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2 mx-auto"
                >
                    <Check className="w-5 h-5" />
                    {isPayingFull ? 'Processando...' : 'Quitar Venda Total'}
                </button>
            </div>
        )
    }

    return (
        <div className="border-t border-gray-200 bg-gray-50/50">
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-300">
                                    <th className="text-left py-3 px-4 font-bold text-[#4A3B32] cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('installmentNumber')}>
                                         <div className="flex items-center gap-2">Parcela <ArrowUpDown className="w-3 h-3" /></div>
                                     </th>
                                    <th className="text-left py-3 px-4 font-bold text-[#4A3B32] cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('dueDate')}>
                                         <div className="flex items-center gap-2">Vencimento <ArrowUpDown className="w-3 h-3" /></div>
                                     </th>
                                    <th className="text-right py-3 px-4 font-bold text-[#4A3B32] cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('originalAmount')}>
                                         <div className="flex items-center justify-end gap-2">Valor <ArrowUpDown className="w-3 h-3" /></div>
                                     </th>
                                    <th className="text-right py-3 px-4 font-bold text-[#4A3B32] cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('paidAmount')}>
                                         <div className="flex items-center justify-end gap-2">Pago <ArrowUpDown className="w-3 h-3" /></div>
                                     </th>
                                    <th className="text-right py-3 px-4 font-bold text-[#4A3B32] cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('remainingAmount')}>
                                         <div className="flex items-center justify-end gap-2">Saldo <ArrowUpDown className="w-3 h-3" /></div>
                                     </th>
                                    <th className="text-center py-3 px-4 font-bold text-[#4A3B32] cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('status')}>
                                         <div className="flex items-center justify-center gap-2">Status <ArrowUpDown className="w-3 h-3" /></div>
                                     </th>
                                    <th className="text-center py-3 px-4 font-bold text-[#4A3B32]">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedInstallments.map((installment) => (
                                    <tr key={installment.id} className="border-b border-gray-200 hover:bg-white transition-colors">
                                        <td className="py-3 px-4 font-bold text-[#4A3B32]">{installment.installmentNumber}ª</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-[#4A3B32]/40" />
                                                <span className="text-[#4A3B32]">{new Date(installment.dueDate).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-[#4A3B32]">R$ {(installment.originalAmount || 0).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-right font-bold text-green-600">R$ {(installment.paidAmount || 0).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-right font-bold text-amber-600">R$ {(installment.remainingAmount || 0).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {getStatusIcon(installment.status)}
                                                {getStatusBadge(installment.status)}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {installment.status !== 'paid' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedInstallment(installment)
                                                        setPaymentForm(prev => ({ ...prev, amount: (installment.remainingAmount || 0).toFixed(2) }))
                                                        setShowPaymentModal(true)
                                                    }}
                                                    className="px-3 py-1.5 bg-[#C75D3B] text-white text-xs font-bold rounded-lg hover:bg-[#A64D31] transition-colors"
                                                >
                                                    Baixar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CardContent>

            {/* Payment Modal inside Details */}
            <AnimatePresence>
                {showPaymentModal && selectedInstallment && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowPaymentModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-[#4A3B32] mb-4">
                                Registrar Pagamento - {selectedInstallment.installmentNumber}ª Parcela
                            </h3>

                            <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-xs text-[#4A3B32]/60 font-bold">Valor Pendente</p>
                                    <p className="text-2xl font-bold text-amber-600">R$ {(selectedInstallment.remainingAmount || 0).toFixed(2)}</p>
                                </div>
                            </div>

                            <form onSubmit={handleRegisterPayment} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-[#4A3B32]/60 block mb-2">Valor do Pagamento *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C75D3B] outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#4A3B32]/60 block mb-2">Data *</label>
                                    <input
                                        type="date"
                                        value={paymentForm.date}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C75D3B] outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#4A3B32]/60 block mb-2">Método</label>
                                    <select
                                        value={paymentForm.method}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C75D3B] outline-none"
                                    >
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="pix">PIX</option>
                                        <option value="cartao">Cartão</option>
                                    </select>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPaymentModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-[#4A3B32] rounded-lg font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isRegistering}
                                        className="flex-1 px-4 py-2 bg-[#C75D3B] text-white rounded-lg font-bold hover:bg-[#A64D31]"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// Main Component
export function InstallmentsList() {
    const navigate = useNavigate()
    const [expandedVendaId, setExpandedVendaId] = useState(null)
    const [statusFilter, setStatusFilter] = useState('pendentes') // 'todas', 'pendentes', 'pagas'
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(20)

    const [sortConfig, setSortConfig] = useState({ key: 'customerName', direction: 'asc' })

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [statusFilter])

    // Fetch Sales (Paginated & Filtered)
    const {
        vendas,
        total,
        totalPages,
        isLoading,
        isError
    } = useAdminInstallmentSales({
        page: currentPage,
        pageSize,
        status: statusFilter
    })

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }

    const sortedSales = useMemo(() => {
        if (!vendas) return []
        const sortableItems = [...vendas]
        
        sortableItems.sort((a, b) => {
            let aValue, bValue;

            if (['totalValue', 'entryPayment', 'dueAmount', 'numInstallments', 'id'].includes(sortConfig.key)) {
                aValue = parseFloat(a[sortConfig.key]) || 0;
                bValue = parseFloat(b[sortConfig.key]) || 0;
            } else {
                aValue = (a[sortConfig.key] || '').toString().toLowerCase();
                bValue = (b[sortConfig.key] || '').toString().toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        })
        
        return sortableItems
    }, [vendas, sortConfig])

    // Fetch Metrics for Cards (Filtered by current status)
    const {
        metrics,
        isLoading: metricsLoading
    } = useAdminInstallmentsMetrics({
        status: statusFilter
    })

    const handleExpandVenda = (vendaId) => {
        setExpandedVendaId(expandedVendaId === vendaId ? null : vendaId)
    }

    if (isLoading) return <TableSkeleton columns={5} rows={6} />
    if (isError) return <div className="p-10 text-center text-red-500">Erro ao carregar vendas.</div>

    return (
        <div className="max-w-7xl mx-auto space-y-4 pb-20">
            {/* Header — compacto no mobile */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-[#C75D3B] to-[#A64D31] rounded-2xl shadow-md shrink-0">
                    <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl md:text-4xl font-display font-bold text-[#4A3B32] tracking-tight leading-none">Crediário</h2>
                    <p className="text-[#4A3B32]/50 text-xs md:text-sm font-medium mt-0.5">Parcelas e cobranças</p>
                </div>
            </motion.div>

            {/* Segmented control — ocupa toda a largura no mobile */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
                <div className="flex w-full rounded-2xl bg-gray-100 p-1 gap-1">
                    {[
                        { key: 'pendentes', label: 'Pendentes', icon: Clock,      activeClass: 'bg-amber-500 text-white shadow-md shadow-amber-500/25' },
                        { key: 'pagas',     label: 'Pagas',     icon: Check,      activeClass: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25' },
                        { key: 'todas',     label: 'Todas',     icon: DollarSign, activeClass: 'bg-[#4A3B32] text-white shadow-md shadow-[#4A3B32]/20' },
                    ].map(({ key, label, icon: Icon, activeClass }) => {
                        const isActive = statusFilter === key
                        return (
                            <button
                                key={key}
                                onClick={() => setStatusFilter(key)}
                                className={cn(
                                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] md:text-sm font-bold transition-all duration-200',
                                    isActive ? activeClass : 'text-[#4A3B32]/50 hover:text-[#4A3B32]'
                                )}
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{label}</span>
                                {isActive && metrics.count > 0 && (
                                    <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black leading-none">
                                        {metrics.count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </motion.div>

            {/* KPIs — sempre 3 colunas para não ter card isolado */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <KpiCard
                    label={statusFilter === 'pendentes' ? 'Pendentes' : statusFilter === 'pagas' ? 'Pagas' : 'Ativas'}
                    value={metrics.count || 0}
                    sub="vendas"
                    icon={CreditCard}
                    iconBg="bg-[#F0E6DF]"
                    iconColor="text-[#C75D3B]"
                    accent="text-[#C75D3B]"
                    delay={0.1}
                />
                <KpiCard
                    label="Saldo"
                    value={`R$ ${(metrics.totalDueEstimative || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                    sub="a receber"
                    icon={DollarSign}
                    iconBg="bg-amber-100"
                    iconColor="text-amber-600"
                    accent="text-amber-700"
                    delay={0.15}
                />
                <KpiCard
                    label="Vencidas"
                    value={metrics.overdueCount || 0}
                    sub={`R$ ${(metrics.totalOverdueEstimative || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                    icon={AlertCircle}
                    iconBg="bg-red-100"
                    iconColor="text-red-500"
                    accent="text-red-600"
                    delay={0.2}
                />
            </div>

            {/* Lista de Vendas */}
            <AnimatePresence>
                {sortedSales.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                        <AlertCircle className="w-12 h-12 text-[#4A3B32]/20 mx-auto mb-4" />
                        <p className="text-[#4A3B32]/60">
                            {statusFilter === 'pendentes' && 'Nenhuma venda pendente no crediário'}
                            {statusFilter === 'pagas' && 'Nenhuma venda paga no crediário'}
                            {statusFilter === 'todas' && 'Nenhuma venda com crediário ativo'}
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-2">
                        {/* Sort bar — desktop: colunas clicáveis | mobile: select compacto */}
                        <div className="flex items-center justify-between gap-3 px-1">
                            {/* Mobile: select de ordenação */}
                            <div className="flex items-center gap-2 md:hidden">
                                <ArrowUpDown className="w-3.5 h-3.5 text-[#A07060] shrink-0" />
                                <select
                                    value={sortConfig.key}
                                    onChange={e => requestSort(e.target.value)}
                                    className="text-[12px] font-semibold text-[#4A3B32] bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 outline-none"
                                >
                                    <option value="customerName">Cliente</option>
                                    <option value="totalValue">Total</option>
                                    <option value="entryPayment">Entrada</option>
                                    <option value="dueAmount">Saldo</option>
                                    <option value="numInstallments">Parcelas</option>
                                </select>
                                <button
                                    onClick={() => setSortConfig(s => ({ ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }))}
                                    className="text-[12px] font-bold text-[#C75D3B] bg-[#FDF0ED] px-2.5 py-1.5 rounded-xl"
                                >
                                    {sortConfig.direction === 'asc' ? '↑ A–Z' : '↓ Z–A'}
                                </button>
                            </div>

                            {/* Desktop: labels clicáveis */}
                            <div className="hidden md:flex flex-1 items-center">
                                {[
                                    { key: 'customerName', label: 'Cliente',   w: 'flex-[2]' },
                                    { key: 'totalValue',   label: 'Total',     w: 'flex-1'   },
                                    { key: 'entryPayment', label: 'Entrada',   w: 'flex-1'   },
                                    { key: 'dueAmount',    label: 'Saldo',     w: 'flex-1'   },
                                    { key: 'numInstallments', label: 'Parcelas', w: 'flex-1' },
                                ].map(col => (
                                    <button
                                        key={col.key}
                                        onClick={() => requestSort(col.key)}
                                        className={cn(
                                            col.w,
                                            'flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.12em] transition-colors',
                                            sortConfig.key === col.key
                                                ? 'text-[#C75D3B]'
                                                : 'text-[#4A3B32]/40 hover:text-[#4A3B32]/70'
                                        )}
                                    >
                                        {col.label}
                                        <ArrowUpDown className={cn(
                                            'w-3 h-3 shrink-0',
                                            sortConfig.key === col.key ? 'opacity-100' : 'opacity-40'
                                        )} />
                                    </button>
                                ))}
                                <div className="w-10 shrink-0" />
                            </div>

                            <span className="text-[11px] text-[#A07060] font-medium shrink-0">
                                {sortedSales.length} {sortedSales.length === 1 ? 'venda' : 'vendas'}
                            </span>
                        </div>

                        {/* Cards */}
                        {sortedSales.map((venda, idx) => {
                            const isExpanded = expandedVendaId === venda.id
                            const due = venda.dueAmount || 0
                            const overdue = venda.overdueCount > 0
                            const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

                            return (
                                <motion.div
                                    key={venda.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03, duration: 0.18 }}
                                >
                                    <div className={cn(
                                        'rounded-2xl border bg-white overflow-hidden transition-all duration-200',
                                        isExpanded ? 'border-[#C75D3B]/25 shadow-md' : 'border-[#EDE0D8] hover:border-[#C75D3B]/20 hover:shadow-sm',
                                        overdue && !isExpanded && 'border-l-4 border-l-red-400'
                                    )}>
                                        {/* Main row */}
                                        <button
                                            type="button"
                                            onClick={() => handleExpandVenda(venda.id)}
                                            className="w-full text-left"
                                        >
                                            {/* ── MOBILE layout ── */}
                                            <div className="md:hidden">
                                                {/* Header do card: nome + status */}
                                                <div className={cn(
                                                    'flex items-center gap-3 px-4 pt-4 pb-3',
                                                )}>
                                                    {/* Inicial do nome */}
                                                    <div className={cn(
                                                        'h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center text-[15px] font-black',
                                                        overdue ? 'bg-red-100 text-red-600' : 'bg-[#F0E6DF] text-[#C75D3B]'
                                                    )}>
                                                        {(venda.customerName || '?')[0].toUpperCase()}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-[15px] text-[#2C1810] truncate leading-tight">
                                                            {venda.customerName || 'Sem nome'}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            <span className={cn(
                                                                'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                                                venda.numInstallments > 1
                                                                    ? 'bg-[#FDF0ED] text-[#C75D3B]'
                                                                    : 'bg-gray-100 text-gray-500'
                                                            )}>
                                                                {venda.numInstallments}× parcelas
                                                            </span>
                                                            {overdue && (
                                                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                                    ⚠ {venda.overdueCount} vencida{venda.overdueCount > 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className={cn(
                                                        'shrink-0 grid h-8 w-8 place-items-center rounded-xl transition-all duration-200',
                                                        isExpanded
                                                            ? 'bg-[#C75D3B] text-white rotate-180'
                                                            : 'bg-[#F5EBE4] text-[#C75D3B]'
                                                    )}>
                                                        <ChevronDown className="h-4 w-4" />
                                                    </div>
                                                </div>

                                                {/* Valores: linha dividida */}
                                                <div className="mx-4 mb-4 rounded-2xl overflow-hidden border border-[#EDE0D8]">
                                                    <div className="grid grid-cols-3 divide-x divide-[#EDE0D8]">
                                                        <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5">
                                                            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#A07060]">Total</p>
                                                            <p className="text-[13px] font-black text-[#2C1810] leading-none">
                                                                R$ {Number(venda.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5">
                                                            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#A07060]">Entrada</p>
                                                            <p className="text-[13px] font-black text-emerald-700 leading-none">
                                                                R$ {Number(venda.entryPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                        <div className={cn(
                                                            'flex flex-col items-center justify-center py-3 px-2 gap-0.5',
                                                            due > 0 ? 'bg-amber-50/60' : ''
                                                        )}>
                                                            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#A07060]">Saldo</p>
                                                            <p className={cn(
                                                                'text-[13px] font-black leading-none',
                                                                due > 0 ? 'text-amber-600' : 'text-emerald-600'
                                                            )}>
                                                                R$ {Number(due).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── DESKTOP layout ── */}
                                            <div className="hidden md:flex items-center gap-0 px-5 py-4">
                                                {/* Cliente flex-[2] */}
                                                <div className="flex-[2] flex items-center gap-3 min-w-0">
                                                    <div className="h-9 w-9 shrink-0 rounded-full bg-[#F0E6DF] flex items-center justify-center">
                                                        <User className="h-4 w-4 text-[#C75D3B]" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-[13.5px] text-[#2C1810] truncate">{venda.customerName || 'Sem nome'}</p>
                                                        {overdue && (
                                                            <span className="text-[10px] font-bold text-red-500">
                                                                {venda.overdueCount} parcela{venda.overdueCount > 1 ? 's' : ''} vencida{venda.overdueCount > 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Total */}
                                                <div className="flex-1">
                                                    <p className="text-[13px] font-bold text-[#2C1810]">R$ {fmt(venda.totalValue)}</p>
                                                </div>
                                                {/* Entrada */}
                                                <div className="flex-1">
                                                    <p className="text-[13px] font-bold text-emerald-700">R$ {fmt(venda.entryPayment)}</p>
                                                </div>
                                                {/* Saldo */}
                                                <div className="flex-1">
                                                    <p className={cn('text-[13px] font-bold', due > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                                                        R$ {fmt(due)}
                                                    </p>
                                                </div>
                                                {/* Parcelas */}
                                                <div className="flex-1">
                                                    <span className="inline-flex items-center gap-1 text-[12px] font-black text-[#C75D3B] bg-[#FDF0ED] px-2 py-0.5 rounded-lg">
                                                        {venda.numInstallments}×
                                                    </span>
                                                </div>
                                                {/* Chevron */}
                                                <div className="w-10 shrink-0 flex justify-end">
                                                    <div className={cn(
                                                        'grid h-7 w-7 place-items-center rounded-lg transition-colors',
                                                        isExpanded ? 'bg-[#C75D3B] text-white' : 'bg-gray-100 text-[#8C6150]'
                                                    )}>
                                                        {isExpanded
                                                            ? <ChevronUp className="h-3.5 w-3.5" />
                                                            : <ChevronDown className="h-3.5 w-3.5" />}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expand: parcelas */}
                                        <AnimatePresence initial={false}>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <div className="border-t border-[#EDE0D8]">
                                                        <InstallmentDetails vendaId={venda.id} />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </AnimatePresence>
            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E5CFC5] bg-white text-[13px] font-semibold text-[#4A3B32] transition-colors hover:bg-[#FAF7F4] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        ← Anterior
                    </button>
                    <span className="text-[12px] font-bold text-[#A07060]">
                        {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E5CFC5] bg-white text-[13px] font-semibold text-[#4A3B32] transition-colors hover:bg-[#FAF7F4] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Próxima →
                    </button>
                </div>
            )}
        </div>
    )
}
