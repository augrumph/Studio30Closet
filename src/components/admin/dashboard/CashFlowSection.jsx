import { motion } from 'framer-motion'
import { Clock, AlertTriangle, CreditCard, Info } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

/**
 * Componente para exibir métricas de fluxo de caixa e risco
 */
export function CashFlowSection({ metrics }) {
    return (
        <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Valores Recebidos */}
                <CashFlowCard
                    label="Valores Recebidos"
                    value={metrics.receivedAmount}
                    icon={<img src="" alt="" className="hidden" />}
                    IconComponent={() => <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center">💰</span>}
                    colorClass="bg-emerald-100 text-emerald-600"
                    valueColorClass="text-emerald-600"
                    description="Valor bruto que entrou no caixa"
                    tooltip="Total de dinheiro que entrou no caixa no período selecionado. Inclui vendas pagas e todos os adiantamentos ou parcelas pagos pelos clientes."
                    delay={0.48}
                />

                {/* Valores a Receber */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ delay: 0.56, duration: 0.4 }}
                    className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center",
                                metrics.toReceiveAmount > 0 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                            )}>
                                <Clock className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" aria-label="Informações sobre valores a receber">
                                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm leading-relaxed">
                                    <p className="font-semibold mb-1">Valores a Receber (Fiado/Parcelas)</p>
                                    <p className="text-gray-300">Saldo total que os clientes ainda devem (crediário/fiado). Representa o que falta pagar de todas as parcelas ativas no sistema.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">Valores a Receber</p>
                        <h3 className={cn(
                            "text-2xl md:text-3xl font-display font-bold mb-3 leading-tight",
                            metrics.toReceiveAmount > 0 ? "text-amber-600" : "text-green-600"
                        )}>
                            R$ {(metrics.toReceiveAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium font-display tracking-tight">Saldo a liquidar</p>
                    </div>
                </motion.div>

                {/* Inadimplência */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ delay: 0.64, duration: 0.4 }}
                    className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center",
                                metrics.overdueAmount > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                            )}>
                                <AlertTriangle className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" aria-label="Informações sobre inadimplência">
                                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm leading-relaxed">
                                    <p className="font-semibold mb-1">Inadimplência (Atrasos)</p>
                                    <p className="text-gray-300">Valor das parcelas que já venceram e não foram pagas. Indica o risco real de perda financeira no momento.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">Inadimplência</p>
                        <h3 className={cn(
                            "text-2xl md:text-3xl font-display font-bold mb-3 leading-tight",
                            metrics.overdueAmount > 0 ? "text-red-600" : "text-green-600"
                        )}>
                            R$ {(metrics.overdueAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium font-display tracking-tight">Total vencido e não pago</p>
                    </div>
                </motion.div>

                {/* Lucro do Período */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ delay: 0.72, duration: 0.4 }}
                    className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all",
                                metrics.operatingProfit >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                            )}>
                                <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-xl">💵</span>
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" aria-label="Informações sobre lucro do período">
                                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm leading-relaxed">
                                    <p className="font-semibold mb-1">Lucro Operacional do Período</p>
                                    <p className="text-gray-300">Lucro Bruto menos Despesas Fixas proporcionais e Taxas de Pagamento. Representa o quanto sobrou depois de pagar todos os custos operacionais.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">Lucro do Período</p>
                        <h3 className={cn(
                            "text-2xl md:text-3xl font-display font-bold mb-3 leading-tight",
                            metrics.operatingProfit >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                            R$ {(metrics.operatingProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium font-display tracking-tight">
                            {metrics.netMarginPercent >= 0 ? '+' : ''}{(metrics.netMarginPercent || 0).toFixed(1)}% margem
                        </p>
                    </div>
                </motion.div>
            </div>
        </TooltipProvider>
    )
}

/**
 * Card reutilizável para métricas de fluxo de caixa
 */
function CashFlowCard({ label, value, IconComponent, colorClass, valueColorClass, description, tooltip, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ delay, duration: 0.4 }}
            className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center", colorClass)}>
                        <IconComponent />
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" aria-label={`Informações sobre ${label}`}>
                                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 text-sm leading-relaxed">
                            <p className="font-semibold mb-1">{label}</p>
                            <p className="text-gray-300">{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">{label}</p>
                <h3 className={cn("text-2xl md:text-3xl font-display font-bold mb-3 leading-tight", valueColorClass)}>
                    R$ {(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-emerald-600 font-medium font-display tracking-tight">{description}</p>
            </div>
        </motion.div>
    )
}
