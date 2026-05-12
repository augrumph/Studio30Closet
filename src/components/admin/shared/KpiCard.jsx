import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'

/**
 * KpiCard — card de métrica padronizado, responsivo, 2-col safe.
 *
 * Props:
 *   label      — texto do rótulo (string)
 *   value      — valor principal (string | number | ReactNode)
 *   sub        — linha secundária abaixo do valor (string | ReactNode, opcional)
 *   icon       — componente de ícone Lucide
 *   iconBg     — classe Tailwind p/ fundo do ícone     (ex: "bg-emerald-100")
 *   iconColor  — classe Tailwind p/ cor do ícone       (ex: "text-emerald-600")
 *   accent     — classe Tailwind p/ cor do valor       (default: "text-[#2C1810]")
 *   tooltip    — texto do tooltip (opcional)
 *   onClick    — handler (opcional, torna o card clicável)
 *   badge      — ReactNode renderizado no canto superior direito (opcional)
 *   gradient   — classe Tailwind de fundo (ex: "bg-gradient-to-br from-red-50 to-white")
 *   delay      — delay de animação em segundos
 *   className  — classes extras no wrapper externo
 */
export function KpiCard({
    label,
    value,
    sub,
    icon: Icon,
    iconBg    = 'bg-[#F0E6DF]',
    iconColor = 'text-[#C75D3B]',
    accent    = 'text-[#2C1810]',
    tooltip,
    onClick,
    badge,
    gradient  = 'bg-white',
    delay     = 0,
    className,
}) {
    const isClickable = Boolean(onClick)

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1], delay }}
            className={cn('h-full', className)}
        >
            <div
                onClick={onClick}
                className={cn(
                    'group relative flex h-full min-h-[108px] flex-col justify-between overflow-hidden rounded-2xl border border-[#EDE0D8] p-3 md:p-4 transition-all duration-200',
                    gradient,
                    isClickable && 'cursor-pointer hover:shadow-md hover:border-[#C75D3B]/30 active:scale-[0.98]',
                )}
            >
                {/* Top row: icon + badge/tooltip */}
                <div className="flex items-start justify-between gap-2">
                    {/* Icon */}
                    <div className={cn(
                        'grid shrink-0 place-items-center rounded-xl',
                        'h-8 w-8 md:h-9 md:w-9',
                        iconBg,
                    )}>
                        <Icon className={cn('h-4 w-4 md:h-[18px] md:w-[18px]', iconColor)} />
                    </div>

                    {/* Badge + tooltip */}
                    <div className="flex shrink-0 items-center gap-1">
                        {badge}
                        {tooltip && (
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={e => e.stopPropagation()}
                                            className="hidden sm:grid h-6 w-6 place-items-center rounded-full text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500"
                                        >
                                            <HelpCircle className="h-3.5 w-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-[#2C1810] p-3 text-xs text-white shadow-xl">
                                        {tooltip}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>

                {/* Bottom: label + value + sub */}
                <div className="mt-2 min-w-0">
                    <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-[#A07060]">
                        {label}
                    </p>
                    <p className={cn(
                        'mt-0.5 truncate font-black leading-none',
                        'text-[18px] md:text-[22px]',
                        accent,
                    )}>
                        {value}
                    </p>
                    {sub && (
                        <p className="mt-1 truncate text-[11px] font-medium text-[#A07060]">
                            {sub}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
