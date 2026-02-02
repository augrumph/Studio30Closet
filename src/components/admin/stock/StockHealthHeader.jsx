
import { HelpCircle, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

function KPICard({ title, value, subtext, score, tooltip, colorCls }) {
    return (
        <Card className={cn("relative overflow-hidden border-l-4 shadow-sm h-full", colorCls)}>
            <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">{title}</h3>
                    <TooltipProvider>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger>
                                <Info className="w-3 h-3 opacity-40 hover:opacity-100" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-black text-white p-2 text-xs">
                                {tooltip}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div>
                    <div className="text-2xl md:text-3xl font-display font-bold leading-tight mb-1">
                        {value}
                    </div>
                    <p className="text-xs font-medium opacity-80">{subtext}</p>
                </div>
            </CardContent>
        </Card>
    )
}

export function StockHealthHeader({ kpis, loading }) {
    if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-32 bg-gray-100 animate-pulse rounded-xl" />
    if (!kpis) return null

    // Helper para formatar moeda
    const money = (val) => `R$ ${(val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
    const pct = (val) => `${(val || 0).toFixed(1)}%`

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
            {/* 1. GMROI */}
            <KPICard
                title="GMROI (ROI)"
                value={kpis.gmroi.toFixed(1) + 'x'}
                subtext="Retorno p/ cada R$ 1 investido"
                tooltip="Gross Margin Return on Investment. < 1 é prejuízo, > 2 é excelente."
                colorCls={kpis.gmroi > 2 ? 'border-l-emerald-500 bg-white' : kpis.gmroi < 1 ? 'border-l-red-500 bg-white' : 'border-l-amber-500 bg-white'}
            />

            {/* 2. SELL-THROUGH */}
            <KPICard
                title="Giro (Sell-Through)"
                value={pct(kpis.sellThrough)}
                subtext="Velocidade de venda (30d)"
                tooltip="% do estoque disponível que foi vendido no último mês. Meta > 40%."
                colorCls={kpis.sellThrough > 40 ? 'border-l-blue-500 bg-white' : 'border-l-gray-300 bg-white'}
            />

            {/* 3. INVENTORY VALUE (COST) */}
            <KPICard
                title="Custo em Estoque"
                value={money(kpis.totalStockCost)}
                subtext={`${kpis.totalUnitsOnHand} peças disponíveis`}
                tooltip="Valor de custo total imobilizado no estoque hoje."
                colorCls="border-l-purple-500 bg-white"
            />

            {/* 4. HEALTH SCORE */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-[#4A3B32] to-[#2A211C] text-white shadow-md border-0">
                <CardContent className="p-4 md:p-5 flex items-center justify-between h-full">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#C75D3B] mb-1">Saúde do Estoque</h3>
                        <div className="text-4xl font-display font-bold">{kpis.healthScore.toFixed(0)}</div>
                        <p className="text-[10px] text-white/60">Base 100 pontos</p>
                    </div>

                    {/* Radial Progress Mini (CSS only) */}
                    <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-white/10">
                        <div className="absolute inset-0 rounded-full border-4 border-[#C75D3B] border-t-transparent border-l-transparent transform -rotate-45" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }} />
                        <span className="text-xl">❤️</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
