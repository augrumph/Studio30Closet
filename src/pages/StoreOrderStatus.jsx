import { useMemo, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, XCircle, Package, Truck, ArrowLeft, ExternalLink, MapPin, RefreshCw } from 'lucide-react'
import { getPublicStoreOrder } from '@/lib/api/store'
import { formatPrice, cn } from '@/lib/utils'
import { SEO } from '@/components/SEO'
import { motion, AnimatePresence } from 'framer-motion'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'

const SHIPPING_STEPS = [
    { key: 'quoted',          label: 'Frete escolhido' },
    { key: 'label_generated', label: 'Etiqueta gerada' },
    { key: 'posted',          label: 'Postado' },
    { key: 'in_transit',      label: 'Em transporte' },
    { key: 'delivered',       label: 'Entregue' },
]

const SHIPPING_STEP_INDEX = Object.fromEntries(SHIPPING_STEPS.map((s, i) => [s.key, i]))

function CountdownTimer({ expiresAt }) {
    const [remaining, setRemaining] = useState('')

    useEffect(() => {
        if (!expiresAt) return
        const tick = () => {
            const diff = new Date(expiresAt) - Date.now()
            if (diff <= 0) { setRemaining('Expirado'); return }
            const m = Math.floor(diff / 60000)
            const s = Math.floor((diff % 60000) / 1000)
            setRemaining(`${m}:${String(s).padStart(2, '0')}`)
        }
        tick()
        const t = setInterval(tick, 1000)
        return () => clearInterval(t)
    }, [expiresAt])

    if (!remaining || remaining === 'Expirado') return null
    return (
        <span className="font-mono text-amber-600 font-bold">{remaining}</span>
    )
}

