import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    TrendingUp, TrendingDown, Package, DollarSign, BarChart3,
    Filter, Search, Star, Award, AlertCircle,
    Info, HelpCircle, Sparkles, Target, Activity, Eye,
    ChevronUp, ChevronDown, ChevronsUpDown
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
// PRIORITY BADGE (ABC)
// ========================
function PriorityBadge({ abcClass }) {
    if (abcClass === 'A') return (
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md whitespace-nowrap">
            ⭐ Alta
        </span>
    )
    if (abcClass === 'B') return (
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-sm whitespace-nowrap">
            Regular
        </span>
    )
    return (
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm whitespace-nowrap">
            Baixa
        </span>
    )
}

// ========================
// RETURN INDICATOR (GMROI)
// ========================
function ReturnIndicator({ gmroi }) {
    if (gmroi >= 3) return (
        <span className="flex items-center gap-1 text-emerald-600 text-xs font-black px-2 py-1 bg-emerald-50 rounded-lg whitespace-nowrap">
            <TrendingUp className="w-3 h-3" />Ótimo
        </span>
    )
    if (gmroi >= 2) return (
        <span className="flex items-center gap-1 text-blue-600 text-xs font-black px-2 py-1 bg-blue-50 rounded-lg whitespace-nowrap">
            <TrendingUp className="w-3 h-3" />Bom
        </span>
    )
    if (gmroi >= 1) return (
        <span className="flex items-center gap-1 text-amber-600 text-xs font-black px-2 py-1 bg-amber-50 rounded-lg whitespace-nowrap">
            <Activity className="w-3 h-3" />Regular
        </span>
    )
    return (
        <span className="flex items-center gap-1 text-red-600 text-xs font-black px-2 py-1 bg-red-50 rounded-lg whitespace-nowrap">
            <TrendingDown className="w-3 h-3" />Fraco
        </span>
    )
}

