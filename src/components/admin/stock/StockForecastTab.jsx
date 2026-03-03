import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    TrendingUp, TrendingDown, AlertTriangle, Clock, Package,
    ArrowUpRight, ArrowDownRight, Minus, Search, Zap, Info, HelpCircle,
    Activity, Brain, Target, Calendar, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { getStockForecast } from '@/lib/api/stock'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { toast } from 'sonner'

// ========================
// SKELETON LOADER
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

function ForecastSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <SkeletonPulse key={i} className="h-28" />
                ))}
            </div>
            <SkeletonPulse className="h-96" />
        </div>
    )
}

// ========================
// URGENCY BADGE
// ========================
function UrgencyBadge({ urgency }) {
    if (urgency >= 90) return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg animate-pulse">
            CRÍTICO
        </span>
    )
    if (urgency >= 70) return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
            URGENTE
        </span>
    )
    if (urgency >= 50) return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm">
            ATENÇÃO
        </span>
    )
    if (urgency >= 30) return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-sm">
            MONITORAR
        </span>
    )
    return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-sm">
            OK
        </span>
    )
}

// ========================
// TREND INDICATOR
// ========================
function TrendIndicator({ trend }) {
    if (trend > 20) return (
        <span className="flex items-center gap-1 text-emerald-600 text-xs font-black px-2 py-1 bg-emerald-50 rounded-lg">
            <ArrowUpRight className="w-3 h-3" />+{trend}%
        </span>
    )
    if (trend < -20) return (
        <span className="flex items-center gap-1 text-red-500 text-xs font-black px-2 py-1 bg-red-50 rounded-lg">
            <ArrowDownRight className="w-3 h-3" />{trend}%
        </span>
    )
    return (
        <span className="flex items-center gap-1 text-gray-400 text-xs font-black px-2 py-1 bg-gray-50 rounded-lg">
            <Minus className="w-3 h-3" />Estável
        </span>
    )
}

