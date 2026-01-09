import { motion } from 'framer-motion'
import { useState } from 'react'
import { CashFlowModal } from './CashFlowModal'
import {
    ShoppingCart,
    TrendingUp,
    DollarSign,
    Coins,
    Wallet,
    Receipt,
    Info,
    CircleCheck,
    CircleAlert,
    CircleX,
    Sparkles
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

/**
 * Determina o status da margem baseado na faixa
 */
function getMarginStatus(marginPercent) {
    if (marginPercent >= 35) return {
        icon: CircleCheck,
        label: 'Saudável',
        textColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
    }
    if (marginPercent >= 25) return {
        icon: CircleAlert,
        label: 'Atenção',
        textColor: 'text-amber-600',
        bgColor: 'bg-amber-50'
    }
    return {
        icon: CircleX,
        label: 'Crítico',
        textColor: 'text-red-600',
        bgColor: 'bg-red-50'
    }
}

/**
 * Configuração dos 6 cards essenciais
 */
const getSimplifiedCards = (metrics) => {
    const marginStatus = getMarginStatus(metrics.netMarginPercent || 0)

    return [
        // Linha 1: Faturamento | Vendas | Ticket Médio
        {
            label: 'Faturamento',
            value: metrics.netRevenue,
            icon: DollarSign,
            iconBg: 'bg-[#FAF3F0]',
            iconColor: 'text-[#C75D3B]',
            descriptionIcon: null,
            descriptionText: 'Receita líquida do período',
            tooltip: 'Total vendido menos descontos. É o dinheiro que de fato entrou nas vendas.',
            isCurrency: true
        },
        {
            label: 'Vendas',
            value: metrics.totalSalesCount,
            icon: ShoppingCart,
            iconBg: 'bg-[#F5F0ED]',
            iconColor: 'text-[#4A3B32]',
            descriptionIcon: null,
            descriptionText: 'Quantidade de vendas',
            tooltip: 'Número total de vendas realizadas no período.',
            isNumber: true
        },
        {
            label: 'Ticket Médio',
            value: metrics.averageTicket,
            icon: Receipt,
            iconBg: 'bg-[#F5F0ED]',
            iconColor: 'text-[#4A3B32]',
            descriptionIcon: null,
            descriptionText: 'Valor médio por venda',
            tooltip: 'Faturamento dividido pelo número de vendas.',
            isCurrency: true
        },
        // Linha 2: Lucro | Margem | Caixa
        {
            label: 'Lucro',
            value: metrics.netProfit,
            icon: Coins,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            descriptionIcon: Sparkles,
            descriptionIconColor: 'text-emerald-500',
            descriptionText: 'Resultado líquido',
            tooltip: 'Lucro final: Faturamento - CPV - Despesas - DAS - Taxas - Juros. Inclui custo de reposição dos produtos.',
            isCurrency: true
        },
        {
            label: 'Margem',
            value: metrics.netMarginPercent,
            icon: TrendingUp,
            iconBg: marginStatus.bgColor,
            iconColor: marginStatus.textColor,
            descriptionIcon: marginStatus.icon,
            descriptionIconColor: marginStatus.textColor,
            descriptionText: marginStatus.label,
            tooltip: 'Percentual de lucro sobre o faturamento. Vermelho < 25% | Amarelo 25-35% | Verde > 35%',
            isPercentage: true
        },
        {
            label: 'Caixa',
            value: metrics.cashBalance,
            icon: Wallet,
            iconBg: 'bg-[#FAF3F0]',
            iconColor: 'text-[#C75D3B]',
            descriptionIcon: null,
            descriptionText: `Entr: ${(metrics.receivedAmount || 0).toLocaleString('pt-BR')} | Sai: ${((metrics.purchasesInPeriod || 0) + (metrics.totalExpensesInPeriod || 0)).toLocaleString('pt-BR')}`,
            tooltip: `Saldo Final = Recebido (R$ ${metrics.receivedAmount?.toLocaleString('pt-BR')}) - [Compras Loja (R$ ${metrics.purchasesInPeriod?.toLocaleString('pt-BR')}) + Despesas (R$ ${metrics.totalExpensesInPeriod?.toLocaleString('pt-BR')})]`,
            isCurrency: true
        }
    ]
}

/**
 * Componente de card individual com design refinado
 */
function KPICard({ stat, index }) {
    const formatValue = () => {
        if (stat.isCurrency) {
            return `R$ ${(stat.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }
        if (stat.isPercentage) {
            return `${(stat.value || 0).toFixed(1)}%`
        }
        if (stat.isNumber) {
            return (stat.value || 0).toLocaleString('pt-BR')
        }
        return stat.value
    }

    const DescIcon = stat.descriptionIcon

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ y: -2 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`relative bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm transition-all group overflow-hidden ${stat.onClick ? 'cursor-pointer hover:shadow-md hover:border-[#C75D3B]/30' : 'hover:shadow-md'
                }`}
            onClick={stat.onClick}
        >
            <div className="relative z-10 p-4 flex flex-col h-full">
                {/* Header: Icon + Info */}
                <div className="flex items-center justify-between mb-2">
                    <div className={cn(
                        "w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center",
                        stat.iconBg
                    )}>
                        <stat.icon className={cn("w-4 h-4 md:w-5 md:h-5", stat.iconColor)} />
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="p-1 hover:bg-gray-50 rounded-full transition-colors" aria-label={`Informações sobre ${stat.label}`}>
                                <Info className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-[#4A3B32] text-white p-2.5 text-xs leading-relaxed rounded-lg">
                            <p className="font-semibold mb-0.5">{stat.label}</p>
                            <p className="text-white/80">{stat.tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Label */}
                <p className="text-[#4A3B32]/50 text-[9px] md:text-[10px] font-semibold uppercase tracking-wider mb-1">{stat.label}</p>

                {/* Value */}
                <h3 className="text-xl md:text-2xl font-display font-bold text-[#4A3B32] mb-1 leading-tight">
                    {formatValue()}
                </h3>

                {/* Description with optional icon */}
                <div className="flex items-center gap-1.5">
                    {DescIcon && (
                        <DescIcon className={cn("w-3.5 h-3.5", stat.descriptionIconColor)} />
                    )}
                    <p className="text-xs text-gray-400 font-medium">{stat.descriptionText}</p>
                </div>
            </div>
        </motion.div>
    )
}

/**
 * Componente principal do scoreboard financeiro simplificado (6 KPIs)
 */
export function FinancialScoreboard({ metrics, isLoading }) {
    const [isCashFlowOpen, setIsCashFlowOpen] = useState(false)

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
            </div>
        )
    }

    const cards = getSimplifiedCards(metrics).map(card => {
        if (card.label === 'Caixa') {
            return {
                ...card,
                onClick: () => setIsCashFlowOpen(true),
                tooltip: card.tooltip + ' (Clique para ver detalhes)'
            }
        }
        return card
    })

    return (
        <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {cards.map((stat, i) => (
                    <KPICard key={stat.label} stat={stat} index={i} />
                ))}
            </div>

            <CashFlowModal
                isOpen={isCashFlowOpen}
                onClose={() => setIsCashFlowOpen(false)}
                metrics={metrics}
                details={metrics.cashFlowDetails}
            />
        </TooltipProvider>
    )
}
