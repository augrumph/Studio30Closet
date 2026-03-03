import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    TrendingUp, TrendingDown, Package, DollarSign, BarChart3,
    Filter, Search, Download, Star, Award, AlertCircle,
    Info, HelpCircle, Sparkles, Target, Activity, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { getInventoryAnalysis } from '@/lib/api/stock'
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

function AnalysisSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <SkeletonPulse key={i} className="h-32" />
                ))}
            </div>
            <SkeletonPulse className="h-96" />
        </div>
    )
}

// ========================
// ABC CLASS BADGE
// ========================
function ABCBadge({ abcClass }) {
    if (abcClass === 'A') return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md">
            A - Premium
        </span>
    )
    if (abcClass === 'B') return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-sm">
            B - Regular
        </span>
    )
    return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm">
            C - Baixo
        </span>
    )
}

// ========================
// GMROI INDICATOR
// ========================
function GMROIIndicator({ gmroi }) {
    if (gmroi >= 3) return (
        <span className="flex items-center gap-1 text-emerald-600 text-xs font-black px-2 py-1 bg-emerald-50 rounded-lg">
            <TrendingUp className="w-3 h-3" />Excelente
        </span>
    )
    if (gmroi >= 2) return (
        <span className="flex items-center gap-1 text-blue-600 text-xs font-black px-2 py-1 bg-blue-50 rounded-lg">
            <TrendingUp className="w-3 h-3" />Bom
        </span>
    )
    if (gmroi >= 1) return (
        <span className="flex items-center gap-1 text-amber-600 text-xs font-black px-2 py-1 bg-amber-50 rounded-lg">
            <Activity className="w-3 h-3" />Regular
        </span>
    )
    return (
        <span className="flex items-center gap-1 text-red-600 text-xs font-black px-2 py-1 bg-red-50 rounded-lg">
            <TrendingDown className="w-3 h-3" />Ruim
        </span>
    )
}

