import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const fmt = (n) =>
    (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtInt = (n) =>
    (n || 0).toLocaleString('pt-BR')

function Skeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
        </div>
    )
}

export function BusinessOverview({ data, isLoading }) {
    if (isLoading) return <Skeleton />
    if (!data) return null

    const { monthly = [], investmentByPerson = [], reconciliation = {} } = data

    const rec = reconciliation
    const faturamentoBruto = rec.faturamento_bruto || 0
    const descontos = rec.descontos || 0
    const faturamentoLiquido = rec.faturamento_liquido || 0

    // Totals row for monthly table
    const totals = monthly.reduce(
        (acc, m) => ({
            faturamento: acc.faturamento + m.faturamento,
            compras_total: acc.compras_total + m.compras_total,
            compras_count: acc.compras_count + m.compras_count,
            vendas_count: acc.vendas_count + m.vendas_count,
        }),
        { faturamento: 0, compras_total: 0, compras_count: 0, vendas_count: 0 }
    )

    const maxFaturamento = Math.max(...monthly.map(m => m.faturamento), 1)
    const maxCompras = Math.max(...monthly.map(m => m.compras_total), 1)
    const maxBar = Math.max(maxFaturamento, maxCompras)

    const topInvestor = investmentByPerson[0]?.label || 'N/A'

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 md:space-y-6"
        >
            {/* ─── Section 1: Reconciliação do Caixa ─── */}
            <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white">
                <CardHeader className="p-5 md:p-6 pb-0">
                    <CardTitle className="text-base md:text-lg font-display text-[#4A3B32]">
                        Reconciliação do Caixa
                    </CardTitle>
                    {/* Pills header */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FDF0ED] text-[#C75D3B]">
                            Faturado R$ {fmt(faturamentoBruto)}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                            Descontos −R$ {fmt(descontos)}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                            Líquido R$ {fmt(faturamentoLiquido)}
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="p-5 md:p-6 pt-4">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Left: Onde está o dinheiro */}
                        <div>
                            <p className="text-xs font-bold text-[#4A3B32]/60 uppercase tracking-wider mb-3">
                                Onde está o dinheiro
                            </p>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-gray-50">
                                    <tr>
                                        <td className="py-2 text-[#4A3B32]">
                                            <span className="mr-1.5">✅</span>Recebido à vista
                                        </td>
                                        <td className="py-2 text-right font-semibold text-[#4A3B32]">
                                            R$ {fmt(rec.recebido_avista)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-[#4A3B32]">
                                            <span className="mr-1.5">✅</span>Entradas de crediário
                                        </td>
                                        <td className="py-2 text-right font-semibold text-[#4A3B32]">
                                            R$ {fmt(rec.entradas_crediario)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-[#4A3B32]">
                                            <span className="mr-1.5">✅</span>Parcelas recebidas
                                        </td>
                                        <td className="py-2 text-right font-semibold text-[#4A3B32]">
                                            R$ {fmt(rec.parcelas_recebidas)}
                                        </td>
                                    </tr>
                                    <tr className="bg-gray-50">
                                        <td className="py-2 px-2 font-bold text-[#4A3B32] rounded-l">
                                            Total recebido
                                        </td>
                                        <td className="py-2 px-2 text-right font-black text-[#4A3B32] rounded-r">
                                            R$ {fmt(rec.total_recebido)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-amber-700">
                                            <span className="mr-1.5">🕐</span>Crediário a receber
                                        </td>
                                        <td className="py-2 text-right font-semibold text-amber-700">
                                            R$ {fmt(rec.pending_crediario)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-red-600">
                                            <span className="mr-1.5">⚠️</span>Pix/card pendente
                                        </td>
                                        <td className="py-2 text-right font-semibold text-red-600">
                                            R$ {fmt(rec.pending_pagamentos)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Right: CPV + Margem */}
                        <div className="bg-[#FDF0ED] rounded-xl p-4 flex flex-col gap-3">
                            <div>
                                <p className="text-xs font-bold text-[#4A3B32]/60 uppercase tracking-wider mb-2">
                                    Custo &amp; Margem
                                </p>
                                <p className="text-sm text-[#4A3B32]">
                                    Custo do vendido:{' '}
                                    <span className="font-bold">R$ {fmt(rec.cpv)}</span>
                                </p>
                                <p className="text-sm text-[#4A3B32] mt-1">
                                    Margem bruta:{' '}
                                    <span className="font-black text-[#C75D3B] text-base">
                                        {(rec.margem_bruta_pct || 0).toFixed(1)}%
                                    </span>
                                </p>
                            </div>

                            {/* CPV vs Margin bar */}
                            {faturamentoLiquido > 0 && (
                                <div>
                                    <div className="h-4 w-full rounded-full overflow-hidden bg-gray-200 flex">
                                        <div
                                            className="h-full bg-[#C75D3B]"
                                            style={{
                                                width: `${Math.min((rec.cpv / faturamentoLiquido) * 100, 100)}%`
                                            }}
                                        />
                                        <div className="h-full bg-emerald-400 flex-1" />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold mt-1">
                                        <span className="text-[#C75D3B]">
                                            CPV {((rec.cpv / faturamentoLiquido) * 100).toFixed(1)}%
                                        </span>
                                        <span className="text-emerald-600">
                                            Margem {(rec.margem_bruta_pct || 0).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="pt-1 border-t border-[#C75D3B]/20">
                                <p className="text-xs text-[#4A3B32]/70 leading-relaxed">
                                    Estoque em mãos:{' '}
                                    <span className="font-semibold text-[#4A3B32]">
                                        {fmtInt(rec.estoque_unidades)} peças
                                    </span>
                                    {' '}• custo{' '}
                                    <span className="font-semibold text-[#4A3B32]">
                                        R$ {fmt(rec.estoque_custo)}
                                    </span>
                                    {' '}• valor{' '}
                                    <span className="font-semibold text-[#4A3B32]">
                                        R$ {fmt(rec.estoque_venda)}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Section 2: Faturamento vs. Compras por Mês ─── */}
            <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white">
                <CardHeader className="p-5 md:p-6 pb-0">
                    <CardTitle className="text-base md:text-lg font-display text-[#4A3B32]">
                        Faturamento vs. Compras por Mês
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6 pt-4 overflow-x-auto">
                    <table className="w-full text-sm min-w-[580px]">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-2 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider">
                                    Mês
                                </th>
                                <th className="text-right py-2 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider">
                                    Faturamento
                                </th>
                                <th className="text-right py-2 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider">
                                    Compras (R$)
                                </th>
                                <th className="text-right py-2 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider">
                                    Qtd Compras
                                </th>
                                <th className="text-right py-2 text-xs font-bold text-[#4A3B32]/50 uppercase tracking-wider">
                                    Lucro Bruto Est.
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {[...monthly].reverse().map((m) => {
                                const lucro = m.faturamento - m.compras_total
                                const isPos = lucro >= 0
                                return (
                                    <tr
                                        key={m.month_key}
                                        className={cn(
                                            'transition-colors',
                                            m.isCurrent
                                                ? 'bg-[#FDF0ED]/60'
                                                : 'hover:bg-gray-50'
                                        )}
                                    >
                                        <td className="py-2.5 text-[#4A3B32] font-medium">
                                            {m.label}
                                            {m.isCurrent && (
                                                <span className="ml-1.5 text-[9px] font-bold text-[#C75D3B] bg-[#FDF0ED] px-1.5 py-0.5 rounded-full uppercase">
                                                    atual
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="hidden sm:block w-20">
                                                    <div
                                                        className="h-2 rounded-full bg-[#C75D3B]/20"
                                                        style={{ width: '100%' }}
                                                    >
                                                        <div
                                                            className="h-2 rounded-full bg-[#C75D3B]"
                                                            style={{
                                                                width: `${(m.faturamento / maxBar) * 100}%`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="font-semibold text-[#4A3B32]">
                                                    R$ {fmt(m.faturamento)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="hidden sm:block w-20">
                                                    <div
                                                        className="h-2 rounded-full bg-amber-100"
                                                        style={{ width: '100%' }}
                                                    >
                                                        <div
                                                            className="h-2 rounded-full bg-amber-500"
                                                            style={{
                                                                width: `${(m.compras_total / maxBar) * 100}%`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="font-semibold text-[#4A3B32]">
                                                    R$ {fmt(m.compras_total)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 text-right text-[#4A3B32]">
                                            {m.compras_count}
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <span
                                                className={cn(
                                                    'font-bold',
                                                    isPos ? 'text-emerald-600' : 'text-red-500'
                                                )}
                                            >
                                                {isPos ? '+' : ''}R$ {fmt(lucro)}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 border-t-2 border-gray-200">
                                <td className="py-3 px-1 font-black text-[#4A3B32] text-xs uppercase tracking-wide">
                                    Total
                                </td>
                                <td className="py-3 text-right font-black text-[#4A3B32]">
                                    R$ {fmt(totals.faturamento)}
                                </td>
                                <td className="py-3 text-right font-black text-[#4A3B32]">
                                    R$ {fmt(totals.compras_total)}
                                </td>
                                <td className="py-3 text-right font-black text-[#4A3B32]">
                                    {totals.compras_count}
                                </td>
                                <td className="py-3 text-right">
                                    <span
                                        className={cn(
                                            'font-black',
                                            totals.faturamento - totals.compras_total >= 0
                                                ? 'text-emerald-600'
                                                : 'text-red-500'
                                        )}
                                    >
                                        {totals.faturamento - totals.compras_total >= 0 ? '+' : ''}R${' '}
                                        {fmt(totals.faturamento - totals.compras_total)}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    <p className="text-[10px] text-gray-400 mt-3 italic">
                        * Lucro estimado = faturamento do mês − compras do mês. Sua margem real sobre o
                        que foi vendido é de{' '}
                        <span className="font-bold text-[#4A3B32]">
                            {(rec.margem_bruta_pct || 0).toFixed(1)}%
                        </span>
                    </p>
                </CardContent>
            </Card>

            {/* ─── Section 3: Investimento em Estoque por Pessoa ─── */}
            <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white">
                <CardHeader className="p-5 md:p-6 pb-0">
                    <CardTitle className="text-base md:text-lg font-display text-[#4A3B32]">
                        Investimento em Estoque por Pessoa
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6 pt-4">
                    <div className="space-y-4">
                        {investmentByPerson.map((person, idx) => (
                            <motion.div
                                key={person.spent_by}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.08 }}
                                className="space-y-1.5"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-[#4A3B32] text-sm">
                                            {person.label}
                                        </span>
                                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {person.count} compras
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-[#4A3B32] text-sm">
                                            R$ {fmt(person.total)}
                                        </span>
                                        <span className="ml-2 text-xs font-bold text-[#C75D3B]">
                                            {person.pct.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${person.pct}%` }}
                                        transition={{ delay: idx * 0.08 + 0.2, duration: 0.8, ease: 'easeOut' }}
                                        className="h-full rounded-full"
                                        style={{
                                            background:
                                                'linear-gradient(90deg, #C75D3B 0%, #FF8C6B 100%)'
                                        }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    {topInvestor !== 'N/A' && (
                        <p className="text-[10px] text-gray-400 mt-4 italic">
                            {topInvestor} é o maior investidor individual do negócio.
                        </p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}
