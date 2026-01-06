import { motion } from 'framer-motion'
import {
    Users,
    ShoppingBag,
    Package,
    TrendingUp,
    Clock,
    DollarSign,
    Calendar,
    ArrowUpRight,
    Target,
    CreditCard,
    ArrowDownRight,
    AlertTriangle,
    Info
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

// Configuração dos cards DRE
const getDRECards = (metrics) => [
    {
        label: 'Receita Bruta',
        value: metrics.grossRevenue,
        icon: DollarSign,
        color: 'blue',
        description: `${metrics.totalSalesCount} vendas`,
        tooltip: 'Valor total de todas as vendas realizadas no período, antes de qualquer desconto ou dedução.'
    },
    {
        label: 'Ticket Médio',
        value: metrics.averageTicket,
        icon: ShoppingBag,
        color: 'sky',
        description: `${metrics.totalSalesCount} vendas`,
        tooltip: 'Valor médio que cada cliente gasta por compra.'
    },
    {
        label: 'CPV (Custo da Venda)',
        value: metrics.totalCPV,
        icon: Package,
        color: 'amber',
        description: 'Custo histórico',
        tooltip: 'Custo de Produto Vendido: quanto você pagou pelos produtos que foram vendidos.'
    },
    {
        label: 'Lucro Bruto',
        value: metrics.grossProfit,
        icon: ArrowUpRight,
        color: 'green',
        description: 'Receita - CPV',
        tooltip: 'Diferença entre a Receita Bruta e o CPV (Receita - CPV).'
    },
    {
        label: 'Margem Bruta',
        value: metrics.grossMarginPercent,
        icon: TrendingUp,
        color: 'emerald',
        description: `${metrics.grossMarginPercent.toFixed(1)}%`,
        isPercentage: true,
        tooltip: 'Percentual de lucro sobre cada venda, antes das despesas.'
    },
    {
        label: 'Taxas Pagto',
        value: metrics.totalFees,
        icon: CreditCard,
        color: 'orange',
        description: `${metrics.feePercent.toFixed(1)}% da receita`,
        tooltip: 'Total de taxas cobradas pelas maquininhas de cartão e meios de pagamento.'
    },
    {
        label: 'Descontos',
        value: metrics.totalDiscounts,
        icon: ArrowDownRight,
        color: 'red',
        description: 'Cupons e ajustes',
        tooltip: 'Total de descontos concedidos através de cupons e promoções.'
    },
    {
        label: 'Despesas Fixas',
        value: metrics.proportionalExpenses,
        icon: Calendar,
        color: 'slate',
        description: `Proporcionalizadas (${metrics.periodDays} dias)`,
        tooltip: 'Custos operacionais fixos do período (aluguel, energia, internet, etc.).'
    },
    {
        label: 'Lucro Operacional',
        value: metrics.operatingProfit,
        icon: Target,
        color: 'purple',
        description: 'Lucro Bruto - Despesas',
        tooltip: 'Lucro real do negócio após todas as deduções.'
    },
    {
        label: 'Margem Líquida',
        value: metrics.netMarginPercent,
        icon: TrendingUp,
        color: 'indigo',
        description: `${metrics.netMarginPercent.toFixed(1)}%`,
        isPercentage: true,
        tooltip: 'Percentual de lucro final sobre cada real vendido.'
    }
]

// Mapeamento de cores
const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    sky: 'bg-sky-100 text-sky-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600'
}

/**
 * Componente de card individual do DRE
 */
function DRECard({ stat, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                        "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all",
                        colorClasses[stat.color]
                    )}>
                        <stat.icon className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" aria-label={`Informações sobre ${stat.label}`}>
                                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm leading-relaxed">
                            <p className="font-semibold mb-1">{stat.label}</p>
                            <p className="text-gray-300">{stat.tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-[#4A3B32] mb-3 leading-tight">
                    {stat.isPercentage ?
                        `${(stat.value || 0).toFixed(1)}%` :
                        `R$ ${(stat.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                </h3>
                <p className="text-xs text-gray-500 font-medium line-clamp-2">{stat.description}</p>
            </div>
        </motion.div>
    )
}

/**
 * Componente principal do scoreboard financeiro (DRE)
 */
export function FinancialScoreboard({ metrics }) {
    const cards = getDRECards(metrics)

    return (
        <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {cards.map((stat, i) => (
                    <DRECard key={stat.label} stat={stat} index={i} />
                ))}
            </div>
        </TooltipProvider>
    )
}
