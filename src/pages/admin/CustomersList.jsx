import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Phone, Mail, ShoppingBag, ExternalLink, MoreHorizontal, User, Trash2, Info, Gift, Send } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
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
import { CardFooter } from '@/components/ui/Card'
import { CustomersListSkeleton } from '@/components/admin/PageSkeleton'

export function CustomersList() {
    const { customers, customersLoading, loadCustomers, removeCustomer, vendas, loadVendas, orders, loadOrders } = useAdminStore()
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [filterSegment, setFilterSegment] = useState('all') // 'all', 'active', 'inactive'
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, customerId: null, customerName: '' })
    const [showBirthdays, setShowBirthdays] = useState(false)

    useEffect(() => {
        loadCustomers()
        loadVendas()
        loadOrders()
    }, [loadCustomers, loadVendas, loadOrders])

    // ✅ MÉTRICAS E CLIENTES PROCESSADOS
    const { processedCustomers, metrics, birthdaysThisMonth } = useMemo(() => {
        // Mapear vendas e pedidos por cliente para acesso rápido
        const salesByCustomer = {}
        const ordersByCustomer = {}

        vendas.forEach(v => {
            if (!salesByCustomer[v.customerId]) salesByCustomer[v.customerId] = []
            salesByCustomer[v.customerId].push(v)
        })

        orders.forEach(o => {
            if (!ordersByCustomer[o.customerId]) ordersByCustomer[o.customerId] = []
            ordersByCustomer[o.customerId].push(o)
        })

        // Processar cada cliente com suas métricas
        const processed = customers.map(customer => {
            const customerSales = salesByCustomer[customer.id] || []
            const customerOrders = ordersByCustomer[customer.id] || []

            const totalSpent = customerSales.reduce((sum, v) => sum + (v.totalValue || 0), 0)
            const totalOrders = customerOrders.length

            // Tenta pegar a data da última venda, senão do último pedido
            const lastOrderAt = customerSales.length > 0
                ? customerSales[0].createdAt
                : (customerOrders.length > 0 ? customerOrders[0].updatedAt : null)

            return {
                ...customer,
                totalSpent,
                totalOrders,
                lastOrderAt
            }
        })

        // Filtrar aniversariantes do mês atual
        const currentMonth = new Date().getMonth() + 1 // 1-12
        const birthdays = processed.filter(c => {
            if (!c.birth_date) return false
            const [_, month] = c.birth_date.split('-').map(Number)
            return month === currentMonth
        }).sort((a, b) => {
            const dayA = parseInt(a.birth_date.split('-')[2])
            const dayB = parseInt(b.birth_date.split('-')[2])
            return dayA - dayB
        })

        // Métricas Globais
        const totalSpentGlobal = vendas.reduce((acc, venda) => acc + (venda.totalValue || 0), 0)
        const customersWithSales = Object.keys(salesByCustomer).length
        const averageLTV = customersWithSales > 0 ? totalSpentGlobal / customersWithSales : 0
        const totalMalinhas = orders.length

        return {
            processedCustomers: processed,
            birthdaysThisMonth: birthdays,
            metrics: {
                totalSpent: totalSpentGlobal,
                averageLTV,
                totalMalinhas,
                activeContacts: customers.length
            }
        }
    }, [vendas, orders, customers])

    const filteredCustomers = useMemo(() => {
        return processedCustomers.filter(customer => {
            const matchesSearch = customer.name.toLowerCase().includes(search.toLowerCase()) ||
                (customer.phone && customer.phone.includes(search)) ||
                (customer.email && customer.email.toLowerCase().includes(search.toLowerCase()))

            let matchesSegment = true
            if (filterSegment === 'active') {
                matchesSegment = customer.totalOrders > 0
            } else if (filterSegment === 'inactive') {
                matchesSegment = customer.totalOrders === 0
            }

            return matchesSearch && matchesSegment
        })
    }, [processedCustomers, search, filterSegment])

    // Paginação
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
    const paginatedCustomers = useMemo(() => {
        const startIdx = (currentPage - 1) * itemsPerPage
        return filteredCustomers.slice(startIdx, startIdx + itemsPerPage)
    }, [filteredCustomers, currentPage, itemsPerPage])

    // Reset page quando filtros mudam
    useEffect(() => {
        setCurrentPage(1)
    }, [search, filterSegment])

    const handleDelete = (id, name) => {
        setConfirmDelete({ isOpen: true, customerId: id, customerName: name })
    }

    const onConfirmDelete = async () => {
        const result = await removeCustomer(confirmDelete.customerId)
        if (result.success) {
            toast.success('Cliente removida com sucesso.', {
                description: 'O registro da cliente foi excluído permanentemente.',
                icon: '🗑️'
            })
        } else {
            toast.error(`Erro ao excluir: ${result.error}`, {
                description: 'Tente novamente mais tarde ou contate o suporte.',
                icon: '⚠️'
            })
        }
    }

    // Helper: Formatar data (DD/MM)
    const formatBirthday = (dateString) => {
        if (!dateString) return ''
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}`
    }

    // Helper: Gerar link WhatsApp
    const getWhatsAppLink = (customer) => {
        const phone = customer.phone.replace(/\D/g, '')
        const firstName = customer.name.split(' ')[0]
        const message = `Oi ${firstName}, parabéns! 🥳🎂\n\nVi que é seu mês de aniversário e separei um presente especial pra você aqui na Studio 30!\n\nQuando puder, me dá um oi pra eu te contar! 😘`
        return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
    }

    // Show skeleton while loading
    if (customersLoading && customers.length === 0) {
        return <CustomersListSkeleton />
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="space-y-6 pb-20">
                {/* Header Premium */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Banco de Clientes</h2>
                        </div>
                        <p className="text-[#4A3B32]/60 font-medium">Gestão de relacionamento e histórico de consumo.</p>
                    </div>

                    <ShimmerButton
                        onClick={() => window.location.href = '/admin/customers/new'}
                        className="px-8 py-4 rounded-2xl font-bold shadow-2xl"
                        shimmerColor="#ffffff"
                        shimmerSize="0.15em"
                        borderRadius="16px"
                        shimmerDuration="2s"
                        background="linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nova Cliente
                    </ShimmerButton>
                </motion.div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Card: Aniversariantes */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowBirthdays(true)}
                        className="cursor-pointer"
                    >
                        <Card className="bg-gradient-to-br from-[#C75D3B] to-[#A64D31] border-none shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-all" />
                            <CardContent className="pt-6 relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-12 h-12 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                                        <Gift className="w-6 h-6" />
                                    </div>
                                    <span className="px-2 py-1 bg-white/20 rounded-lg text-white text-[10px] font-bold uppercase backdrop-blur-sm">
                                        Mês Atual
                                    </span>
                                </div>
                                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Aniversariantes</p>
                                <div className="flex items-end gap-2">
                                    <p className="text-3xl font-display font-bold text-white">{birthdaysThisMonth.length}</p>
                                    <p className="text-white/80 text-xs font-bold mb-1.5">clientes</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Card: Contatos Ativos */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-12 h-12 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                        <p className="font-semibold mb-1">Contatos Ativos</p>
                                        <p className="text-gray-300">Total de clientes cadastrados no sistema.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contatos Ativos</p>
                            <p className="text-2xl font-display font-bold text-[#4A3B32]">{metrics.activeContacts}</p>
                        </CardContent>
                    </Card>

                    {/* Card: LTV Médio */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-12 h-12 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                        <p className="font-semibold mb-1">LTV Médio</p>
                                        <p className="text-gray-300">Lifetime Value médio: quanto cada cliente gasta em média ao longo do tempo.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">LTV Médio</p>
                            <p className="text-2xl font-display font-bold text-[#4A3B32]">R$ {metrics.averageLTV.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                        </CardContent>
                    </Card>

                    {/* Card: Receita Total */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-12 h-12 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-600">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                        <p className="font-semibold mb-1">Receita Total</p>
                                        <p className="text-gray-300">Faturamento bruto total histórico.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Receita Total</p>
                            <p className="text-2xl font-display font-bold text-[#4A3B32]">R$ {metrics.totalSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
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
                        <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'active', label: 'Com Compra' },
                                { id: 'inactive', label: 'Sem Compra' }
                            ].map(seg => (
                                <button
                                    key={seg.id}
                                    onClick={() => setFilterSegment(seg.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                        filterSegment === seg.id
                                            ? "bg-[#4A3B32] text-white shadow-sm"
                                            : "text-[#4A3B32]/40 hover:text-[#4A3B32]"
                                    )}
                                >
                                    {seg.label}
                                </button>
                            ))}
                        </div>
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
                                    ) : paginatedCustomers.length > 0 ? (
                                        paginatedCustomers.map((customer, idx) => (
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
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-[#4A3B32]">{customer.name}</p>
                                                                {customer.birth_date && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400" title="Aniversário Cadastrado" />
                                                                )}
                                                            </div>
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
                                                        R$ {(customer.totalSpent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

                    <CardFooter className="bg-white border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4 p-6">
                        <p className="text-xs text-gray-400 font-medium">
                            Mostrando <span className="text-[#4A3B32] font-bold">{paginatedCustomers.length}</span> de <span className="text-[#4A3B32] font-bold">{filteredCustomers.length}</span> clientes
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

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        if (
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
                                            return (
                                                <PaginationItem key={page}>
                                                    <PaginationLink
                                                        onClick={() => setCurrentPage(page)}
                                                        isActive={currentPage === page}
                                                    >
                                                        {page}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            )
                                        } else if (
                                            page === currentPage - 2 ||
                                            page === currentPage + 2
                                        ) {
                                            return <PaginationEllipsis key={page} />
                                        }
                                        return null
                                    })}

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

                {/* MODAL ANIVERSARIANTES */}
                <Dialog open={showBirthdays} onOpenChange={setShowBirthdays}>
                    <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-gray-50 border-none shadow-3xl">
                        <DialogHeader>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-pink-100 rounded-2xl">
                                    <Gift className="w-6 h-6 text-pink-500" />
                                </div>
                                <div>
                                    <DialogTitle>Aniversariantes do Mês</DialogTitle>
                                    <DialogDescription className="text-gray-500 font-medium">
                                        Clientes que celebram aniversário em <strong>{new Date().toLocaleString('pt-BR', { month: 'long' })}</strong>
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 mt-4">
                            {birthdaysThisMonth.length > 0 ? (
                                birthdaysThisMonth.map(customer => (
                                    <motion.div
                                        key={customer.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 font-bold text-lg border-2 border-white shadow-sm">
                                                {formatBirthday(customer.birth_date)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#4A3B32]">{customer.name}</p>
                                                <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {customer.phone}
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={getWhatsAppLink(customer)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-green-600 transition-colors shadow-sm hover:shadow-green-200"
                                        >
                                            <Send className="w-3 h-3" />
                                            Enviar Parabéns
                                        </a>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                        <Gift className="w-8 h-8" />
                                    </div>
                                    <p className="text-gray-500 font-medium">Nenhum aniversariante neste mês.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                            <span>Total: {birthdaysThisMonth.length} clientes</span>
                            <span>🎉 Celebre com seus clientes!</span>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
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
