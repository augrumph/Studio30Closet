import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShoppingCart, Package, DollarSign, Truck, ChevronDown, ChevronRight,
    Copy, Phone, MapPin, HelpCircle, Sparkles, Target, CheckCircle2, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { getPurchasePlan } from '@/lib/api/stock'
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

function PurchasePlanSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                    <SkeletonPulse key={i} className="h-28" />
                ))}
            </div>
            {[1, 2, 3].map(i => (
                <SkeletonPulse key={i} className="h-64" />
            ))}
        </div>
    )
}

// ========================
// SUPPLIER CARD
// ========================
function SupplierCard({ supplier, expanded, onToggle }) {
    const money = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

    const copyToClipboard = () => {
        const text = supplier.items.map(item =>
            `${item.name} — Qtd: ${item.suggestedQty}un (Estoque atual: ${item.currentStock})`
        ).join('\n')

        const header = `🛍️ PEDIDO — ${supplier.supplierName}\n${'─'.repeat(40)}\n`
        const footer = `\n${'─'.repeat(40)}\n💰 Total: ${supplier.totalPieces} peças | ${money(supplier.totalCost)}`

        navigator.clipboard.writeText(header + text + footer)
        toast.success('Lista copiada! Cole no WhatsApp do fornecedor 📋')
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className={cn(
                "border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden",
                expanded && "ring-2 ring-[#C75D3B]/30"
            )}>
                {/* Supplier Header - Clickable */}
                <div onClick={onToggle} className="cursor-pointer">
                    <CardHeader className="px-5 py-4 bg-gradient-to-r from-gray-50 to-transparent border-b border-gray-100 hover:from-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C75D3B] to-[#A04A2E] flex items-center justify-center shadow-lg">
                                    <Truck className="w-6 h-6 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-black text-[#4A3B32] text-base">{supplier.supplierName}</h3>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1 font-medium">
                                        {supplier.supplierCity && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {supplier.supplierCity}
                                            </span>
                                        )}
                                        {supplier.supplierPhone && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-3 h-3" />
                                                {supplier.supplierPhone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <div className="text-2xl font-black text-[#C75D3B]">{money(supplier.totalCost)}</div>
                                    <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                                        {supplier.totalPieces} peças • {supplier.items.length} produtos
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: expanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                </motion.div>
                            </div>
                        </div>
                    </CardHeader>
                </div>

                {/* Expanded Items */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div>
                                {/* Action Buttons */}
                                <div className="px-5 py-3 bg-gray-50/50 flex gap-2 border-b border-gray-100">
                                    <motion.button
                                        onClick={copyToClipboard}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#C75D3B] to-[#A04A2E] rounded-xl text-xs font-black text-white hover:shadow-lg transition-all shadow-md"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Copiar Lista
                                    </motion.button>
                                    {supplier.supplierPhone && (
                                        <motion.a
                                            href={`https://wa.me/55${supplier.supplierPhone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-xs font-black text-white hover:shadow-lg transition-all shadow-md"
                                        >
                                            <Phone className="w-3.5 h-3.5" />
                                            WhatsApp
                                        </motion.a>
                                    )}
                                </div>

                                {/* Items Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left px-5 py-3 text-xs text-gray-600 font-black uppercase tracking-wider">Produto</th>
                                                <th className="text-center px-3 py-3 text-xs text-gray-600 font-black uppercase">Estoque</th>
                                                <th className="text-center px-3 py-3 text-xs text-gray-600 font-black uppercase hidden sm:table-cell">Vendas/sem</th>
                                                <th className="text-center px-3 py-3 text-xs text-gray-600 font-black uppercase hidden md:table-cell">Sem. Supply</th>
                                                <th className="text-center px-3 py-3 text-xs text-gray-600 font-black uppercase text-[#C75D3B]">Comprar</th>
                                                <th className="text-center px-3 py-3 text-xs text-gray-600 font-black uppercase hidden sm:table-cell">Custo Un.</th>
                                                <th className="text-center px-3 py-3 text-xs text-gray-600 font-black uppercase">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {supplier.items.map((item, i) => (
                                                <motion.tr
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    className="hover:bg-gray-50 transition-colors group"
                                                >
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                                                <img
                                                                    src={getOptimizedImageUrl(item.images?.[0], 80)}
                                                                    className="w-full h-full object-cover"
                                                                    alt=""
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-[#4A3B32] truncate max-w-[150px] md:max-w-[250px] text-sm">
                                                                    {item.name}
                                                                </p>
                                                                <p className="text-[10px] text-gray-500">{item.category}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center px-3 py-3">
                                                        <span className={cn(
                                                            "text-xs font-black",
                                                            item.currentStock === 0 ? "text-red-600" : "text-gray-600"
                                                        )}>
                                                            {item.currentStock}
                                                        </span>
                                                    </td>
                                                    <td className="text-center px-3 py-3 hidden sm:table-cell text-xs text-gray-600 font-medium">
                                                        {item.weeklyRate}
                                                    </td>
                                                    <td className="text-center px-3 py-3 hidden md:table-cell">
                                                        <span className={cn(
                                                            "text-xs font-black px-2 py-1 rounded-lg",
                                                            item.weeksOfSupply < 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {item.weeksOfSupply}s
                                                        </span>
                                                    </td>
                                                    <td className="text-center px-3 py-3">
                                                        <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C75D3B]/10 to-[#A04A2E]/10 text-[#C75D3B] text-xs font-black shadow-sm">
                                                            +{item.suggestedQty} un
                                                        </span>
                                                    </td>
                                                    <td className="text-center px-3 py-3 hidden sm:table-cell text-xs text-gray-500 font-medium">
                                                        {money(item.unitCost)}
                                                    </td>
                                                    <td className="text-center px-3 py-3 font-black text-[#4A3B32] text-sm">
                                                        {money(item.totalCost)}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Supplier Total Footer */}
                                <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-transparent border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-sm text-gray-600 font-black">Total do Fornecedor</span>
                                    <span className="text-lg font-black text-[#C75D3B]">
                                        {supplier.totalPieces} peças • {money(supplier.totalCost)}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    )
}

// ========================
// MAIN COMPONENT
// ========================
export function StockPurchasePlanTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [expandedIdx, setExpandedIdx] = useState(0)

    useEffect(() => { loadPlan() }, [])

    const loadPlan = async () => {
        setLoading(true)
        try {
            const result = await getPurchasePlan()
            setData(result)
        } catch (error) {
            toast.error('Erro ao carregar plano de compras')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <PurchasePlanSkeleton />
    if (!data) return null

    const money = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    const suppliers = data.suppliers || []

    return (
        <div className="space-y-6">
            {/* Premium Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
            >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                    <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[#4A3B32]">Plano de Compras Inteligente</h2>
                    <p className="text-xs text-gray-500 font-medium">Sugestões automáticas organizadas por fornecedor</p>
                </div>
            </motion.div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4 }}
                >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-[#4A3B32] to-[#2A211C] text-white">
                        <CardContent className="p-5 text-center">
                            <div className="text-3xl font-black mb-1">{money(data.summary?.grandTotalCost)}</div>
                            <p className="text-[10px] text-white/70 uppercase font-black tracking-wider">Investimento Total</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    whileHover={{ y: -4 }}
                >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-emerald-50 to-white">
                        <CardContent className="p-5 text-center">
                            <div className="text-3xl font-black text-[#4A3B32] mb-1">{data.summary?.grandTotalPieces}</div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-wider">Peças a Comprar</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ y: -4 }}
                >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-blue-50 to-white">
                        <CardContent className="p-5 text-center">
                            <div className="text-3xl font-black text-[#4A3B32] mb-1">{data.summary?.totalProducts}</div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-wider">Produtos Diferentes</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    whileHover={{ y: -4 }}
                >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-purple-50 to-white">
                        <CardContent className="p-5 text-center">
                            <div className="text-3xl font-black text-[#4A3B32] mb-1">{data.summary?.totalSuppliers}</div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-wider">Fornecedores</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Info Banner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 shadow-sm"
            >
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500 shadow-md flex-shrink-0">
                        <HelpCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-blue-900 mb-1">💡 Como funciona o Planejador?</h3>
                        <p className="text-xs text-blue-700">
                            O sistema analisa a <strong className="font-black">velocidade de venda</strong> de cada produto e calcula a quantidade necessária
                            para manter <strong className="font-black">4 semanas de estoque</strong>. Produtos que já têm estoque suficiente não aparecem na lista.
                            Clique em <strong className="font-black">"Copiar Lista"</strong> para colar no WhatsApp do fornecedor! 📋
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Supplier Accordion */}
            {suppliers.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-16 text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200 }}
                                className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl"
                            >
                                <CheckCircle2 className="w-12 h-12 text-white" />
                            </motion.div>
                            <h3 className="text-lg font-black text-[#4A3B32] mb-2">Estoque Saudável!</h3>
                            <p className="text-sm text-gray-500">
                                Todos os produtos estão com estoque adequado para as próximas 4 semanas.
                                Nenhuma compra urgente necessária no momento. 🎉
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    {suppliers.map((supplier, i) => (
                        <SupplierCard
                            key={supplier.supplierId || i}
                            supplier={supplier}
                            expanded={expandedIdx === i}
                            onToggle={() => setExpandedIdx(expandedIdx === i ? -1 : i)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
