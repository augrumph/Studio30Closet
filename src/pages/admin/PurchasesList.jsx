import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ShoppingCart, CreditCard, Calendar, Package, Trash2, Edit2, DollarSign } from 'lucide-react'
import { useSuppliersStore } from '@/store/suppliers-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function PurchasesList() {
    const { purchases, purchasesLoading, loadPurchases, removePurchase, suppliers, loadSuppliers } = useSuppliersStore()
    const [search, setSearch] = useState('')
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, purchaseId: null })

    useEffect(() => {
        loadPurchases()
        loadSuppliers()
    }, [loadPurchases, loadSuppliers])

    const filteredPurchases = purchases.filter(purchase => {
        const supplier = suppliers.find(s => s.id === purchase.supplierId)
        const supplierName = supplier?.name || ''
        return supplierName.toLowerCase().includes(search.toLowerCase()) ||
            purchase.paymentMethod?.toLowerCase().includes(search.toLowerCase())
    })

    const handleDelete = (id) => {
        setConfirmDelete({ isOpen: true, purchaseId: id })
    }

    const onConfirmDelete = async () => {
        const result = await removePurchase(confirmDelete.purchaseId)
        if (result.success) {
            toast.success('Compra excluída com sucesso.')
        } else {
            toast.error(`Erro ao excluir: ${result.error}`)
        }
        setConfirmDelete({ isOpen: false, purchaseId: null })
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

    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (p.value || 0), 0)
    const totalItems = filteredPurchases.reduce((sum, p) => sum + (p.pieces || 0), 0)

    return (
        <div className="space-y-10 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Compras de Fornecedores</h2>
                    <p className="text-[#4A3B32]/40 font-medium">Gerencie todas as compras realizadas.</p>
                </div>

                <Link
                    to="/admin/purchases/new"
                    className="flex items-center gap-2 px-6 py-3 bg-[#4A3B32] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#4A3B32]/10 hover:scale-105 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Nova Compra
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Total Comprado</p>
                                <p className="text-2xl font-bold text-[#4A3B32]">{formatCurrency(totalPurchases)}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-[#C75D3B]/10 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-[#C75D3B]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Total de Compras</p>
                                <p className="text-2xl font-bold text-[#4A3B32]">{filteredPurchases.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Total de Peças</p>
                                <p className="text-2xl font-bold text-[#4A3B32]">{totalItems}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                                <Package className="w-6 h-6 text-purple-600" />
                            </div>
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
                        {filteredPurchases.length} {filteredPurchases.length === 1 ? 'compra' : 'compras'}
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
                                                                getPaymentMethodColor(purchase.paymentMethod)
                                                            )}>
                                                                {getPaymentMethodLabel(purchase.paymentMethod)}
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
