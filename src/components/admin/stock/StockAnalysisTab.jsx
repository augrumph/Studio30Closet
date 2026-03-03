import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    BarChart3, Package, DollarSign, Clock, AlertTriangle, TrendingUp,
    Filter, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { getInventoryAnalysis } from '@/lib/api/stock'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { toast } from 'sonner'

const ABC_COLORS = {
    A: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Classe A — Top 80% da Receita' },
    B: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Classe B — 80-95% da Receita' },
    C: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', label: 'Classe C — Cauda Longa' }
}

const AGING_LABELS = {
    fresh: { label: 'Novo', color: 'bg-emerald-500', desc: '< 30 dias' },
    normal: { label: 'Normal', color: 'bg-blue-500', desc: '30-60 dias' },
    watch: { label: 'Atenção', color: 'bg-amber-500', desc: '60-90 dias' },
    aging: { label: 'Envelhecendo', color: 'bg-orange-500', desc: '90-180 dias' },
    critical: { label: 'Crítico', color: 'bg-red-500', desc: '> 180 dias' }
}

function ABCBar({ abc }) {
    if (!abc) return null
    const total = abc.a.count + abc.b.count + abc.c.count
    if (total === 0) return null

    const aPct = (abc.a.count / total) * 100
    const bPct = (abc.b.count / total) * 100
    const cPct = (abc.c.count / total) * 100

    return (
        <div className="space-y-3">
            {/* Stacked Bar  */}
            <div className="flex rounded-xl overflow-hidden h-8 shadow-inner bg-gray-100">
                {aPct > 0 && <div style={{ width: `${aPct}%` }} className="bg-emerald-500 flex items-center justify-center"><span className="text-[10px] font-bold text-white">{abc.a.count} A</span></div>}
                {bPct > 0 && <div style={{ width: `${bPct}%` }} className="bg-blue-500 flex items-center justify-center"><span className="text-[10px] font-bold text-white">{abc.b.count} B</span></div>}
                {cPct > 0 && <div style={{ width: `${cPct}%` }} className="bg-gray-400 flex items-center justify-center"><span className="text-[10px] font-bold text-white">{abc.c.count} C</span></div>}
            </div>
            {/* Legend Cards */}
            <div className="grid grid-cols-3 gap-2">
                {['a', 'b', 'c'].map(cls => {
                    const d = abc[cls]
                    const c = ABC_COLORS[cls.toUpperCase()]
                    const money = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                    return (
                        <div key={cls} className={cn("rounded-lg p-3 border", c.bg, c.border)}>
                            <div className={cn("text-lg font-bold", c.text)}>{d.count}</div>
                            <div className="text-[10px] text-gray-600 font-medium">{c.label.split('—')[0].trim()}</div>
                            <div className="text-[10px] text-gray-500 mt-1">Receita: {money(d.revenue)}</div>
                            <div className="text-[10px] text-gray-500">Custo em estoque: {money(d.stockCost)}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function AgingDistribution({ aging }) {
    if (!aging) return null
    const entries = Object.entries(aging).filter(([, v]) => v > 0)
    const total = entries.reduce((s, [, v]) => s + v, 0)
    if (total === 0) return <p className="text-xs text-gray-400 text-center py-4">Sem dados de aging</p>

    return (
        <div className="space-y-2">
            {Object.entries(AGING_LABELS).map(([key, cfg]) => {
                const count = aging[key] || 0
                const pct = total > 0 ? (count / total) * 100 : 0
                return (
                    <div key={key} className="flex items-center gap-3">
                        <span className="text-[10px] font-medium text-gray-500 w-20 text-right">{cfg.desc}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", cfg.color)} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-12 text-right">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                )
            })}
        </div>
    )
}

export function StockAnalysisTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [abcFilter, setAbcFilter] = useState(null)
    const [sortBy, setSortBy] = useState('revenue90d')
    const [sortDir, setSortDir] = useState('desc')

    useEffect(() => { loadAnalysis() }, [])

    const loadAnalysis = async () => {
        setLoading(true)
        try {
            const result = await getInventoryAnalysis({})
            setData(result)
        } catch (error) {
            toast.error('Erro ao carregar análise de inventário')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
    if (!data) return null

    const money = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`

    let products = [...(data.products || [])]
    if (abcFilter) products = products.filter(p => p.abcClass === abcFilter)

    // Sort
    products.sort((a, b) => {
        const av = a[sortBy] || 0
        const bv = b[sortBy] || 0
        return sortDir === 'desc' ? bv - av : av - bv
    })

    const toggleSort = (field) => {
        if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        else { setSortBy(field); setSortDir('desc') }
    }

    const SortHeader = ({ field, children, className }) => (
        <th onClick={() => toggleSort(field)} className={cn("cursor-pointer select-none hover:text-[#C75D3B] transition-colors", className)}>
            <span className="flex items-center gap-1 justify-center">
                {children}
                {sortBy === field && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
            </span>
        </th>
    )

    return (
        <div className="space-y-6">
            {/* TOP ROW: ABC + Aging + Category */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* ABC Distribution */}
                <Card className="border shadow-sm lg:col-span-2">
                    <CardHeader className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <CardTitle className="text-sm font-bold text-[#4A3B32] flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-[#C75D3B]" />
                            Classificação ABC (Pareto)
                            <TooltipProvider><Tooltip delayDuration={0}><TooltipTrigger><HelpCircle className="w-3 h-3 opacity-40 hover:opacity-100 text-gray-400" /></TooltipTrigger><TooltipContent className="max-w-xs bg-[#2A211C] text-white p-2 text-xs">Classe A: ~20% dos produtos que geram 80% da receita. Classe B: próximos 30% que geram 15%. Classe C: os 50% restantes que geram apenas 5%. Foque em NUNCA deixar faltar os A.</TooltipContent></Tooltip></TooltipProvider>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <ABCBar abc={data.summary?.abc} />
                    </CardContent>
                </Card>

                {/* Aging Analysis */}
                <Card className="border shadow-sm">
                    <CardHeader className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <CardTitle className="text-sm font-bold text-[#4A3B32] flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#C75D3B]" />
                            Envelhecimento do Estoque
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <AgingDistribution aging={data.summary?.agingDistribution} />
                    </CardContent>
                </Card>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border shadow-sm bg-white">
                    <CardContent className="p-3 text-center">
                        <div className="text-xl font-bold text-[#4A3B32]">{money(data.summary?.totalStockCost)}</div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Capital Imobilizado</p>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm bg-white">
                    <CardContent className="p-3 text-center">
                        <div className="text-xl font-bold text-[#4A3B32]">{money(data.summary?.totalRevenue90d)}</div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Receita 90d</p>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm bg-white">
                    <CardContent className="p-3 text-center">
                        <div className="text-xl font-bold text-[#4A3B32]">{data.summary?.avgGmroi}x</div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">GMROI Médio</p>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm bg-white">
                    <CardContent className="p-3 text-center">
                        <div className="text-xl font-bold text-[#4A3B32]">{data.summary?.totalProducts}</div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Produtos Ativos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Category Breakdown */}
            {data.summary?.categoryBreakdown?.length > 0 && (
                <Card className="border shadow-sm">
                    <CardHeader className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <CardTitle className="text-sm font-bold text-[#4A3B32] flex items-center gap-2">
                            <Package className="w-4 h-4 text-[#C75D3B]" />
                            Performance por Categoria
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="text-left px-4 py-2 text-xs text-gray-500 font-bold">Categoria</th>
                                        <th className="text-center px-3 py-2 text-xs text-gray-500 font-bold">Produtos</th>
                                        <th className="text-center px-3 py-2 text-xs text-gray-500 font-bold">Peças</th>
                                        <th className="text-center px-3 py-2 text-xs text-gray-500 font-bold">Receita 90d</th>
                                        <th className="text-center px-3 py-2 text-xs text-gray-500 font-bold hidden sm:table-cell">Custo em Estoque</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.summary.categoryBreakdown.slice(0, 10).map((cat, i) => (
                                        <tr key={i} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-2 font-medium text-[#4A3B32] capitalize">{cat.category}</td>
                                            <td className="text-center px-3 py-2 text-gray-600">{cat.products}</td>
                                            <td className="text-center px-3 py-2 text-gray-600">{cat.stock}</td>
                                            <td className="text-center px-3 py-2 font-bold text-emerald-600">{money(cat.revenue)}</td>
                                            <td className="text-center px-3 py-2 text-gray-500 hidden sm:table-cell">{money(cat.costValue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ABC Filter + Full Product Table */}
            <div className="flex gap-2 items-center">
                <span className="text-sm font-bold text-[#4A3B32]">Filtrar Classe:</span>
                {[null, 'A', 'B', 'C'].map(cls => (
                    <button key={cls || 'all'} onClick={() => setAbcFilter(cls)} className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        abcFilter === cls ? 'bg-[#C75D3B] text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}>
                        {cls || 'Todas'}
                    </button>
                ))}
                <span className="text-xs text-gray-400 ml-auto">{products.length} produtos</span>
            </div>

            <Card className="border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase">Produto</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-500 font-bold uppercase">ABC</th>
                                <SortHeader field="revenue90d" className="text-center px-3 py-3 text-xs text-gray-500 font-bold uppercase">Receita 90d</SortHeader>
                                <SortHeader field="margin" className="text-center px-3 py-3 text-xs text-gray-500 font-bold uppercase hidden sm:table-cell">Margem</SortHeader>
                                <SortHeader field="gmroi" className="text-center px-3 py-3 text-xs text-gray-500 font-bold uppercase hidden md:table-cell">GMROI</SortHeader>
                                <SortHeader field="sellThrough" className="text-center px-3 py-3 text-xs text-gray-500 font-bold uppercase hidden md:table-cell">Giro</SortHeader>
                                <SortHeader field="daysInStock" className="text-center px-3 py-3 text-xs text-gray-500 font-bold uppercase hidden lg:table-cell">Dias Estoque</SortHeader>
                                <th className="text-center px-3 py-3 text-xs text-gray-500 font-bold uppercase">Estoque</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {products.slice(0, 50).map(p => {
                                const abc = ABC_COLORS[p.abcClass]
                                return (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                    <img src={getOptimizedImageUrl(p.images?.[0], 80)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-[#4A3B32] truncate max-w-[150px] md:max-w-[220px]">{p.name}</p>
                                                    <p className="text-[10px] text-gray-400">{p.category}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", abc?.bg, abc?.text)}>{p.abcClass}</span>
                                        </td>
                                        <td className="text-center px-3 py-3 font-bold text-[#4A3B32]">{money(p.revenue90d)}</td>
                                        <td className="text-center px-3 py-3 hidden sm:table-cell">
                                            <span className={cn("text-xs font-bold", p.margin > 50 ? "text-emerald-600" : p.margin > 30 ? "text-blue-600" : "text-red-500")}>{p.margin}%</span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden md:table-cell">
                                            <span className={cn("text-xs font-bold", p.gmroi > 2 ? "text-emerald-600" : p.gmroi > 1 ? "text-blue-600" : "text-red-500")}>{p.gmroi}x</span>
                                        </td>
                                        <td className="text-center px-3 py-3 hidden md:table-cell text-xs font-bold text-gray-600">{p.sellThrough}%</td>
                                        <td className="text-center px-3 py-3 hidden lg:table-cell text-xs text-gray-500">{p.daysInStock}d</td>
                                        <td className="text-center px-3 py-3">
                                            <span className={cn("font-bold text-sm", p.stock === 0 ? "text-red-600" : "text-[#4A3B32]")}>{p.stock}</span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
