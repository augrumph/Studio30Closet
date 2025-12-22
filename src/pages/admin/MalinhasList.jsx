import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, ShoppingBag, Clock, CheckCircle, XCircle, Truck, Calendar, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { useAdminStore } from '@/store/admin-store'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'


export function MalinhasList() {
    const { orders, loadOrders, removeOrder, ordersLoading } = useAdminStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [deleteAlert, setDeleteAlert] = useState({ isOpen: false, orderId: null })

    useEffect(() => {
        loadOrders()
    }, [loadOrders])

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter
        return matchesSearch && matchesStatus
    })
    const handleDelete = (id, e) => {
        e.preventDefault()
        e.stopPropagation()
        setDeleteAlert({ isOpen: true, orderId: id })
    }

    const confirmDelete = async () => {
        const id = deleteAlert.orderId
        const result = await removeOrder(id)
        if (result.success) {
            toast.success('Malinha removida com sucesso.')
        } else {
            toast.error('Erro ao remover malinha.')
        }
    }

    const statusMap = {
        pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
        shipped: { label: 'Enviado', color: 'bg-blue-100 text-blue-700', icon: Truck },
        completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
        cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
    }

    const pendingCount = orders.filter(o => o.status === 'pending').length

    return (
        <div className="space-y-10 pb-20">
            {/* Header com Insights Rápidos */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-display font-semibold text-[#4A3B32] tracking-tight">Malinhas</h2>
                    <p className="text-[#4A3B32]/40 font-medium italic">Gestão logística de malas delivery.</p>
                </div>

                <Link
                    to="/admin/malinhas/new"
                    className="flex items-center gap-3 px-8 py-4 bg-[#C75D3B] text-white rounded-[24px] font-bold shadow-lg shadow-[#C75D3B]/20 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                    <Plus className="w-5 h-5" /> Nova Malinha
                </Link>
            </div>

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

                    <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl w-full md:w-auto overflow-x-auto custom-scrollbar">
                        {['all', 'pending', 'shipped', 'completed'].map(status => (
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
                                {status === 'all' ? 'Ver Tudo' : status === 'pending' ? 'Pendentes' : status === 'shipped' ? 'Enviados' : 'Concluídos'}
                            </button>
                        ))}
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
                                {ordersLoading ? (
                                    <tr><td colSpan="5" className="py-24 text-center text-gray-300 italic">Carregando agendamentos...</td></tr>
                                ) : filteredOrders.length > 0 ? (
                                    filteredOrders.map((order, idx) => {
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
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-[#FAF3F0] flex items-center justify-center text-[#4A3B32] font-bold text-xs border border-[#C75D3B]/10">
                                                            {order.customer.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-[#4A3B32] text-sm">{order.customer.name}</p>
                                                            <p className="text-[10px] text-gray-400">{order.customer.phone}</p>
                                                        </div>
                                                    </div>
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
                                                <p className="text-gray-400 font-medium font-display text-lg">Nenhuma malinha ativa.</p>
                                                <p className="text-xs text-gray-300">Todas as malinhas estão em dia!</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </Card>

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
        </div>
    )
}
