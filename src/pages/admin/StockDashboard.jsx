import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Activity,
    AlertTriangle,
    DollarSign,
    Package,
    TrendingUp,
    Skull,
    Tag,
    Palette,
    Ruler,
    Info,
    HelpCircle,
    ChevronRight,
    Star,
    Brain,
    BarChart3,
    ShoppingCart,
    RefreshCw,
    Sparkles,
    TrendingDown,
    Eye,
    Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    getStockOverview,
    getSalesRankingByCategory,
} from '@/lib/api/stock'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { StockForecastTab } from '@/components/admin/stock/StockForecastTab'
import { StockAnalysisTab } from '@/components/admin/stock/StockAnalysisTab'
import { StockPurchasePlanTab } from '@/components/admin/stock/StockPurchasePlanTab'

// ========================
// BEAUTIFUL SKELETON LOADER
// ========================
function SkeletonPulse({ className }) {
    return (
        <div className={cn("relative overflow-hidden bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-xl", className)}>
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    )
}

function OverviewSkeleton() {
    return (
        <div className="space-y-6">
            {/* Period Filters Skeleton */}
            <div className="flex flex-wrap gap-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <SkeletonPulse key={i} className="h-10 w-32" />
                ))}
            </div>

            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <SkeletonPulse key={i} className="h-32" />
                ))}
            </div>

            {/* Rankings Section Skeleton */}
            <div className="space-y-4">
                <SkeletonPulse className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <SkeletonPulse key={i} className="h-64" />
                    ))}
                </div>
            </div>

            {/* Alerts Section Skeleton */}
            <div className="space-y-4">
                <SkeletonPulse className="h-8 w-64" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SkeletonPulse className="h-80" />
                    <SkeletonPulse className="h-80" />
                </div>
            </div>
        </div>
    )
}

