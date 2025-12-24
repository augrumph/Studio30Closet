import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Tag, Package, ChevronRight, MoreHorizontal, Trash2, Edit2 } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState, TableWrapper } from '@/components/admin/shared'
import { ShimmerButton } from '@/components/magicui/shimmer-button'

export function ProductsList() {
    const { products, productsLoading, loadProducts, removeProduct, removeMultipleProducts } = useAdminStore()
    const [search, setSearch] = useState('')
    const [selectedProducts, setSelectedProducts] = useState([])
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, productId: null, productName: '' })
    const [confirmMultiDelete, setConfirmMultiDelete] = useState(false)
    const [error, setError] = useState(null)


    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setError(null)
                await loadProducts()
            } catch (err) {
                console.error('Erro ao carregar produtos:', err)
                setError(err.message || 'Erro ao carregar produtos')
            }
        }
        fetchProducts()
    }, [loadProducts])

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.category.toLowerCase().includes(search.toLowerCase()) ||
        product.id.toString().includes(search)
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
            {/* Header Premium */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Catálogo de Produtos</h2>
                    </div>
                    <p className="text-[#4A3B32]/60 font-medium">Gerencie o estoque e a vitrine do seu Studio.</p>
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
                    <ShimmerButton
                        onClick={() => window.location.href = '/admin/products/new'}
                        className="px-8 py-4 rounded-2xl font-bold shadow-2xl"
                        shimmerColor="#ffffff"
                        shimmerSize="0.15em"
                        borderRadius="16px"
                        shimmerDuration="2s"
                        background="linear-gradient(135deg, #10b981 0%, #0d9488 100%)"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Produto
                    </ShimmerButton>
                </div>
            </motion.div>

            {/* Main Content Card */}
            <Card className="overflow-hidden border-none shadow-2xl shadow-gray-100">
                <div className="p-6 border-b border-gray-50 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, categoria ou ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                        />
                    </div>
                </div>

                <TableWrapper>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-4 md:px-8 py-3 md:py-5 w-12">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-[#C75D3B] focus:ring-[#C75D3B]/50 focus-visible:ring-2 focus-visible:ring-[#C75D3B]"
                                        onChange={handleSelectAll}
                                        checked={selectedProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                                        aria-label="Selecionar todos os produtos"
                                    />
                                </th>
                                <th className="px-4 md:px-8 py-3 md:py-5 text-xs md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Produto</th>
                                <th className="hidden sm:table-cell px-4 md:px-8 py-3 md:py-5 text-xs md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Categoria</th>
                                <th className="px-4 md:px-8 py-3 md:py-5 text-xs md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">Valor</th>
                                <th className="hidden md:table-cell px-4 md:px-8 py-3 md:py-5 text-xs md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">Estoque</th>
                                <th className="px-4 md:px-8 py-3 md:py-5 text-xs md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {error ? (
                                    <tr>
                                        <td colSpan="6">
                                            <ErrorState
                                                title="Erro ao carregar produtos"
                                                description={error}
                                                onRetry={() => {
                                                    setError(null)
                                                    loadProducts()
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ) : productsLoading ? (
                                    <tr>
                                        <td colSpan="6">
                                            <LoadingState text="Sincronizando catálogo..." />
                                        </td>
                                    </tr>
                                ) : filteredProducts.length > 0 ? (
                                    filteredProducts.map((product, idx) => (
                                        <motion.tr
                                            key={product.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className={cn("transition-colors group", selectedProducts.includes(product.id) ? 'bg-[#FFF9F7]' : 'hover:bg-[#FDFBF7]/40')}
                                        >
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-[#C75D3B] focus:ring-[#C75D3B]/50 focus-visible:ring-2 focus-visible:ring-[#C75D3B]"
                                                    checked={selectedProducts.includes(product.id)}
                                                    onChange={() => handleSelectProduct(product.id)}
                                                    aria-label={`Selecionar ${product.name}`}
                                                />
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                        <img
                                                            src={product.images[0]}
                                                            alt={product.name}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <p className="text-sm font-bold text-[#4A3B32] truncate">{product.name}</p>
                                                            <span className="px-2 py-0.5 bg-[#C75D3B]/10 text-[#C75D3B] text-xs font-bold rounded shrink-0">
                                                                #{product.id}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 font-medium line-clamp-1 italic">{product.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden sm:table-cell px-4 md:px-8 py-4 md:py-6">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-[#4A3B32]/60 text-xs font-bold uppercase tracking-wider">
                                                    <Tag className="w-3 h-3" />
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                                                <span className="text-sm font-bold text-[#4A3B32]">
                                                    R$ {(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="hidden md:table-cell px-4 md:px-8 py-4 md:py-6 text-right">
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    product.stock <= 2 ? "text-red-500" : "text-[#4A3B32]"
                                                )}>
                                                    {product.stock} un
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        to={`/admin/products/${product.id}`}
                                                        className="inline-flex items-center gap-2 px-3 md:px-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-[#4A3B32] hover:bg-[#4A3B32] hover:text-white transition-all shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-[#C75D3B]"
                                                        aria-label={`Editar ${product.name}`}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        <span className="hidden md:inline">EDITAR</span>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        className="inline-flex items-center gap-2 px-3 py-3 bg-white border border-red-100 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500"
                                                        aria-label={`Excluir ${product.name}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6">
                                            <EmptyState
                                                icon={Package}
                                                title={search ? "Nenhum produto encontrado" : "Catálogo vazio"}
                                                description={search ? `Nenhum resultado para "${search}"` : "Adicione seu primeiro produto ao catálogo"}
                                                action={!search && (
                                                    <Link
                                                        to="/admin/products/new"
                                                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#C75D3B] text-white rounded-lg hover:bg-[#A64D31] transition-colors"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                        Adicionar produto
                                                    </Link>
                                                )}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </TableWrapper>
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
