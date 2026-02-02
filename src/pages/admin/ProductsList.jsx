import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Tag, Package, Trash2, Edit2, EyeOff, TrendingUp, DollarSign, Info, ArrowUpDown, ArrowUp, ArrowDown, Layers } from 'lucide-react'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState, TableWrapper } from '@/components/admin/shared'
import { ProductsListSkeleton, KPISkeletonCard } from '@/components/admin/PageSkeleton'
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
import { useAdminProducts } from '@/hooks/useAdminProducts'
import { CollectionsManagerModal } from '@/components/admin/CollectionsManagerModal'
import { getActiveCollections } from '@/lib/api/collections'


export function ProductsList() {
    // ⚡ REACT QUERY HOOK
    const {
        products,
        isLoading: productsLoading,
        isError,
        error,
        deleteProduct,
        deleteMultipleProducts,
        refetch
    } = useAdminProducts()

    const [searchParams] = useSearchParams()
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [stockFilter, setStockFilter] = useState(searchParams.get('filter') === 'lowStock' ? 'low' : 'all')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [selectedProducts, setSelectedProducts] = useState([])
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, productId: null, productName: '' })
    const [confirmMultiDelete, setConfirmMultiDelete] = useState(false)
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' })

    // Collections state
    const [collectionsModalOpen, setCollectionsModalOpen] = useState(false)
    const [collections, setCollections] = useState([])

    // Load collections for dropdown
    useEffect(() => {
        getActiveCollections().then(setCollections).catch(() => { })
    }, [])

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }

    // Filter Logic
    const filteredProducts = useMemo(() => {
        if (!products) return []
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                product.category.toLowerCase().includes(search.toLowerCase()) ||
                product.id.toString().includes(search)

            const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
            const matchesStock = stockFilter === 'all' || (stockFilter === 'low' && product.stock <= 2)

            return matchesSearch && matchesCategory && matchesStock
        }).sort((a, b) => {
            if (!sortConfig.key) return 0;

            let aValue, bValue;

            // Handle calculated fields
            if (sortConfig.key === 'markup') {
                aValue = a.costPrice > 0 ? a.price / a.costPrice : 0;
                bValue = b.costPrice > 0 ? b.price / b.costPrice : 0;
            } else if (sortConfig.key === 'margin') {
                aValue = a.price > 0 ? (a.price - a.costPrice) / a.price : -Infinity;
                bValue = b.price > 0 ? (b.price - b.costPrice) / b.price : -Infinity;
            } else {
                aValue = a[sortConfig.key];
                bValue = b[sortConfig.key];
            }

            // Handle string comparison for case-insensitive sort
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue != null ? bValue.toLowerCase() : '';
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        })
    }, [products, search, categoryFilter, stockFilter, sortConfig])

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1)
    }, [search, categoryFilter, stockFilter])

    // Derived Data
    const categories = useMemo(() => {
        if (!products) return []
        const cats = new Set(products.map(p => p.category))
        return Array.from(cats).sort()
    }, [products])

    const metrics = useMemo(() => {
        if (!products) return { totalValue: 0, totalCost: 0, totalItems: 0, totalProducts: 0, averageMarkup: '0' }
        return {
            totalValue: products.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0),
            totalCost: products.reduce((acc, p) => acc + ((p.costPrice || 0) * (p.stock || 0)), 0),
            totalItems: products.reduce((acc, p) => acc + (p.stock || 0), 0),
            totalProducts: products.length,
            averageMarkup: (() => {
                const totalVal = products.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0);
                const totalCst = products.reduce((acc, p) => acc + ((p.costPrice || 0) * (p.stock || 0)), 0);
                if (!totalCst || totalCst === 0) return '0';
                return (((totalVal - totalCst) / totalCst) * 100).toFixed(0);
            })()
        }
    }, [products])

    // Handlers
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
        try {
            await deleteProduct(confirmDelete.productId)
            toast.success('Produto excluído do catálogo.')
            setConfirmDelete({ ...confirmDelete, isOpen: false })
        } catch (err) {
            toast.error(`Erro ao excluir: ${err.message}`)
        }
    }

    const onConfirmMultiDelete = async () => {
        try {
            await deleteMultipleProducts(selectedProducts)
            toast.success(`${selectedProducts.length} produtos excluídos com sucesso.`)
            setSelectedProducts([])
            setConfirmMultiDelete(false)
        } catch (err) {
            toast.error(`Erro ao excluir produtos: ${err.message}`)
        }
    }

    // Skeleton View
    if (productsLoading && !products.length) {
        return <ProductsListSkeleton />
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
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

                <div className="flex items-center gap-4 flex-wrap">
                    {/* Collections Buttons */}
                    <button
                        onClick={() => setCollectionsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-2xl text-sm font-bold hover:bg-purple-200 transition-all active:scale-95"
                    >
                        <Layers className="w-4 h-4" />
                        Coleções
                    </button>



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

            {/* Quick Insights Cards */}
            <TooltipProvider delayDuration={200}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {productsLoading ? <KPISkeletonCard /> : (
                        <KPI_Card
                            icon={TrendingUp} iconColor="text-emerald-600" bgColor="bg-emerald-50"
                            title="Faturamento Estimado"
                            value={`R$ ${(metrics.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            subtitle="Potencial de receita bruta"
                            tooltip="Soma total do valor de venda de todos os produtos em estoque."
                        />
                    )}
                    {productsLoading ? <KPISkeletonCard /> : (
                        <KPI_Card
                            icon={DollarSign} iconColor="text-amber-600" bgColor="bg-amber-50"
                            title="Custo de Estoque"
                            value={`R$ ${(metrics.totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            subtitle="Capital imobilizado"
                            tooltip="Soma total do valor de custo de todos os produtos parados no estoque."
                        />
                    )}
                    {productsLoading ? <KPISkeletonCard /> : (
                        <KPI_Card
                            icon={TrendingUp} iconColor="text-emerald-600" bgColor="bg-emerald-50"
                            title="Markup Médio"
                            value={`${metrics.averageMarkup}%`}
                            subtitle="Rentabilidade estimada"
                            tooltip="Média percentual de lucro sobre o custo."
                        />
                    )}
                    {productsLoading ? <KPISkeletonCard /> : (
                        <KPI_Card
                            icon={Package} iconColor="text-blue-600" bgColor="bg-blue-50"
                            title="Total de Peças"
                            value={metrics.totalItems}
                            subtitle="Unidades físicas"
                            tooltip="Soma total da quantidade de todas as peças cadastradas."
                        />
                    )}
                    {productsLoading ? <KPISkeletonCard /> : (
                        <KPI_Card
                            icon={Tag} iconColor="text-purple-600" bgColor="bg-purple-50"
                            title="SKUs"
                            value={metrics.totalProducts}
                            subtitle="Modelos ativos"
                            tooltip="Quantidade de modelos de produtos diferentes cadastrados."
                        />
                    )}
                </div>
            </TooltipProvider>

            {/* Main Table Card */}
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
                                    />
                                </th>
                                <th
                                    className="px-4 md:px-8 py-3 md:py-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[#C75D3B] transition-colors group"
                                    onClick={() => requestSort('name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Produto
                                        {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                    </div>
                                </th>
                                <th
                                    className="hidden sm:table-cell px-4 md:px-8 py-3 md:py-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[#C75D3B] transition-colors group"
                                    onClick={() => requestSort('category')}
                                >
                                    <div className="flex items-center gap-1">
                                        Categoria
                                        {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                    </div>
                                </th>
                                <th
                                    className="px-4 md:px-8 py-3 md:py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-[#C75D3B] transition-colors group"
                                    onClick={() => requestSort('costPrice')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Custo
                                        {sortConfig.key === 'costPrice' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                    </div>
                                </th>
                                <th
                                    className="hidden lg:table-cell px-4 md:px-8 py-3 md:py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-[#C75D3B] transition-colors group"
                                    onClick={() => requestSort('markup')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Markup
                                        {sortConfig.key === 'markup' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                    </div>
                                </th>
                                <th
                                    className="hidden lg:table-cell px-4 md:px-8 py-3 md:py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-[#C75D3B] transition-colors group"
                                    onClick={() => requestSort('margin')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Margem
                                        {sortConfig.key === 'margin' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                    </div>
                                </th>
                                <th
                                    className="px-4 md:px-8 py-3 md:py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-[#C75D3B] transition-colors group"
                                    onClick={() => requestSort('price')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Valor
                                        {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                    </div>
                                </th>
                                <th
                                    className="hidden md:table-cell px-4 md:px-8 py-3 md:py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-[#C75D3B] transition-colors group"
                                    onClick={() => requestSort('stock')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Estoque
                                        {sortConfig.key === 'stock' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                    </div>
                                </th>
                                <th className="px-4 md:px-8 py-3 md:py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {isError ? (
                                    <tr>
                                        <td colSpan="9">
                                            <ErrorState
                                                title="Erro ao carregar produtos"
                                                description={error?.message}
                                                onRetry={refetch}
                                            />
                                        </td>
                                    </tr>
                                ) : paginatedProducts.length > 0 ? (
                                    paginatedProducts.map((product, idx) => (
                                        <motion.tr
                                            layout
                                            key={product.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{
                                                duration: 0.3,
                                                layout: { type: "spring", stiffness: 300, damping: 30 }
                                            }}
                                            className={cn("transition-colors group", selectedProducts.includes(product.id) ? 'bg-[#FFF9F7]' : 'hover:bg-[#FDFBF7]/40')}
                                        >
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-[#C75D3B] focus:ring-[#C75D3B]/50 focus-visible:ring-2 focus-visible:ring-[#C75D3B]"
                                                    checked={selectedProducts.includes(product.id)}
                                                    onChange={() => handleSelectProduct(product.id)}
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
                                                                    <EyeOff className="w-3 h-3" /> Oculto
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
                                                <span className="text-sm text-gray-400">
                                                    R$ {(product.costPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell px-4 md:px-8 py-4 md:py-6 text-right">
                                                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                                    {product.costPrice > 0 ? (((product.price - product.costPrice) / product.costPrice) * 100).toFixed(0) + '%' : '-'}
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell px-4 md:px-8 py-4 md:py-6 text-right">
                                                {(() => {
                                                    const margin = product.price > 0 ? ((product.price - product.costPrice) / product.price * 100) : 0;
                                                    return (
                                                        <span className={cn(
                                                            "text-sm font-bold px-2 py-1 rounded-md",
                                                            margin >= 50 ? "text-emerald-600 bg-emerald-50" : margin >= 30 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"
                                                        )}>
                                                            {product.price > 0 ? margin.toFixed(0) + '%' : '-'}
                                                        </span>
                                                    )
                                                })()}
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
                                                        className="inline-flex items-center gap-2 px-3 md:px-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-[#4A3B32] hover:bg-[#4A3B32] hover:text-white transition-all shadow-sm active:scale-95"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        <span className="hidden md:inline">EDITAR</span>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        className="inline-flex items-center gap-2 px-3 py-3 bg-white border border-red-100 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9">
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
                                {/* Pagination numbers simplified for brevity */}
                                <span className="mx-2 text-sm text-gray-500">Página {currentPage} de {totalPages}</span>
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

            {/* Collections Manager Modal */}
            <CollectionsManagerModal
                isOpen={collectionsModalOpen}
                onClose={() => {
                    setCollectionsModalOpen(false)
                    // Refresh collections list after closing modal
                    getActiveCollections().then(setCollections).catch(() => { })
                }}
            />
        </div>
    )
}

function KPI_Card({ icon: Icon, iconColor, bgColor, title, value, subtitle, tooltip }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`border-${bgColor.replace('bg-', '').replace('-50', '')}-50 bg-white group overflow-hidden relative h-full`}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 ${bgColor} rounded-xl`}><Icon className={`w-5 h-5 ${iconColor}`} /></div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</span>
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                    <Info className="w-4 h-4 text-gray-300" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm">
                                <p>{tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-display font-bold text-[#4A3B32]">{value}</div>
                    <p className={`text-[10px] ${iconColor} font-medium mt-1`}>{subtitle}</p>
                </CardContent>
            </Card>
        </motion.div>
    )
}
