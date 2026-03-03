import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    TrendingUp, TrendingDown, AlertTriangle, Clock, Package,
    ArrowUpRight, ArrowDownRight, Minus, Search, Filter, Info, HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { getStockForecast } from '@/lib/api/stock'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { toast } from 'sonner'

function UrgencyBadge({ urgency }) {
    if (urgency >= 90) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 animate-pulse">CRÍTICO</span>
    if (urgency >= 70) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">URGENTE</span>
    if (urgency >= 50) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">ATENÇÃO</span>
    if (urgency >= 30) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">MONITORAR</span>
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">OK</span>
}

function TrendIndicator({ trend }) {
    if (trend > 20) return <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-bold"><ArrowUpRight className="w-3 h-3" />+{trend}%</span>
    if (trend < -20) return <span className="flex items-center gap-0.5 text-red-500 text-xs font-bold"><ArrowDownRight className="w-3 h-3" />{trend}%</span>
    return <span className="flex items-center gap-0.5 text-gray-400 text-xs font-bold"><Minus className="w-3 h-3" />Estável</span>
}

function ForecastKPI({ title, value, subtext, colorCls, tooltip }) {
    return (
        <Card className={cn("border shadow-sm", colorCls)}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</h3>
                    <TooltipProvider><Tooltip delayDuration={0}><TooltipTrigger><HelpCircle className="w-3 h-3 opacity-30 hover:opacity-100 text-gray-400" /></TooltipTrigger><TooltipContent className="max-w-xs bg-[#2A211C] text-white p-2 text-xs">{tooltip}</TooltipContent></Tooltip></TooltipProvider>
                </div>
                <div className="text-2xl font-display font-bold text-[#4A3B32]">{value}</div>
                <p className="text-[10px] text-gray-500 mt-0.5">{subtext}</p>
            </CardContent>
        </Card>
    )
}

