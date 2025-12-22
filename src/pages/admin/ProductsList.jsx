import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Tag, Package, ChevronRight, MoreHorizontal, Trash2, Edit2 } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function ProductsList() {
    const { products, productsLoading, loadProducts, removeProduct, removeMultipleProducts } = useAdminStore()
    const [search, setSearch] = useState('')
    const [selectedProducts, setSelectedProducts] = useState([])
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, productId: null, productName: '' })
    const [confirmMultiDelete, setConfirmMultiDelete] = useState(false)


    useEffect(() => {
        loadProducts()
    }, [loadProducts])

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.category.toLowerCase().includes(search.toLowerCase())
    )

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedProducts(filteredProducts.map(p => p.id))
        } else {
            setSelectedProducts([])
        }
    }

    const handleSelectProduct = (id) => {
        setSelectedProducts(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        )
    }

    const handleDelete = (id, name) => {
        setConfirmDelete({ isOpen: true, productId: id, productName: name })
    }

    const onConfirmDelete = async () => {
        const result = await removeProduct(confirmDelete.productId)
        if (result.success) {
            toast.success('Produto excluído do catálogo.')
        } else {
            toast.error(`Erro ao excluir: ${result.error}`)
        }
    }

    const onConfirmMultiDelete = async () => {
        const result = await removeMultipleProducts(selectedProducts)
        if (result.success) {
            toast.success(`${selectedProducts.length} produtos excluídos com sucesso.`)
            setSelectedProducts([])
        } else {
            toast.error(`Erro ao excluir produtos: ${result.error}`)
        }
        setConfirmMultiDelete(false)
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Catálogo de Produtos</h2>
                    <p className="text-[#4A3B32]/40 font-medium">Gerencie o estoque e a vitrine do seu Studio.</p>
                </div>

                <div className="flex items-center gap-4">
                    {selectedProducts.length > 0 && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => setConfirmMultiDelete(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/10 hover:bg-red-600 transition-all active:scale-95"
                        >
                            <Trash2 className="w-5 h-5" /> Excluir ({selectedProducts.length})
                        </motion.button>
                    )}
                    <Link
                        to="/admin/products/new"
                        className="flex items-center gap-2 px-6 py-3 bg-[#4A3B32] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#4A3B32]/10 hover:scale-105 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Novo Produto
                    </Link>
                </div>
            </div>

            {/* Main Content Card */}
            <Card className="overflow-hidden border-none shadow-2xl shadow-gray-100">
                <div className="p-6 border-b border-gray-50 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou categoria..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 w-12">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-[#C75D3B] focus:ring-[#C75D3B]/50"
                                        onChange={handleSelectAll}
                                        checked={selectedProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                                    />
                                </th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Produto</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Categoria</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">Valor</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">Estoque</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {productsLoading ? (
                                    <tr><td colSpan="6" className="py-24 text-center text-gray-300 italic">Sincronizando catálogo...</td></tr>
                                ) : filteredProducts.length > 0 ? (
                                    filteredProducts.map((product, idx) => (
                                        <motion.tr
                                            key={product.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className={cn("transition-colors group", selectedProducts.includes(product.id) ? 'bg-[#FFF9F7]' : 'hover:bg-[#FDFBF7]/40')}
                                        >
                                            <td className="px-8 py-6">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-[#C75D3B] focus:ring-[#C75D3B]/50"
                                                    checked={selectedProducts.includes(product.id)}
                                                    onChange={() => handleSelectProduct(product.id)}
                                                />
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                        <img
                                                            src={product.images[0]}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-[#4A3B32]">{product.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium line-clamp-1 italic max-w-xs">{product.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-[#4A3B32]/60 text-[10px] font-bold uppercase tracking-wider">
                                                    <Tag className="w-3 h-3" />
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-sm font-bold text-[#4A3B32]">
                                                    R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    product.stock <= 2 ? "text-red-500" : "text-[#4A3B32]"
                                                )}>
                                                    {product.stock} un
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center space-x-2">
                                                <Link
                                                    to={`/admin/products/${product.id}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl text-[10px] font-bold text-[#4A3B32] hover:bg-[#4A3B32] hover:text-white transition-all shadow-sm active:scale-95"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    EDITAR
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(product.id, product.name)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-100 rounded-2xl text-[10px] font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="6" className="py-24 text-center text-gray-300 italic">Nenhum produto encontrado.</td></tr>
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
                title="Excluir Produto?"
                description={`Tem certeza que deseja excluir o produto "${confirmDelete.productName}" do catálogo? Esta ação é irreversível.`}
                confirmText="Excluir Produto"
                cancelText="Cancelar"
                variant="danger"
            />

            <AlertDialog
                isOpen={confirmMultiDelete}
                onClose={() => setConfirmMultiDelete(false)}
                onConfirm={onConfirmMultiDelete}
                title={`Excluir ${selectedProducts.length} Produtos?`}
                description={`Tem certeza que deseja excluir os ${selectedProducts.length} produtos selecionados? Esta ação é irreversível.`}
                confirmText="Excluir Selecionados"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}
