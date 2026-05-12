import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Ruler, Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { calculateCustomerSizeAnalysis, cn } from '@/lib/utils'

function normalizeItem(item) {
    return {
        ...item,
        category: item.category || item.productCategory || item.product_category || item.collection || '',
        name: item.name || item.productName || item.title || '',
        productName: item.productName || item.name || item.title || '',
        quantity: Number(item.quantity || item.qty || 1)
    }
}

export function SizeProfileDeepDive({ vendas = [] }) {
    const items = useMemo(() => (
        vendas.flatMap(venda => (venda.items || []).map(normalizeItem))
    ), [vendas])

    const analysis = useMemo(() => calculateCustomerSizeAnalysis(items), [items])

    const groupEntries = useMemo(() => Object.entries(analysis), [analysis])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md bg-white overflow-hidden">
                <CardHeader className="p-6 md:p-8 pb-0">
                    <CardTitle className="text-lg md:text-2xl font-display text-[#4A3B32] flex items-center justify-center gap-3">
                        <div className="p-2.5 bg-[#FDF0ED] rounded-2xl">
                            <Ruler className="w-5 h-5 text-[#C75D3B]" />
                        </div>
                        Perfil & Tamanhos
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {groupEntries.map(([key, group]) => {
                            const entries = Object.entries(group.counts || {})
                                .sort((a, b) => {
                                    if (b[1] !== a[1]) return b[1] - a[1]
                                    return a[0].localeCompare(b[0], 'pt-BR')
                                })
                            const total = entries.reduce((sum, [, count]) => sum + count, 0)
                            const maxCount = Math.max(...entries.map(([, count]) => count), 1)

                            return (
                                <div
                                    key={key}
                                    className="rounded-3xl border border-gray-100 bg-gradient-to-b from-white to-[#FDFBF7] p-5 shadow-sm"
                                >
                                    {group.primary ? (
                                        <div className="space-y-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                                                        {group.label}
                                                    </p>
                                                    <p className="mt-1 text-xs font-bold text-gray-400">
                                                        {total} peças analisadas
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[#4A3B32] text-2xl font-black text-white shadow-lg shadow-[#4A3B32]/10">
                                                        {group.primary}
                                                    </div>
                                                    <p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#C75D3B]">
                                                        Principal
                                                    </p>
                                                </div>
                                            </div>

                                            {group.secondary && (
                                                <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-3 py-2">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                                                        Segundo
                                                    </span>
                                                    <span className="text-sm font-black text-[#4A3B32]">
                                                        {group.secondary}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                {entries.map(([size, count]) => (
                                                    <div key={size} className="space-y-1.5">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black',
                                                                    size === group.primary
                                                                        ? 'bg-[#FDF0ED] text-[#C75D3B]'
                                                                        : 'bg-white text-[#4A3B32]/70 border border-gray-100'
                                                                )}>
                                                                    {size}
                                                                </span>
                                                                <span className="text-xs font-bold text-gray-400">
                                                                    {count}x
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="h-2 overflow-hidden rounded-full bg-white border border-gray-100">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.max((count / maxCount) * 100, 8)}%` }}
                                                                transition={{ duration: 0.55, ease: 'easeOut' }}
                                                                className={cn(
                                                                    'h-full rounded-full',
                                                                    size === group.primary ? 'bg-[#C75D3B]' : 'bg-[#4A3B32]/18'
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/70 p-5 text-center">
                                            <Tag className="w-6 h-6 text-gray-300 mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                                                {group.label}
                                            </p>
                                            <p className="mt-2 text-sm text-gray-500 font-bold">Sem base</p>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
