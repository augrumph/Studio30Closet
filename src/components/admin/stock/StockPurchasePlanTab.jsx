import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShoppingCart, Package, DollarSign, Truck, ChevronDown, ChevronRight,
    Copy, Printer, HelpCircle, Phone, Mail, MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { getPurchasePlan } from '@/lib/api/stock'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { toast } from 'sonner'

function SupplierCard({ supplier, expanded, onToggle }) {
    const money = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

    const copyToClipboard = () => {
        const text = supplier.items.map(item =>
            `${item.name} — Qtd: ${item.suggestedQty}un (Estoque atual: ${item.currentStock})`
        ).join('\n')

        const header = `PEDIDO — ${supplier.supplierName}\n${'─'.repeat(40)}\n`
        const footer = `\n${'─'.repeat(40)}\nTotal: ${supplier.totalPieces} peças | ${money(supplier.totalCost)}`

        navigator.clipboard.writeText(header + text + footer)
        toast.success('Lista copiada para a área de transferência!')
    }

    return (
        <Card className={cn("border shadow-sm transition-all", expanded && "ring-2 ring-[#C75D3B]/20")}>
            {/* Supplier Header */}
            <div onClick={onToggle} className="cursor-pointer">
                <CardHeader className="px-4 py-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C75D3B] to-[#A04A2E] flex items-center justify-center shadow-sm">
                            <Truck className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-[#4A3B32] text-sm">{supplier.supplierName}</h3>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                                {supplier.supplierCity && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{supplier.supplierCity}</span>}
                                {supplier.supplierPhone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{supplier.supplierPhone}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-lg font-bold text-[#C75D3B]">{money(supplier.totalCost)}</div>
                            <div className="text-[10px] text-gray-400">{supplier.totalPieces} peças • {supplier.items.length} produtos</div>
                        </div>
                        {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                    </div>
                </CardHeader>
            </div>

            {/* Expanded Items */}
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="border-t border-gray-100">
                            {/* Action Buttons */}
                            <div className="px-4 py-2 bg-gray-50/50 flex gap-2">
                                <button onClick={copyToClipboard} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                                    <Copy className="w-3 h-3" /> Copiar Lista
                                </button>
                                {supplier.supplierPhone && (
                                    <a href={`https://wa.me/55${supplier.supplierPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm">
                                        <Phone className="w-3 h-3" /> WhatsApp
                                    </a>
                                )}
                            </div>

                            {/* Items Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs text-gray-500 font-bold">Produto</th>
                                            <th className="text-center px-3 py-2 text-xs text-gray-500 font-bold">Estoque</th>
                                            <th className="text-center px-3 py-2 text-xs text-gray-500 font-bold hidden sm:table-cell">Vendas/sem</th>
                                            <th className="text-center px-3 py-2 text-xs text-gray-500 font-bold hidden md:table-cell">Sem. Supply</th>
                                            <th className="text-center px-3 py-2 text-xs text-gray-500 font-bold text-[#C75D3B]">Comprar</th>
                                            <th className="text-center px-3 py-2 text-xs text-gray-500 font-bold hidden sm:table-cell">Custo Un.</th>
                                            <th className="text-center px-3 py-2 text-xs text-gray-500 font-bold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {supplier.items.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                                            <img src={getOptimizedImageUrl(item.images?.[0], 60)} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-[#4A3B32] truncate max-w-[140px] md:max-w-[200px] text-xs">{item.name}</p>
                                                            <p className="text-[10px] text-gray-400">{item.category}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-center px-3 py-2.5">
                                                    <span className={cn("text-xs font-bold", item.currentStock === 0 ? "text-red-600" : "text-gray-600")}>{item.currentStock}</span>
                                                </td>
                                                <td className="text-center px-3 py-2.5 hidden sm:table-cell text-xs text-gray-600">{item.weeklyRate}</td>
                                                <td className="text-center px-3 py-2.5 hidden md:table-cell">
                                                    <span className={cn("text-xs font-bold", item.weeksOfSupply < 2 ? "text-red-600" : "text-amber-600")}>{item.weeksOfSupply}s</span>
                                                </td>
                                                <td className="text-center px-3 py-2.5">
                                                    <span className="px-2 py-1 rounded bg-[#C75D3B]/10 text-[#C75D3B] text-xs font-bold">+{item.suggestedQty} un</span>
                                                </td>
                                                <td className="text-center px-3 py-2.5 hidden sm:table-cell text-xs text-gray-500">{money(item.unitCost)}</td>
                                                <td className="text-center px-3 py-2.5 font-bold text-[#4A3B32] text-xs">{money(item.totalCost)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Supplier Total Footer */}
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-xs text-gray-500 font-bold">Total do Fornecedor</span>
                                <span className="text-sm font-bold text-[#C75D3B]">{supplier.totalPieces} peças • {money(supplier.totalCost)}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    )
}

export function StockPurchasePlanTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [expandedIdx, setExpandedIdx] = useState(0) // first expanded by default

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

    if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
    if (!data) return null

    const money = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    const suppliers = data.suppliers || []

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border shadow-sm bg-gradient-to-br from-[#4A3B32] to-[#2A211C] text-white">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{money(data.summary?.grandTotalCost)}</div>
                        <p className="text-[10px] text-white/60 uppercase font-bold mt-1">Investimento Total</p>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-[#4A3B32]">{data.summary?.grandTotalPieces}</div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Peças a Comprar</p>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-[#4A3B32]">{data.summary?.totalProducts}</div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Produtos</p>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-[#4A3B32]">{data.summary?.totalSuppliers}</div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Fornecedores</p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm font-bold text-blue-700">Como funciona o Planejador de Compras?</p>
                    <p className="text-xs text-blue-600 mt-0.5">O sistema analisa a velocidade de venda de cada produto e calcula a quantidade necessária para manter <strong>4 semanas de estoque</strong>. Produtos que já têm estoque suficiente não aparecem na lista. Clique em "Copiar Lista" para enviar por WhatsApp ao fornecedor.</p>
                </div>
            </div>

            {/* Supplier Accordion */}
            {suppliers.length === 0 ? (
                <Card className="border shadow-sm">
                    <CardContent className="p-12 text-center">
                        <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">Estoque Saudável!</h3>
                        <p className="text-sm text-gray-300 mt-1">Todos os produtos estão com estoque adequado. Nenhuma compra sugerida no momento.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {suppliers.map((supplier, i) => (
                        <motion.div key={supplier.supplierId || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <SupplierCard
                                supplier={supplier}
                                expanded={expandedIdx === i}
                                onToggle={() => setExpandedIdx(expandedIdx === i ? -1 : i)}
                            />
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