// ========================
// SORTABLE COLUMN HEADER
// ========================
function SortHeader({ label, field, sortBy, sortDir, onSort, tooltip, className }) {
    const active = sortBy === field
    return (
        <th
            className={cn("px-3 py-4 font-black text-gray-600 text-xs uppercase cursor-pointer select-none hover:bg-gray-100/80 transition-colors group", className)}
            onClick={() => onSort(field)}
        >
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1">
                            <span className={cn(active && "text-[#C75D3B]")}>{label}</span>
                            {active ? (
                                sortDir === 'desc'
                                    ? <ChevronDown className="w-3 h-3 text-[#C75D3B]" />
                                    : <ChevronUp className="w-3 h-3 text-[#C75D3B]" />
                            ) : (
                                <ChevronsUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60" />
                            )}
                        </div>
                    </TooltipTrigger>
                    {tooltip && (
                        <TooltipContent className="max-w-xs bg-[#2A211C] text-white p-2 text-xs shadow-xl">
                            {tooltip}
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
        </th>
    )
}

// ========================
// KPI CARD
// ========================
function AnalysisKPI({ title, value, subtext, gradient, icon: Icon, tooltip }) {
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
    const [sortDir, setSortDir] = useState('desc')

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

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        } else {
            setSortBy(field)
            setSortDir('desc')
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
        let aVal, bVal
        if (sortBy === 'gmroi') { aVal = a.gmroi || 0; bVal = b.gmroi || 0 }
        else if (sortBy === 'revenue') { aVal = a.revenue90d || 0; bVal = b.revenue90d || 0 }
        else if (sortBy === 'margin') { aVal = a.margin || 0; bVal = b.margin || 0 }
        else if (sortBy === 'stockValue') { aVal = a.stockValueCost || 0; bVal = b.stockValueCost || 0 }
        else if (sortBy === 'stock') { aVal = a.stock || 0; bVal = b.stock || 0 }
        else if (sortBy === 'sellThrough') { aVal = a.sellThrough || 0; bVal = b.sellThrough || 0 }
        else if (sortBy === 'name') { return sortDir === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '') }
        else { aVal = a.gmroi || 0; bVal = b.gmroi || 0 }
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })

    const categories = [...new Set((data.products || []).map(p => p.category).filter(Boolean))]
    const summary = data.summary || {}

    return (
        <div className="space-y-6">
            {/* Header */}
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
                    <p className="text-xs text-gray-500 font-medium">Rentabilidade, prioridade e performance por produto</p>
                </div>
            </motion.div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalysisKPI
                    title="Produtos Prioritários"
                    value={summary.classA ?? summary.abc?.a?.count ?? 0}
                    subtext={`${summary.classARevenuePct ?? 0}% da receita total`}
                    gradient="bg-gradient-to-br from-emerald-50 to-white"
                    icon={Star}
                    tooltip="Os produtos que mais vendem e geram receita. São os mais importantes do seu estoque — nunca deixe faltar."
                />
                <AnalysisKPI
                    title="Retorno Médio (GMROI)"
                    value={`${(summary.avgGmroi ?? 0).toFixed(1)}x`}
                    subtext="Lucro gerado por R$1 investido"
                    gradient="bg-gradient-to-br from-blue-50 to-white"
                    icon={Target}
                    tooltip="Para cada R$1 que você investiu em estoque, quanto de lucro bruto retornou. Meta ideal: acima de 2.5x."
                />
                <AnalysisKPI
                    title="Margem Média"
                    value={`${(summary.avgMargin ?? 0).toFixed(0)}%`}
                    subtext="Lucro sobre preço de venda"
                    gradient="bg-gradient-to-br from-purple-50 to-white"
                    icon={DollarSign}
                    tooltip="Percentual médio de lucro bruto sobre o preço de venda. Quanto maior, mais lucrativo é o seu mix de produtos."
                />
                <AnalysisKPI
                    title="Capital Investido"
                    value={money(summary.totalStockCost ?? 0)}
                    subtext={`${summary.totalProducts ?? 0} produtos em análise`}
                    gradient="bg-gradient-to-br from-amber-50 to-white"
                    icon={Package}
                    tooltip="Total de dinheiro que você pagou pelos produtos que ainda estão no estoque. É o capital que precisa girar para virar lucro."
                />
            </div>

            {/* Filters Bar */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100"
            >
                <div className="flex flex-wrap gap-3 items-center">
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

                    {/* Priority Filter (ABC) */}
                    <div className="flex gap-2">
                        {[
                            { value: '', label: 'Todas' },
                            { value: 'A', label: '⭐ Alta Prioridade' },
                            { value: 'B', label: 'Regular' },
                            { value: 'C', label: 'Baixa' }
                        ].map(opt => (
                            <motion.button
                                key={opt.value}
                                onClick={() => setFilters({ ...filters, abcClass: opt.value })}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                    'px-3 py-2 rounded-xl text-xs font-black transition-all shadow-sm whitespace-nowrap',
                                    filters.abcClass === opt.value
                                        ? 'bg-gradient-to-r from-[#C75D3B] to-[#A04A2E] text-white shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                )}
                            >
                                {opt.label}
                            </motion.button>
                        ))}
                    </div>

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

                    <span className="text-xs text-gray-400 font-bold ml-auto">{products.length} produtos</span>
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
                                    <th className="text-left px-5 py-4 font-black text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 transition-colors group" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1">
                                            Produto
                                            {sortBy === 'name'
                                                ? sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-[#C75D3B]" /> : <ChevronUp className="w-3 h-3 text-[#C75D3B]" />
                                                : <ChevronsUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60" />
                                            }
                                        </div>
                                    </th>
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => handleSort('name')}>
                                        Prioridade
                                    </th>
                                    <SortHeader label="Estoque" field="stock" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} tooltip="Quantidade total disponível" className="hidden sm:table-cell" />
                                    <SortHeader
                                        label="Retorno"
                                        field="gmroi"
                                        sortBy={sortBy}
                                        sortDir={sortDir}
                                        onSort={handleSort}
                                        tooltip="Retorno sobre investimento (90 dias). Quanto de lucro para cada R$1 de estoque."
                                    />
                                    <SortHeader
                                        label="Margem"
                                        field="margin"
                                        sortBy={sortBy}
                                        sortDir={sortDir}
                                        onSort={handleSort}
                                        tooltip="% de lucro sobre o preço de venda"
                                        className="hidden md:table-cell"
                                    />
                                    <SortHeader
                                        label="Vendas 90d"
                                        field="revenue"
                                        sortBy={sortBy}
                                        sortDir={sortDir}
                                        onSort={handleSort}
                                        tooltip="Receita total nos últimos 90 dias"
                                        className="hidden lg:table-cell"
                                    />
                                    <SortHeader
                                        label="% Vendido"
                                        field="sellThrough"
                                        sortBy={sortBy}
                                        sortDir={sortDir}
                                        onSort={handleSort}
                                        tooltip="Quanto do estoque foi vendido. Quanto maior, mais rápido esse produto gira."
                                        className="hidden md:table-cell"
                                    />
                                    <th className="text-left px-3 py-4 font-black text-gray-600 text-xs uppercase hidden lg:table-cell">Tamanhos</th>
                                    <SortHeader
                                        label="Capital"
                                        field="stockValue"
                                        sortBy={sortBy}
                                        sortDir={sortDir}
                                        onSort={handleSort}
                                        tooltip="Capital investido no estoque atual (custo de compra)"
                                        className="hidden lg:table-cell"
                                    />
                                    <th className="text-center px-3 py-4 font-black text-gray-600 text-xs uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {products.slice(0, 50).map((p, i) => (
                                    <motion.tr
                                        key={p.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.015 }}
                                        className={cn(
                                            "hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all group",
                                            p.abcClass === 'A' && "bg-emerald-50/20"
                                        )}
                                    >
                                        {/* Produto */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                                    <img src={getOptimizedImageUrl(p.images?.[0], 80)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[#4A3B32] truncate max-w-[140px] md:max-w-[220px]">{p.name}</p>
                                                    <p className="text-[10px] text-gray-500">{p.category}{p.brand ? ` • ${p.brand}` : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Prioridade */}
                                        <td className="text-center px-3 py-3">
                                            <PriorityBadge abcClass={p.abcClass} />
                                        </td>
                                        {/* Estoque */}
                                        <td className="text-center px-3 py-3 hidden sm:table-cell font-black text-[#4A3B32]">{p.stock ?? 0}</td>
                                        {/* Retorno (GMROI) */}
                                        <td className="text-center px-3 py-3">
                                            <span className="text-sm font-black text-[#C75D3B]">{(p.gmroi ?? 0).toFixed(1)}x</span>
                                        </td>
                                        {/* Margem */}
                                        <td className="text-center px-3 py-3 hidden md:table-cell">
                                            <span className={cn(
                                                "text-xs font-black",
                                                (p.margin ?? 0) > 60 ? "text-emerald-600" : (p.margin ?? 0) > 40 ? "text-blue-600" : "text-gray-500"
                                            )}>
                                                {(p.margin ?? 0).toFixed(0)}%
                                            </span>
                                        </td>
                                        {/* Vendas 90d */}
                                        <td className="text-center px-3 py-3 hidden lg:table-cell font-medium text-gray-600">
                                            {money(p.revenue90d)}
                                        </td>
                                        {/* % Vendido (Sell-Through) */}
                                        <td className="text-center px-3 py-3 hidden md:table-cell">
                                            <span className={cn(
                                                "text-xs font-black px-2 py-1 rounded-lg",
                                                (p.sellThrough ?? 0) > 50 ? "bg-emerald-100 text-emerald-700" :
                                                (p.sellThrough ?? 0) > 25 ? "bg-blue-100 text-blue-700" :
                                                "bg-gray-100 text-gray-600"
                                            )}>
                                                {(p.sellThrough ?? 0).toFixed(0)}%
                                            </span>
                                        </td>
                                        {/* Tamanhos */}
                                        <td className="px-3 py-3 hidden lg:table-cell">
                                            {p.sizesSummary?.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {p.sizesSummary.map(s => (
                                                        <span
                                                            key={s.size}
                                                            className={cn(
                                                                "text-[9px] px-1.5 py-0.5 rounded font-bold",
                                                                s.quantity > 0 ? "bg-gray-100 text-gray-600" : "bg-red-50 text-red-400 line-through"
                                                            )}
                                                        >
                                                            {s.size}({s.quantity})
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-400">—</span>
                                            )}
                                        </td>
                                        {/* Capital */}
                                        <td className="text-center px-3 py-3 hidden lg:table-cell text-xs text-gray-500 font-medium">
                                            {money(p.stockValueCost)}
                                        </td>
                                        {/* Status */}
                                        <td className="text-center px-3 py-3">
                                            <ReturnIndicator gmroi={p.gmroi ?? 0} />
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
                            <p className="text-xs text-gray-300 mt-1">Ajuste os filtros ou a busca</p>
                        </div>
                    )}

                    {products.length > 50 && (
                        <div className="p-4 text-center border-t border-gray-100 bg-gray-50/50">
                            <p className="text-xs text-gray-500 font-medium">Mostrando 50 de {products.length} produtos. Use os filtros para refinar.</p>
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
                        <h3 className="text-sm font-black text-blue-900 mb-1">💡 Como ler esta análise</h3>
                        <div className="text-xs text-blue-700 space-y-1">
                            <p><strong className="font-black">⭐ Alta Prioridade</strong>: Seus campeões de venda! Geram ~80% da receita. NUNCA deixe faltar.</p>
                            <p><strong className="font-black">Regular</strong>: Produtos com vendas moderadas. Mantenha estoque razoável.</p>
                            <p><strong className="font-black">Baixa Prioridade</strong>: Poucas vendas. Considere liquidar ou não repor.</p>
                            <p className="pt-1"><strong className="font-black">Retorno acima de 2.5x</strong> = ótimo retorno sobre o que você investiu em estoque!</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
