import { motion } from 'framer-motion'
import {
    LayoutGrid,
    Ruler,
    Star,
    Truck
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Componente para exibir insights de produtos mais vendidos
 * Estilo bold com gradientes vibrantes (matching CustomersList)
 */
export function CashFlowSection({ trends }) {
    if (!trends) return null

    const trendCards = [
        {
            label: "Categoria Mais Vendida",
            value: trends.category,
            description: "Segmento com maior saída",
            icon: LayoutGrid,
            gradient: "from-[#4A3B32] to-[#5A4B42]", // Dark Brown
            delay: 0.1
        },
        {
            label: "Tamanho Mais Vendido",
            value: trends.size,
            description: "Tamanho preferido das clientes",
            icon: Ruler,
            gradient: "from-amber-500 to-amber-600", // Amber
            delay: 0.2
        },
        {
            label: "Peça Mais Vendida",
            value: trends.product,
            description: "Best-seller do período",
            icon: Star,
            gradient: "from-[#C75D3B] to-[#A64D31]", // Terracotta
            delay: 0.3
        },
        {
            label: "Fornecedor Mais Lucrativo",
            value: trends.supplierMostProfitable,
            description: "Maior lucro líquido gerado",
            icon: Truck,
            gradient: "from-[#E8C4B0] to-[#D4A89A]", // Light Beige/Peach
            delay: 0.4
        },
        {
            label: "Fornecedor Mais Vendido",
            value: trends.supplierMostVolume,
            description: "Maior volume de peças vendidas",
            icon: Truck,
            gradient: "from-orange-500 to-orange-600", // Orange
            delay: 0.5
        }
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            {trendCards.map((card, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: card.delay }}
                    className="h-full"
                >
                    <div className={cn(
                        "border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br h-full rounded-2xl p-4 md:p-5",
                        card.gradient
                    )}>
                        <div className="flex items-start justify-between mb-3 gap-2">
                            <card.icon className="w-6 h-6 md:w-7 md:h-7 text-white/80 flex-shrink-0" />
                            <span className="text-xl md:text-2xl font-bold text-white text-right break-words leading-tight">
                                {card.value}
                            </span>
                        </div>
                        <p className="text-xs md:text-sm text-white/90 font-medium leading-tight mb-1">{card.label}</p>
                        <p className="text-[10px] md:text-xs text-white/70 leading-snug">{card.description}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}