// ========================
// KPI CARD
// ========================
function AnalysisKPI({ title, value, subtext, gradient, icon: Icon, tooltip, trend }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.3 }}
        >
            <Card className={cn("border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden", gradient)}>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8">
                    <Icon className="w-full h-full" />
                </div>

                <CardContent className="p-5 relative z-10">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-white/50 shadow-sm">
                                <Icon className="w-4 h-4 text-[#4A3B32]" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-600">{title}</p>
                        </div>

                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <button className="opacity-40 hover:opacity-100 transition-opacity">
                                        <HelpCircle className="w-4 h-4 text-gray-500" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-[#2A211C] text-white p-3 text-xs shadow-2xl">
                                    <p className="font-medium mb-1">{title}</p>
                                    <p className="text-gray-300">{tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <div className="flex items-baseline gap-2 mb-2">
                        <div className="text-3xl font-black text-[#4A3B32]">{value}</div>
                        {trend && (
                            <span className={cn(
                                "text-xs font-black flex items-center gap-0.5",
                                trend > 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                                {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(trend)}%
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium">{subtext}</p>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ========================
// MAIN COMPONENT
// ========================
export function StockAnalysisTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({ category: '', abcClass: '' })
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState('gmroi')

    useEffect(() => {
        loadAnalysis()
    }, [filters])

    const loadAnalysis = async () => {
        setLoading(true)
        try {
            const params = {}
            if (filters.category) params.category = filters.category
            if (filters.abcClass) params.abcClass = filters.abcClass

            const result = await getInventoryAnalysis(params)
            setData(result)
        } catch (error) {
            toast.error('Erro ao carregar análise')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <AnalysisSkeleton />
    if (!data) return null

    const money = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`

    let products = data.products || []

    // Apply search
    if (search) {
        const s = search.toLowerCase()
        products = products.filter(p =>
            p.name?.toLowerCase().includes(s) ||
            p.category?.toLowerCase().includes(s) ||
            p.brand?.toLowerCase().includes(s)
        )
    }

    // Apply sorting
    products = [...products].sort((a, b) => {
        if (sortBy === 'gmroi') return (b.gmroi || 0) - (a.gmroi || 0)
        if (sortBy === 'revenue') return (b.revenue90d || 0) - (a.revenue90d || 0)
        if (sortBy === 'margin') return (b.margin || 0) - (a.margin || 0)
        if (sortBy === 'stockValue') return (b.stockValueCost || 0) - (a.stockValueCost || 0)
        return 0
    })

    const categories = [...new Set((data.products || []).map(p => p.category).filter(Boolean))]

    return (
        <div className="space-y-6">
            {/* Premium Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
            >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[#4A3B32]">Análise de Inventário</h2>
                    <p className="text-xs text-gray-500 font-medium">GMROI, ABC, Margem e Performance de Produtos</p>
                </div>
            </motion.div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalysisKPI
                    title="Produtos A"
                    value={data.summary?.classA || 0}
                    subtext={`${data.summary?.classARevenuePct || 0}% da receita`}
                    gradient="bg-gradient-to-br from-emerald-50 to-white"
                    icon={Star}
                    tooltip="Produtos classe A geram 80% da receita com apenas 20% dos itens. São os campeões de vendas que você NÃO pode deixar faltar."
                />
                <AnalysisKPI
                    title="GMROI Médio"
                    value={`${data.summary?.avgGMROI?.toFixed(1) || 0}x`}
                    subtext="Retorno sobre investimento"
                    gradient="bg-gradient-to-br from-blue-50 to-white"
                    icon={Target}
                    tooltip="Gross Margin Return on Investment: quanto de lucro bruto você gera para cada R$1 investido em estoque. Meta: acima de 2.5x"
                />
                <AnalysisKPI
                    title="Margem Média"
                    value={`${data.summary?.avgMargin?.toFixed(0) || 0}%`}
                    subtext="Lucro sobre preço de venda"
                    gradient="bg-gradient-to-br from-purple-50 to-white"
                    icon={DollarSign}
                    tooltip="Percentual médio de lucro sobre o preço de venda dos produtos. Quanto maior, melhor sua rentabilidade."
                />
                <AnalysisKPI
                    title="Valor Imobilizado"
                    value={money(data.summary?.totalStockCost || 0)}
                    subtext={`${data.summary?.totalProducts || 0} produtos`}
                    gradient="bg-gradient-to-br from-amber-50 to-white"
                    icon={Package}
                    tooltip="Capital total investido em estoque (custo). É o dinheiro 'parado' que você precisa recuperar através de vendas."
                />
            </div>

            {/* Filters Bar */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100"
            >
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-[#C75D3B]" />
                        <span className="text-sm font-black text-[#4A3B32]">Filtros:</span>
                    </div>

                    {/* Category Filter */}
                    <select
                        value={filters.category}
                        onChange={e => setFilters({ ...filters, category: e.target.value })}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-[#C75D3B]/20 focus:border-[#C75D3B] outline-none transition-all shadow-sm"
                    >
                        <option value="">Todas as categorias</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* ABC Filter */}
                    <div className="flex gap-2">
                        {['', 'A', 'B', 'C'].map(abc => (
                            <motion.button
                                key={abc}
                                onClick={() => setFilters({ ...filters, abcClass: abc })}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm',
                                    filters.abcClass === abc
                                        ? 'bg-gradient-to-r from-[#C75D3B] to-[#A04A2E] text-white shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                )}
                            >
                                {abc || 'Todas'} {abc && `Classe`}
                            </motion.button>
                        ))}
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-[#C75D3B]/20 focus:border-[#C75D3B] outline-none transition-all shadow-sm"
                    >
                        <option value="gmroi">📊 Maior GMROI</option>
                        <option value="revenue">💰 Maior Receita</option>
                        <option value="margin">📈 Maior Margem</option>
                        <option value="stockValue">💎 Maior Valor</option>
                    </select>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar produto..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#C75D3B]/20 focus:border-[#C75D3B] outline-none transition-all shadow-sm"
                        />
                    </div>

                    <span className="text-xs text-gray-400 font-bold ml-auto">{products.length} itens</span>
                </div>
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
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase">Classe ABC</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden sm:table-cell">Estoque</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase">
                                        <TooltipProvider>
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                                    GMROI
                                                    <HelpCircle className="w-3 h-3 opacity-50" />
                                                </TooltipTrigger>
                                                <TooltipContent>Retorno sobre inv. (90d)</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden md:table-cell">Margem</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden lg:table-cell">Receita 90d</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden md:table-cell">
                                        <TooltipProvider>
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                                    Sell-Through
                                                    <HelpCircle className="w-3 h-3 opacity-50" />
                                                </TooltipTrigger>
                                                <TooltipContent>% vendido do total exposto</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase hidden lg:table-cell">Valor Custo</th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase">Performance</th>
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
                                            p.abcClass === 'A' && "bg-emerald-50/20"
                                        )}
                                    >
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                                    <img src={getOptimizedImageUrl(p.images?.[0], 80)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[#4A3B32] truncate max-w-[160px] md:max-w-[250px]">{p.name}</p>
                                                    <p className="text-[10px] text-gray-500">{p.category} • {p.brand || 'Sem marca'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            <ABCBadge abcClass={p.abcClass} />
                                        </td>
                                        <td className="text-center px-3 py-3 hidden sm:table-cell font-black text-[#4A3B32]">{p.stock || 0}</td>
                                        <td className="text-center px-3 py-3">
                                            <span className="text-sm font-black text-[#C75D3B]">{p.gmroi?.toFixed(1)}x</span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden md:table-cell">
                                            <span className={cn(
                                                "text-xs font-black",
                                                p.margin > 60 ? "text-emerald-600" : p.margin > 40 ? "text-blue-600" : "text-gray-500"
                                            )}>
                                                {p.margin?.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden lg:table-cell font-medium text-gray-600">
                                            {money(p.revenue90d)}
                                        </td>
                                        <td className="text-center px-3 py-3 hidden md:table-cell">
                                            <span className={cn(
                                                "text-xs font-black px-2 py-1 rounded-lg",
                                                p.sellThrough > 50 ? "bg-emerald-100 text-emerald-700" :
                                                p.sellThrough > 25 ? "bg-blue-100 text-blue-700" :
                                                "bg-gray-100 text-gray-600"
                                            )}>
                                                {p.sellThrough?.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden lg:table-cell text-xs text-gray-500 font-medium">
                                            {money(p.stockValueCost)}
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            <GMROIIndicator gmroi={p.gmroi} />
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {products.length === 0 && (
                        <div className="p-16 text-center">
                            <Eye className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <p className="text-sm font-bold text-gray-400">Nenhum produto encontrado</p>
                            <p className="text-xs text-gray-300 mt-1">Ajuste os filtros ou busca</p>
                        </div>
                    )}
                </Card>
            </motion.div>

            {/* Info Banner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 shadow-sm"
            >
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500 shadow-md flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-blue-900 mb-1">💡 Entendendo a Análise ABC</h3>
                        <div className="text-xs text-blue-700 space-y-1">
                            <p><strong className="font-black">Classe A</strong> (top 20%): Seus campeões! Geram 80% da receita. NUNCA deixe faltar.</p>
                            <p><strong className="font-black">Classe B</strong> (30% seguintes): Produtos regulares. Mantenha estoque moderado.</p>
                            <p><strong className="font-black">Classe C</strong> (50% restantes): Vendas baixas. Considere liquidar ou não repor.</p>
                            <p className="pt-2"><strong className="font-black">GMROI acima de 2.5x</strong> = excelente retorno sobre investimento!</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
