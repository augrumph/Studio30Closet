import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, DollarSign, Calendar, User, AlertCircle, Check, Clock, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { getOpenInstallmentSales, getInstallmentsByVendaId, registerInstallmentPayment } from '@/lib/api'
import { cn } from '@/lib/utils'
import { TableSkeleton } from '@/components/admin/PageSkeleton'

export function InstallmentsList() {
    const navigate = useNavigate()
    const [vendas, setVendas] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedVendaId, setExpandedVendaId] = useState(null)
    const [installmentsMap, setInstallmentsMap] = useState({}) // Armazenar parcelas por venda
    const [loadingInstallments, setLoadingInstallments] = useState({}) // Controlar carregamento por venda
    const [selectedInstallment, setSelectedInstallment] = useState(null)
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'dinheiro'
    })
    const [showPaymentModal, setShowPaymentModal] = useState(false)

    useEffect(() => {
        loadVendas()
    }, [])

    const loadVendas = async () => {
        try {
            setLoading(true)
            const result = await getOpenInstallmentSales(1, 50)
            setVendas(result.vendas || [])
            console.log(`✅ ${result.vendas?.length || 0} vendas com crediário encontradas`)
        } catch (error) {
            console.error('❌ Erro ao carregar vendas:', error)
            toast.error('Erro ao carregar crediário', {
                description: 'Não foi possível carregar as vendas com crediário.'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleExpandVenda = async (vendaId) => {
        if (expandedVendaId === vendaId) {
            setExpandedVendaId(null)
        } else {
            // Carregar parcelas quando expandir
            if (!installmentsMap[vendaId]) {
                await loadInstallments(vendaId)
            }
            setExpandedVendaId(vendaId)
        }
    }

    const loadInstallments = async (vendaId) => {
        try {
            setLoadingInstallments(prev => ({ ...prev, [vendaId]: true }))
            const result = await getInstallmentsByVendaId(vendaId)
            setInstallmentsMap(prev => ({
                ...prev,
                [vendaId]: result.installments || []
            }))
            console.log(`✅ ${result.installments?.length || 0} parcelas carregadas para venda ${vendaId}`)
        } catch (error) {
            console.error('❌ Erro ao carregar parcelas:', error)
            toast.error('Erro ao carregar parcelas', {
                description: 'Não foi possível carregar as parcelas desta venda.'
            })
        } finally {
            setLoadingInstallments(prev => ({ ...prev, [vendaId]: false }))
        }
    }

    const handleRegisterPayment = async (e) => {
        e.preventDefault()

        if (!selectedInstallment || !paymentForm.amount) {
            toast.error('Dados incompletos', {
                description: 'Informe o valor do pagamento.'
            })
            return
        }

        const amount = parseFloat(paymentForm.amount)
        if (amount <= 0 || amount > selectedInstallment.remainingAmount) {
            toast.error('Valor inválido', {
                description: `Máximo: R$ ${selectedInstallment.remainingAmount.toFixed(2)}`
            })
            return
        }

        try {
            await registerInstallmentPayment(
                selectedInstallment.id,
                amount,
                paymentForm.date,
                paymentForm.method
            )

            toast.success('Pagamento registrado!', {
                description: `R$ ${amount.toFixed(2)} - ${selectedInstallment.installmentNumber}ª parcela`
            })

            // Limpar formulário e recarregar
            setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'dinheiro' })
            setSelectedInstallment(null)
            setShowPaymentModal(false)

            // Recarregar dados
            await loadInstallments(selectedInstallment.vendaId)
            await loadVendas()
        } catch (error) {
            console.error('Erro:', error)
            toast.error('Erro ao registrar pagamento')
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid':
                return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Pago</span>
            case 'pending':
                return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Pendente</span>
            case 'overdue':
                return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Vencido</span>
            default:
                return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{status}</span>
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'paid':
                return <Check className="w-4 h-4 text-emerald-600" />
            case 'pending':
                return <Clock className="w-4 h-4 text-amber-600" />
            case 'overdue':
                return <AlertCircle className="w-4 h-4 text-red-600" />
            default:
                return null
        }
    }

    if (loading) {
        return <TableSkeleton columns={5} rows={6} />
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
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

            {/* Cards de Resumo */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                <Card>
                    <CardContent className="pt-8">
                        <div className="space-y-2">
                            <p className="text-sm text-[#4A3B32]/60 font-medium">Vendas Ativas</p>
                            <p className="text-3xl font-bold text-[#C75D3B]">{vendas.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-8">
                        <div className="space-y-2">
                            <p className="text-sm text-[#4A3B32]/60 font-medium">Total Devido</p>
                            <p className="text-3xl font-bold text-amber-600">
                                R$ {vendas.reduce((sum, v) => sum + (v.dueAmount || 0), 0).toFixed(2)}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-8">
                        <div className="space-y-2">
                            <p className="text-sm text-[#4A3B32]/60 font-medium">Parcelas Vencidas</p>
                            <p className="text-3xl font-bold text-red-600">
                                {vendas.reduce((sum, v) => sum + (v.overdueCount || 0), 0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Lista de Vendas */}
            <AnimatePresence>
                {vendas.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <AlertCircle className="w-12 h-12 text-[#4A3B32]/20 mx-auto mb-4" />
                        <p className="text-[#4A3B32]/60">Nenhuma venda com crediário ativo</p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {vendas.map((venda) => (
                            <motion.div
                                key={venda.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="overflow-hidden">
                                    {/* Cabeçalho da Venda */}
                                    <CardContent
                                        className="pt-6 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => handleExpandVenda(venda.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                                                {/* Cliente */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#C75D3B]/10 flex items-center justify-center">
                                                        <User className="w-5 h-5 text-[#C75D3B]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-[#4A3B32]/60 font-bold">CLIENTE</p>
                                                        <p className="font-bold text-[#4A3B32]">{venda.customerName}</p>
                                                    </div>
                                                </div>

                                                {/* Valor Total */}
                                                <div>
                                                    <p className="text-xs text-[#4A3B32]/60 font-bold">TOTAL</p>
                                                    <p className="text-lg font-bold text-[#4A3B32]">
                                                        R$ {(venda.totalValue || 0).toFixed(2)}
                                                    </p>
                                                </div>

                                                {/* Entrada */}
                                                <div>
                                                    <p className="text-xs text-[#4A3B32]/60 font-bold">ENTRADA</p>
                                                    <p className="text-lg font-bold text-green-600">
                                                        R$ {(venda.entryPayment || 0).toFixed(2)}
                                                    </p>
                                                </div>

                                                {/* Saldo Devedor */}
                                                <div>
                                                    <p className="text-xs text-[#4A3B32]/60 font-bold">SALDO</p>
                                                    <p className="text-lg font-bold text-amber-600">
                                                        R$ {(venda.dueAmount || 0).toFixed(2)}
                                                    </p>
                                                </div>

                                                {/* Parcelas */}
                                                <div>
                                                    <p className="text-xs text-[#4A3B32]/60 font-bold">PARCELAS</p>
                                                    <p className="text-lg font-bold text-[#C75D3B]">{venda.numInstallments}x</p>
                                                </div>
                                            </div>

                                            {/* Botão Expandir */}
                                            <button
                                                type="button"
                                                className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleExpandVenda(venda.id)
                                                }}
                                            >
                                                {expandedVendaId === venda.id ? (
                                                    <ChevronUp className="w-5 h-5 text-[#C75D3B]" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-[#4A3B32]/60" />
                                                )}
                                            </button>
                                        </div>
                                    </CardContent>

                                    {/* Expandido - Parcelas */}
                                    <AnimatePresence>
                                        {expandedVendaId === venda.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="border-t border-gray-200 bg-gray-50/50"
                                            >
                                                <CardContent className="pt-6">
                                                    <div className="space-y-4">
                                                        {/* Header Cliente Info */}
                                                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                                                            <p className="text-sm text-[#4A3B32]/60 font-bold mb-2">INFORMAÇÕES DO CLIENTE</p>
                                                            <p className="text-lg font-bold text-[#4A3B32]">{venda.customerName}</p>
                                                            {venda.customers?.phone && (
                                                                <p className="text-sm text-[#4A3B32]/60 mt-1">📞 {venda.customers.phone}</p>
                                                            )}
                                                        </div>

                                                        {/* Tabela de Parcelas */}
                                                        {loadingInstallments[venda.id] ? (
                                                            <div className="text-center py-8">
                                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C75D3B] mx-auto"></div>
                                                                <p className="text-sm text-[#4A3B32]/60 mt-2">Carregando parcelas...</p>
                                                            </div>
                                                        ) : installmentsMap[venda.id]?.length === 0 ? (
                                                            <div className="text-center py-8">
                                                                <AlertCircle className="w-8 h-8 text-[#4A3B32]/20 mx-auto mb-2" />
                                                                <p className="text-sm text-[#4A3B32]/60">Nenhuma parcela encontrada</p>
                                                            </div>
                                                        ) : (
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
                                                                        {installmentsMap[venda.id]?.map((installment, idx) => (
                                                                            <tr key={installment.id} className="border-b border-gray-200 hover:bg-white transition-colors">
                                                                                {/* Número */}
                                                                                <td className="py-3 px-4 font-bold text-[#4A3B32]">
                                                                                    {installment.installmentNumber}ª
                                                                                </td>

                                                                                {/* Vencimento */}
                                                                                <td className="py-3 px-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Calendar className="w-4 h-4 text-[#4A3B32]/40" />
                                                                                        <span className="text-[#4A3B32]">
                                                                                            {new Date(installment.dueDate).toLocaleDateString('pt-BR')}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>

                                                                                {/* Valor Original */}
                                                                                <td className="py-3 px-4 text-right font-bold text-[#4A3B32]">
                                                                                    R$ {(installment.originalAmount || 0).toFixed(2)}
                                                                                </td>

                                                                                {/* Valor Pago */}
                                                                                <td className="py-3 px-4 text-right font-bold text-green-600">
                                                                                    R$ {(installment.paidAmount || 0).toFixed(2)}
                                                                                </td>

                                                                                {/* Saldo */}
                                                                                <td className="py-3 px-4 text-right font-bold text-amber-600">
                                                                                    R$ {(installment.remainingAmount || 0).toFixed(2)}
                                                                                </td>

                                                                                {/* Status */}
                                                                                <td className="py-3 px-4 text-center">
                                                                                    <div className="flex items-center justify-center gap-2">
                                                                                        {getStatusIcon(installment.status)}
                                                                                        {getStatusBadge(installment.status)}
                                                                                    </div>
                                                                                </td>

                                                                                {/* Ação */}
                                                                                <td className="py-3 px-4 text-center">
                                                                                    {installment.status !== 'paid' && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setSelectedInstallment({ ...installment, vendaId: venda.id })
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
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Pagamento */}
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
                                    <p className="text-2xl font-bold text-amber-600">
                                        R$ {(selectedInstallment.remainingAmount || 0).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#4A3B32]/60 font-bold">Vencimento</p>
                                    <p className="font-semibold text-[#4A3B32]">
                                        {new Date(selectedInstallment.dueDate).toLocaleDateString('pt-BR')}
                                    </p>
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
                                        placeholder="0.00"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C75D3B] outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-[#4A3B32]/60 block mb-2">Data do Pagamento *</label>
                                    <input
                                        type="date"
                                        value={paymentForm.date}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C75D3B] outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-[#4A3B32]/60 block mb-2">Forma de Pagamento</label>
                                    <select
                                        value={paymentForm.method}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C75D3B] outline-none"
                                    >
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="pix">PIX</option>
                                        <option value="cartao">Cartão</option>
                                        <option value="transferencia">Transferência</option>
                                    </select>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPaymentModal(false)
                                            setSelectedInstallment(null)
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-[#4A3B32] rounded-lg hover:bg-gray-50 transition-colors font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-[#C75D3B] text-white rounded-lg hover:bg-[#A64D31] transition-colors font-bold"
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
