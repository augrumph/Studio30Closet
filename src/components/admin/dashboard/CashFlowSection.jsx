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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            {trendCards.map((card, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: card.delay }}
                    className="h-full"
                >
                    <div className={cn(
                        "border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br h-full min-h-[108px] rounded-2xl p-3 md:p-5 flex flex-col justify-between",
                        card.gradient
                    )}>
                        <div>
                            <card.icon className="w-5 h-5 text-white/80 shrink-0" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/70 truncate">{card.label}</p>
                            <p className="text-[17px] md:text-xl font-black text-white leading-tight mt-0.5 line-clamp-2">{card.value}</p>
                            <p className="text-[10px] text-white/60 leading-snug mt-0.5 line-clamp-2">{card.description}</p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}
