import { Check, Package, Truck, Home } from 'lucide-react'
import { motion } from 'framer-motion'

export function MalinhaTimeline() {
    const steps = [
        {
            num: 1,
            title: 'Pedido Confirmado',
            description: 'Hoje',
            icon: Check,
            status: 'completed'
        },
        {
            num: 2,
            title: 'Preparando sua Malinha',
            description: 'Amanhã',
            icon: Package,
            status: 'in-progress'
        },
        {
            num: 3,
            title: 'A caminho',
            description: 'Em breve',
            icon: Truck,
            status: 'pending'
        },
        {
            num: 4,
            title: 'Entregue em sua casa',
            description: 'Você tem 48h para decidir',
            icon: Home,
            status: 'pending'
        }
    ]

    return (
        <div className="relative">
            <div className="space-y-4 sm:space-y-6">
                {steps.map((step, idx) => {
                    const Icon = step.icon
                    const isCompleted = step.status === 'completed'
                    const isInProgress = step.status === 'in-progress'

                    return (
                        <motion.div
                            key={step.num}
                            className="relative flex gap-4"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            {/* Timeline dot */}
                            <div className="relative flex flex-col items-center">
                                <motion.div
                                    animate={
                                        isInProgress
                                            ? {
                                                  boxShadow: [
                                                      '0 0 0 0 rgba(199, 93, 59, 0.7)',
                                                      '0 0 0 10px rgba(199, 93, 59, 0)'
                                                  ]
                                              }
                                            : {}
                                    }
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity
                                    }}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                        isCompleted
                                            ? 'bg-green-500 text-white'
                                            : isInProgress
                                              ? 'bg-[#C75D3B] text-white'
                                              : 'bg-gray-200 text-gray-400'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </motion.div>

                                {/* Connector line */}
                                {idx < steps.length - 1 && (
                                    <div
                                        className={`w-1 h-8 sm:h-12 mt-2 transition-colors ${
                                            isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                        }`}
                                    />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 py-1 sm:py-2">
                                <h3 className="font-semibold text-sm sm:text-base text-[#4A3B32]">
                                    {step.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-[#4A3B32]/60">
                                    {step.description}
                                </p>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
