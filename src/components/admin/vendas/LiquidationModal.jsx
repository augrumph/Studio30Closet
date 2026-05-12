import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, CheckCircle2, DollarSign, Package, CreditCard,
    Receipt, Calendar, User, Banknote, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { triggerConfetti } from '@/components/magicui/confetti'

const fmt = (v) =>
    Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const SPRING  = { type: 'spring', stiffness: 380, damping: 32 }
const EASE    = { duration: 0.22, ease: [0.22, 1, 0.36, 1] }

const METHOD_MAP = {
    pending_decision: { label: 'A decidir',          icon: Receipt,   cls: 'bg-slate-100  text-slate-600'   },
    pix:              { label: 'PIX',                 icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700' },
    debit:            { label: 'Débito',              icon: CreditCard, cls: 'bg-blue-100   text-blue-700'   },
    card_machine:     { label: 'Crédito',             icon: CreditCard, cls: 'bg-blue-100   text-blue-700'   },
    credito_parcelado:{ label: 'Crédito Parcelado',   icon: Calendar,   cls: 'bg-indigo-100 text-indigo-700' },
    fiado:            { label: 'Crediário',           icon: Receipt,    cls: 'bg-amber-100  text-amber-700'  },
    fiado_parcelado:  { label: 'Crediário Parcelado', icon: Receipt,    cls: 'bg-orange-100 text-orange-700' },
    cash:             { label: 'Dinheiro',            icon: Banknote,   cls: 'bg-gray-100   text-gray-700'   },
    card:             { label: 'Cartão',              icon: CreditCard, cls: 'bg-blue-100   text-blue-700'   },
}

const stagger = {
    hidden: {},
    show:   { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show:   { opacity: 1, y: 0, transition: EASE },
}

// ── Success overlay ──────────────────────────────────────────────────────────
function SuccessView({ total, onClose }) {
    useEffect(() => {
        triggerConfetti({ particleCount: 120, spread: 90, origin: { y: 0.55 } })
        const t = setTimeout(onClose, 2800)
        return () => clearTimeout(t)
    }, [onClose])

    return (
        <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={SPRING}
            className="flex flex-col items-center justify-center gap-5 px-8 py-14 text-center"
        >
            {/* Ícone animado */}
            <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28, delay: 0.05 }}
                className="relative grid h-24 w-24 place-items-center rounded-full bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.35)]"
            >
                <CheckCircle2 className="h-12 w-12 text-white" strokeWidth={1.8} />
                {/* Pulso externo */}
                <motion.span
                    className="absolute inset-0 rounded-full bg-emerald-400"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.7 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...EASE, delay: 0.18 }}
            >
                <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-emerald-600">Recebimento confirmado</p>
                <div className="mt-1 flex items-baseline justify-center gap-1">
                    <span className="text-[22px] font-bold text-[#4A3B32]">R$</span>
                    <span className="text-[44px] font-black leading-none text-[#4A3B32]">
                        <NumberTicker value={total} decimalPlaces={2} className="text-[44px] font-black text-[#4A3B32]" />
                    </span>
                </div>
                <p className="mt-2 text-sm text-gray-400">Venda liquidada com sucesso!</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400"
            >
                <Sparkles className="h-3 w-3" />
                Fechando automaticamente…
            </motion.div>
        </motion.div>
    )
}

