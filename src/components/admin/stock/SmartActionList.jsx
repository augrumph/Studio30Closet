
import { ArrowRight, AlertTriangle, TrendingDown, TrendingUp, CheckCircle, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export function SmartActionList({ actions, loading }) {
    if (loading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />

    const { reorder, liquidate, top } = actions || { reorder: [], liquidate: [], top: [] }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 1. REORDER NOW (Ruptura Iminente) */}
            <Card className="border-l-4 border-l-amber-500 shadow-sm overflow-hidden">
                <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-[#4A3B32] flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            Reposição Urgente
                        </h3>
                        <p className="text-xs text-amber-700 mt-1">Alta venda + Baixo estoque</p>
                    </div>
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                        {reorder.length} itens
                    </span>
                </div>
                <CardContent className="p-0">
                    {reorder.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            Nenhum risco de ruptura detectado.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {reorder.map((item, i) => (
                                <div key={i} className="p-3 hover:bg-amber-50/30 transition-colors flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={item.images?.[0]} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#4A3B32] truncate">{item.name}</p>
                                        <p className="text-xs text-gray-500">
                                            Sobra: <span className="text-red-500 font-bold">{item.stats.weeksOfSupply.toFixed(1)} semanas</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold bg-white border border-gray-200 px-2 py-1 rounded">
                                            {item.stock} un
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                        <Link to="/admin/purchases/new" className="text-xs font-bold text-amber-600 hover:text-amber-700 uppercase tracking-widest flex items-center justify-center gap-2">
                            Gerar Pedido <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* 2. LIQUIDATE (Encalhe) */}
            <Card className="border-l-4 border-l-red-500 shadow-sm overflow-hidden">
                <div className="p-4 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-[#4A3B32] flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            Liquidar (Encalhe)
                        </h3>
                        <p className="text-xs text-red-700 mt-1">Sem venda + Estoque alto</p>
                    </div>
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                        {liquidate.length} itens
                    </span>
                </div>
                <CardContent className="p-0">
                    {liquidate.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            Estoque girando bem! Nenhuma liquidação sugerida.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {liquidate.map((item, i) => (
                                <div key={i} className="p-3 hover:bg-red-50/30 transition-colors flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 grayscale">
                                        <img src={item.images?.[0]} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#4A3B32] truncate">{item.name}</p>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">-{item.daysInStock} dias</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-400 line-through">R$ {item.price}</p>
                                        <p className="text-xs font-bold text-red-600">R$ {(item.costPrice * 1.2).toFixed(0)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                        <button className="text-xs font-bold text-red-600 hover:text-red-700 uppercase tracking-widest flex items-center justify-center gap-2">
                            Criar Promoção <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* 3. TOP PERFORMERS (Review de Preço) */}
            <Card className="border-l-4 border-l-emerald-500 shadow-sm overflow-hidden">
                <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-[#4A3B32] flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            Estrelas (Top Velocity)
                        </h3>
                        <p className="text-xs text-emerald-700 mt-1">Giro muito rápido (>50%)</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
                        {top.length} itens
                    </span>
                </div>
                <CardContent className="p-0">
                    {top.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            Nenhum destaque de performance.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {top.map((item, i) => (
                                <div key={i} className="p-3 hover:bg-emerald-50/30 transition-colors flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={item.images?.[0]} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#4A3B32] truncate">{item.name}</p>
                                        <p className="text-xs text-emerald-600 font-medium">Turnover: {item.stats.sellThrough.toFixed(0)}%</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">
                                            R$ {item.stats.revenue30d.toFixed(0)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                        <span className="text-xs text-gray-400">Considerar aumentar preços levemente?</span>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
