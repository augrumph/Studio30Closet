import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Tag, Package, ChevronRight, MoreHorizontal, Trash2, Edit2, Eye, EyeOff } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState, TableWrapper } from '@/components/admin/shared'
import { ProductsListSkeleton } from '@/components/admin/PageSkeleton'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import { Info, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/Pagination"

export function ProductsList() {
    const { products, productsLoading, loadInventoryForAdmin, removeProduct, removeMultipleProducts } = useAdminStore()
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [stockFilter, setStockFilter] = useState('all') // 'all', 'low'
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [selectedProducts, setSelectedProducts] = useState([])
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, productId: null, productName: '' })
    const [confirmMultiDelete, setConfirmMultiDelete] = useState(false)
    const [error, setError] = useState(null)


    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setError(null)
                // Use loadInventoryForAdmin to fetch ALL data including cost_price
                await loadInventoryForAdmin()
            } catch (err) {
                console.error('Erro ao carregar produtos:', err)
                setError(err.message || 'Erro ao carregar produtos')
            }
        }
        fetchProducts()
    }, [loadInventoryForAdmin])

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                product.category.toLowerCase().includes(search.toLowerCase()) ||
                product.id.toString().includes(search)

            const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
            const matchesStock = stockFilter === 'all' || (stockFilter === 'low' && product.stock <= 2)

            return matchesSearch && matchesCategory && matchesStock
        })
    }, [products, search, categoryFilter, stockFilter])

    // Paginação
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Reset page quando filtros mudam
    useEffect(() => {
        setCurrentPage(1)
    }, [search, categoryFilter, stockFilter])

    // Categorias únicas para o filtro
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category))
        return Array.from(cats).sort()
    }, [products])

    // Métricas
    const metrics = useMemo(() => {
        return {
            totalValue: products.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0),
            totalCost: products.reduce((acc, p) => acc + ((p.costPrice || 0) * (p.stock || 0)), 0),
            totalItems: products.reduce((acc, p) => acc + (p.stock || 0), 0),
            totalProducts: products.length,
            lowStock: products.filter(p => p.stock <= 2).length
        }
    }, [products])

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

    // Show skeleton while loading
    if (productsLoading && products.length === 0) {
        return <ProductsListSkeleton />
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

            {/* Quick Insights - Bento Style Cards */}
            <TooltipProvider delayDuration={200}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border-emerald-50 bg-white group overflow-hidden relative h-full">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-xl"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor de Venda</span>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                                <Info className="w-4 h-4 text-gray-300" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                            <p>Soma total do valor de venda de todos os produtos em estoque (Preço x Quantidade).</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-display font-bold text-[#4A3B32]">
                                    R$ {(metrics.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <p className="text-[10px] text-emerald-600 font-medium mt-1">Potencial de faturamento</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <Card className="border-amber-50 bg-white group overflow-hidden relative h-full">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-50 rounded-xl"><DollarSign className="w-5 h-5 text-amber-600" /></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custo de Estoque</span>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                                <Info className="w-4 h-4 text-gray-300" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                            <p>Soma total do valor de custo de todos os produtos parados no estoque (Custo x Quantidade).</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-display font-bold text-[#4A3B32]">
                                    R$ {(metrics.totalCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <p className="text-[10px] text-amber-600 font-medium mt-1">Capital imobilizado</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="border-blue-50 bg-white group overflow-hidden relative h-full">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 rounded-xl"><Package className="w-5 h-5 text-blue-600" /></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total de Peças</span>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                                <Info className="w-4 h-4 text-gray-300" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                            <p>Soma total da quantidade de todas as peças cadastradas e disponíveis.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-display font-bold text-[#4A3B32]">{metrics.totalItems}</div>
                                <p className="text-[10px] text-blue-600 font-medium mt-1">Unidades físicas</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="border-purple-50 bg-white group overflow-hidden relative h-full">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 rounded-xl"><Tag className="w-5 h-5 text-purple-600" /></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">SKUs</span>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                                <Info className="w-4 h-4 text-gray-300" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                            <p>Quantidade de modelos de produtos diferentes cadastrados no catálogo.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-display font-bold text-[#4A3B32]">{metrics.totalProducts}</div>
                                <p className="text-[10px] text-purple-600 font-medium mt-1">Modelos ativos</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Card className={cn(
                            "border-red-50 bg-white group overflow-hidden relative cursor-pointer hover:shadow-lg transition-all",
                            metrics.lowStock > 0 && "bg-red-50/30"
                        )} onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-100 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                                        <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Estoque Baixo</span>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button className="p-1.5 hover:bg-red-200/50 rounded-full transition-colors">
                                                <Info className="w-4 h-4 text-red-400" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                            <p>Produtos com 2 ou menos unidades em estoque. Clique para filtrar.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-display font-bold text-red-600">{metrics.lowStock}</div>
                                <p className="text-xs text-red-500 font-medium mt-1">Precisam de reposição</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </TooltipProvider>

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

                    <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl overflow-x-auto">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-transparent border-none text-[10px] font-bold uppercase tracking-wider text-[#4A3B32] outline-none px-4 py-2 cursor-pointer"
                        >
                            <option value="all">Todas Categorias</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                            ))}
                        </select>
                        <div className="w-[1px] bg-gray-200 my-2" />
                        <button
                            onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                stockFilter === 'low'
                                    ? "bg-red-500 text-white shadow-sm"
                                    : "text-[#4A3B32]/40 hover:text-[#4A3B32]"
                            )}
                        >
                            Estoque Baixo
                        </button>
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
                                ) : paginatedProducts.length > 0 ? (
                                    paginatedProducts.map((product, idx) => (
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
                                                            src={product.images?.[0] || '/placeholder.png'}
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
                                                            {product.active === false && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded shrink-0">
                                                                    <EyeOff className="w-3 h-3" />
                                                                    Oculto
                                                                </span>
                                                            )}
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

                <CardFooter className="bg-white border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4 p-6">
                    <p className="text-xs text-gray-400 font-medium">
                        Mostrando <span className="text-[#4A3B32] font-bold">{paginatedProducts.length}</span> de <span className="text-[#4A3B32] font-bold">{filteredProducts.length}</span> produtos
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
