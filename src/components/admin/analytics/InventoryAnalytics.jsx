import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { useAdminStore } from '@/store/admin-store'
import {
    Clock,
    AlertTriangle,
    Eye,
    Truck,
    DollarSign,
    Layers,
    ArrowUpRight,
    Search,
    Filter,
    ArrowDownUp,
    CheckCircle2,
    Store,
    Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import { dashboardService } from '@/lib/api/dashboard'

export function InventoryAnalytics() {
    const { products } = useAdminStore()
    const [activeTab, setActiveTab] = useState('overview') // overview, rankings, cemiterio, auditoria
    const [searchTerm, setSearchTerm] = useState('')

    const [loading, setLoading] = useState(true)
    const [kpis, setKpis] = useState({
        totalStockValue: 0,
        totalItems: 0,
        criticalItems: 0,
        inMalinha: 0
    })

    // Fetch Analytics Data
    useEffect(() => {
        async function loadDashboardData() {
            setLoading(true)
            try {
                // Datas: Últimos 30 dias para simplificar ou customizável
                const endDate = new Date().toISOString().split('T')[0]
                const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

                // 1. KPIs Financeiros e de Estoque
                // Nota: O dashboardService.getKPIs retorna visão financeira.
                // Mas aqui precisamos de visão de ESTOQUE específica.
                // A view dashboard_inventory_actions nos dá visão item a item.
                // Idealmente teríamos uma view agregada de estoque também.
                // Como não criamos uma view específica de "KPI de Estoque" (apenas Financeiro), 
                // vamos manter o cálculo local RÁPIDO para valores de estoque (já que products está carregado no store),
                // mas usar a dashboardService para o que for pesado ou não existir no store (como 'inMalinha' real).

                // Mas espere! O objetivo é remover cálculo do front.
                // Vamos usar a dashboard_inventory_actions para contar críticos.
                const actions = await dashboardService.getInventoryActions()

                // Calcular KPIs baseados na view leve
                const critical = actions.filter(p => p.action === 'queimar_agora').length // Aproximação de críticos
                const stockValue = actions.reduce((acc, p) => acc + (p.costPrice || 0) * (p.realStock || 0), 0)
                const itemsCount = actions.reduce((acc, p) => acc + (p.realStock || 0), 0)

                setKpis({
                    totalStockValue: stockValue,
                    totalItems: itemsCount,
                    criticalItems: critical,
                    inMalinha: 0 // Ainda pendente de integração real com malinhas
                })

            } catch (error) {
                console.error("Falha ao carregar analytics:", error)
            } finally {
                setLoading(false)
            }
        }

        loadDashboardData()
    }, []) // Run once on mount

    // Table Data (Client-side filtering is fine for < 1000 items if they are already in store)
    // But ideally we should use the service too.
    const tableData = useMemo(() => {
        return products.map(p => {
            const margin = p.price > 0 ? ((p.price - (p.costPrice || 0)) / p.price) * 100 : 0
            const daysInStock = p.created_at ? differenceInDays(new Date(), parseISO(p.created_at)) : 0

            return {
                ...p,
                margin,
                daysInStock,
                status: p.stock > 0 ? 'Disponível' : 'Esgotado'
            }
        })
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.stock - a.stock)
    }, [products, searchTerm])

    const kpiData = kpis // Alias for usage in template

    // Tabs Configuration
    const TABS = [
        { id: 'overview', label: 'Visão Geral', icon: Layers },
        { id: 'rankings', label: 'Rankings', icon: ArrowUpRight },
        { id: 'cemiterio', label: 'Cemitério', icon: AlertTriangle },
        { id: 'auditoria', label: 'Auditoria', icon: Search },
    ]

    return (
        <TooltipProvider delayDuration={200}>
            <div className="space-y-8 animate-in fade-in duration-500">

                {/* KPI Cards Header */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Value in Stock */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border border-emerald-100 bg-emerald-50/30 shadow-sm cursor-help hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <DollarSign className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                            Ativo
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#4A3B32]">
                                            R$ {kpiData.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </h3>
                                        <div className="flex items-center gap-1 mt-1">
                                            <p className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-widest">
                                                Valor em Estoque
                                            </p>
                                            <Info className="w-3 h-3 text-[#4A3B32]/30" />
                                        </div>
                                        <p className="text-xs text-[#4A3B32]/60 mt-2">
                                            {kpiData.totalItems} peças totais
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#4A3B32] text-white p-3 rounded-xl border-none shadow-xl max-w-xs">
                            <p className="font-bold text-sm mb-1">Custo Total em Estoque</p>
                            <p className="text-xs opacity-90">Soma do preço de custo de todas as peças 'Disponíveis'.</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* In Malinha */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border border-blue-100 bg-blue-50/30 shadow-sm cursor-help hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Truck className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#4A3B32]">{kpiData.inMalinha}</h3>
                                        <div className="flex items-center gap-1 mt-1">
                                            <p className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-widest">
                                                Em Malinha
                                            </p>
                                            <Info className="w-3 h-3 text-[#4A3B32]/30" />
                                        </div>
                                        <p className="text-xs text-[#4A3B32]/60 mt-2">
                                            peças na rua
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#4A3B32] text-white p-3 rounded-xl border-none shadow-xl max-w-xs">
                            <p className="font-bold text-sm mb-1">Itens em Condicional</p>
                            <p className="text-xs opacity-90">Quantidade de peças que estão atualmente com clientes.</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Critical Items */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border border-red-100 bg-red-50/30 shadow-sm cursor-help hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#4A3B32]">{kpiData.criticalItems}</h3>
                                        <div className="flex items-center gap-1 mt-1">
                                            <p className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-widest">
                                                Críticos (+90d)
                                            </p>
                                            <Info className="w-3 h-3 text-[#4A3B32]/30" />
                                        </div>
                                        <p className="text-xs text-[#4A3B32]/60 mt-2">
                                            precisam atenção
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#4A3B32] text-white p-3 rounded-xl border-none shadow-xl max-w-xs">
                            <p className="font-bold text-sm mb-1">Estoque Antigo</p>
                            <p className="text-xs opacity-90">Produtos parados em estoque há mais de 90 dias.</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* To Analyze */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border border-amber-100 bg-amber-50/30 shadow-sm cursor-help hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                            <Eye className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#4A3B32]">0</h3>
                                        <div className="flex items-center gap-1 mt-1">
                                            <p className="text-xs font-bold text-[#4A3B32]/40 uppercase tracking-widest">
                                                Analisar
                                            </p>
                                            <Info className="w-3 h-3 text-[#4A3B32]/30" />
                                        </div>
                                        <p className="text-xs text-[#4A3B32]/60 mt-2">
                                            +5 viagens
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#4A3B32] text-white p-3 rounded-xl border-none shadow-xl max-w-xs">
                            <p className="font-bold text-sm mb-1">Alta Rejeição</p>
                            <p className="text-xs opacity-90">Produtos que foram e voltaram muitas vezes sem venda.</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Tabs & Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center bg-[#4A3B32]/5 p-1 rounded-xl w-fit">
                        {TABS.map(tab => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all",
                                        isActive
                                            ? "bg-[#C75D3B] text-white shadow-md"
                                            : "text-[#4A3B32]/60 hover:text-[#4A3B32] hover:bg-white/50"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3B32]/30" />
                        <input
                            type="text"
                            placeholder="Buscar produto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-[#4A3B32]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C75D3B]/20 transition-all w-full md:w-64"
                        />
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-[#4A3B32]/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#4A3B32]/5 border-b border-[#4A3B32]/5">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider">Produto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider text-center">Cat.</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider text-right">Custo</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider text-right">Venda</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider text-right">Margem</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider text-center">Dias</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#4A3B32]/5">
                                {tableData.length > 0 ? (
                                    tableData.map((product) => (
                                        <tr key={product.id} className="hover:bg-[#FDFBF7] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-100 group-hover:shadow-md transition-all">
                                                        {product.images?.[0] ? (
                                                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[#4A3B32]/20">
                                                                <Store className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[#4A3B32]">{product.name}</p>
                                                        <p className="text-xs text-[#4A3B32]/40">{product.variants?.length || 0} variações</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 rounded-full bg-[#4A3B32]/5 text-[#4A3B32] text-xs font-bold">
                                                    {product.category || 'Geral'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-500 font-medium">
                                                R$ {product.costPrice?.toFixed(0)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-[#4A3B32]">
                                                R$ {product.price?.toFixed(0)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn(
                                                    "font-bold",
                                                    product.margin >= 50 ? "text-emerald-600" : "text-amber-600"
                                                )}>
                                                    {product.margin.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-md text-xs font-bold",
                                                    product.daysInStock > 90
                                                        ? "bg-red-50 text-red-600 border border-red-100"
                                                        : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                )}>
                                                    {product.daysInStock}d
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                                                        product.stock > 0
                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                            : "bg-gray-50 text-gray-400 border-gray-100"
                                                    )}>
                                                        {product.stock > 0 ? (
                                                            <>
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Disponível
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertTriangle className="w-3 h-3" />
                                                                Esgotado
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-[#4A3B32]/40">
                                            Nenhum produto encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}