function ShippingTimeline({ status }) {
    const currentIdx = SHIPPING_STEP_INDEX[status] ?? -1

    return (
        <div className="flex items-center gap-0">
            {SHIPPING_STEPS.map((step, idx) => {
                const done = idx <= currentIdx
                const active = idx === currentIdx
                return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                            <div className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2',
                                done ? 'bg-[#C75D3B] border-[#C75D3B] text-white' : 'bg-white border-gray-200 text-gray-300'
                            )}>
                                {done ? <CheckCircle className="w-4 h-4" /> : <span>{idx + 1}</span>}
                            </div>
                            <span className={cn(
                                'text-[10px] font-semibold text-center leading-tight hidden sm:block max-w-[60px]',
                                done ? 'text-[#4A3B32]' : 'text-gray-300'
                            )}>{step.label}</span>
                        </div>
                        {idx < SHIPPING_STEPS.length - 1 && (
                            <div className={cn('flex-1 h-0.5 mx-1', done && idx < currentIdx ? 'bg-[#C75D3B]' : 'bg-gray-200')} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export function StoreOrderStatus() {
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const statusParam = searchParams.get('status')

    const { data: order, isLoading, isError, error } = useQuery({
        queryKey: ['store-order', id],
        queryFn: () => getPublicStoreOrder(id),
        enabled: !!id,
        refetchInterval: (q) => q.state.data?.paymentStatus === 'pending' ? 4000 : false,
        retry: 2,
    })

    const tone = useMemo(() => {
        if (order?.paymentStatus === 'approved') return 'success'
        if (order?.paymentStatus === 'cancelled' || statusParam === 'cancelled') return 'cancelled'
        if (['failed', 'chargeback', 'refunded'].includes(order?.paymentStatus)) return 'error'
        return 'pending'
    }, [order?.paymentStatus, statusParam])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <p className="text-sm font-medium">Carregando pedido...</p>
                </div>
            </div>
        )
    }

    if (isError || !order) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h1 className="text-xl font-display font-bold text-[#4A3B32] mb-2">Pedido não encontrado</h1>
                    <p className="text-sm text-gray-500 mb-6">{error?.message || 'Não conseguimos carregar esse pedido.'}</p>
                    <Link to="/catalogo" className="btn-primary inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
                    </Link>
                </div>
            </div>
        )
    }

    const shippingInfo = order.shippingQuote || {}

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <SEO title={`Pedido ${order.orderNumber}`} noIndex />

            <div className="max-w-2xl mx-auto space-y-4">

                {/* ── PENDING ──────────────────────────────────── */}
                <AnimatePresence mode="wait">
                {tone === 'pending' && (
                    <motion.div key="pending" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Hero card */}
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-amber-100">
                            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-8 py-8 text-center">
                                <div className="w-16 h-16 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8 text-white" />
                                </div>
                                <h1 className="text-2xl font-display font-bold text-white">Aguardando pagamento</h1>
                                <p className="text-amber-100 text-sm mt-1">
                                    Suas peças ficam reservadas por{' '}
                                    {order.reservationExpiresAt ? <CountdownTimer expiresAt={order.reservationExpiresAt} /> : '30 minutos'}
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="text-center">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pedido</p>
                                    <p className="text-xl font-mono font-bold text-[#4A3B32]">{order.orderNumber}</p>
                                </div>

                                {order.abacatePaymentUrl && (
                                    <a
                                        href={order.abacatePaymentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#4A3B32] hover:bg-[#C75D3B] text-white font-bold rounded-2xl transition-colors shadow-md"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Continuar para o pagamento
                                    </a>
                                )}

                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    <div className="flex-1 h-px bg-gray-100" />
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Atualizando automaticamente...</span>
                                    <div className="flex-1 h-px bg-gray-100" />
                                </div>

                                {/* Total */}
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">Total a pagar</span>
                                    <span className="text-xl font-black text-[#C75D3B]">{formatPrice(order.totalValue)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Items */}
                        {order.items?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <p className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    {order.items.length} {order.items.length === 1 ? 'item' : 'itens'} reservados
                                </p>
                                <div className="divide-y divide-gray-50">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 px-5 py-3">
                                            <div className="w-10 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                                {item.product?.images?.[0] && (
                                                    <img src={getOptimizedImageUrl(item.product.images[0], 80)} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[#4A3B32] truncate">{item.product?.name}</p>
                                                <p className="text-xs text-gray-400">{item.selectedColor} · {item.selectedSize} · {item.quantity}×</p>
                                            </div>
                                            <p className="text-sm font-bold text-[#4A3B32]">{formatPrice(item.totalPrice)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ── SUCCESS ──────────────────────────────────── */}
                {tone === 'success' && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                        {/* Hero */}
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-8 py-10 text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />
                                <motion.div
                                    className="w-16 h-16 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10"
                                    initial={{ scale: 0, rotate: -90 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                >
                                    <CheckCircle className="w-9 h-9 text-white" />
                                </motion.div>
                                <h1 className="text-2xl font-display font-bold text-white relative z-10">Pagamento confirmado!</h1>
                                <p className="text-emerald-100 text-sm mt-1 relative z-10">
                                    {order.customerName ? `Obrigada, ${order.customerName.split(' ')[0]}!` : 'Obrigada!'}
                                </p>
                            </div>

                            <div className="p-6">
                                <div className="text-center pb-4 border-b border-gray-100">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Número do pedido</p>
                                    <p className="text-2xl font-mono font-bold text-[#4A3B32]">{order.orderNumber}</p>
                                    {order.paidAt && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            Pago em {new Date(order.paidAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </div>

                                {/* Financial summary */}
                                <div className="py-4 border-b border-gray-100 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Produtos</span>
                                        <span className="font-semibold text-[#4A3B32]">{formatPrice(order.subtotalValue || order.totalValue - order.shippingValue)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Frete {shippingInfo.service ? `(${shippingInfo.carrier} — ${shippingInfo.service})` : ''}</span>
                                        <span className="font-semibold text-[#4A3B32]">{formatPrice(order.shippingValue)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-gray-100">
                                        <span className="font-black text-[#4A3B32]">Total pago</span>
                                        <span className="font-black text-[#C75D3B] text-lg">{formatPrice(order.totalValue)}</span>
                                    </div>
                                </div>

                                {/* Email confirmation notice */}
                                {order.customerEmail && (
                                    <div className="mt-4 flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                                        <span className="text-blue-500 text-lg">📧</span>
                                        <p className="text-sm text-blue-700">
                                            Um e-mail de confirmação foi enviado para <strong>{order.customerEmail}</strong>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items */}
                        {order.items?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <p className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-[#C75D3B]" /> Itens do pedido
                                </p>
                                <div className="divide-y divide-gray-50">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                                            <div className="w-12 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                                {item.product?.images?.[0] && (
                                                    <img src={getOptimizedImageUrl(item.product.images[0], 100)} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[#4A3B32] line-clamp-2">{item.product?.name}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {[item.selectedColor, item.selectedSize, item.quantity > 1 ? `×${item.quantity}` : null].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                            <p className="text-sm font-bold text-[#4A3B32] flex-shrink-0">{formatPrice(item.totalPrice || item.unitPrice * item.quantity)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shipping */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <p className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-[#C75D3B]" /> Entrega
                            </p>
                            <div className="p-5 space-y-4">
                                {/* Timeline */}
                                <ShippingTimeline status={order.shippingStatus} />

                                {/* Tracking */}
                                {order.melhorEnvioTrackingCode && (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Código de rastreio</p>
                                            <p className="font-mono font-bold text-[#4A3B32] text-sm mt-0.5">{order.melhorEnvioTrackingCode}</p>
                                        </div>
                                        <a
                                            href={`https://www.linkcorreios.com.br/?id=${order.melhorEnvioTrackingCode}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-[#C75D3B] hover:underline flex items-center gap-1"
                                        >
                                            Rastrear <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}

                                {/* Address */}
                                {order.shippingAddress?.street && (
                                    <div className="flex items-start gap-2.5 text-sm">
                                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                        <p className="text-gray-600">
                                            {order.shippingAddress.street}, {order.shippingAddress.number}
                                            {order.shippingAddress.complement ? `, ${order.shippingAddress.complement}` : ''} —{' '}
                                            {order.shippingAddress.district}, {order.shippingAddress.city}/{order.shippingAddress.state}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Link to="/catalogo" className="block text-center text-sm font-bold text-[#C75D3B] py-2 hover:underline">
                            ← Continuar comprando
                        </Link>
                    </motion.div>
                )}

                {/* ── CANCELLED / ERROR ────────────────────────── */}
                {(tone === 'cancelled' || tone === 'error') && (
                    <motion.div key="error" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                            <div className={cn(
                                'px-8 py-10 text-center',
                                tone === 'cancelled' ? 'bg-gradient-to-r from-orange-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-rose-500'
                            )}>
                                <div className="w-16 h-16 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <XCircle className="w-9 h-9 text-white" />
                                </div>
                                <h1 className="text-2xl font-display font-bold text-white">
                                    {tone === 'cancelled' ? 'Pedido cancelado' : 'Pagamento não aprovado'}
                                </h1>
                                <p className="text-white/80 text-sm mt-1">
                                    {tone === 'cancelled'
                                        ? 'Seu pedido foi cancelado. As peças foram liberadas.'
                                        : 'Houve um problema com o pagamento. Nenhum valor foi cobrado.'}
                                </p>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-500 text-center">
                                    Pedido: <span className="font-mono font-bold text-[#4A3B32]">{order.orderNumber}</span>
                                </p>
                                <Link
                                    to="/catalogo"
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-[#4A3B32] hover:bg-[#C75D3B] text-white font-bold rounded-2xl transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar ao catálogo
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </div>
    )
}