// ========================
// PREMIUM KPI CARD WITH TOOLTIP
// ========================
function KPICard({ title, value, subtext, icon: Icon, tooltip, gradient, iconColor, trend, trendValue }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
            <Card className={cn("relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300", gradient)}>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8">
                    <Icon className="w-full h-full" />
                </div>

                <CardContent className="p-5 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                        <div className={cn("p-3 rounded-xl shadow-md", iconColor)}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>

                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <button className="opacity-50 hover:opacity-100 transition-opacity">
                                        <HelpCircle className="w-4 h-4 text-gray-600" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs bg-[#2A211C] text-white p-3 text-sm shadow-2xl">
                                    <p className="font-medium mb-1">{title}</p>
                                    <p className="text-xs text-gray-300">{tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{title}</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black text-[#4A3B32] tracking-tight">{value}</h3>
                            {trend && (
                                <span className={cn(
                                    "text-xs font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full",
                                    trend === 'up' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                )}>
                                    {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {trendValue}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">{subtext}</p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ========================
// BEAUTIFUL RANKING CARD
// ========================
function RankingCard({ title, icon: Icon, items, nameKey = 'name', valueKey = 'quantity', valueSuffix = 'un', tooltip, delay = 0 }) {
    const money = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
                <CardHeader className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-transparent">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-black text-[#4A3B32] flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#C75D3B]/10">
                                <Icon className="w-4 h-4 text-[#C75D3B]" />
                            </div>
                            {title}
                        </CardTitle>

                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <button className="opacity-40 hover:opacity-100 transition-opacity">
                                        <Info className="w-4 h-4 text-gray-500" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-[#2A211C] text-white p-3 text-xs shadow-2xl">
                                    {tooltip}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {!items || items.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <Eye className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm text-gray-400 font-medium">Sem dados no período</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {items.slice(0, 5).map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="px-5 py-3 flex items-center justify-between hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all duration-200 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            "flex items-center justify-center w-8 h-8 rounded-xl text-sm font-black shadow-sm transition-transform group-hover:scale-110",
                                            i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white" :
                                            i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white" :
                                            i === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white" :
                                            "bg-gray-100 text-gray-600"
                                        )}>
                                            {i + 1}
                                        </span>
                                        <span className="text-sm font-bold text-[#4A3B32] capitalize">{item[nameKey]}</span>
                                    </div>
                                    <span className="text-sm font-black text-[#C75D3B] group-hover:scale-110 transition-transform">
                                        {valueKey === 'profit' ? money(item[valueKey]) : `${item[valueKey]} ${valueSuffix}`}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ========================
// OVERVIEW TAB - REDESIGNED
// ========================
function OverviewTab() {
    const [loading, setLoading] = useState(true)
    const [kpis, setKpis] = useState(null)
    const [topSellers, setTopSellers] = useState(null)
    const [lowStock, setLowStock] = useState([])
    const [deadStock, setDeadStock] = useState(null)
    const [periodFilter, setPeriodFilter] = useState('all')
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        loadDashboard()
    }, [periodFilter])

    const loadDashboard = async () => {
        // Show loading only on initial load, show refreshing for filter changes
        if (!kpis) {
            setLoading(true)
        } else {
            setRefreshing(true)
        }

        try {
            let startDate = null
            let endDate = null

            if (periodFilter === 'last7days') {
                const date = new Date(); date.setDate(date.getDate() - 7)
                startDate = date.toISOString(); endDate = new Date().toISOString()
            } else if (periodFilter === 'last30days') {
                const date = new Date(); date.setDate(date.getDate() - 30)
                startDate = date.toISOString(); endDate = new Date().toISOString()
            } else if (periodFilter === 'currentMonth') {
                const now = new Date()
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
                endDate = new Date().toISOString()
            } else if (periodFilter === 'currentYear') {
                const now = new Date()
                startDate = new Date(now.getFullYear(), 0, 1).toISOString()
                endDate = new Date().toISOString()
            }

            const [overview, salesRanking] = await Promise.all([
                getStockOverview(),
                getSalesRankingByCategory(startDate, endDate, periodFilter)
            ])

            setKpis(overview.kpis || { totalValue: 0, totalCost: 0, totalItems: 0, productsCount: 0, lowStockCount: 0 })
            setLowStock(overview.lowStock || [])
            setDeadStock(overview.deadStock || { count: 0, totalValue: 0, products: [] })
            setTopSellers(salesRanking || { byCategory: [], byColor: [], bySize: [], byProduct: [], byProfit: [] })
        } catch (error) {
            console.error('❌ Erro ao carregar dashboard de estoque:', error)
            toast.error('Erro ao atualizar informações')
            setKpis({ totalValue: 0, totalCost: 0, totalItems: 0, productsCount: 0, lowStockCount: 0 })
            setTopSellers({ byCategory: [], byColor: [], bySize: [], byProduct: [], byProfit: [] })
            setLowStock([])
            setDeadStock({ count: 0, totalValue: 0, products: [] })
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadDashboard()
    }

    if (loading) return <OverviewSkeleton />

    const money = (val) => `R$ ${(val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
    const averageMarkup = kpis?.averageMarkup || 0

    return (
        <div className="space-y-8">
            {/* Period Filters */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-3"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#C75D3B]" />
                    <span className="text-sm font-black text-[#4A3B32]">Período de Análise:</span>
                </div>

                {[
                    { value: 'all', label: 'Todo o Período', icon: Activity },
                    { value: 'last7days', label: 'Últimos 7 dias' },
                    { value: 'last30days', label: 'Últimos 30 dias' },
                    { value: 'currentMonth', label: 'Mês Atual' },
                    { value: 'currentYear', label: 'Ano Atual' }
                ].map(period => (
                    <motion.button
                        key={period.value}
                        onClick={() => setPeriodFilter(period.value)}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                            'px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm',
                            periodFilter === period.value
                                ? 'bg-gradient-to-r from-[#C75D3B] to-[#A04A2E] text-white shadow-lg shadow-[#C75D3B]/20'
                                : 'bg-white text-[#4A3B32] hover:bg-gray-50 border border-gray-200'
                        )}
                    >
                        {period.label}
                    </motion.button>
                ))}

                <motion.button
                    onClick={handleRefresh}
                    whileHover={{ scale: 1.05, rotate: 180 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={refreshing}
                    className="ml-auto p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                >
                    <RefreshCw className={cn("w-4 h-4 text-[#C75D3B]", refreshing && "animate-spin")} />
                </motion.button>
            </motion.div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Valor em Estoque"
                    value={money(kpis?.totalValue)}
                    subtext={`${kpis?.productsCount || 0} produtos • ${kpis?.totalItems || 0} peças`}
                    icon={DollarSign}
                    iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
                    gradient="bg-gradient-to-br from-emerald-50 to-white"
                    tooltip="Valor total de venda de todas as peças disponíveis no seu estoque. Representa o potencial máximo de receita se tudo for vendido pelo preço atual."
                />
                <KPICard
                    title="Custo Imobilizado"
                    value={money(kpis?.totalCost)}
                    subtext="Investimento em produtos"
                    icon={Package}
                    iconColor="bg-gradient-to-br from-purple-500 to-purple-600"
                    gradient="bg-gradient-to-br from-purple-50 to-white"
                    tooltip="Quanto você efetivamente pagou por todas as peças que ainda tem em estoque. É o capital 'parado' que você investiu e ainda não recuperou através de vendas."
                />
                <KPICard
                    title="Markup Médio"
                    value={`${averageMarkup.toFixed(0)}%`}
                    subtext="Margem de lucro bruto"
                    icon={TrendingUp}
                    iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
                    gradient="bg-gradient-to-br from-blue-50 to-white"
                    tooltip="Percentual médio de lucro bruto sobre o custo dos produtos em estoque. Calculado como: (Valor Venda - Custo) ÷ Custo × 100. Quanto maior, melhor sua margem."
                    trend={averageMarkup > 50 ? 'up' : 'down'}
                    trendValue={`${averageMarkup.toFixed(0)}%`}
                />
                <KPICard
                    title="Estoque Baixo"
                    value={`${kpis?.lowStockCount || 0}`}
                    subtext="Produtos com ≤ 2 unidades"
                    icon={AlertTriangle}
                    iconColor="bg-gradient-to-br from-amber-500 to-amber-600"
                    gradient="bg-gradient-to-br from-amber-50 to-white"
                    tooltip="Quantidade de produtos que estão acabando (2 unidades ou menos). Produtos com estoque baixo correm risco de ruptura e podem gerar perda de vendas se não forem repostos."
                />
            </div>

            {/* Top Sellers Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#C75D3B] to-[#A04A2E] shadow-lg">
                        <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#4A3B32]">O Que Está Vendendo Bem?</h2>
                        <p className="text-xs text-gray-500 font-medium">
                            Top produtos para não deixar faltar
                            {periodFilter !== 'all' && ` (${periodFilter === 'last7days' ? 'Últimos 7 dias' :
                                periodFilter === 'last30days' ? 'Últimos 30 dias' :
                                    periodFilter === 'currentMonth' ? 'Mês Atual' :
                                        periodFilter === 'currentYear' ? 'Ano Atual' : ''
                                })`}
                        </p>
                    </div>
                </div>

                <div className="relative">
                    {/* Loading Overlay */}
                    <AnimatePresence>
                        {refreshing && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center"
                            >
                                <div className="flex flex-col items-center gap-3">
                                    <RefreshCw className="w-8 h-8 text-[#C75D3B] animate-spin" />
                                    <p className="text-sm font-black text-[#4A3B32]">Atualizando rankings...</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <RankingCard
                            title="Por Categoria"
                            icon={Tag}
                            items={topSellers?.byCategory}
                            nameKey="category"
                            valueKey="quantity"
                            valueSuffix="un"
                            tooltip="Ranking das categorias de roupa que mais vendem. Use para identificar quais tipos de produtos são mais populares e priorizar compras."
                            delay={0}
                        />
                        <RankingCard
                            title="Por Cor"
                            icon={Palette}
                            items={topSellers?.byColor}
                            nameKey="color"
                            valueKey="quantity"
                            valueSuffix="un"
                            tooltip="Cores que suas clientes mais compram. Ajuda a escolher as cores certas na hora de fazer pedidos aos fornecedores."
                            delay={0.1}
                        />
                        <RankingCard
                            title="Por Tamanho"
                            icon={Ruler}
                            items={topSellers?.bySize}
                            nameKey="size"
                            valueKey="quantity"
                            valueSuffix="un"
                            tooltip="Tamanhos mais vendidos. Fundamental para equilibrar o estoque e não ficar sem os tamanhos que mais saem."
                            delay={0.2}
                        />
                        <RankingCard
                            title="Mais Lucrativos"
                            icon={DollarSign}
                            items={topSellers?.byProfit}
                            nameKey="name"
                            valueKey="profit"
                            valueSuffix=""
                            tooltip="Produtos que geram mais lucro total acumulado. Nem sempre o que mais vende é o que mais lucra!"
                            delay={0.3}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Alerts Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
                        <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#4A3B32]">Atenção: Reposição Urgente</h2>
                        <p className="text-xs text-gray-500 font-medium">Produtos que precisam de ação imediata</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Low Stock */}
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <CardHeader className="px-5 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-transparent">
                            <CardTitle className="text-base font-black text-[#4A3B32] flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    Estoque Baixo ({lowStock.length} itens)
                                </span>
                                <Link to="/admin/products" className="text-xs text-[#C75D3B] hover:text-[#A04A2E] font-bold flex items-center gap-1 transition-colors">
                                    Ver todos <ChevronRight className="w-3 h-3" />
                                </Link>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[320px] overflow-y-auto custom-scrollbar">
                            {lowStock.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                    <p className="text-sm text-gray-400 font-medium">Nenhum produto com estoque baixo</p>
                                    <p className="text-xs text-gray-300 mt-1">Tudo sob controle! 🎉</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {lowStock.map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
                                        >
                                            <span className="text-xs font-black text-gray-300 w-6 group-hover:text-[#C75D3B] transition-colors">#{i + 1}</span>
                                            <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                                                <img src={getOptimizedImageUrl(item.images?.[0], 100)} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-[#4A3B32] truncate">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.suppliers?.name || 'Sem fornecedor'}</p>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-black px-3 py-1.5 rounded-lg shadow-sm",
                                                item.stock === 0 ? "bg-red-100 text-red-700 animate-pulse" : "bg-amber-100 text-amber-700"
                                            )}>
                                                {item.stock} un
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dead Stock */}
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <CardHeader className="px-5 py-4 border-b border-red-100 bg-gradient-to-r from-red-50 to-transparent">
                            <CardTitle className="text-base font-black text-[#4A3B32] flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Skull className="w-5 h-5 text-red-500" />
                                    Cemitério — Parado há +60 dias ({deadStock?.count || 0} itens)
                                </span>
                                <TooltipProvider>
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <button className="opacity-40 hover:opacity-100 transition-opacity">
                                                <Info className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-[#2A211C] text-white p-3 text-xs shadow-2xl">
                                            Produtos com estoque que estão cadastrados há mais de 60 dias. Considere promoções para girar esse estoque parado.
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {deadStock?.count === 0 ? (
                                <div className="p-12 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200 }}
                                        className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                                    >
                                        <Sparkles className="w-10 h-10 text-white" />
                                    </motion.div>
                                    <p className="text-sm font-bold text-gray-600">Nenhum produto encalhado!</p>
                                    <p className="text-xs text-gray-400 mt-1">Estoque girando perfeitamente 🎯</p>
                                </div>
                            ) : (
                                <>
                                    <div className="px-5 py-2.5 bg-red-50/60 border-b border-red-100 flex items-center justify-between">
                                        <p className="text-xs text-red-700 font-medium">
                                            ≈ {money(deadStock?.totalValue)} em capital imobilizado
                                        </p>
                                        <p className="text-xs text-red-500 font-bold">💡 Faça uma promoção para girar</p>
                                    </div>
                                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar divide-y divide-gray-50">
                                        {(deadStock?.products || []).map((item, i) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="px-5 py-3 flex items-center gap-3 hover:bg-red-50/30 transition-colors group"
                                            >
                                                <span className="text-xs font-black text-gray-300 w-6 group-hover:text-red-400 transition-colors">#{i + 1}</span>
                                                <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm grayscale group-hover:grayscale-0 transition-all">
                                                    <img src={getOptimizedImageUrl(item.images?.[0], 100)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-[#4A3B32] truncate">{item.name}</p>
                                                    {item.sizesSummary?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {item.sizesSummary.map(s => (
                                                                <span key={s.size} className="text-[9px] px-1.5 py-0.5 bg-gray-100 rounded font-bold text-gray-500">
                                                                    {s.size} ({s.quantity})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="text-xs font-black px-2 py-1 rounded-lg bg-red-100 text-red-700">
                                                        {item.daysInStock}d
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </motion.div>
        </div>
    )
}

// ========================
// MAIN DASHBOARD WITH TABS
// ========================
export function StockDashboard() {
    const [activeTab, setActiveTab] = useState('overview')
    const [loadedTabs, setLoadedTabs] = useState(new Set(['overview']))

    const handleTabChange = (value) => {
        setActiveTab(value)
        if (!loadedTabs.has(value)) {
            setLoadedTabs(new Set([...loadedTabs, value]))
        }
    }

    return (
        <div className="space-y-6 pb-20 max-w-[1600px] mx-auto">
            {/* Premium Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#4A3B32] to-[#2A211C] rounded-2xl p-6 shadow-xl"
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            Inteligência de Estoque
                        </h1>
                    </div>
                    <p className="text-sm text-white/70 font-medium ml-14">
                        Análise avançada, forecast e planejamento de compras
                    </p>
                </div>
                <Link
                    to="/admin/products"
                    className="px-5 py-3 bg-white hover:bg-gray-50 rounded-xl text-sm font-bold text-[#4A3B32] transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
                >
                    <Package className="w-4 h-4" />
                    Gerenciar Produtos
                </Link>
            </motion.div>

            {/* Beautiful Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="bg-white/80 backdrop-blur-xl border border-gray-200 shadow-lg">
                    <TabsTrigger value="overview">
                        <Activity className="w-4 h-4" />
                        <span className="hidden sm:inline">Visão Geral</span>
                        <span className="sm:hidden">Geral</span>
                    </TabsTrigger>
                    <TabsTrigger value="forecast">
                        <Brain className="w-4 h-4" />
                        <span className="hidden sm:inline">Forecast & Reposição</span>
                        <span className="sm:hidden">Forecast</span>
                    </TabsTrigger>
                    <TabsTrigger value="analysis">
                        <BarChart3 className="w-4 h-4" />
                        <span className="hidden sm:inline">Análise Inventário</span>
                        <span className="sm:hidden">Análise</span>
                    </TabsTrigger>
                    <TabsTrigger value="purchase">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="hidden sm:inline">Plano de Compras</span>
                        <span className="sm:hidden">Compras</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <OverviewTab />
                </TabsContent>

                <TabsContent value="forecast">
                    {loadedTabs.has('forecast') ? <StockForecastTab /> : null}
                </TabsContent>

                <TabsContent value="analysis">
                    {loadedTabs.has('analysis') ? <StockAnalysisTab /> : null}
                </TabsContent>

                <TabsContent value="purchase">
                    {loadedTabs.has('purchase') ? <StockPurchasePlanTab /> : null}
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default StockDashboard
