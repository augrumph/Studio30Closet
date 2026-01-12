import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Activity,
    AlertTriangle,
    DollarSign,
    Package,
    ArrowRight,
    Search,
    RefreshCw,
    TrendingUp,
    Skull,
    ShoppingBag,
    Truck,
    CheckCircle2,
    Clock,
    Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    getStockHeadlineKPIs,
    getLowStockAlerts,
    getDeadStockSummary,
    getSalesRankingByCategory
} from '@/lib/api/stock'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StockDashboardSkeleton } from '@/components/admin/PageSkeleton'

export function StockDashboard() {
    const [loading, setLoading] = useState(true)
    const [kpis, setKpis] = useState(null)
    const [lowStock, setLowStock] = useState([])
    const [deadStock, setDeadStock] = useState(null)
    const [topSellers, setTopSellers] = useState(null)
    const [tab, setTab] = useState('alerts') // 'alerts' | 'deadstock' | 'ranking'

    useEffect(() => {
        loadDashboard()
    }, [])

    const loadDashboard = async () => {
        setLoading(true)
        try {
            // Carregar tudo em paralelo, mas são queries muito mais leves agora
            const [kpiData, alertsData, deadData, rankData] = await Promise.all([
                getStockHeadlineKPIs(),
                getLowStockAlerts(10),
                getDeadStockSummary(),
                getSalesRankingByCategory() // Mantemos o ranking pois o usuário gosta, mas pode ser otimizado
            ])

            setKpis(kpiData)
            setLowStock(alertsData)
            setDeadStock(deadData)
            setTopSellers(rankData)
        } catch (error) {
            console.error('Erro ao carregar dashboard de estoque:', error)
            toast.error('Erro ao atualizar informações')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <StockDashboardSkeleton />
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header: KPIs Financeiros de Estoque (Decision Center) */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                {/* KPI 1: Valor em Estoque (Asset) */}
                <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <DollarSign className="w-24 h-24 text-emerald-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Valor em Estoque</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-display font-bold text-[#4A3B32]">
                            R$ {kpis?.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                {kpis?.productsCount} produtos
                            </span>
                            <span className="text-xs text-gray-400">
                                {kpis?.totalItems} peças totais
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* KPI 2: Custo Imobilizado (Liability/Risk) */}
                <Card className="border-amber-100 bg-gradient-to-br from-white to-amber-50/30 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Package className="w-24 h-24 text-amber-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Activity className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Custo Imobilizado</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-display font-bold text-[#4A3B32]">
                            R$ {kpis?.totalCost?.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-xs text-amber-700 mt-2 font-medium">
                            Valor de compra dos produtos atuais
                        </p>
                    </CardContent>
                </Card>

                {/* KPI 3: Giro / Oportunidade (Velocity) */}
                <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/30 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <TrendingUp className="w-24 h-24 text-blue-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">Performance</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-display font-bold text-[#4A3B32]">
                            {topSellers?.byProfit?.[0]?.margin?.toFixed(0)}%
                        </div>
                        <p className="text-xs text-blue-700 mt-2 font-medium">
                            Margem do Top 1: {topSellers?.byProfit?.[0]?.name}
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Painel de Ações: O que fazer agora? */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Bloco 1: REPOSIÇÃO (O que comprar) */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-[#4A3B32] flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Atenção: Reposição
                        </h3>
                        <Link to="/admin/products?filter=lowStock" className="text-xs font-bold text-[#C75D3B] hover:underline flex items-center gap-1">
                            Ver todos <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                        {lowStock.length === 0 ? (
                            <div className="p-8 text-center bg-gray-50">
                                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Estoque saudável!</p>
                                <p className="text-xs text-gray-400">Nenhum produto com estoque crítico.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {lowStock.map((item, i) => (
                                    <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-red-50/30 transition-colors">
                                        <div className="font-mono text-xs text-gray-300 w-6">#{i + 1}</div>
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            <img src={item.images?.[0] || '/placeholder.png'} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-[#4A3B32] truncate">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.suppliers?.name || 'Sem fornecedor'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn(
                                                "px-2 py-1 rounded-lg text-xs font-bold",
                                                item.stock === 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                                            )}>
                                                {item.stock} un
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="p-3 bg-red-50 border-t border-red-100 text-center">
                            <p className="text-xs text-red-600 font-medium">
                                {kpis?.lowStockCount} produtos abaixo do nível mínimo.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Bloco 2: LIQUIDAÇÃO (O que vender logo) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-[#4A3B32] flex items-center gap-2">
                            <Skull className="w-5 h-5 text-gray-500" />
                            Cemitério (Estoque Parado)
                        </h3>
                        {/* Botão de ação fictício para exemplo */}
                        <button className="text-xs font-bold text-gray-400 hover:text-[#4A3B32] transition-colors">
                            Gerar Promoção
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {deadStock?.items?.length === 0 ? (
                            <div className="p-8 text-center bg-gray-50">
                                <TrendingUp className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Giro excelente!</p>
                                <p className="text-xs text-gray-400">Nenhum produto parado há +90 dias.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {deadStock?.items?.map((item, i) => (
                                    <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors opacity-75 hover:opacity-100">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 grayscale">
                                            <img src={item.images?.[0] || '/placeholder.png'} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-[#4A3B32] truncate">{item.name}</p>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-gray-400">Custo: R$ {item.costPrice}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                <span className="text-red-400 font-medium flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    +90d
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-gray-600">
                                                {item.stock} un
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center text-xs px-4">
                            <span className="text-gray-500">Parado em estoque:</span>
                            <span className="font-bold text-[#4A3B32] text-sm">
                                R$ {deadStock?.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bloco 3: OPORTUNIDADES (Rankings de Venda) - Opcional, mantido pois é útil */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-4 border-t border-[#4A3B32]/10"
            >
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-[#4A3B32]">O Que Está Vendendo Bem?</h3>
                    <p className="text-sm text-gray-400">Top produtos para não deixar faltar.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Top 3 Categorias */}
                    <div className="bg-white p-5 rounded-2xl border border-[#4A3B32]/5 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Por Categoria</h4>
                        <div className="space-y-4">
                            {topSellers?.byCategory?.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                            i === 0 ? "bg-amber-100 text-amber-700" :
                                                i === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"
                                        )}>{i + 1}</div>
                                        <span className="text-sm font-bold text-[#4A3B32]">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-medium text-gray-400">{item.qty} un</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top 3 Cores */}
                    <div className="bg-white p-5 rounded-2xl border border-[#4A3B32]/5 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Por Cor</h4>
                        <div className="space-y-4">
                            {topSellers?.byColor?.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: item.name === 'Padrão' ? '#fff' : 'gray' }} />
                                        <span className="text-sm font-bold text-[#4A3B32]">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-medium text-gray-400">{item.qty} un</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top 3 Lucrativos */}
                    <div className="bg-white p-5 rounded-2xl border border-[#4A3B32]/5 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Mais Lucrativos</h4>
                        <div className="space-y-4">
                            {topSellers?.byProfit?.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-sm font-bold text-[#4A3B32] truncate">{item.name}</p>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                        R$ {item.margin?.toFixed(0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default StockDashboard
