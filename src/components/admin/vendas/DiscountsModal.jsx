import { motion, AnimatePresence } from 'framer-motion'
import { X, Tag, TrendingDown, DollarSign, Percent, AlertCircle, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export function DiscountsModal({ isOpen, onClose, vendas, metrics }) {
    if (!isOpen) return null

    // Filtrar vendas que têm desconto
    const vendasComDesconto = vendas.filter(v => {
        const discount = Number(v.discountAmount || 0)
        return discount > 0
    })

    // Calcular estatísticas
    const totalGrossRevenue = metrics.totalRevenue + metrics.totalDiscounts
    const totalDiscounts = metrics.totalDiscounts || 0
    const discountPercentage = totalGrossRevenue > 0
        ? (totalDiscounts / totalGrossRevenue) * 100
        : 0

    const averageDiscount = vendasComDesconto.length > 0
        ? totalDiscounts / vendasComDesconto.length
        : 0

    const maxDiscount = vendasComDesconto.length > 0
        ? Math.max(...vendasComDesconto.map(v => Number(v.discountAmount || 0)))
        : 0

    const vendasSemDesconto = vendas.length - vendasComDesconto.length

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-orange-50 to-amber-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-100 rounded-2xl">
                                    <Tag className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-display font-bold text-[#4A3B32]">
                                        Descontos Aplicados
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Detalhamento completo de todos os descontos concedidos
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/50 rounded-xl transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="border-orange-100 bg-gradient-to-br from-orange-50 to-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                            <TrendingDown className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase">Total Descontos</span>
                                    </div>
                                    <p className="text-2xl font-black text-orange-600">
                                        R$ {totalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-amber-100 rounded-lg">
                                            <Percent className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase">% do Faturamento</span>
                                    </div>
                                    <p className="text-2xl font-black text-amber-600">
                                        {discountPercentage.toFixed(1)}%
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <DollarSign className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase">Média por Venda</span>
                                    </div>
                                    <p className="text-2xl font-black text-blue-600">
                                        R$ {averageDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-emerald-100 rounded-lg">
                                            <AlertCircle className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase">Maior Desconto</span>
                                    </div>
                                    <p className="text-2xl font-black text-emerald-600">
                                        R$ {maxDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Breakdown */}
                        <div className="flex items-center gap-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="text-sm font-bold text-gray-600">
                                    {vendasComDesconto.length} vendas com desconto
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                                <span className="text-sm font-bold text-gray-600">
                                    {vendasSemDesconto} vendas sem desconto
                                </span>
                            </div>
                        </div>

                        {/* Detailed List */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-[#4A3B32] flex items-center gap-2">
                                <Tag className="w-5 h-5 text-orange-600" />
                                Detalhamento por Venda
                            </h3>

                            {vendasComDesconto.length === 0 ? (
                                <Card className="border-gray-100">
                                    <CardContent className="p-8 text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Tag className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="text-gray-400 font-medium">
                                            Nenhum desconto aplicado nas vendas
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-2">
                                    {vendasComDesconto
                                        .sort((a, b) => Number(b.discountAmount || 0) - Number(a.discountAmount || 0))
                                        .map((venda) => {
                                            const discount = Number(venda.discountAmount || 0)
                                            const total = Number(venda.totalValue || 0)
                                            const original = total + discount
                                            const discountPercent = original > 0 ? (discount / original) * 100 : 0

                                            return (
                                                <motion.div
                                                    key={venda.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="p-4 border border-gray-100 rounded-xl hover:border-orange-200 hover:bg-orange-50/30 transition-all"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className="text-sm font-bold text-[#4A3B32]">
                                                                    Venda #{venda.id}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {venda.customerName || 'Cliente não identificado'}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {new Date(venda.createdAt).toLocaleDateString('pt-BR')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs">
                                                                <span className="text-gray-500">
                                                                    Original: <span className="line-through">R$ {original.toFixed(2)}</span>
                                                                </span>
                                                                <span className="font-bold text-orange-600">
                                                                    Desconto: R$ {discount.toFixed(2)}
                                                                </span>
                                                                <span className="text-emerald-600 font-bold">
                                                                    Final: R$ {total.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "px-3 py-1.5 rounded-full text-xs font-black",
                                                                discountPercent >= 20 ? "bg-red-100 text-red-700" :
                                                                discountPercent >= 10 ? "bg-orange-100 text-orange-700" :
                                                                "bg-amber-100 text-amber-700"
                                                            )}>
                                                                -{discountPercent.toFixed(0)}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <AlertCircle className="w-4 h-4" />
                                <span>
                                    Receita Bruta: <span className="font-bold text-gray-700">R$ {totalGrossRevenue.toFixed(2)}</span>
                                    {' '} → Receita Líquida: <span className="font-bold text-emerald-600">R$ {metrics.totalRevenue.toFixed(2)}</span>
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-[#4A3B32] text-white rounded-xl font-bold hover:bg-[#3A2B22] transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
