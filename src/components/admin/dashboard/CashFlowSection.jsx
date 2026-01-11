import { motion } from 'framer-motion'
import {
    LayoutGrid,
    Ruler,
    Shirt,
    Truck,
    Info,
    TrendingUp,
    Sparkles,
    Star,
    Award
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

/**
 * Componente para exibir insights de produtos mais vendidos
 */
export function CashFlowSection({ trends }) {
    if (!trends) return null

    const trendCards = [
        {
            label: "Categoria Mais Vendida",
            value: trends.category,
            description: "Segmento com maior saída",
            icon: LayoutGrid,
            color: "bg-blue-100 text-blue-600",
            tooltip: "A categoria de produtos que mais teve unidades vendidas no período selecionado.",
            delay: 0.48
        },
        {
            label: "Tamanho Mais Vendido",
            value: trends.size,
            description: "Tamanho preferido das clientes",
            icon: Ruler,
            color: "bg-purple-100 text-purple-600",
            tooltip: "O tamanho que teve maior volume de vendas. Útil para planejar próximas compras.",
            delay: 0.56
        },
        {
            label: "Peça Mais Vendida",
            value: trends.product,
            description: "Best-seller do período",
            icon: Shirt,
            color: "bg-[#C75D3B]/10 text-[#C75D3B]",
            tooltip: "O produto específico (pelo nome) que mais vendeu unidades.",
            delay: 0.64
        },
        {
            label: "Fornecedor Mais Vendido",
            value: trends.supplier,
            description: "Parceiro com maior volume",
            icon: Truck,
            color: "bg-amber-100 text-amber-600",
            tooltip: "O fornecedor cujos produtos tiveram maior volume de saída no período.",
            delay: 0.72
        }
    ]

    return (
        <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {trendCards.map((card, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        transition={{ delay: card.delay, duration: 0.4 }}
                        className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center", card.color)}>
                                    <card.icon className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" aria-label={`Informações sobre ${card.label}`}>
                                            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm leading-relaxed">
                                        <p className="font-semibold mb-1">{card.label}</p>
                                        <p className="text-gray-300">{card.tooltip}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">{card.label}</p>
                            <h3 className="text-xl md:text-2xl font-display font-bold mb-3 leading-tight text-[#4A3B32] truncate">
                                {card.value}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-auto">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                <p className="text-xs text-gray-500 font-medium font-display tracking-tight">{card.description}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </TooltipProvider>
    )
}

