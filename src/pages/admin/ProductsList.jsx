import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Tag, Package, Trash2, Edit2, TrendingUp, DollarSign, ArrowUpDown, Layers, AlertTriangle, Activity, FolderPlus, ChevronDown, Check, X } from 'lucide-react'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { formatUserFriendlyError } from '@/lib/errorHandler'
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
import { useDebounce } from '@/hooks/useDebounce'
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData.js'
import { CollectionsManagerModal } from '@/components/admin/CollectionsManagerModal'
import { getActiveCollections } from '@/lib/api/collections'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { apiClient } from '@/lib/api-client'
import { useNavigate } from 'react-router-dom'

export function ProductsList() {
    // ⚡ REACT QUERY HOOK - ULTRA FAST SEARCH
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(searchInput, 300)
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [collectionFilter, setCollectionFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(20)

    useEffect(() => {
        setSearch(debouncedSearch)
    }, [debouncedSearch])

    const {
        products: paginatedProducts,
        total: totalItems,
        totalPages,
        isLoading: productsLoading,
        isError,
        error,
        deleteProduct,
        deleteMultipleProducts,
        refetch
    } = useAdminProducts({
        page: currentPage,
        pageSize: itemsPerPage,
        search: search,
        category: categoryFilter,
        collection: collectionFilter,
        full: false
    })

    const navigate = useNavigate()
    const [selectedProducts, setSelectedProducts] = useState([])
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, productId: null, productName: '' })
    const [confirmMultiDelete, setConfirmMultiDelete] = useState(false)
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' })

    const [collectionsModalOpen, setCollectionsModalOpen] = useState(false)
    const [collections, setCollections] = useState([])
    const [bulkCollectionOpen, setBulkCollectionOpen] = useState(false)
    const [bulkCollectionLoading, setBulkCollectionLoading] = useState(false)

    useEffect(() => {
        getActiveCollections().then(setCollections).catch(err => {
            console.error('Erro ao carregar coleções:', err)
        })
    }, [])

    const handleBulkAddToCollection = async (collectionId) => {
        setBulkCollectionLoading(true)
        try {
            const selectedItems = paginatedProducts.filter(p => selectedProducts.includes(p.id))
            await Promise.all(selectedItems.map(product => {
                const current = product.collectionIds || product.collection_ids || []
                if (current.includes(collectionId)) return Promise.resolve()
                return apiClient(`/products/${product.id}`, {
                    method: 'PUT',
                    body: { collection_ids: [...current, collectionId] }
                })
            }))
            const col = collections.find(c => c.id === collectionId)
            toast.success(`${selectedProducts.length} produto(s) adicionados à coleção "${col?.title}"`)
            setSelectedProducts([])
            setBulkCollectionOpen(false)
            refetch()
        } catch (err) {
            toast.error('Erro ao adicionar produtos à coleção')
        } finally {
            setBulkCollectionLoading(false)
        }
    }

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }

    const sortedProducts = useMemo(() => {
        if (!paginatedProducts) return []
        return [...paginatedProducts].sort((a, b) => {
            if (!sortConfig.key) return 0;
            let aValue, bValue;

            if (sortConfig.key === 'markup') {
                const aPrice = parseFloat(a.price) || 0;
                const aCost = parseFloat(a.costPrice) || 0;
                const bPrice = parseFloat(b.price) || 0;
                const bCost = parseFloat(b.costPrice) || 0;
                aValue = aCost > 0 ? aPrice / aCost : 0;
                bValue = bCost > 0 ? bPrice / bCost : 0;
            } else if (sortConfig.key === 'margin') {
                const aPrice = parseFloat(a.price) || 0;
                const aCost = parseFloat(a.costPrice) || 0;
                const bPrice = parseFloat(b.price) || 0;
                const bCost = parseFloat(b.costPrice) || 0;
                aValue = aPrice > 0 && aCost > 0 ? (aPrice - aCost) / aPrice : -Infinity;
                bValue = bPrice > 0 && bCost > 0 ? (bPrice - bCost) / bPrice : -Infinity;
            } else if (sortConfig.key === 'id') {
                aValue = parseInt(a.id?.toString().replace('#', '') || '0')
                bValue = parseInt(b.id?.toString().replace('#', '') || '0')
            } else if (['price', 'costPrice', 'stock', 'originalPrice', 'original_price'].includes(sortConfig.key)) {
                aValue = parseFloat(a[sortConfig.key]) || 0;
                bValue = parseFloat(b[sortConfig.key]) || 0;
            } else {
                aValue = a[sortConfig.key];
                bValue = b[sortConfig.key];
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue != null ? bValue.toLowerCase() : '';
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        })
    }, [paginatedProducts, sortConfig])

    useEffect(() => {
        setCurrentPage(1)
    }, [search, categoryFilter, collectionFilter])

    const {
        dashboardMetricsRaw: backendMetrics,
        isLoading: isLoadingMetrics,
    } = useAdminDashboardData()

    const [sellThroughData, setSellThroughData] = useState(null)
    const [isLoadingSTR, setIsLoadingSTR] = useState(true)

    useEffect(() => {
        apiClient('/products/metrics/sell-through')
            .then(data => {
                setSellThroughData(data)
                setIsLoadingSTR(false)
            })
            .catch(err => {
                console.error('Erro ao carregar STR:', err)
                setIsLoadingSTR(false)
            })
    }, [])

    const metrics = useMemo(() => {
        if (!backendMetrics?.inventory) return { totalValue: 0, totalCost: 0, totalItems: 0, totalProducts: 0, averageMarkup: '0' }
        return {
            totalValue: backendMetrics.inventory.totalEstimatedValue || 0,
            totalCost: backendMetrics.inventory.totalCostValue || 0,
            totalItems: backendMetrics.inventory?.totalItems || 0,
            totalProducts: backendMetrics.inventory?.totalProducts || 0,
            averageMarkup: (backendMetrics.inventory?.averageMarkup || 0).toFixed(0)
        }
    }, [backendMetrics])

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedProducts(sortedProducts.map(p => p.id))
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
            toast.error(formatUserFriendlyError(err))
        }
    }

    const onConfirmMultiDelete = async () => {
        try {
            await deleteMultipleProducts(selectedProducts)
            toast.success(`${selectedProducts.length} produtos excluídos com sucesso.`)
            setSelectedProducts([])
            setConfirmMultiDelete(false)
        } catch (err) {
            toast.error(formatUserFriendlyError(err))
        }
    }

    if (productsLoading && (!paginatedProducts || paginatedProducts.length === 0) && !searchInput) {
        return (
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
                <ProductsListSkeleton />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8 pb-24">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#FDF0ED] rounded-2xl">
                            <Package className="w-6 h-6 text-[#C75D3B]" />
                        </div>
                        <h2 className="text-3xl font-display font-bold text-[#4A3B32]">Produtos</h2>
                    </div>
                    <p className="text-[#4A3B32]/60 text-sm font-medium">Gerencie seu estoque e vitrine em tempo real.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setCollectionsModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-[#4A3B32] shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                        <Layers className="w-4 h-4 text-purple-500" />
                        Coleções
                    </button>

                    <AnimatePresence>
                    {selectedProducts.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, x: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, x: 10 }}
                            className="flex items-center gap-2"
                        >
                            <span className="text-xs font-bold text-[#C75D3B] bg-[#FDF0ED] px-3 py-1.5 rounded-full">
                                {selectedProducts.length} selecionado{selectedProducts.length > 1 ? 's' : ''}
                            </span>

                            {/* Bulk: Adicionar à Coleção */}
                            <div className="relative">
                                <button
                                    onClick={() => setBulkCollectionOpen(o => !o)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-[#4A3B32] shadow-sm hover:shadow-md hover:border-[#C75D3B]/30 transition-all active:scale-95"
                                >
                                    <FolderPlus className="w-4 h-4 text-purple-500" />
                                    Coleção
                                    <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", bulkCollectionOpen && "rotate-180")} />
                                </button>

                                <AnimatePresence>
                                {bulkCollectionOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setBulkCollectionOpen(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                                            className="absolute right-0 top-full mt-2 z-20 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
                                        >
                                            <div className="px-4 py-3 border-b border-gray-50">
                                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                    Adicionar {selectedProducts.length} produto{selectedProducts.length > 1 ? 's' : ''} à:
                                                </p>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto py-1">
                                                {collections.length === 0 && (
                                                    <p className="px-4 py-3 text-sm text-gray-400 text-center">Nenhuma coleção ativa</p>
                                                )}
                                                {collections.map(col => (
                                                    <button
                                                        key={col.id}
                                                        disabled={bulkCollectionLoading}
                                                        onClick={() => handleBulkAddToCollection(col.id)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[#4A3B32] hover:bg-[#FDF0ED] transition-colors text-left disabled:opacity-50"
                                                    >
                                                        <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                                                        <span className="truncate">{col.title}</span>
                                                        {bulkCollectionLoading && <span className="ml-auto text-[10px] text-gray-400">...</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                                </AnimatePresence>
                            </div>

                            {/* Bulk: Excluir */}
                            <button
                                onClick={() => setConfirmMultiDelete(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/10 hover:bg-red-600 transition-all active:scale-95"
                            >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                            </button>
                        </motion.div>
                    )}
                    </AnimatePresence>

                    <ShimmerButton
                        onClick={() => navigate('/admin/products/new')}
                        className="px-8 py-3.5 rounded-2xl font-bold shadow-lg"
                        shimmerColor="#ffffff"
                        shimmerSize="0.1em"
                        borderRadius="16px"
                        shimmerDuration="2s"
                        background="linear-gradient(135deg, #C75D3B 0%, #A64D31 100%)"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Produto
                    </ShimmerButton>
                </div>
            </motion.div>

            {/* Quick Insights Cards */}
            <TooltipProvider delayDuration={200}>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    {productsLoading ? <KPISkeletonCard /> : (
                        <KPI_Card
                            icon={TrendingUp} iconColor="text-emerald-600" bgColor="bg-emerald-50"
                            title="Faturamento"
                            value={`R$ ${(metrics.totalValue).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                            tooltip="Valor total estimado de venda do estoque atual."
                        />
                    )}
                    {productsLoading ? <KPISkeletonCard /> : (
                        <KPI_Card
                            icon={DollarSign} iconColor="text-amber-600" bgColor="bg-amber-50"
                            title="Custo Total"
                            value={`R$ ${(metrics.totalCost).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                            tooltip="Valor total investido no estoque atual."
                        />
                    )}
                    {productsLoading ? <KPISkeletonCard /> : (
                        <KPI_Card
                            icon={TrendingUp} iconColor="text-[#C75D3B]" bgColor="bg-[#FDF0ED]"
                            title="Markup"
                            value={`${metrics.averageMarkup}%`}
                            tooltip="Média de markup aplicada nos produtos."
                        />
                    )}
                    {productsLoading ? <KPISkeletonCard /> : (
                        <KPI_Card
                            icon={Package} iconColor="text-blue-600" bgColor="bg-blue-50"
                            title="Peças"
                            value={metrics.totalItems}
                            tooltip="Unidades totais disponíveis."
                        />
                    )}
                    {productsLoading ? <KPISkeletonCard /> : (
                        <KPI_Card
                            icon={Tag} iconColor="text-purple-600" bgColor="bg-purple-50"
                            title="Modelos"
                            value={metrics.totalProducts}
                            tooltip="Quantidade de modelos únicos cadastrados."
                        />
                    )}
                    {isLoadingSTR ? <KPISkeletonCard /> : (
                        <STR_Card data={sellThroughData} />
                    )}
                </div>
            </TooltipProvider>

            {/* Main Content */}
            <Card className="overflow-hidden border border-gray-100 shadow-sm bg-white rounded-3xl">
                <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col gap-3">
                    {/* Linha 1: busca */}
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, ID ou categoria..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                        />
                    </div>

                    {/* Linha 2: filtros rápidos */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Filtro Coleção */}
                        <div className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <select
                                value={collectionFilter}
                                onChange={e => setCollectionFilter(e.target.value)}
                                className={cn(
                                    "text-[12px] font-semibold border rounded-xl px-3 py-1.5 outline-none transition-all cursor-pointer",
                                    collectionFilter
                                        ? "bg-purple-50 border-purple-200 text-purple-700"
                                        : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                                )}
                            >
                                <option value="">Todas as coleções</option>
                                {collections.map(col => (
                                    <option key={col.id} value={col.id}>{col.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Limpar filtros */}
                        {(collectionFilter || categoryFilter !== 'all') && (
                            <button
                                onClick={() => { setCollectionFilter(''); setCategoryFilter('all') }}
                                className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-3 h-3" /> Limpar filtros
                            </button>
                        )}

                        {/* Indicador de filtro ativo */}
                        {collectionFilter && (
                            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                                {collections.find(c => String(c.id) === String(collectionFilter))?.title}
                            </span>
                        )}
                    </div>
                </div>

                {/* Mobile View: Power-User Cards */}
                <div className="md:hidden p-4 space-y-4">
                    {sortedProducts.map((product, idx) => {
                        const cost = parseFloat(product.costPrice) || 0
                        const price = parseFloat(product.price) || 0
                        const isZeroCost = cost === 0
                        const isLowStock = product.stock <= 2
                        
                        return (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                onClick={() => navigate(`/admin/products/${product.id}`)}
                                className={cn(
                                    "relative bg-white rounded-3xl border p-4 shadow-sm active:scale-[0.98] transition-all overflow-hidden",
                                    isZeroCost ? "border-amber-200 bg-amber-50/30" : "border-gray-100",
                                    selectedProducts.includes(product.id) && "border-[#C75D3B] ring-1 ring-[#C75D3B]/20"
                                )}
                            >
                                {/* Alerta Visual para Erros Críticos */}
                                {isZeroCost && (
                                    <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-bl-xl uppercase tracking-wider animate-pulse">
                                        Custo Zerado
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    {/* Checkbox Discreto */}
                                    <div 
                                        className="mt-1"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleSelectProduct(product.id)
                                        }}
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors",
                                            selectedProducts.includes(product.id) ? "bg-[#C75D3B] border-[#C75D3B] text-white" : "border-gray-200"
                                        )}>
                                            {selectedProducts.includes(product.id) && <Plus className="w-4 h-4 rotate-45" />}
                                        </div>
                                    </div>

                                    {/* Imagem */}
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                                        <img
                                            src={getOptimizedImageUrl(product.images?.[0], 160) || '/placeholder.png'}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Info Principal */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="font-bold text-[#4A3B32] text-base leading-tight truncate">{product.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">#{product.id}</span>
                                            <span className="text-[10px] font-bold text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">{product.category}</span>
                                            {(product.collectionIds || product.collection_ids || []).map(cid => {
                                                const col = collections.find(c => c.id === cid)
                                                return col ? (
                                                    <span key={cid} className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full truncate max-w-[70px]">
                                                        {col.title}
                                                    </span>
                                                ) : null
                                            })}
                                        </div>

                                        <div className="mt-3 flex items-end justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">Preço de Venda</p>
                                                <p className="text-xl font-black text-[#4A3B32]">R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">Estoque</p>
                                                <p className={cn("text-lg font-black", isLowStock ? "text-red-500" : "text-[#4A3B32]")}>
                                                    {product.stock} <span className="text-xs font-medium">un</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de Alerta Inferior */}
                                {isLowStock && (
                                    <div className="mt-4 pt-3 border-t border-red-50 flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Estoque baixo - Reposição urgente
                                    </div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block">
                    <TableWrapper>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-5 w-12">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-[#C75D3B] focus:ring-[#C75D3B]/50"
                                            onChange={handleSelectAll}
                                            checked={selectedProducts.length > 0 && selectedProducts.length === sortedProducts.length}
                                        />
                                    </th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('name')}>Produto</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('category')}>Categoria</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('costPrice')}>Custo</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Margem</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('price')}>Preço</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-[#C75D3B]" onClick={() => requestSort('stock')}>Estoque</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sortedProducts.map((product) => {
                                    const cost = parseFloat(product.costPrice) || 0
                                    const price = parseFloat(product.price) || 0
                                    const margin = price > 0 ? ((price - cost) / price * 100) : 0

                                    return (
                                        <tr 
                                            key={product.id}
                                            className={cn("hover:bg-gray-50/50 transition-colors group cursor-pointer", selectedProducts.includes(product.id) && 'bg-[#FDF0ED]/30')}
                                            onClick={() => navigate(`/admin/products/${product.id}`)}
                                        >
                                            <td className="px-8 py-5" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-[#C75D3B]"
                                                    checked={selectedProducts.includes(product.id)}
                                                    onChange={() => handleSelectProduct(product.id)}
                                                />
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 shadow-sm">
                                                        <img src={getOptimizedImageUrl(product.images?.[0], 100) || '/placeholder.png'} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-[#4A3B32] truncate">{product.name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">#{product.id}</p>
                                                            {(product.collectionIds || product.collection_ids || []).map(cid => {
                                                                const col = collections.find(c => c.id === cid)
                                                                return col ? (
                                                                    <span key={cid} className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full truncate max-w-[80px]">
                                                                        {col.title}
                                                                    </span>
                                                                ) : null
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-medium text-gray-500">{product.category}</td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={cn("text-sm font-bold", cost === 0 ? "text-amber-500" : "text-gray-400")}>
                                                    R$ {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={cn(
                                                    "text-[11px] font-black px-2.5 py-1 rounded-lg uppercase",
                                                    margin >= 50 ? "bg-emerald-50 text-emerald-600" : margin >= 30 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                                                )}>
                                                    {margin.toFixed(0)}%
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right text-sm font-black text-[#4A3B32]">R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-8 py-5 text-right text-sm font-bold">
                                                <span className={cn(product.stock <= 2 ? "text-red-500" : "text-[#4A3B32]")}>{product.stock} un</span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={e => { e.stopPropagation(); navigate(`/admin/products/${product.id}`); }} className="p-2 hover:bg-[#FDF0ED] rounded-xl text-[#C75D3B] transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={e => { e.stopPropagation(); handleDelete(product.id, product.name); }} className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </TableWrapper>
                </div>

                <CardFooter className="bg-white border-t border-gray-50 flex items-center justify-between p-6">
                    <p className="text-xs text-gray-400 font-medium">Mostrando <span className="text-[#4A3B32] font-bold">{sortedProducts.length}</span> produtos</p>
                    {totalPages > 1 && (
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem><PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} /></PaginationItem>
                                <div className="flex items-center gap-2 mx-4 text-sm font-bold text-[#4A3B32]">Página {currentPage} de {totalPages}</div>
                                <PaginationItem><PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} /></PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    )}
                </CardFooter>
            </Card>

            <CollectionsManagerModal isOpen={collectionsModalOpen} onClose={() => setCollectionsModalOpen(false)} />
            <AlertDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ ...confirmDelete, isOpen: false })}
                onConfirm={onConfirmDelete}
                title="Excluir Produto?"
                description={`Tem certeza que deseja excluir "${confirmDelete.productName}"?`}
                confirmText="Excluir"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}

function KPI_Card({ icon: Icon, iconColor, bgColor, title, value, tooltip }) {
    return (
        <Card className="border-none bg-white shadow-sm overflow-hidden p-4">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", bgColor)}><Icon className={cn("w-5 h-5", iconColor)} /></div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
                    <p className="text-lg font-black text-[#4A3B32] leading-none mt-1">{value}</p>
                </div>
            </div>
        </Card>
    )
}

function STR_Card({ data }) {
    if (!data) return null
    return (
        <Card className="border-none bg-white shadow-sm overflow-hidden p-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl"><Activity className="w-5 h-5 text-emerald-600" /></div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Capacidade</p>
                    <p className="text-lg font-black text-emerald-600 leading-none mt-1">{data.sellThroughRate}%</p>
                </div>
            </div>
        </Card>
    )
}
