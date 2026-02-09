
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    Activity,
    AlertTriangle,
    DollarSign,
    Package,
    ArrowRight,
    RefreshCw,
    TrendingUp,
    Skull,
    ShoppingBag,
    Tag,
    Palette,
    Ruler,
    Info,
    HelpCircle,
    ChevronRight,
    Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    getStockHeadlineKPIs,
    getLowStockAlerts,
    getDeadStockSummary,
    getSalesRankingByCategory,
} from '@/lib/api/stock'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { StockDashboardSkeleton } from '@/components/admin/PageSkeleton'

// Componente de KPI Card com Tooltip
function KPICard({ title, value, subtext, icon: Icon, tooltip, colorCls, iconCls }) {
    return (
        <Card className={cn("relative overflow-hidden border shadow-sm", colorCls)}>
            <CardContent className="p-4 md:p-5">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 rounded-lg bg-white/80 shadow-sm">
                        <Icon className={cn("w-5 h-5", iconCls)} />
                    </div>
                    <TooltipProvider>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger>
                                <HelpCircle className="w-4 h-4 opacity-40 hover:opacity-100 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-[#2A211C] text-white p-3 text-xs shadow-lg">
                                {tooltip}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="mt-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{title}</h3>
                    <div className="text-2xl md:text-3xl font-display font-bold text-[#4A3B32] leading-tight">
                        {value}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{subtext}</p>
                </div>
            </CardContent>
        </Card>
    )
}

