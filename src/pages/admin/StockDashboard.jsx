import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Package,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    DollarSign,
    Search,
    Filter,
    BarChart3,
    PieChart,
    Clock,
    Truck,
    AlertCircle,
    CheckCircle2,
    XCircle,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    Eye,
    Clipboard,
    Tag,
    Palette,
    Ruler,
    ShoppingBag,
    Skull,
    Sparkles,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Box,
    Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    getStockReport,
    getStockMetrics,
    getSalesRankingByCategory,
    getDeadStock,
    generateAuditList,
    updateStockStatus
} from '@/lib/api/stock'
import { toast } from 'sonner'

// Status colors
const STATUS_CONFIG = {
    disponivel: { label: 'Disponível', color: 'emerald', icon: CheckCircle2 },
    em_malinha: { label: 'Em Malinha', color: 'blue', icon: Truck },
    vendido: { label: 'Vendido', color: 'violet', icon: ShoppingBag },
    quarentena: { label: 'Quarentena', color: 'amber', icon: AlertCircle }
}

const AGE_CONFIG = {
    novo: { label: 'Novo', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    normal: { label: 'Normal', color: 'gray', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
    alerta: { label: 'Alerta', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    critico: { label: 'Crítico', color: 'red', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
}

export function StockDashboard() {
    const [loading, setLoading] = useState(true)
    const [stockData, setStockData] = useState([])
    const [metrics, setMetrics] = useState(null)
    const [rankings, setRankings] = useState(null)
    const [deadStock, setDeadStock] = useState(null)
    const [auditList, setAuditList] = useState([])

    // Filtros
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [ageFilter, setAgeFilter] = useState('all')

    // Tabs dos painéis
    const [activePanel, setActivePanel] = useState('overview')
    const [rankingTab, setRankingTab] = useState('category')

    // Carregar dados
    useEffect(() => {
        loadAllData()
    }, [])

    const loadAllData = async () => {
        setLoading(true)
        try {
            const [stockReport, stockMetrics, salesRanking, dead] = await Promise.all([
                getStockReport(),
                getStockMetrics(),
                getSalesRankingByCategory(),
                getDeadStock(60)
            ])

            setStockData(stockReport)
            setMetrics(stockMetrics)
            setRankings(salesRanking)
            setDeadStock(dead)
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            toast.error('Erro ao carregar estoque')
        } finally {
            setLoading(false)
        }
    }

    const generateAudit = async () => {
        try {
            const list = await generateAuditList(15)
            setAuditList(list)
            setActivePanel('audit')
            toast.success('Lista de auditoria gerada!')
        } catch (error) {
            toast.error('Erro ao gerar auditoria')
        }
    }

    // Dados filtrados
    const filteredData = useMemo(() => {
        return stockData.filter(item => {
            const matchesSearch = !searchTerm ||
                item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category?.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesStatus = statusFilter === 'all' || item.stockStatus === statusFilter
            const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
            const matchesAge = ageFilter === 'all' || item.ageStatus === ageFilter

            return matchesSearch && matchesStatus && matchesCategory && matchesAge
        })
    }, [stockData, searchTerm, statusFilter, categoryFilter, ageFilter])

    // Categorias únicas
    const categories = useMemo(() => {
        return [...new Set(stockData.map(p => p.category).filter(Boolean))]
    }, [stockData])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-[#C75D3B] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[#4A3B32]/60 font-medium">Carregando estoque...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#FDFBF7] to-[#F5F0EB] pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#4A3B32]/5">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-bold text-[#4A3B32]">Estoque Inteligente</h1>
                            <p className="text-xs text-[#4A3B32]/50">Gestão e BI de produtos</p>
                        </div>
                        <button
                            onClick={loadAllData}
                            className="p-2 rounded-xl bg-[#4A3B32]/5 hover:bg-[#4A3B32]/10 transition-colors"
                        >
                            <RefreshCw className="w-5 h-5 text-[#4A3B32]" />
                        </button>
                    </div>

                    {/* Cards de Métricas */}
                    {metrics && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <MetricCard
                                icon={DollarSign}
                                label="Valor em Estoque"
                                value={`R$ ${(metrics.totalCostValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                                sublabel={`${metrics.totalPieces} peças`}
                                color="emerald"
                            />
                            <MetricCard
                                icon={Truck}
                                label="Em Malinha"
                                value={metrics.inMalinha}
                                sublabel="peças na rua"
                                color="blue"
                            />
                            <MetricCard
                                icon={AlertTriangle}
                                label="Críticos (+90d)"
                                value={metrics.criticalAge}
                                sublabel="precisam atenção"
                                color="red"
                            />
                            <MetricCard
                                icon={Eye}
                                label="Analisar"
                                value={metrics.needsReview}
                                sublabel="+5 viagens"
                                color="amber"
                            />
                        </div>
                    )}
                </div>

                {/* Tabs de navegação */}
                <div className="px-4 flex gap-1 overflow-x-auto pb-2">
                    {[
                        { id: 'overview', label: 'Visão Geral', icon: Layers },
                        { id: 'ranking', label: 'Rankings', icon: BarChart3 },
                        { id: 'cemetery', label: 'Cemitério', icon: Skull },
                        { id: 'audit', label: 'Auditoria', icon: Clipboard },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActivePanel(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                                activePanel === tab.id
                                    ? "bg-[#C75D3B] text-white"
                                    : "bg-[#4A3B32]/5 text-[#4A3B32] hover:bg-[#4A3B32]/10"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="px-4 py-4">
                <AnimatePresence mode="wait">
                    {/* PAINEL: VISÃO GERAL */}
                    {activePanel === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            {/* Filtros */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#4A3B32]/5">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3B32]/30" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Buscar por nome, marca, SKU..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-[#4A3B32]/5 rounded-xl text-sm"
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto">
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="px-3 py-2.5 bg-[#4A3B32]/5 rounded-xl text-sm font-medium min-w-[120px]"
                                        >
                                            <option value="all">Status</option>
                                            <option value="disponivel">Disponível</option>
                                            <option value="em_malinha">Em Malinha</option>
                                            <option value="vendido">Vendido</option>
                                            <option value="quarentena">Quarentena</option>
                                        </select>
                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                            className="px-3 py-2.5 bg-[#4A3B32]/5 rounded-xl text-sm font-medium min-w-[120px]"
                                        >
                                            <option value="all">Categoria</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={ageFilter}
                                            onChange={(e) => setAgeFilter(e.target.value)}
                                            className="px-3 py-2.5 bg-[#4A3B32]/5 rounded-xl text-sm font-medium min-w-[100px]"
                                        >
                                            <option value="all">Idade</option>
                                            <option value="novo">Novo (&lt;30d)</option>
                                            <option value="normal">Normal</option>
                                            <option value="alerta">Alerta (60d+)</option>
                                            <option value="critico">Crítico (90d+)</option>
                                        </select>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-[#4A3B32]/50">
                                    {filteredData.length} de {stockData.length} produtos
                                </p>
                            </div>

                            {/* Tabela de Estoque */}
                            <div className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[#4A3B32]/5">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-[#4A3B32]/70 uppercase tracking-wider">Produto</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-[#4A3B32]/70 uppercase tracking-wider hidden sm:table-cell">Categoria</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-[#4A3B32]/70 uppercase tracking-wider">Custo</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-[#4A3B32]/70 uppercase tracking-wider">Preço</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-[#4A3B32]/70 uppercase tracking-wider hidden md:table-cell">Margem</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-[#4A3B32]/70 uppercase tracking-wider">Dias</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-[#4A3B32]/70 uppercase tracking-wider hidden sm:table-cell">Viagens</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-[#4A3B32]/70 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#4A3B32]/5">
                                            {filteredData.slice(0, 50).map((item) => {
                                                const ageConfig = AGE_CONFIG[item.ageStatus] || AGE_CONFIG.normal
                                                const statusConfig = STATUS_CONFIG[item.stockStatus] || STATUS_CONFIG.disponivel
                                                const StatusIcon = statusConfig.icon

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className={cn(
                                                            "hover:bg-[#4A3B32]/[0.02] transition-colors",
                                                            item.ageStatus === 'critico' && "bg-red-50/50",
                                                            item.needsReview && "bg-amber-50/50"
                                                        )}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-[#4A3B32]/5 overflow-hidden flex-shrink-0">
                                                                    {item.images?.[0] ? (
                                                                        <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <Package className="w-4 h-4 text-[#4A3B32]/20" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium text-[#4A3B32] truncate">{item.name}</p>
                                                                    <p className="text-xs text-[#4A3B32]/50">{item.brand || 'Sem marca'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 hidden sm:table-cell">
                                                            <span className="text-xs px-2 py-1 bg-[#4A3B32]/5 rounded-lg text-[#4A3B32]">
                                                                {item.category || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="text-sm text-[#4A3B32]">
                                                                R$ {(item.costPrice || 0).toFixed(0)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="text-sm font-medium text-[#4A3B32]">
                                                                R$ {(item.price || 0).toFixed(0)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right hidden md:table-cell">
                                                            <span className={cn(
                                                                "text-sm font-bold",
                                                                item.marginPercent >= 50 ? "text-emerald-600" :
                                                                item.marginPercent >= 30 ? "text-amber-600" : "text-red-600"
                                                            )}>
                                                                {item.marginPercent}%
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={cn(
                                                                "text-xs font-bold px-2 py-1 rounded-lg",
                                                                ageConfig.bg, ageConfig.text
                                                            )}>
                                                                {item.daysInStock}d
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                            <span className={cn(
                                                                "text-xs font-bold",
                                                                item.tripCount > 5 ? "text-red-500" :
                                                                item.tripCount > 3 ? "text-amber-500" : "text-[#4A3B32]/50"
                                                            )}>
                                                                {item.tripCount || 0}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
                                                                `bg-${statusConfig.color}-50 text-${statusConfig.color}-700`
                                                            )}>
                                                                <StatusIcon className="w-3 h-3" />
                                                                <span className="hidden sm:inline">{statusConfig.label}</span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredData.length > 50 && (
                                    <div className="p-4 text-center border-t border-[#4A3B32]/5">
                                        <p className="text-sm text-[#4A3B32]/50">
                                            Mostrando 50 de {filteredData.length} produtos
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* PAINEL: RANKINGS */}
                    {activePanel === 'ranking' && rankings && (
                        <motion.div
                            key="ranking"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            {/* Tabs de ranking */}
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {[
                                    { id: 'category', label: 'Categoria', icon: Tag },
                                    { id: 'color', label: 'Cor', icon: Palette },
                                    { id: 'size', label: 'Tamanho', icon: Ruler },
                                    { id: 'product', label: 'Produtos', icon: Package },
                                    { id: 'profit', label: 'Lucro', icon: DollarSign },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setRankingTab(tab.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                                            rankingTab === tab.id
                                                ? "bg-[#4A3B32] text-white"
                                                : "bg-white text-[#4A3B32] border border-[#4A3B32]/10"
                                        )}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Ranking por Volume */}
                            <div className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 overflow-hidden">
                                <div className="p-4 border-b border-[#4A3B32]/5">
                                    <h3 className="font-bold text-[#4A3B32] flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                                        {rankingTab === 'profit' ? 'O Que Dá Mais Lucro' : 'O Que Mais Vende'}
                                    </h3>
                                    <p className="text-xs text-[#4A3B32]/50 mt-1">
                                        {rankingTab === 'profit'
                                            ? 'Ranking por margem de contribuição total'
                                            : 'Ranking por quantidade vendida'
                                        }
                                    </p>
                                </div>

                                <div className="divide-y divide-[#4A3B32]/5">
                                    {(rankingTab === 'category' ? rankings.byCategory :
                                      rankingTab === 'color' ? rankings.byColor :
                                      rankingTab === 'size' ? rankings.bySize :
                                      rankingTab === 'product' ? rankings.byProduct :
                                      rankings.byProfit
                                    ).slice(0, 10).map((item, index) => (
                                        <div key={item.name || index} className="p-4 flex items-center gap-4">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                                index === 0 ? "bg-amber-400 text-white" :
                                                index === 1 ? "bg-gray-300 text-white" :
                                                index === 2 ? "bg-amber-600 text-white" :
                                                "bg-[#4A3B32]/10 text-[#4A3B32]"
                                            )}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-[#4A3B32] truncate">{item.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-[#4A3B32]/50">
                                                        {item.qty} vendidos
                                                    </span>
                                                    <span className="text-xs text-emerald-600 font-medium">
                                                        R$ {item.revenue?.toFixed(0)} faturado
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-[#C75D3B]">
                                                    R$ {item.margin?.toFixed(0)}
                                                </p>
                                                <p className="text-xs text-[#4A3B32]/50">lucro</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* PAINEL: CEMITÉRIO */}
                    {activePanel === 'cemetery' && deadStock && (
                        <motion.div
                            key="cemetery"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            {/* Alerta de valor parado */}
                            <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-4 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Skull className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-white/80">Valor estagnado (+60 dias)</p>
                                        <p className="text-2xl font-bold">
                                            R$ {deadStock.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sm text-white/70">
                                    {deadStock.count} produtos parados que precisam de ação
                                </p>
                            </div>

                            {/* Lista de produtos parados */}
                            <div className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 overflow-hidden">
                                <div className="p-4 border-b border-[#4A3B32]/5 flex items-center justify-between">
                                    <h3 className="font-bold text-[#4A3B32]">Produtos Parados</h3>
                                    <button className="px-3 py-1.5 bg-[#C75D3B] text-white text-xs font-medium rounded-lg">
                                        Gerar Promoção
                                    </button>
                                </div>

                                <div className="divide-y divide-[#4A3B32]/5">
                                    {deadStock.products.slice(0, 20).map((item) => (
                                        <div key={item.id} className="p-4 flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-[#4A3B32]/5 overflow-hidden flex-shrink-0">
                                                {item.images?.[0] ? (
                                                    <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package className="w-5 h-5 text-[#4A3B32]/20" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#4A3B32] truncate">{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-[#4A3B32]/50">{item.category}</span>
                                                    <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">
                                                        {item.daysInStock} dias
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-[#4A3B32]">
                                                    R$ {(item.costPrice || 0).toFixed(0)}
                                                </p>
                                                <p className="text-xs text-[#4A3B32]/50">custo</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* PAINEL: AUDITORIA */}
                    {activePanel === 'audit' && (
                        <motion.div
                            key="audit"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            {/* Info */}
                            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                                <div className="flex items-start gap-3">
                                    <Clipboard className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-blue-900">Contagem Cíclica</h3>
                                        <p className="text-sm text-blue-700 mt-1">
                                            Confira se o estoque físico bate com o sistema. Gere uma lista aleatória para verificação semanal.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={generateAudit}
                                className="w-full py-3 bg-[#C75D3B] text-white rounded-xl font-bold"
                            >
                                Gerar Nova Lista de Auditoria
                            </button>

                            {auditList.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 overflow-hidden">
                                    <div className="p-4 border-b border-[#4A3B32]/5">
                                        <h3 className="font-bold text-[#4A3B32]">Lista para Conferência</h3>
                                        <p className="text-xs text-[#4A3B32]/50">{auditList.length} itens selecionados</p>
                                    </div>

                                    <div className="divide-y divide-[#4A3B32]/5">
                                        {auditList.map((item, index) => (
                                            <div key={item.id} className="p-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#4A3B32]/10 flex items-center justify-center text-sm font-bold text-[#4A3B32]">
                                                    {index + 1}
                                                </div>
                                                <div className="w-10 h-10 rounded-lg bg-[#4A3B32]/5 overflow-hidden flex-shrink-0">
                                                    {item.images?.[0] ? (
                                                        <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="w-4 h-4 text-[#4A3B32]/20" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#4A3B32] truncate">{item.name}</p>
                                                    <p className="text-xs text-[#4A3B32]/50">{item.category}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-[#C75D3B]">{item.stock || 0}</p>
                                                    <p className="text-xs text-[#4A3B32]/50">sistema</p>
                                                </div>
                                                <input
                                                    type="number"
                                                    placeholder="Real"
                                                    className="w-16 px-2 py-1.5 text-center bg-[#4A3B32]/5 rounded-lg text-sm font-bold"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    )
}

// Componente de Card de Métrica
function MetricCard({ icon: Icon, label, value, sublabel, color }) {
    const colorClasses = {
        emerald: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-blue-50 text-blue-600',
        red: 'bg-red-50 text-red-600',
        amber: 'bg-amber-50 text-amber-600',
        violet: 'bg-violet-50 text-violet-600'
    }

    return (
        <div className="bg-white rounded-xl p-3 shadow-sm border border-[#4A3B32]/5">
            <div className="flex items-start justify-between">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colorClasses[color])}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <p className="mt-2 text-lg font-bold text-[#4A3B32]">{value}</p>
            <p className="text-[10px] text-[#4A3B32]/50 uppercase tracking-wide">{label}</p>
            {sublabel && <p className="text-xs text-[#4A3B32]/40">{sublabel}</p>}
        </div>
    )
}

export default StockDashboard
