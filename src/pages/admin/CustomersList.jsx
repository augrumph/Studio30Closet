import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Phone, Mail, ShoppingBag, ExternalLink, MoreHorizontal, User, Trash2 } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function CustomersList() {
    const { customers, customersLoading, loadCustomers, removeCustomer } = useAdminStore()
    const [search, setSearch] = useState('')
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, customerId: null, customerName: '' })

    useEffect(() => {
        loadCustomers()
    }, [loadCustomers])

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.phone.includes(search) ||
        (customer.email && customer.email.toLowerCase().includes(search.toLowerCase()))
    )

    const totalSpent = customers.reduce((acc, curr) => acc + curr.totalSpent, 0)
    const averageLTV = customers.length > 0 ? totalSpent / customers.length : 0

    const handleDelete = (id, name) => {
        setConfirmDelete({ isOpen: true, customerId: id, customerName: name })
    }

    const onConfirmDelete = async () => {
        const result = await removeCustomer(confirmDelete.customerId)
        if (result.success) {
            toast.success('Cliente removida com sucesso.')
        } else {
            toast.error(`Erro ao excluir: ${result.error}`)
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Elegant Header with Stats Tile */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Banco de Clientes</h2>
                    <p className="text-[#4A3B32]/40 font-medium">Gestão de relacionamento e histórico de consumo.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/customers/new"
                        className="flex items-center gap-2 px-6 py-3 bg-[#C75D3B] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#C75D3B]/20 hover:scale-105 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Nova Cliente
                    </Link>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Phone className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contatos Ativos</p>
                                <p className="text-2xl font-display font-bold text-[#4A3B32]">{customers.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">LTV Médio</p>
                                <p className="text-2xl font-display font-bold text-[#4A3B32]">R$ {averageLTV.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-3xl bg-purple-50 flex items-center justify-center text-purple-600">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Malinhas</p>
                                <p className="text-2xl font-display font-bold text-[#4A3B32]">{customers.reduce((acc, c) => acc + c.totalOrders, 0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Receita Total</p>
                                <p className="text-2xl font-display font-bold text-[#4A3B32]">R$ {totalSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* List Table Card */}
            <Card className="overflow-hidden border-none shadow-2xl shadow-gray-100">
                <div className="p-6 border-b border-gray-50 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, telefone ou e-mail..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-[#4A3B32] hover:bg-gray-50 transition-all">
                        <Filter className="w-4 h-4" /> Filtros Avançados
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Cliente</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Engajamento</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">LTV Acumulado</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Última Interação</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {customersLoading ? (
                                    <tr><td colSpan="5" className="py-24 text-center text-gray-300 italic font-medium">Carregando CRM...</td></tr>
                                ) : filteredCustomers.length > 0 ? (
                                    filteredCustomers.map((customer, idx) => (
                                        <motion.tr
                                            key={customer.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover:bg-[#FDFBF7]/40 transition-colors group"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-[#FAF3F0] flex items-center justify-center text-[#C75D3B] font-bold text-lg border-2 border-white shadow-sm transition-transform group-hover:scale-110">
                                                        {customer.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-[#4A3B32]">{customer.name}</p>
                                                        <p className="text-[10px] text-gray-400 italic">{customer.email || 'Nenhum e-mail vinculado'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-1.5 font-bold text-[#4A3B32] text-xs">
                                                    <ShoppingBag className="w-3.5 h-3.5 text-[#C75D3B]/40" />
                                                    {customer.totalOrders} Entregas
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="font-bold text-[#4A3B32] text-sm">
                                                    R$ {customer.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-medium text-gray-400">
                                                    {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('pt-BR') : 'Sem registros'}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6 text-center space-x-2">
                                                <Link
                                                    to={`/admin/customers/${customer.id}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl text-[10px] font-bold text-[#4A3B32] hover:bg-[#4A3B32] hover:text-white transition-all shadow-sm group-hover:shadow-md active:scale-95"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    PERFIL
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(customer.id, customer.name)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-100 rounded-2xl text-[10px] font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                                                    title="Excluir Cliente"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="py-24 text-center text-gray-300 italic font-medium">Nenhuma cliente encontrada para "{search}".</td></tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </Card>

            <AlertDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ ...confirmDelete, isOpen: false })}
                onConfirm={onConfirmDelete}
                title="Excluir Cliente?"
                description={`Tem certeza que deseja excluir a cliente "${confirmDelete.customerName}"? Esta ação removerá todo o histórico vinculado.`}
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}

function TrendingUp(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    )
}

function DollarSign(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    )
}
