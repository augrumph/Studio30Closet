import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, DollarSign, Calendar, CreditCard, ChevronRight, MoreHorizontal, TrendingUp, Trash2, Edit2 } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'

export function VendasList() {
    const { vendas, loadVendas, vendasLoading, removeVenda } = useAdminStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, vendaId: null, customerName: '' })

    useEffect(() => {
        loadVendas()
    }, [loadVendas])

    const filteredVendas = vendas.filter(venda => {
        const matchesSearch = venda.customerName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = filterType === 'all' || venda.paymentMethod === filterType
        return matchesSearch && matchesType
    })

    const totalRevenue = filteredVendas.reduce((acc, curr) => acc + curr.totalValue, 0)
    const pendingFiado = filteredVendas
        .filter(v => v.paymentMethod === 'fiado' && v.paymentStatus === 'pending')
        .reduce((acc, curr) => acc + curr.totalValue, 0)

    const paymentMethods = {
        pix: { label: 'PIX', color: 'bg-emerald-100 text-emerald-700' },
        card: { label: 'Cartão', color: 'bg-blue-100 text-blue-700' },
        fiado: { label: 'Crediário', color: 'bg-amber-100 text-amber-700' },
        cash: { label: 'Dinheiro', color: 'bg-gray-100 text-gray-700' }
    }

    const handleDelete = (id, customer) => {
        setConfirmDelete({ isOpen: true, vendaId: id, customerName: customer })
    }

    const onConfirmDelete = async () => {
        const result = await removeVenda(confirmDelete.vendaId)
        if (result.success) {
            toast.success('Venda removida com sucesso.')
        } else {
            toast.error(`Erro ao remover: ${result.error}`)
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header com Ação Principal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-display font-semibold text-[#4A3B32] tracking-tight">Vendas</h2>
                    <p className="text-[#4A3B32]/40 font-medium italic">Histórico de faturamento e recebimentos.</p>
                </div>
                <Link
                    to="/admin/vendas/new"
                    className="flex items-center gap-2 px-8 py-4 bg-[#C75D3B] text-white rounded-2xl font-bold hover:bg-[#A64D31] transition-all shadow-xl shadow-[#C75D3B]/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5" />
                    Nova Venda Manual
                </Link>
            </div>

            {/* Quick Insights - Bento Style Cards */}
            <div className="grid md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="border-emerald-50 bg-white">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-xl"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Faturamento</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            R$ {totalRevenue.toLocaleString('pt-BR')}
                            <p className="text-xs text-emerald-600 font-medium mt-1">+12% em relação ao mês anterior</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="border-amber-50 bg-white">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 rounded-xl"><CreditCard className="w-5 h-5 text-amber-600" /></div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Crediário (Pendente)</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-1 text-3xl font-display font-bold text-[#4A3B32]">
                                R$ {pendingFiado.toLocaleString('pt-BR')}
                            </div>
                            <p className="text-xs text-amber-600 font-medium mt-1">Aguardando liquidação</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="border-[#FDF0ED] bg-white">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#FDF0ED] rounded-xl"><TrendingUp className="w-5 h-5 text-[#C75D3B]" /></div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Performance Hoje</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-display font-bold text-[#4A3B32]">
                                {vendas.filter(v => new Date(v.createdAt).toDateString() === new Date().toDateString()).length}
                                <span className="text-sm font-medium text-gray-400 ml-2">vendas hoje</span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

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

                    <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl">
                        {['all', 'pix', 'card', 'fiado'].map(type => (
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
                                {type === 'all' ? 'Ver Tudo' : type === 'fiado' ? 'Crediário' : type}
                            </button>
                        ))}
                    </div>
                </CardHeader>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#FAF8F5]/50 text-[#4A3B32]/40 text-[10px] uppercase font-bold tracking-[0.2em]">
                                <th className="px-8 py-5">Data / Horário</th>
                                <th className="px-8 py-5">Cliente</th>
                                <th className="px-8 py-5">Método</th>
                                <th className="px-8 py-5 text-right">Valor Final</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {vendasLoading ? (
                                    <tr><td colSpan="6" className="py-24 text-center text-gray-300 italic font-medium">Sincronizando registros da Studio 30...</td></tr>
                                ) : filteredVendas.length > 0 ? (
                                    filteredVendas.map((venda, idx) => (
                                        <motion.tr
                                            key={venda.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.05 }}
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
                                                        {venda.customerName.charAt(0)}
                                                    </div>
                                                    <p className="font-bold text-[#4A3B32] text-sm">{venda.customerName}</p>
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
                                                <span className="font-bold text-[#4A3B32] text-sm">
                                                    R$ {venda.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                                        onClick={() => handleDelete(venda.id, venda.customerName)}
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

                <CardFooter className="bg-[#FAF8F5]/30 border-t border-gray-50 flex justify-between p-6">
                    <p className="text-xs text-gray-400 font-medium">Exibindo {filteredVendas.length} de {vendas.length} registros</p>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-bold text-gray-400 disabled:opacity-50" disabled>Anterior</button>
                        <button className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-bold text-gray-400 disabled:opacity-50" disabled>Próxima</button>
                    </div>
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
