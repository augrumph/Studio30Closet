import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Truck, Phone, Mail, MapPin, Edit2, Trash2, Building2 } from 'lucide-react'
import { useSuppliersStore } from '@/store/suppliers-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { TableSkeleton } from '@/components/admin/PageSkeleton'

export function SuppliersList() {
    const { suppliers, suppliersLoading, loadSuppliers, removeSupplier, initialize } = useSuppliersStore()
    const [search, setSearch] = useState('')
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, supplierId: null, supplierName: '' })

    useEffect(() => {
        initialize()
    }, [initialize])

    const filteredSuppliers = suppliers.filter(supplier =>
        supplier.name?.toLowerCase().includes(search.toLowerCase()) ||
        supplier.cnpj?.toLowerCase().includes(search.toLowerCase()) ||
        supplier.city?.toLowerCase().includes(search.toLowerCase())
    )

    const handleDelete = (id, name) => {
        setConfirmDelete({ isOpen: true, supplierId: id, supplierName: name })
    }

    const onConfirmDelete = async () => {
        const result = await removeSupplier(confirmDelete.supplierId)
        if (result.success) {
            toast.success('Fornecedor excluído com sucesso.')
        } else {
            toast.error(`Erro ao excluir: ${result.error}`)
        }
        setConfirmDelete({ isOpen: false, supplierId: null, supplierName: '' })
    }

    // Show skeleton while loading
    if (suppliersLoading && suppliers.length === 0) {
        return <TableSkeleton columns={4} rows={5} />
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
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg">
                            <Truck className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Fornecedores</h2>
                    </div>
                    <p className="text-[#4A3B32]/60 font-medium">Gerencie sua rede de fornecedores.</p>
                </div>

                <ShimmerButton
                    onClick={() => window.location.href = '/admin/suppliers/new'}
                    className="px-8 py-4 rounded-2xl font-bold shadow-2xl"
                    shimmerColor="#ffffff"
                    shimmerSize="0.15em"
                    borderRadius="16px"
                    shimmerDuration="2s"
                    background="linear-gradient(135deg, #f97316 0%, #f59e0b 100%)"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Novo Fornecedor
                </ShimmerButton>
            </motion.div>

            {/* Main Content Card */}
            <Card className="overflow-hidden border-none shadow-2xl shadow-gray-100">
                <div className="p-6 border-b border-gray-50 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar fornecedor por nome, CNPJ ou cidade..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="text-sm font-bold text-[#4A3B32]/40">
                        {filteredSuppliers.length} {filteredSuppliers.length === 1 ? 'fornecedor' : 'fornecedores'}
                    </div>
                </div>

                <CardContent className="p-0">
                    {suppliersLoading ? (
                        <div className="p-20 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#C75D3B] border-t-transparent"></div>
                            <p className="mt-4 text-sm text-[#4A3B32]/40 font-medium">Carregando fornecedores...</p>
                        </div>
                    ) : filteredSuppliers.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FAF3F0] flex items-center justify-center">
                                <Truck className="w-8 h-8 text-[#C75D3B]/40" />
                            </div>
                            <p className="text-sm text-[#4A3B32]/40 font-medium">
                                {search ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado ainda.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {filteredSuppliers.map((supplier, idx) => (
                                    <motion.div
                                        key={supplier.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-6 hover:bg-[#FDFBF7] transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-6">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="w-12 h-12 rounded-2xl bg-[#C75D3B]/10 flex items-center justify-center flex-shrink-0">
                                                    <Building2 className="w-6 h-6 text-[#C75D3B]" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-bold text-[#4A3B32] text-lg truncate">
                                                            {supplier.name}
                                                        </h3>
                                                        {supplier.cnpj && (
                                                            <span className="text-xs font-mono text-[#4A3B32]/40 bg-gray-100 px-2 py-1 rounded">
                                                                {supplier.cnpj}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#4A3B32]/60">
                                                        {supplier.phone && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone className="w-3.5 h-3.5" />
                                                                <span>{supplier.phone}</span>
                                                            </div>
                                                        )}
                                                        {supplier.email && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Mail className="w-3.5 h-3.5" />
                                                                <span className="truncate max-w-[200px]">{supplier.email}</span>
                                                            </div>
                                                        )}
                                                        {supplier.city && (
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                <span>{supplier.city}/{supplier.state}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {supplier.notes && (
                                                        <p className="mt-2 text-sm text-[#4A3B32]/50 italic line-clamp-2">
                                                            {supplier.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/admin/suppliers/${supplier.id}`}
                                                    className="p-3 text-[#4A3B32]/40 hover:text-[#C75D3B] hover:bg-[#FDF0ED] rounded-xl transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(supplier.id, supplier.name)}
                                                    className="p-3 text-[#4A3B32]/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, supplierId: null, supplierName: '' })}
                onConfirm={onConfirmDelete}
                title="Excluir Fornecedor?"
                description={`Tem certeza que deseja excluir o fornecedor "${confirmDelete.supplierName}"? Esta ação não pode ser desfeita.`}
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
            />
        </div>
    )
}
