import { useState } from 'react'
import { ArrowLeft, Plus, DollarSign, Calendar, User, AlertCircle, Check, Clock, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/admin/PageSkeleton'
import { useAdminInstallmentSales, useAdminInstallmentDetails, useAdminInstallmentsMutations } from '@/hooks/useAdminInstallments'

// Sub-component for Details
function InstallmentDetails({ vendaId }) {
    const { data: detailsData, isLoading } = useAdminInstallmentDetails(vendaId)
    const { registerPayment, isRegistering } = useAdminInstallmentsMutations()
    const [selectedInstallment, setSelectedInstallment] = useState(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'dinheiro'
    })

    const installments = detailsData?.installments || []

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
                method: paymentForm.method
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
            <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-[#4A3B32]/20 mx-auto mb-2" />
                <p className="text-sm text-[#4A3B32]/60">Nenhuma parcela encontrada</p>
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
                                    <th className="text-left py-3 px-4 font-bold text-[#4A3B32]">Parcela</th>
                                    <th className="text-left py-3 px-4 font-bold text-[#4A3B32]">Vencimento</th>
                                    <th className="text-right py-3 px-4 font-bold text-[#4A3B32]">Valor</th>
                                    <th className="text-right py-3 px-4 font-bold text-[#4A3B32]">Pago</th>
                                    <th className="text-right py-3 px-4 font-bold text-[#4A3B32]">Saldo</th>
                                    <th className="text-center py-3 px-4 font-bold text-[#4A3B32]">Status</th>
                                    <th className="text-center py-3 px-4 font-bold text-[#4A3B32]">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {installments.map((installment) => (
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
                                                        setPaymentForm(prev => ({ ...prev, amount: installment.remainingAmount.toFixed(2) })) // Pre-fill amount
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
    const { data, isLoading, isError } = useAdminInstallmentSales()
    const [expandedVendaId, setExpandedVendaId] = useState(null)
    const [statusFilter, setStatusFilter] = useState('pendentes') // 'todas', 'pendentes', 'pagas'

    const allVendas = data?.vendas || []

    // Filtrar vendas baseado no status
    const vendas = allVendas.filter(venda => {
        if (statusFilter === 'todas') return true

        // Uma venda é considerada "paga" se todas as parcelas estiverem pagas (dueAmount = 0)
        const isPaid = venda.dueAmount === 0

        if (statusFilter === 'pagas') return isPaid
        if (statusFilter === 'pendentes') return !isPaid

        return true
    })

    const handleExpandVenda = (vendaId) => {
        setExpandedVendaId(expandedVendaId === vendaId ? null : vendaId)
    }

    if (isLoading) return <TableSkeleton columns={5} rows={6} />
    if (isError) return <div className="p-10 text-center text-red-500">Erro ao carregar vendas.</div>

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-[#C75D3B] to-[#A64D31] rounded-2xl shadow-lg">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Crediário</h2>
                    </div>
                    <p className="text-[#4A3B32]/60 font-medium">Gerenciar parcelas e cobranças</p>
                </div>
            </motion.div>

            {/* Filtros */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                    {['pendentes', 'pagas', 'todas'].map((status) => {
                        const isActive = statusFilter === status
                        let count = 0
                        if (status === 'pendentes') count = allVendas.filter(v => v.dueAmount > 0).length
                        if (status === 'pagas') count = allVendas.filter(v => v.dueAmount === 0).length
                        if (status === 'todas') count = allVendas.length

                        return (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`
                                    flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap
                                    ${isActive
                                        ? (status === 'pendentes' ? 'bg-[#E69600] text-white shadow-lg shadow-amber-500/20' : 'bg-gray-200 text-[#4A3B32]')
                                        : 'bg-gray-50 text-[#4A3B32]/60 hover:bg-gray-100'
                                    }
                                `}
                            >
                                {status === 'pendentes' && <Clock className="w-4 h-4" />}
                                {status === 'pagas' && <Check className="w-4 h-4" />}
                                {status === 'todas' && <DollarSign className="w-4 h-4" />}
                                <span className="capitalize">{status}</span>
                                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive
                                    ? (status === 'pendentes' ? 'bg-white/20 text-white' : 'bg-white text-[#4A3B32]')
                                    : 'bg-gray-200 text-[#4A3B32]/60'
                                    }`}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </motion.div>

            {/* Cards de Resumo */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="pt-8">
                        <div className="space-y-2">
                            <p className="text-sm text-[#4A3B32]/60 font-medium">
                                {statusFilter === 'pendentes' ? 'Vendas Pendentes' : statusFilter === 'pagas' ? 'Vendas Pagas' : 'Vendas Ativas'}
                            </p>
                            <p className="text-3xl font-bold text-[#C75D3B]">{vendas.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-8">
                        <div className="space-y-2">
                            <p className="text-sm text-[#4A3B32]/60 font-medium">Saldo Devido</p>
                            <p className="text-3xl font-bold text-amber-600">R$ {vendas.reduce((sum, v) => sum + (v.dueAmount || 0), 0).toFixed(2)}</p>
                            <p className="text-xs text-[#4A3B32]/40 font-medium">
                                {statusFilter === 'pendentes' ? 'Apenas vendas pendentes' : statusFilter === 'pagas' ? 'Nada a receber' : 'Todas as vendas'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-8">
                        <div className="space-y-2">
                            <p className="text-sm text-[#4A3B32]/60 font-medium">Parcelas Vencidas</p>
                            <p className="text-3xl font-bold text-red-600">{vendas.reduce((sum, v) => sum + (v.overdueCount || 0), 0)}</p>
                            <p className="text-xs text-[#4A3B32]/40 font-medium">
                                {statusFilter === 'pendentes' ? 'Nas vendas pendentes' : statusFilter === 'pagas' ? 'Já quitadas' : 'No total'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Lista de Vendas */}
            <AnimatePresence>
                {vendas.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                        <AlertCircle className="w-12 h-12 text-[#4A3B32]/20 mx-auto mb-4" />
                        <p className="text-[#4A3B32]/60">
                            {statusFilter === 'pendentes' && 'Nenhuma venda pendente no crediário'}
                            {statusFilter === 'pagas' && 'Nenhuma venda paga no crediário'}
                            {statusFilter === 'todas' && 'Nenhuma venda com crediário ativo'}
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {vendas.map((venda) => (
                            <motion.div key={venda.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className="overflow-hidden">
                                    <CardContent className="pt-6 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleExpandVenda(venda.id)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#C75D3B]/10 flex items-center justify-center">
                                                        <User className="w-5 h-5 text-[#C75D3B]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-[#4A3B32]/60 font-bold">CLIENTE</p>
                                                        <p className="font-bold text-[#4A3B32]">{venda.customerName}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-[#4A3B32]/60 font-bold">TOTAL</p>
                                                    <p className="text-lg font-bold text-[#4A3B32]">R$ {(venda.totalValue || 0).toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-[#4A3B32]/60 font-bold">ENTRADA</p>
                                                    <p className="text-lg font-bold text-green-600">R$ {(venda.entryPayment || 0).toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-[#4A3B32]/60 font-bold">SALDO</p>
                                                    <p className="text-lg font-bold text-amber-600">R$ {(venda.dueAmount || 0).toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-[#4A3B32]/60 font-bold">PARCELAS</p>
                                                    <p className="text-lg font-bold text-[#C75D3B]">{venda.numInstallments}x</p>
                                                </div>
                                            </div>
                                            <button type="button" className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                                {expandedVendaId === venda.id ? <ChevronUp className="w-5 h-5 text-[#C75D3B]" /> : <ChevronDown className="w-5 h-5 text-[#4A3B32]/60" />}
                                            </button>
                                        </div>
                                    </CardContent>
                                    <AnimatePresence>
                                        {expandedVendaId === venda.id && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                <InstallmentDetails vendaId={venda.id} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
