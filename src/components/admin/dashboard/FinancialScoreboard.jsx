import { motion } from 'framer-motion'
import { useState } from 'react'
import { CashFlowModal } from './CashFlowModal'
import { ReceivedAmountModal } from './ReceivedAmountModal'
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
    Sparkles,
    Package,
    Truck,
    Users
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
 * Determina o status de peças por venda
 * Verde: > 2.5 (cross-sell excelente)
 * Amarelo: 1.5 - 2.5 (regular)
 * Vermelho: < 1.5 (venda única)
 */
function getItemsPerSaleStatus(itemsPerSale) {
    if (itemsPerSale > 2.5) return {
        icon: CircleCheck,
        label: 'Ótimo',
        textColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
    }
    if (itemsPerSale >= 1.5) return {
        icon: CircleAlert,
        label: 'Regular',
        textColor: 'text-amber-600',
        bgColor: 'bg-amber-50'
    }
    return {
        icon: CircleX,
        label: 'Baixo',
        textColor: 'text-red-600',
        bgColor: 'bg-red-50'
    }
}

/**
 * Configuração dos 6 cards essenciais
 */
const getSimplifiedCards = (metrics) => {
    const marginStatus = getMarginStatus(metrics.netMarginPercent || 0)
    const itemsStatus = getItemsPerSaleStatus(metrics.itemsPerSale || 0)

    // Retention Status (Target > 40%?)
    const retentionRate = metrics.retentionRate || 0
    const retentionStatus = retentionRate >= 50 ? 'text-emerald-600' : retentionRate >= 30 ? 'text-amber-600' : 'text-red-600'
    const retentionBg = retentionRate >= 50 ? 'bg-emerald-50' : retentionRate >= 30 ? 'bg-amber-50' : 'bg-red-50'

    // Logistics Status (Target < 10%?)
    const logisticsPercent = metrics.logisticsCostPercent || 0
    const logisticsStatus = logisticsPercent <= 8 ? 'text-emerald-600' : logisticsPercent <= 12 ? 'text-amber-600' : 'text-red-600'
    const logisticsBg = logisticsPercent <= 8 ? 'bg-emerald-50' : logisticsPercent <= 12 ? 'bg-amber-50' : 'bg-red-50'

    return [
        // === LINHA 1: SAÚDE DO NEGÓCIO (Financeiro Macro) ===
        {
            label: 'Faturamento',
            value: metrics.netRevenue,
            icon: DollarSign,
            iconBg: 'bg-[#FAF3F0]',
            iconColor: 'text-[#C75D3B]',
            descriptionIcon: null,
            descriptionText: 'Receita líquida',
            tooltip: 'Total vendido menos descontos. É o dinheiro que de fato entrou nas vendas.',
            isCurrency: true
        },
        {
            label: 'Lucro Líquido',
            value: metrics.netProfit,
            icon: Sparkles,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            descriptionIcon: null,
            descriptionText: 'Competência (DRE)',
            tooltip: 'Lucro contábil do período (Faturamento - CPV - Despesas - Juros).',
            isCurrency: true,
            warning: metrics.isCPVEstimated
                ? `${metrics.estimatedPercent.toFixed(0)}% das peças sem custo definido (Lucro Estimado).`
                : metrics.costWarnings > 0
                    ? `${metrics.costWarnings} peças sem custo (impacto baixo).`
                    : null
        },
        {
            label: 'Margem Líquida',
            value: metrics.netMarginPercent,
            icon: TrendingUp,
            iconBg: marginStatus.bgColor,
            iconColor: marginStatus.textColor,
            descriptionIcon: marginStatus.icon,
            descriptionIconColor: marginStatus.textColor,
            descriptionText: marginStatus.label,
            tooltip: 'Percentual de lucro sobre o faturamento. Ideal > 35%.',
            isPercentage: true,
            warning: metrics.isCPVEstimated ? 'Margem baseada em custos estimados.' : null
        },
        {
            label: 'Ticket Médio',
            value: metrics.averageTicket,
            icon: Receipt,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            descriptionIcon: null,
            descriptionText: 'Por venda',
            tooltip: 'Valor médio gasto por cliente em cada compra.',
            isCurrency: true
        },

        // === LINHA 2: EFICIÊNCIA OPERACIONAL (Malinha) ===
        {
            label: 'Vendas (Qtd)',
            value: metrics.totalSalesCount,
            icon: ShoppingCart,
            iconBg: 'bg-gray-50',
            iconColor: 'text-gray-600',
            descriptionIcon: null,
            descriptionText: 'Vendas fechadas',
            tooltip: 'Número total de vendas realizadas no período.',
            isNumber: true
        },
        {
            label: 'Peças / Atendimento',
            value: metrics.itemsPerSale,
            icon: Package,
            iconBg: itemsStatus.bgColor,
            iconColor: itemsStatus.textColor,
            descriptionIcon: itemsStatus.icon,
            descriptionIconColor: itemsStatus.textColor,
            descriptionText: `${metrics.totalItemsSold || 0} peças tot.`,
            tooltip: 'Média de produtos por atendimento (P.A.). Indica eficiência do cross-sell.',
            isDecimal: true
        },
        {
            label: 'Fidelização (Recorrência)',
            value: metrics.fidelityRate,
            icon: Users, // Need to ensure Users is imported or pick another
            iconBg: retentionBg,
            iconColor: retentionStatus,
            descriptionIcon: null,
            descriptionText: `${metrics.newCustomersCount || 0} novos clientes`,
            tooltip: 'Percentual do faturamento vindo de clientes que já compraram antes. Indica lealdade da base.',
            isPercentage: true
        },
        {
            label: 'Preço Médio por Peça',
            value: metrics.averageUnitRetail,
            icon: Sparkles, // Reuse Sparkles or similar
            iconBg: logisticsBg,
            iconColor: logisticsStatus,
            descriptionIcon: null,
            descriptionText: 'Valor agregado',
            tooltip: 'Valor médio de venda de cada peça (AUR).',
            isCurrency: true
        },

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
        if (stat.isDecimal) {
            return (stat.value || 0).toFixed(1)
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
                        "w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center relative",
                        stat.iconBg
                    )}>
                        <stat.icon className={cn("w-4 h-4 md:w-5 md:h-5", stat.iconColor)} />
                        {stat.warning && (
                            <div className="absolute -top-1 -right-1 flex items-center justify-center">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 items-center justify-center">
                                        <CircleAlert className="w-2.5 h-2.5 text-white" />
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                                {stat.warning && (
                                    <CircleAlert className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                )}
                                <button className="p-1 hover:bg-gray-50 rounded-full transition-colors" aria-label={`Informações sobre ${stat.label}`}>
                                    <Info className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
                                </button>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-[#4A3B32] text-white p-2.5 text-xs leading-relaxed rounded-lg">
                            <p className="font-semibold mb-0.5">{stat.label}</p>
                            {stat.warning && (
                                <p className="text-amber-300 font-bold mb-1 flex items-center gap-1">
                                    <CircleAlert className="w-3 h-3" /> {stat.warning}
                                </p>
                            )}
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
    const [isReceivedModalOpen, setIsReceivedModalOpen] = useState(false)

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
        if (card.label === 'Faturamento') {
            return {
                ...card,
                onClick: () => setIsReceivedModalOpen(true),
                tooltip: card.tooltip + ' (Clique para ver o que entrou)'
            }
        }
        return card
    })

    return (
        <TooltipProvider delayDuration={200}>
            {/* 30/12/2026: Changed lg:grid-cols-6 to lg:grid-cols-4 to accommodate 11 cards nicely (4 top, 4 middle, 3 bottom) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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

            <ReceivedAmountModal
                isOpen={isReceivedModalOpen}
                onClose={() => setIsReceivedModalOpen(false)}
                metrics={metrics}
                details={metrics.cashFlowDetails}
            />
        </TooltipProvider>
    )
}