// Componente de Lista Rankeada
function RankingList({ title, icon: Icon, items, valueKey = 'qty', valueSuffix = 'un', colorCls, tooltip }) {
    return (
        <Card className={cn("border shadow-sm", colorCls)}>
            <CardHeader className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-[#4A3B32] flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[#C75D3B]" />
                        {title}
                    </CardTitle>
                    <TooltipProvider>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger>
                                <Info className="w-3 h-3 opacity-40 hover:opacity-100 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-[#2A211C] text-white p-2 text-xs">
                                {tooltip}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {!items || items.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                        <p className="text-xs text-gray-400">Sem dados de vendas no período</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {items.slice(0, 5).map((item, i) => (
                            <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                                        i === 0 ? "bg-amber-100 text-amber-700" :
                                            i === 1 ? "bg-gray-200 text-gray-600" :
                                                i === 2 ? "bg-orange-100 text-orange-600" :
                                                    "bg-gray-100 text-gray-500"
                                    )}>
                                        {i + 1}
                                    </span>
                                    <span className="text-sm font-medium text-[#4A3B32] capitalize">{item.name}</span>
                                </div>
                                <span className="text-sm font-bold text-[#C75D3B]">
                                    {valueKey === 'margin' ? `R$ ${item[valueKey]?.toFixed(0)}` : `${item[valueKey]} ${valueSuffix}`}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export function StockDashboard() {
    const [loading, setLoading] = useState(true)
    const [kpis, setKpis] = useState(null)
    const [topSellers, setTopSellers] = useState(null)
    const [lowStock, setLowStock] = useState([])
    const [deadStock, setDeadStock] = useState(null)
    const [periodFilter, setPeriodFilter] = useState('all') // 'all', 'last7days', 'last30days', 'currentMonth', 'currentYear'

    useEffect(() => {
        loadDashboard()
    }, [periodFilter])

    const loadDashboard = async () => {
        setLoading(true)
        try {
            // Calculate date range based on period filter
            let startDate = null
            let endDate = null

            if (periodFilter === 'last7days') {
                const date = new Date()
                date.setDate(date.getDate() - 7)
                startDate = date.toISOString()
                endDate = new Date().toISOString()
            } else if (periodFilter === 'last30days') {
                const date = new Date()
                date.setDate(date.getDate() - 30)
                startDate = date.toISOString()
                endDate = new Date().toISOString()
            } else if (periodFilter === 'currentMonth') {
                const now = new Date()
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
                endDate = new Date().toISOString()
            } else if (periodFilter === 'currentYear') {
                const now = new Date()
                startDate = new Date(now.getFullYear(), 0, 1).toISOString()
                endDate = new Date().toISOString()
            }
            // If 'all', startDate and endDate remain null (backend will handle)

            const [kpisData, salesRanking, lowStockData, deadStockData] = await Promise.all([
                getStockHeadlineKPIs(),
                getSalesRankingByCategory(startDate, endDate, periodFilter),
                getLowStockAlerts(10),
                getDeadStockSummary()
            ])

            console.log('📊 Dashboard carregado:')
            console.log(`   - Período: ${periodFilter}`)
            console.log(`   - Start Date: ${startDate || 'all'}`)
            console.log(`   - End Date: ${endDate || 'now'}`)
            console.log('   - KPIs:', kpisData)
            console.log('   - Rankings:', salesRanking)
            console.log('   - Estoque baixo:', lowStockData?.length || 0, 'items')
            console.log('   - Dead stock:', deadStockData)

            setKpis(kpisData)
            setTopSellers(salesRanking || { byCategory: [], byColor: [], bySize: [], byProduct: [], byProfit: [] })
            setLowStock(lowStockData || [])
            setDeadStock(deadStockData || { count: 0, totalValue: 0 })
        } catch (error) {
            console.error('❌ Erro ao carregar dashboard de estoque:', error)
            toast.error('Erro ao atualizar informações')
            // Set default empty values to prevent UI crashes
            setKpis({ totalValue: 0, totalCost: 0, totalItems: 0, productsCount: 0, lowStockCount: 0 })
            setTopSellers({ byCategory: [], byColor: [], bySize: [], byProduct: [], byProfit: [] })
            setLowStock([])
            setDeadStock({ count: 0, totalValue: 0 })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <StockDashboardSkeleton />
    }

    // Helper para formatar moeda
    const money = (val) => `R$ ${(val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`

    // Calcular margem do top 1
    const topProduct = topSellers?.byProfit?.[0]
    const topMarginPct = topProduct ? ((topProduct.margin / topProduct.revenue) * 100).toFixed(0) : 0

    return (
        <div className="space-y-8 pb-20 max-w-[1600px] mx-auto">
            {/* Header: Title & Refresh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-[#4A3B32]">
                        Painel de Estoque
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Visão geral do inventário e performance de vendas.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link to="/admin/products" className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                        <Package className="w-4 h-4" />
                        Gerenciar Produtos
                    </Link>
                    <button
                        onClick={loadDashboard}
                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#C75D3B] hover:border-[#C75D3B] transition-colors shadow-sm"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Period Filters */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex flex-wrap items-center gap-3"
            >
                <span className="text-sm font-bold text-[#4A3B32]">Período de Análise:</span>
                {[
                    { value: 'all', label: 'Todo o Período' },
                    { value: 'last7days', label: 'Últimos 7 dias' },
                    { value: 'last30days', label: 'Últimos 30 dias' },
                    { value: 'currentMonth', label: 'Mês Atual' },
                    { value: 'currentYear', label: 'Ano Atual' }
                ].map(period => (
                    <button
                        key={period.value}
                        onClick={() => setPeriodFilter(period.value)}
                        className={cn(
                            'px-4 py-2 rounded-xl font-semibold text-sm transition-all',
                            periodFilter === period.value
                                ? 'bg-[#C75D3B] text-white shadow-md'
                                : 'bg-gray-100 text-[#4A3B32] hover:bg-gray-200'
                        )}
                    >
                        {period.label}
                    </button>
                ))}
            </motion.div>

            {/* 1. KPI Cards (Original Layout) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <KPICard
                    title="Valor em Estoque"
                    value={money(kpis?.totalValue)}
                    subtext={`${kpis?.productsCount || 0} produtos • ${kpis?.totalItems || 0} peças`}
                    icon={DollarSign}
                    iconCls="text-emerald-600"
                    colorCls="bg-emerald-50/50 border-emerald-100"
                    tooltip="Soma do preço de venda de TODAS as peças disponíveis no estoque. Se vender tudo, é esse valor que entra."
                />
                <KPICard
                    title="Custo Imobilizado"
                    value={money(kpis?.totalCost)}
                    subtext="Valor de compra dos produtos"
                    icon={Package}
                    iconCls="text-purple-600"
                    colorCls="bg-purple-50/50 border-purple-100"
                    tooltip="Quanto você PAGOU por todas as peças que ainda tem em estoque. É o seu 'dinheiro parado' em roupas."
                />
                <KPICard
                    title="Performance"
                    value={`${topMarginPct}%`}
                    subtext={`Margem do Top 1: ${topProduct?.name || '-'}`}
                    icon={TrendingUp}
                    iconCls="text-blue-600"
                    colorCls="bg-blue-50/50 border-blue-100"
                    tooltip="A margem de lucro do produto MAIS LUCRATIVO. Ex: Se a margem é 50%, você lucrou R$50 a cada R$100 vendidos desse item."
                />
                <KPICard
                    title="Estoque Baixo"
                    value={`${kpis?.lowStockCount || 0}`}
                    subtext="Produtos com ≤ 2 unidades"
                    icon={AlertTriangle}
                    iconCls="text-amber-600"
                    colorCls="bg-amber-50/50 border-amber-100"
                    tooltip="Número de produtos que estão acabando (2 unidades ou menos). Hora de pensar em repor!"
                />
            </motion.div>

            {/* 2. O QUE ESTÁ VENDENDO BEM? (Restaurado) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-[#C75D3B]" />
                    <h2 className="text-lg font-bold text-[#4A3B32]">O Que Está Vendendo Bem?</h2>
                    <span className="text-xs text-gray-400 ml-2">
                        Top produtos para não deixar faltar
                        {periodFilter !== 'all' && ` (${
                            periodFilter === 'last7days' ? 'Últimos 7 dias' :
                            periodFilter === 'last30days' ? 'Últimos 30 dias' :
                            periodFilter === 'currentMonth' ? 'Mês Atual' :
                            periodFilter === 'currentYear' ? 'Ano Atual' : ''
                        })`}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <RankingList
                        title="Por Categoria"
                        icon={Tag}
                        items={topSellers?.byCategory}
                        valueKey="qty"
                        valueSuffix="un"
                        tooltip="Quais TIPOS de roupa vendem mais? Ex: Blusas, Calças, Vestidos. Ajuda a decidir o que comprar mais."
                    />
                    <RankingList
                        title="Por Cor"
                        icon={Palette}
                        items={topSellers?.byColor}
                        valueKey="qty"
                        valueSuffix="un"
                        tooltip="Quais CORES as clientes preferem? Se Marrom vende muito, talvez valha investir em mais tons terrosos."
                    />
                    <RankingList
                        title="Por Tamanho"
                        icon={Ruler}
                        items={topSellers?.bySize}
                        valueKey="qty"
                        valueSuffix="un"
                        tooltip="Quais TAMANHOS são mais pedidos? Se M vende muito mais que P, ajuste suas compras."
                    />
                    <RankingList
                        title="Mais Lucrativos"
                        icon={DollarSign}
                        items={topSellers?.byProfit}
                        valueKey="margin"
                        valueSuffix=""
                        tooltip="Lucro TOTAL acumulado por peça. Ex: Se vendeu 3 unidades de um produto com R$100 de lucro cada, mostra R$300. Quanto maior, mais esse item te deixou rica!"
                    />
                </div>
            </motion.div>

            {/* 3. Alertas e Atenção */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-[#4A3B32]">Atenção: Reposição</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Low Stock */}
                    <Card className="border shadow-sm">
                        <CardHeader className="px-4 py-3 border-b border-gray-100 bg-amber-50/30">
                            <CardTitle className="text-sm font-bold text-[#4A3B32] flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Estoque Baixo ({lowStock.length} itens)
                                </span>
                                <Link to="/admin/products" className="text-xs text-[#C75D3B] hover:underline flex items-center gap-1">
                                    Ver todos <ChevronRight className="w-3 h-3" />
                                </Link>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                            {lowStock.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    Nenhum produto com estoque baixo.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {lowStock.map((item, i) => (
                                        <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/50">
                                            <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                <img src={item.images?.[0]} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#4A3B32] truncate">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.suppliers?.name || 'Sem fornecedor'}</p>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-1 rounded",
                                                item.stock === 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                                            )}>
                                                {item.stock} un
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dead Stock */}
                    <Card className="border shadow-sm">
                        <CardHeader className="px-4 py-3 border-b border-gray-100 bg-red-50/30">
                            <CardTitle className="text-sm font-bold text-[#4A3B32] flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Skull className="w-4 h-4 text-red-500" />
                                    Cemitério (Parado há +90 dias)
                                </span>
                                <TooltipProvider>
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger>
                                            <Info className="w-3 h-3 opacity-40 hover:opacity-100 text-gray-400" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-[#2A211C] text-white p-2 text-xs">
                                            Produtos que estão no estoque há mais de 90 dias sem vender. Considere fazer promoções ou liquidações.
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {deadStock?.count === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    Nenhum produto encalhado. Ótima notícia!
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="text-4xl font-display font-bold text-red-500 mb-2">
                                        {deadStock?.count || 0}
                                    </div>
                                    <p className="text-sm text-gray-500">produtos parados</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        ≈ {money(deadStock?.totalValue)} em custo imobilizado
                                    </p>
                                    <button className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
                                        Ver Lista Completa
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </motion.div>

        </div>
    )
}

export default StockDashboard
