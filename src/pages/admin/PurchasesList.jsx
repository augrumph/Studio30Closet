import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ShoppingCart, CreditCard, Calendar, Package, Trash2, Edit2, DollarSign, User, Store } from 'lucide-react'
import { useAdminPurchases, useAdminPurchasesMutations, useAdminPurchasesMetrics } from '@/hooks/useAdminPurchases'
import { useAdminSuppliers } from '@/hooks/useAdminSuppliers'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { TableSkeleton } from '@/components/admin/PageSkeleton'

export function PurchasesList() {
    // Hooks

    const { suppliers } = useAdminSuppliers() // Needed for mapping supplier IDs
    const { deletePurchase } = useAdminPurchasesMutations()

    const [search, setSearch] = useState('')
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, purchaseId: null })
    const [periodFilter, setPeriodFilter] = useState('all')
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(20)

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [search, periodFilter, customDateRange])

    // Fetch Purchases (Paginated)
    const {
        purchases,
        total,
        totalPages,
        isLoading: purchasesLoading
    } = useAdminPurchases({
        page: currentPage,
        pageSize: itemsPerPage,
        search,
        period: periodFilter,
        startDate: customDateRange.start,
        endDate: customDateRange.end
    })

    // Fetch Metrics (Server-side aggregation)
    const { metrics: serverMetrics } = useAdminPurchasesMetrics({
        search,
        period: periodFilter,
        startDate: customDateRange.start,
        endDate: customDateRange.end
    })

    // Derived values
    const filteredPurchases = purchases || []
    const totalPurchases = serverMetrics.totalValue || 0
    const totalItems = serverMetrics.totalItems || 0
    const totalLoja = serverMetrics.totalLoja || 0
    const totalAugusto = serverMetrics.totalAugusto || 0

    const handleDelete = (id) => {
        setConfirmDelete({ isOpen: true, purchaseId: id })
    }

    const onConfirmDelete = async () => {
        try {
            await deletePurchase(confirmDelete.purchaseId)
            setConfirmDelete({ isOpen: false, purchaseId: null })
        } catch (error) {
            // Toast is handled by hook
        }
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR')
    }

    const getPaymentMethodLabel = (method) => {
        const labels = {
            'pix': 'PIX',
            'credito_vista': 'Crédito à Vista',
            'credito_parcelado': 'Crédito Parcelado',
            'boleto': 'Boleto',
            'dinheiro': 'Dinheiro'
        }
        return labels[method] || method
    }

    const getPaymentMethodColor = (method) => {
        const colors = {
            'pix': 'bg-green-100 text-green-700',
            'credito_vista': 'bg-blue-100 text-blue-700',
            'credito_parcelado': 'bg-purple-100 text-purple-700',
            'boleto': 'bg-orange-100 text-orange-700',
            'dinheiro': 'bg-gray-100 text-gray-700'
        }
        return colors[method] || 'bg-gray-100 text-gray-700'
    }

    const getPurchaseTypeLabel = (type) => {
        const labels = {
            'produto': 'Produto',
            'material': 'Material'
        }
        return labels[type] || type
    }

    const getPurchaseTypeColor = (type) => {
        const colors = {
            'produto': 'bg-blue-100 text-blue-700',
            'material': 'bg-amber-100 text-amber-700'
        }
        return colors[type] || 'bg-gray-100 text-gray-700'
    }

    const getSpentByLabel = (spentBy) => {
        const labels = {
            'loja': '🏪 Loja',
            'augusto': '👤 Augusto',
            'thais': '👤 Thais'
        }
        return labels[spentBy] || labels['loja']
    }

    const getSpentByColor = (spentBy) => {
        const colors = {
            'loja': 'bg-slate-100 text-slate-700',
            'augusto': 'bg-indigo-100 text-indigo-700',
            'thais': 'bg-pink-100 text-pink-700'
        }
        return colors[spentBy] || 'bg-slate-100 text-slate-700'
    }



    // Show skeleton while loading
    if (purchasesLoading && purchases.length === 0) {
        return <TableSkeleton columns={4} rows={6} />
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
                        <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl shadow-lg">
                            <ShoppingCart className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Compras de Fornecedores</h2>
                    </div>
                    <p className="text-[#4A3B32]/60 font-medium">Gerencie todas as compras realizadas.</p>
                </div>

                <ShimmerButton
                    onClick={() => window.location.href = '/admin/purchases/new'}
                    className="px-8 py-4 rounded-2xl font-bold shadow-2xl"
                    shimmerColor="#ffffff"
                    shimmerSize="0.15em"
                    borderRadius="16px"
                    shimmerDuration="2s"
                    background="linear-gradient(135deg, #475569 0%, #1e293b 100%)"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nova Compra
                </ShimmerButton>
            </motion.div>

            {/* Date Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md p-6 md:p-8"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-lg md:text-xl font-display font-bold text-[#4A3B32] mb-2">Filtrar Período</h3>
                        <p className="text-sm text-gray-500">Selecione o período para analisar suas compras</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                        {[
                            { value: 'all', label: 'Tudo' },
                            { value: 'last7days', label: 'Últimos 7 dias' },
                            { value: 'last30days', label: 'Últimos 30 dias' },
                            { value: 'currentMonth', label: 'Mês atual' },
                            { value: 'custom', label: 'Customizado' }
                        ].map(period => (
                            <button
                                key={period.value}
                                onClick={() => setPeriodFilter(period.value)}
                                className={cn(
                                    'px-4 py-2.5 rounded-xl font-semibold text-sm transition-all',
                                    periodFilter === period.value
                                        ? 'bg-[#C75D3B] text-white shadow-md'
                                        : 'bg-gray-100 text-[#4A3B32] hover:bg-gray-200'
                                )}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>
                </div>

                {periodFilter === 'custom' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-4"
                    >
                        <div className="flex-1">
                            <label className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-widest block mb-2">Data Início</label>
                            <input
                                type="date"
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-[#4A3B32]"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-widest block mb-2">Data Fim</label>
                            <input
                                type="date"
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-[#4A3B32]"
                            />
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Stats Cards */}
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#C75D3B]/10 flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-6 h-6 text-[#C75D3B]" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-[#4A3B32]">{formatCurrency(totalPurchases)}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">Total Comprado</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Store className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-700">{formatCurrency(totalLoja)}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">Gasto Loja</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-indigo-700">{formatCurrency(totalAugusto)}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">Gasto Augusto</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-[#4A3B32]">{total}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">Total de Compras</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-[#4A3B32]">{totalItems}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">Total de Peças</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Card */}
            <Card className="overflow-hidden border-none shadow-2xl shadow-gray-100">
                <div className="p-6 border-b border-gray-50 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar por fornecedor ou forma de pagamento..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="text-sm font-bold text-[#4A3B32]/40">
                        {total} {total === 1 ? 'compra' : 'compras'}
                    </div>
                </div>

                <CardContent className="p-0">
                    {purchasesLoading ? (
                        <div className="p-20 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#C75D3B] border-t-transparent"></div>
                            <p className="mt-4 text-sm text-[#4A3B32]/40 font-medium">Carregando compras...</p>
                        </div>
                    ) : filteredPurchases.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FAF3F0] flex items-center justify-center">
                                <ShoppingCart className="w-8 h-8 text-[#C75D3B]/40" />
                            </div>
                            <p className="text-sm text-[#4A3B32]/40 font-medium">
                                {search ? 'Nenhuma compra encontrada.' : 'Nenhuma compra registrada ainda.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {filteredPurchases.map((purchase, idx) => {
                                    const supplier = suppliers.find(s => s.id === purchase.supplierId)
                                    return (
                                        <motion.div
                                            key={purchase.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="p-6 hover:bg-[#FDFBF7] transition-all group"
                                        >
                                            <div className="flex items-start justify-between gap-6">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#C75D3B]/10 flex items-center justify-center flex-shrink-0">
                                                        <ShoppingCart className="w-6 h-6 text-[#C75D3B]" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <h3 className="font-bold text-[#4A3B32] text-lg">
                                                                {supplier?.name || 'Fornecedor não encontrado'}
                                                            </h3>
                                                            <span className={cn(
                                                                "text-xs font-bold px-3 py-1 rounded-full",
                                                                getPurchaseTypeColor(purchase.purchaseType)
                                                            )}>
                                                                {getPurchaseTypeLabel(purchase.purchaseType)}
                                                            </span>
                                                            <span className={cn(
                                                                "text-xs font-bold px-3 py-1 rounded-full",
                                                                getPaymentMethodColor(purchase.paymentMethod)
                                                            )}>
                                                                {getPaymentMethodLabel(purchase.paymentMethod)}
                                                            </span>
                                                            <span className={cn(
                                                                "text-xs font-bold px-3 py-1 rounded-full",
                                                                getSpentByColor(purchase.spentBy)
                                                            )}>
                                                                {getSpentByLabel(purchase.spentBy)}
                                                            </span>
                                                        </div>

                                                        <div className="grid md:grid-cols-4 gap-4">
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Valor</p>
                                                                <p className="text-lg font-bold text-[#C75D3B]">{formatCurrency(purchase.value)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Data</p>
                                                                <p className="text-sm font-medium text-[#4A3B32]/60 flex items-center gap-1">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    {formatDate(purchase.date)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Peças</p>
                                                                <p className="text-sm font-medium text-[#4A3B32]/60 flex items-center gap-1">
                                                                    <Package className="w-3.5 h-3.5" />
                                                                    {purchase.pieces || 0} peças
                                                                </p>
                                                            </div>
                                                            {purchase.parcelas && (
                                                                <div>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Parcelas</p>
                                                                    <p className="text-sm font-medium text-[#4A3B32]/60">
                                                                        {purchase.parcelas}x
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {purchase.notes && (
                                                            <p className="mt-3 text-sm text-[#4A3B32]/50 italic line-clamp-2">
                                                                {purchase.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        to={`/admin/purchases/${purchase.id}`}
                                                        className="p-3 text-[#4A3B32]/40 hover:text-[#C75D3B] hover:bg-[#FDF0ED] rounded-xl transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(purchase.id)}
                                                        className="p-3 text-[#4A3B32]/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, purchaseId: null })}
                onConfirm={onConfirmDelete}
                title="Excluir Compra?"
                description="Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita."
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
            />
        </div>
    )
}
