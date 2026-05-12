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

// ── Card de grupo (mobile e desktop) ─────────────────────────────────────────
function GroupCard({ groupKey, group }) {
    const entries = useMemo(() => (
        Object.entries(group.counts || {})
            .sort((a, b) => b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], 'pt-BR'))
    ), [group])

    const total    = entries.reduce((s, [, c]) => s + c, 0)
    const maxCount = Math.max(...entries.map(([, c]) => c), 1)

    if (!group.primary) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/70 px-4 py-6 text-center min-h-[120px]">
                <Tag className="w-5 h-5 text-gray-300 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">{group.label}</p>
                <p className="mt-1 text-xs text-gray-400 font-semibold">Sem dados</p>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-[#FDFBF7] shadow-sm overflow-hidden">
            {/* ── MOBILE layout ── */}
            <div className="md:hidden p-3">
                {/* Header: badge primário + label */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-2xl bg-[#4A3B32] text-white text-[17px] font-black shadow-sm">
                        {group.primary}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400 truncate">
                            {group.label}
                        </p>
                        <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                            {total} peças
                        </p>
                        {group.secondary && (
                            <p className="text-[11px] font-semibold text-[#A07060] mt-0.5">
                                2º <span className="font-black text-[#4A3B32]">{group.secondary}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Barras compactas */}
                <div className="space-y-2">
                    {entries.slice(0, 5).map(([size, count]) => {
                        const pct = Math.max((count / maxCount) * 100, 6)
                        const isPrimary = size === group.primary
                        return (
                            <div key={size} className="flex items-center gap-2">
                                <span className={cn(
                                    'inline-flex h-6 min-w-[26px] items-center justify-center rounded-full px-1.5 text-[11px] font-black shrink-0',
                                    isPrimary
                                        ? 'bg-[#FDF0ED] text-[#C75D3B]'
                                        : 'bg-gray-100 text-[#4A3B32]/70'
                                )}>
                                    {size}
                                </span>
                                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                        className={cn('h-full rounded-full', isPrimary ? 'bg-[#C75D3B]' : 'bg-[#4A3B32]/20')}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 shrink-0 w-6 text-right">
                                    {count}
                                </span>
                            </div>
                        )
                    })}
                    {entries.length > 5 && (
                        <p className="text-[10px] text-gray-400 pl-1">+{entries.length - 5} outros</p>
                    )}
                </div>
            </div>

            {/* ── DESKTOP layout (original) ── */}
            <div className="hidden md:block p-5">
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
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Segundo</span>
                            <span className="text-sm font-black text-[#4A3B32]">{group.secondary}</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        {entries.map(([size, count]) => {
                            const pct = Math.max((count / maxCount) * 100, 8)
                            const isPrimary = size === group.primary
                            return (
                                <div key={size} className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black',
                                            isPrimary
                                                ? 'bg-[#FDF0ED] text-[#C75D3B]'
                                                : 'bg-white text-[#4A3B32]/70 border border-gray-100'
                                        )}>
                                            {size}
                                        </span>
                                        <span className="text-xs font-bold text-gray-400">{count}x</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white border border-gray-100">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.55, ease: 'easeOut' }}
                                            className={cn('h-full rounded-full', isPrimary ? 'bg-[#C75D3B]' : 'bg-[#4A3B32]/18')}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── SizeProfileDeepDive ───────────────────────────────────────────────────────
export function SizeProfileDeepDive({ vendas = [] }) {
    const items = useMemo(() => (
        vendas.flatMap(venda => (venda.items || []).map(normalizeItem))
    ), [vendas])

    const analysis     = useMemo(() => calculateCustomerSizeAnalysis(items), [items])
    const groupEntries = useMemo(() => Object.entries(analysis), [analysis])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md bg-white overflow-hidden">
                <CardHeader className="p-4 md:p-8 pb-0">
                    <CardTitle className="text-base md:text-2xl font-display text-[#4A3B32] flex items-center gap-2.5">
                        <div className="p-2 md:p-2.5 bg-[#FDF0ED] rounded-xl md:rounded-2xl">
                            <Ruler className="w-4 h-4 md:w-5 md:h-5 text-[#C75D3B]" />
                        </div>
                        Perfil & Tamanhos
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-3 md:p-8">
                    {/* Mobile: 2 por linha, tudo visível */}
                    <div className="grid grid-cols-2 gap-2 md:hidden">
                        {groupEntries.map(([key, group]) => (
                            <GroupCard key={key} groupKey={key} group={group} />
                        ))}
                    </div>

                    {/* Desktop: grid original */}
                    <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-4">
                        {groupEntries.map(([key, group]) => (
                            <GroupCard key={key} groupKey={key} group={group} />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