export function StockForecastTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, urgent, stockout, healthy
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

    if (loading) return <div className="space-y-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
    if (!data) return null

    const money = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`

    let products = data.products || []

    // Apply filters
    if (filter === 'urgent') products = products.filter(p => p.urgency >= 70)
    else if (filter === 'stockout') products = products.filter(p => p.stock === 0 && p.sold30d > 0)
    else if (filter === 'healthy') products = products.filter(p => p.urgency < 30)

    if (search) {
        const s = search.toLowerCase()
        products = products.filter(p => p.name.toLowerCase().includes(s) || p.category?.toLowerCase().includes(s) || p.supplierName?.toLowerCase().includes(s))
    }

    return (
        <div className="space-y-6">
            {/* KPI Row */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <ForecastKPI title="Produtos em Risco" value={data.summary.urgentItems} subtext="Urgência ≥ 70" colorCls="bg-red-50/50 border-red-100" tooltip="Quantidade de produtos que precisam de reposição urgente nos próximos dias." />
                <ForecastKPI title="Risco de Ruptura" value={`${data.summary.stockoutRisk}`} subtext="Acabam em até 14 dias" colorCls="bg-orange-50/50 border-orange-100" tooltip="Produtos que ficarão zerados dentro de 2 semanas se a velocidade de venda se mantiver." />
                <ForecastKPI title="Sell-Through Médio" value={`${data.summary.avgSellThrough}%`} subtext="Taxa de giro (30d)" colorCls="bg-blue-50/50 border-blue-100" tooltip="% do estoque que foi vendido nos últimos 30 dias. Meta: > 40%." />
                <ForecastKPI title="Semanas de Estoque" value={`${data.summary.avgWeeksOfSupply}`} subtext="Média geral" colorCls="bg-purple-50/50 border-purple-100" tooltip="Quantas semanas o estoque atual dura se as vendas continuarem no ritmo atual." />
                <ForecastKPI title="Custo Reposição" value={money(data.summary.totalReorderCost)} subtext="Itens urgentes" colorCls="bg-emerald-50/50 border-emerald-100" tooltip="Investimento estimado para repor todos os itens urgentes (alvo: 4 semanas de supply)." />
            </motion.div>

            {/* Filters + Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex gap-2 flex-wrap">
                    {[
                        { v: 'all', l: 'Todos' },
                        { v: 'urgent', l: '🔴 Urgentes' },
                        { v: 'stockout', l: '⛔ Sem Estoque' },
                        { v: 'healthy', l: '✅ Saudáveis' }
                    ].map(f => (
                        <button key={f.v} onClick={() => setFilter(f.v)} className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                            filter === f.v ? 'bg-[#C75D3B] text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}>{f.l}</button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto, categoria ou fornecedor..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#C75D3B]/20 focus:border-[#C75D3B] outline-none" />
                </div>
                <span className="text-xs text-gray-400 ml-auto">{products.length} produtos</span>
            </div>

            {/* Product Table */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <Card className="border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Produto</th>
                                    <th className="text-center px-3 py-3 font-bold text-gray-500 text-xs uppercase">Estoque</th>
                                    <th className="text-center px-3 py-3 font-bold text-gray-500 text-xs uppercase hidden sm:table-cell">Vel./dia</th>
                                    <th className="text-center px-3 py-3 font-bold text-gray-500 text-xs uppercase">Vendas 30d</th>
                                    <th className="text-center px-3 py-3 font-bold text-gray-500 text-xs uppercase hidden md:table-cell">Sell-Through</th>
                                    <th className="text-center px-3 py-3 font-bold text-gray-500 text-xs uppercase hidden lg:table-cell">Sem. Supply</th>
                                    <th className="text-center px-3 py-3 font-bold text-gray-500 text-xs uppercase hidden lg:table-cell">Ruptura Est.</th>
                                    <th className="text-center px-3 py-3 font-bold text-gray-500 text-xs uppercase hidden md:table-cell">Tendência</th>
                                    <th className="text-center px-3 py-3 font-bold text-gray-500 text-xs uppercase">Status</th>
                                    <th className="text-center px-3 py-3 font-bold text-gray-500 text-xs uppercase hidden sm:table-cell">Repor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {products.slice(0, 50).map((p, i) => (
                                    <tr key={p.id} className={cn("hover:bg-gray-50/50 transition-colors", p.urgency >= 90 && "bg-red-50/30")}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                    <img src={getOptimizedImageUrl(p.images?.[0], 80)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-[#4A3B32] truncate max-w-[160px] md:max-w-[250px]">{p.name}</p>
                                                    <p className="text-[10px] text-gray-400">{p.category} • {p.supplierName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            <span className={cn("font-bold text-sm", p.stock === 0 ? "text-red-600" : p.stock <= 2 ? "text-amber-600" : "text-[#4A3B32]")}>
                                                {p.stock}
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden sm:table-cell text-xs text-gray-600">{p.velocityDay}</td>
                                        <td className="text-center px-3 py-3 font-semibold text-[#4A3B32]">{p.sold30d}</td>
                                        <td className="text-center px-3 py-3 hidden md:table-cell">
                                            <span className={cn("text-xs font-bold", p.sellThrough30d > 50 ? "text-emerald-600" : p.sellThrough30d > 25 ? "text-blue-600" : "text-gray-400")}>
                                                {p.sellThrough30d}%
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden lg:table-cell">
                                            <span className={cn("text-xs font-bold", p.weeksOfSupply < 2 ? "text-red-600" : p.weeksOfSupply < 4 ? "text-amber-600" : "text-emerald-600")}>
                                                {p.weeksOfSupply > 50 ? '∞' : `${p.weeksOfSupply}s`}
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden lg:table-cell text-xs text-gray-500">
                                            {p.stockoutDate ? new Date(p.stockoutDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
                                        </td>
                                        <td className="text-center px-3 py-3 hidden md:table-cell"><TrendIndicator trend={p.trend} /></td>
                                        <td className="text-center px-3 py-3"><UrgencyBadge urgency={p.urgency} /></td>
                                        <td className="text-center px-3 py-3 hidden sm:table-cell">
                                            {p.suggestedReorderQty > 0 ? (
                                                <span className="text-xs font-bold text-[#C75D3B]">+{p.suggestedReorderQty} un</span>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {products.length === 0 && (
                        <div className="p-12 text-center text-gray-400 text-sm">Nenhum produto encontrado com esses filtros.</div>
                    )}
                </Card>
            </motion.div>
        </div>
    )
}
