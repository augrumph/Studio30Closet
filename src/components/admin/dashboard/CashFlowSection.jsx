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
            gradient: "from-[#4A3B32] to-[#5A4B42]",
            delay: 0.1
        },
        {
            label: "Tamanho Mais Vendido",
            value: trends.size,
            description: "Tamanho preferido das clientes",
            icon: Ruler,
            gradient: "from-amber-500 to-amber-600",
            delay: 0.2
        },
        {
            label: "Peça Mais Vendida",
            value: trends.product,
            description: "Best-seller do período",
            icon: Star,
            gradient: "from-[#C75D3B] to-[#A64D31]",
            delay: 0.3
        },
        {
            label: "Fornecedor Mais Vendido",
            value: trends.supplier,
            description: "Parceiro com maior volume",
            icon: Truck,
            gradient: "from-orange-500 to-orange-600",
            delay: 0.4
        }
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {trendCards.map((card, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: card.delay }}
                    className="h-full"
                >
                    <div className={cn(
                        "border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br h-full rounded-2xl p-4 md:p-6",
                        card.gradient
                    )}>
                        <div className="flex items-center justify-between mb-3">
                            <card.icon className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                            <span className="text-2xl md:text-3xl font-bold text-white truncate ml-2">
                                {card.value}
                            </span>
                        </div>
                        <p className="text-sm md:text-base text-white/90 font-medium">{card.label}</p>
                        <p className="text-xs text-white/70 mt-1">{card.description}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}