// ========================
// FORECAST KPI CARD
// ========================
function ForecastKPI({ title, value, subtext, gradient, icon: Icon, tooltip }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
        >
            <Card className={cn("border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden", gradient)}>
                <div className="absolute top-0 right-0 w-24 h-24 opacity-10 -mr-6 -mt-6">
                    <Icon className="w-full h-full" />
                </div>

                <CardContent className="p-4 relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">{title}</p>

                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <button className="opacity-40 hover:opacity-100 transition-opacity">
                                        <HelpCircle className="w-3 h-3 text-gray-500" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-[#2A211C] text-white p-3 text-xs shadow-2xl">
                                    {tooltip}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <div className="text-3xl font-black text-[#4A3B32] mb-1">{value}</div>
                    <p className="text-[10px] text-gray-500 font-medium">{subtext}</p>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ========================
// MAIN COMPONENT
// ========================
export function StockForecastTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')

    useEffect(() => {
        loadForecast()
    }, [])

    const loadForecast = async () => {
        setLoading(true)
        try {
            const result = await getStockForecast()
            setData(result)
        } catch (error) {
            toast.error('Erro ao carregar forecast')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <ForecastSkeleton />
    if (!data) return null

    const money = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`

    let products = data.products || []

    // Apply filters
    if (filter === 'urgent') products = products.filter(p => p.urgency >= 70)
    else if (filter === 'stockout') products = products.filter(p => p.stock === 0 && p.sold30d > 0)
    else if (filter === 'healthy') products = products.filter(p => p.urgency < 30)

    if (search) {
        const s = search.toLowerCase()
        products = products.filter(p =>
            p.name.toLowerCase().includes(s) ||
            p.category?.toLowerCase().includes(s) ||
            p.supplierName?.toLowerCase().includes(s)
        )
    }

    return (
        <div className="space-y-6">
            {/* Premium Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
            >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                    <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[#4A3B32]">Forecast Inteligente</h2>
                    <p className="text-xs text-gray-500 font-medium">Previsão de ruptura e sugestões de reposição</p>
                </div>
            </motion.div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <ForecastKPI
                    title="Produtos em Risco"
                    value={data.summary.urgentItems}
                    subtext="Urgência ≥ 70"
                    gradient="bg-gradient-to-br from-red-50 to-white"
                    icon={AlertCircle}
                    tooltip="Produtos que precisam de reposição urgente nos próximos dias para evitar ruptura de estoque."
                />
                <ForecastKPI
                    title="Risco de Ruptura"
                    value={`${data.summary.stockoutRisk}`}
                    subtext="Acabam em até 14 dias"
                    gradient="bg-gradient-to-br from-orange-50 to-white"
                    icon={Zap}
                    tooltip="Produtos que ficarão zerados dentro de 2 semanas se a velocidade de venda se mantiver."
                />
                <ForecastKPI
                    title="Sell-Through"
                    value={`${data.summary.avgSellThrough}%`}
                    subtext="Taxa de giro (30d)"
                    gradient="bg-gradient-to-br from-blue-50 to-white"
                    icon={Activity}
                    tooltip="Percentual do estoque que foi vendido nos últimos 30 dias. Meta: acima de 40%."
                />
                <ForecastKPI
                    title="Semanas de Supply"
                    value={`${data.summary.avgWeeksOfSupply}`}
                    subtext="Média geral"
                    gradient="bg-gradient-to-br from-purple-50 to-white"
                    icon={Calendar}
                    tooltip="Quantas semanas o estoque atual dura se as vendas continuarem no ritmo atual."
                />
                <ForecastKPI
                    title="Custo Reposição"
                    value={money(data.summary.totalReorderCost)}
                    subtext="Itens urgentes"
                    gradient="bg-gradient-to-br from-emerald-50 to-white"
                    icon={Target}
                    tooltip="Investimento estimado para repor todos os itens urgentes (alvo: 4 semanas de supply)."
                />
            </div>

            {/* Filters + Search */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
            >
                <div className="flex gap-2 flex-wrap">
                    {[
                        { v: 'all', l: 'Todos', icon: Package },
                        { v: 'urgent', l: '🔴 Urgentes' },
                        { v: 'stockout', l: '⛔ Sem Estoque' },
                        { v: 'healthy', l: '✅ Saudáveis' }
                    ].map(f => (
                        <motion.button
                            key={f.v}
                            onClick={() => setFilter(f.v)}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                                'px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm',
                                filter === f.v
                                    ? 'bg-gradient-to-r from-[#C75D3B] to-[#A04A2E] text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            )}
                        >
                            {f.l}
                        </motion.button>
                    ))}
                </div>

                <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar produto, categoria..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#C75D3B]/20 focus:border-[#C75D3B] outline-none transition-all shadow-sm"
                    />
                </div>

                <span className="text-xs text-gray-400 font-bold ml-auto">{products.length} produtos</span>
            </motion.div>

            {/* Product Table */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="border-0 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gradient-to-r from-gray-50 to-transparent border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-5 py-4 font-black text-gray-600 text-xs uppercase tracking-wider">Produto</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase">Estoque</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden sm:table-cell">Vel./dia</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase">Vendas 30d</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden md:table-cell">
                                        <TooltipProvider>
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                                    Sell-Through
                                                    <HelpCircle className="w-3 h-3 opacity-50" />
                                                </TooltipTrigger>
                                                <TooltipContent>% do estoque vendido em 30 dias</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden lg:table-cell">Sem. Supply</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden lg:table-cell">Ruptura Est.</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden md:table-cell">Tendência</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase">Status</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden sm:table-cell">Repor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {products.slice(0, 50).map((p, i) => (
                                    <motion.tr
                                        key={p.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        className={cn(
                                            "hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all group",
                                            p.urgency >= 90 && "bg-red-50/30"
                                        )}
                                    >
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                                    <img src={getOptimizedImageUrl(p.images?.[0], 80)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[#4A3B32] truncate max-w-[160px] md:max-w-[250px]">{p.name}</p>
                                                    <p className="text-[10px] text-gray-500">{p.category} • {p.supplierName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            <span className={cn(
                                                "font-black text-sm",
                                                p.stock === 0 ? "text-red-600" : p.stock <= 2 ? "text-amber-600" : "text-[#4A3B32]"
                                            )}>
                                                {p.stock}
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden sm:table-cell text-xs text-gray-600 font-medium">{p.velocityDay}</td>
                                        <td className="text-center px-3 py-3 font-black text-[#4A3B32]">{p.sold30d}</td>
                                        <td className="text-center px-3 py-3 hidden md:table-cell">
                                            <span className={cn(
                                                "text-xs font-black",
                                                p.sellThrough30d > 50 ? "text-emerald-600" : p.sellThrough30d > 25 ? "text-blue-600" : "text-gray-400"
                                            )}>
                                                {p.sellThrough30d}%
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden lg:table-cell">
                                            <span className={cn(
                                                "text-xs font-black px-2 py-1 rounded-lg",
                                                p.weeksOfSupply < 2 ? "bg-red-100 text-red-700" :
                                                p.weeksOfSupply < 4 ? "bg-amber-100 text-amber-700" :
                                                "bg-emerald-100 text-emerald-700"
                                            )}>
                                                {p.weeksOfSupply > 50 ? '∞' : `${p.weeksOfSupply}s`}
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden lg:table-cell text-xs text-gray-500 font-medium">
                                            {p.stockoutDate ? new Date(p.stockoutDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
                                        </td>
                                        <td className="text-center px-3 py-3 hidden md:table-cell">
                                            <TrendIndicator trend={p.trend} />
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            <UrgencyBadge urgency={p.urgency} />
                                        </td>
                                        <td className="text-center px-3 py-3 hidden sm:table-cell">
                                            {p.suggestedReorderQty > 0 ? (
                                                <span className="text-xs font-black text-[#C75D3B] px-3 py-1 bg-[#C75D3B]/10 rounded-lg">
                                                    +{p.suggestedReorderQty} un
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-300 font-bold">—</span>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {products.length === 0 && (
                        <div className="p-16 text-center">
                            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <p className="text-sm font-bold text-gray-400">Nenhum produto encontrado</p>
                            <p className="text-xs text-gray-300 mt-1">Ajuste os filtros ou busca</p>
                        </div>
                    )}
                </Card>
            </motion.div>
        </div>
    )
}
