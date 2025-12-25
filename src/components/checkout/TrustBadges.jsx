import { Shield, RefreshCw, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

export function TrustBadges() {
    const badges = [
        {
            icon: Shield,
            title: 'Entrega Segura',
            description: 'Rastreio em tempo real'
        },
        {
            icon: RefreshCw,
            title: 'Devoluções Grátis',
            description: 'Até 48h após entrega'
        },
        {
            icon: Heart,
            title: 'Curadoria Pessoal',
            description: 'Selecionado com amor'
        }
    ]

    return (
        <motion.div
            className="space-y-2 sm:space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {badges.map((badge, idx) => {
                const Icon = badge.icon
                return (
                    <motion.div
                        key={badge.title}
                        className="flex items-start gap-3 p-3 sm:p-4 bg-[#FDF0ED] border border-[#E8C4B0] rounded-lg"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#C75D3B] flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-[#4A3B32]">
                                {badge.title}
                            </div>
                            <div className="text-[12px] sm:text-xs text-[#4A3B32]/60">
                                {badge.description}
                            </div>
                        </div>
                    </motion.div>
                )
            })}
        </motion.div>
    )
}
