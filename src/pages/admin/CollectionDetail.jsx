import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Package, Plus, Check, X, TrendingUp, DollarSign, ShoppingBag, Layers } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import { supabase } from '@/lib/supabase'
import { getCollections } from '@/lib/api/collections'

export function CollectionDetail() {
    const { collectionId } = useParams()
    const [collection, setCollection] = useState(null)
    const [allProducts, setAllProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Carregar dados
    useEffect(() => {
        loadData()
    }, [collectionId])

    const loadData = async () => {
        setLoading(true)
        try {
            // Carregar coleção
            const collections = await getCollections()
            const col = collections.find(c => c.id === parseInt(collectionId))
            setCollection(col)

            // Carregar todos os produtos
            const { data: products } = await supabase
                .from('products')
                .select('id, name, images, price, cost_price, stock, collection_ids, category')
                .eq('active', true)
                .order('name')

            setAllProducts(products || [])
        } catch (err) {
            toast.error('Erro ao carregar dados')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const [searchTerm, setSearchTerm] = useState('')

    // Produtos na coleção (Filtrados)
    const productsInCollection = useMemo(() => {
        return allProducts.filter(p =>
            p.collection_ids?.includes(parseInt(collectionId)) &&
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [allProducts, collectionId, searchTerm])

    // Produtos disponíveis para adicionar (Filtrados)
    const availableProducts = useMemo(() => {
        return allProducts.filter(p =>
            !p.collection_ids?.includes(parseInt(collectionId)) &&
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [allProducts, collectionId, searchTerm])

    // KPIs da coleção (Baseado no total, não no filtro de busca)
    const metrics = useMemo(() => {
        // Usa a lista completa da coleção para KPIs
        const products = allProducts.filter(p => p.collection_ids?.includes(parseInt(collectionId)))

        const totalPieces = products.reduce((acc, p) => acc + (p.stock || 0), 0)
        const totalValue = products.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0)
        const totalCost = products.reduce((acc, p) => acc + ((p.cost_price || 0) * (p.stock || 0)), 0)
        const potentialProfit = totalValue - totalCost

        return {
            productCount: products.length,
            totalPieces,
            totalValue,
            potentialProfit
        }
    }, [allProducts, collectionId])

    // ... (addToCollection, removeFromCollection functions remain unchanged)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        )
    }

    if (!collection) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center">
                <Layers className="w-16 h-16 text-gray-200 mb-4" />
                <h2 className="text-2xl font-bold text-gray-600 mb-2">Coleção não encontrada</h2>
                <Link to="/admin/products" className="text-purple-600 hover:underline font-medium">
                    ← Voltar para Produtos
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link
                            to="/admin/products"
                            className="p-3 bg-white border border-gray-100 shadow-sm hover:shadow-md hover:bg-gray-50 rounded-2xl transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-4 mb-1">
                                <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-600/20">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <h1 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">
                                    {collection.title}
                                </h1>
                            </div>
                            <p className="text-gray-400 pl-1">Gerencie os produtos desta coleção</p>
                        </div>
                    </div>
                </div>

                {/* KPIs Grid */}
                <TooltipProvider>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard
                            icon={Package}
                            iconColor="text-purple-600"
                            bgColor="bg-purple-50"
                            title="Produtos"
                            value={metrics.productCount}
                            tooltip="Quantidade de modelos diferentes nesta coleção"
                        />
                        <KPICard
                            icon={ShoppingBag}
                            iconColor="text-blue-600"
                            bgColor="bg-blue-50"
                            title="Peças em Estoque"
                            value={metrics.totalPieces}
                            tooltip="Total de unidades disponíveis de todos os produtos da coleção"
                        />
                        <KPICard
                            icon={DollarSign}
                            iconColor="text-emerald-600"
                            bgColor="bg-emerald-50"
                            title="Valor da Coleção"
                            value={`R$ ${metrics.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            tooltip="Soma do valor de venda de todas as peças em estoque nesta coleção"
                        />
                        <KPICard
                            icon={TrendingUp}
                            iconColor="text-amber-600"
                            bgColor="bg-amber-50"
                            title="Lucro Potencial"
                            value={`R$ ${metrics.potentialProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            tooltip="Lucro estimado se vender todas as peças (Valor - Custo)"
                        />
                    </div>
                </TooltipProvider>

                {/* Search & Layout */}
                <div className="flex flex-col gap-6">
                    {/* Search Bar */}
                    <div className="relative max-w-md">
                        <input
                            type="text"
                            placeholder="Buscar peça por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-gray-600 placeholder:text-gray-300"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>
                    </div>

                    {/* Two Column Layout with Drag & Drop */}
                    <div className="grid lg:grid-cols-2 gap-8 h-[600px]">
                        {/* Left: Products IN Collection (Drop Zone) */}
                        <Card
                            className={`flex flex-col border-none shadow-xl transition-all h-full overflow-hidden ${saving ? 'opacity-50 pointer-events-none' : ''}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault()
                                const productId = e.dataTransfer.getData("productId")
                                const source = e.dataTransfer.getData("source")
                                if (source === 'available') {
                                    const product = availableProducts.find(p => p.id === parseInt(productId))
                                    if (product) addToCollection(product)
                                }
                            }}
                        >
                            <CardHeader className="bg-white border-b px-6 py-5 shrink-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-[#4A3B32] md:text-lg flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 rounded-xl">
                                            <Check className="w-5 h-5 text-purple-600" />
                                        </div>
                                        Na Coleção
                                        <span className="text-sm font-normal text-gray-400">({productsInCollection.length})</span>
                                    </h3>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-50 px-3 py-1 rounded-full">Arraste para cá</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 overflow-y-auto flex-1 bg-white scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                                {productsInCollection.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-12 text-gray-300 border-2 border-dashed border-gray-50 m-4 rounded-3xl">
                                        <Layers className="w-16 h-16 mb-4 opacity-50" />
                                        <p className="font-medium text-gray-400">Coleção vazia</p>
                                        <p className="text-sm mt-1">Arraste produtos da direita para adicionar</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {productsInCollection.map(product => (
                                            <div
                                                key={product.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData("productId", product.id)
                                                    e.dataTransfer.setData("source", "collection")
                                                }}
                                                className="flex items-center justify-between p-4 px-6 hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <img
                                                            src={product.images?.[0] || '/placeholder.png'}
                                                            alt={product.name}
                                                            className="w-14 h-14 rounded-2xl object-cover bg-gray-100 shadow-sm pointer-events-none"
                                                        />
                                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[#4A3B32] group-hover:text-purple-700 transition-colors">{product.name}</p>
                                                        <p className="text-sm text-gray-400 font-medium mt-0.5">{product.stock} un • R$ {product.price?.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => removeFromCollection(product)}
                                                        disabled={saving}
                                                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                                                        title="Remover da coleção"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Right: Available Products (Drop Zone) */}
                        <Card
                            className={`flex flex-col border-none shadow-xl transition-all h-full overflow-hidden ${saving ? 'opacity-50 pointer-events-none' : ''}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault()
                                const productId = e.dataTransfer.getData("productId")
                                const source = e.dataTransfer.getData("source")
                                if (source === 'collection') {
                                    const product = productsInCollection.find(p => p.id === parseInt(productId))
                                    if (product) removeFromCollection(product)
                                }
                            }}
                        >
                            <CardHeader className="bg-white border-b px-6 py-5 shrink-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-[#4A3B32] md:text-lg flex items-center gap-3">
                                        <div className="p-2 bg-gray-50 rounded-xl">
                                            <Package className="w-5 h-5 text-gray-400" />
                                        </div>
                                        Disponíveis
                                        <span className="text-sm font-normal text-gray-400">({availableProducts.length})</span>
                                    </h3>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Arraste para remover</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 overflow-y-auto flex-1 bg-white scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                                {availableProducts.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-12 text-gray-300 m-4">
                                        <Check className="w-16 h-16 mb-4 text-green-500/20" />
                                        <p className="font-medium text-gray-400">Sem produtos disponíveis</p>
                                        <p className="text-sm mt-1">Todos os produtos (do filtro) já estão na coleção!</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {availableProducts.map(product => (
                                            <div
                                                key={product.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData("productId", product.id)
                                                    e.dataTransfer.setData("source", "available")
                                                }}
                                                className="flex items-center justify-between p-4 px-6 hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={product.images?.[0] || '/placeholder.png'}
                                                        alt={product.name}
                                                        className="w-14 h-14 rounded-2xl object-cover bg-gray-100 shadow-sm pointer-events-none"
                                                    />
                                                    <div>
                                                        <p className="font-bold text-[#4A3B32] group-hover:text-purple-700 transition-colors">{product.name}</p>
                                                        <p className="text-sm text-gray-400 font-medium mt-0.5">{product.category} • {product.stock} un</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => addToCollection(product)}
                                                        disabled={saving}
                                                        className="p-3 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all disabled:opacity-50"
                                                        title="Adicionar à coleção"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

function KPICard({ icon: Icon, iconColor, bgColor, title, value, tooltip }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full">
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all h-full bg-white">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 ${bgColor} rounded-2xl`}>
                            <Icon className={`w-6 h-6 ${iconColor}`} />
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="p-2 hover:bg-gray-50 rounded-full cursor-help transition-colors">
                                    <span className="sr-only">Info</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs bg-gray-900 text-white p-3 text-sm rounded-xl">
                                {tooltip}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                        <h3 className="text-2xl font-display font-bold text-[#4A3B32]">{value}</h3>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