// ── Main modal ───────────────────────────────────────────────────────────────
export function LiquidationModal({ isOpen, onClose, onConfirm, venda, isPaying }) {
    const [phase, setPhase] = useState('review') // 'review' | 'success'

    // Reset quando o modal abre/fecha
    useEffect(() => {
        if (isOpen) setPhase('review')
    }, [isOpen])

    if (!venda) return null

    const items       = Array.isArray(venda.items) ? venda.items : []
    const totalItems  = items.reduce((s, i) => s + (i.quantity || 1), 0)
    const method      = METHOD_MAP[venda.paymentMethod] || { label: venda.paymentMethod, icon: DollarSign, cls: 'bg-gray-100 text-gray-700' }
    const MethodIcon  = method.icon
    const total       = Number(venda.totalValue || 0)
    const discount    = Number(venda.discountAmount || 0)
    const original    = Number(venda.originalTotal || total + discount)

    const handleConfirm = async () => {
        await onConfirm(venda.id)
        setPhase('success')
    }

    const handleClose = () => {
        setPhase('review')
        onClose()
    }

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={phase === 'review' ? handleClose : undefined}
                        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[3px]"
                    />

                    {/* Panel */}
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, y: 32, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.97 }}
                        transition={SPRING}
                        className="fixed inset-x-4 bottom-4 top-4 z-[201] mx-auto flex max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.22)] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full"
                    >
                        <AnimatePresence mode="wait">
                            {phase === 'success' ? (
                                <SuccessView key="success" total={total} onClose={handleClose} />
                            ) : (
                                <motion.div
                                    key="review"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={EASE}
                                    className="flex min-h-0 flex-col"
                                >
                                    {/* ── Header ────────────────────────── */}
                                    <div className="relative shrink-0 overflow-hidden">
                                        {/* Gradiente de fundo */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#FBF4F0] via-white to-white" />
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(199,93,59,0.08),transparent_60%)]" />

                                        <div className="relative flex items-start justify-between gap-4 p-6 pb-5">
                                            <div className="flex items-center gap-4">
                                                <motion.div
                                                    initial={{ scale: 0.7, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ ...SPRING, delay: 0.08 }}
                                                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.3)]"
                                                >
                                                    <DollarSign className="h-6 w-6 text-white" />
                                                </motion.div>
                                                <div>
                                                    <h2 className="text-[18px] font-black text-[#2C1810]">Confirmar Liquidação</h2>
                                                    <p className="text-[13px] text-[#8C6150]">Verifique os dados antes de confirmar</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleClose}
                                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="relative h-px bg-gradient-to-r from-transparent via-[#E8D4C8] to-transparent" />
                                    </div>

                                    {/* ── Body ──────────────────────────── */}
                                    <motion.div
                                        variants={stagger}
                                        initial="hidden"
                                        animate="show"
                                        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5"
                                    >
                                        {/* Cliente + Método */}
                                        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
                                            {/* Cliente */}
                                            <div className="flex flex-col gap-1.5 rounded-2xl border border-[#EDE0D8] bg-[#FAF7F4] p-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5 text-[#C75D3B]" />
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A07060]">Cliente</span>
                                                </div>
                                                <p className="text-[13.5px] font-bold text-[#2C1810] leading-tight">
                                                    {venda.customerName || 'Não identificado'}
                                                </p>
                                                <p className="text-[11px] text-[#A07060]">
                                                    #{venda.id} · {new Date(venda.createdAt).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>

                                            {/* Método */}
                                            <div className={cn('flex flex-col gap-1.5 rounded-2xl border border-transparent p-3.5', method.cls)}>
                                                <div className="flex items-center gap-1.5 opacity-70">
                                                    <MethodIcon className="h-3.5 w-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Pagamento</span>
                                                </div>
                                                <p className="text-[13.5px] font-bold leading-tight">{method.label}</p>
                                                {venda.numInstallments > 1 && (
                                                    <p className="text-[11px] opacity-70">
                                                        {venda.numInstallments}× de R$ {fmt((total - (venda.entryPayment || 0)) / venda.numInstallments)}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>

                                        {/* Itens */}
                                        <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-[#EDE0D8] bg-white">
                                            <div className="flex items-center gap-2 border-b border-[#F5EBE4] px-4 py-3">
                                                <Package className="h-3.5 w-3.5 text-[#C75D3B]" />
                                                <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#A07060]">
                                                    {totalItems} {totalItems === 1 ? 'peça' : 'peças'}
                                                </span>
                                            </div>

                                            <div className="max-h-[180px] divide-y divide-[#F5EBE4] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                                {items.map((item, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, x: -8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ ...EASE, delay: 0.15 + idx * 0.05 }}
                                                        className="flex items-center gap-3 px-4 py-3"
                                                    >
                                                        <div className="h-12 w-10 shrink-0 overflow-hidden rounded-xl bg-[#F5EBE4]">
                                                            <img
                                                                src={getOptimizedImageUrl(item.image || item.imageUrl || '/placeholder-product.png', { width: 80 })}
                                                                alt={item.name}
                                                                className="h-full w-full object-cover"
                                                                onError={e => { e.target.src = '/placeholder-product.png' }}
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-[13px] font-semibold text-[#2C1810]">{item.name}</p>
                                                            <p className="text-[11px] text-[#A07060]">
                                                                {[item.selectedColor || item.color, item.selectedSize || item.size].filter(Boolean).join(' · ')}
                                                                {item.quantity > 1 && ` · ${item.quantity}×`}
                                                            </p>
                                                        </div>
                                                        <p className="shrink-0 text-[13px] font-bold text-[#2C1810]">
                                                            R$ {fmt((item.quantity || 1) * (item.price || 0))}
                                                        </p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>

                                        {/* Totais */}
                                        <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-[#EDE0D8] bg-white">
                                            <div className="space-y-2.5 p-4">
                                                <div className="flex justify-between text-[13px]">
                                                    <span className="text-[#A07060]">Subtotal</span>
                                                    <span className="font-medium text-[#4A2E1E]">R$ {fmt(original)}</span>
                                                </div>
                                                {discount > 0 && (
                                                    <div className="flex justify-between text-[13px]">
                                                        <span className="text-red-400">Desconto</span>
                                                        <span className="font-bold text-red-500">− R$ {fmt(discount)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Total highlight */}
                                            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-4">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Total a Receber</p>
                                                    <div className="mt-0.5 flex items-baseline gap-1">
                                                        <span className="text-[15px] font-bold text-emerald-700">R$</span>
                                                        <span className="text-[28px] font-black leading-none text-emerald-700">
                                                            {fmt(total)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500 shadow-[0_4px_16px_rgba(16,185,129,0.3)]">
                                                    <DollarSign className="h-5 w-5 text-white" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    </motion.div>

                                    {/* ── Footer ────────────────────────── */}
                                    <div className="shrink-0 border-t border-[#EDE0D8] bg-white p-4">
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={handleClose}
                                                disabled={isPaying}
                                                className="h-12 flex-1 rounded-2xl border border-[#E5CFC5] bg-white text-[13.5px] font-semibold text-[#8C6150] transition-colors hover:bg-[#FAF7F4] disabled:opacity-40"
                                            >
                                                Cancelar
                                            </button>

                                            <ShimmerButton
                                                onClick={handleConfirm}
                                                disabled={isPaying}
                                                background="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                                                shimmerColor="rgba(255,255,255,0.4)"
                                                shimmerSize="0.1em"
                                                shimmerDuration="1.8s"
                                                borderRadius="16px"
                                                className={cn(
                                                    'h-12 flex-[2] gap-2.5 px-0 text-[13.5px] font-bold text-white',
                                                    'shadow-[0_4px_20px_rgba(16,185,129,0.35)]',
                                                    'hover:scale-[1.02] active:scale-[0.98]',
                                                    'disabled:opacity-60 disabled:hover:scale-100',
                                                )}
                                            >
                                                <AnimatePresence mode="wait">
                                                    {isPaying ? (
                                                        <motion.span
                                                            key="loading"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <motion.span
                                                                animate={{ rotate: 360 }}
                                                                transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                                                            >
                                                                <DollarSign className="h-4 w-4" />
                                                            </motion.span>
                                                            Liquidando…
                                                        </motion.span>
                                                    ) : (
                                                        <motion.span
                                                            key="idle"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            Confirmar Recebimento
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </ShimmerButton>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}
