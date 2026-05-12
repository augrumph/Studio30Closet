import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft, CreditCard, Truck, FileText, Package, User, Shield, ShieldCheck,
    ShieldX, ShieldAlert, Clock, CheckCircle, XCircle, ExternalLink, RotateCcw,
    AlertTriangle, Loader2, MapPin, Calendar, Hash
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { issueOrderInvoice, generateOrderShippingLabel } from '@/lib/api/orders'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { cn, formatPrice } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── API ───────────────────────────────────────────────────────────────────────

function getOrderFull(id) {
    return apiClient(`/orders/${id}/full`, { method: 'GET' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, className = '' }) {
    return (
        <div className={cn('bg-white rounded-2xl border border-gray-100 overflow-hidden', className)}>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#C75D3B]" />
                <h3 className="font-bold text-[#4A3B32] text-sm">{title}</h3>
            </div>
            <div className="p-5">{children}</div>
        </div>
    )
}

function StatusBadge({ value, map, defaultCls = 'bg-gray-100 text-gray-500' }) {
    const cfg = map[value]
    if (!cfg) return <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', defaultCls)}>{value}</span>
    return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', cfg.cls)}>
            {cfg.Icon && <cfg.Icon className="w-3.5 h-3.5" />}
            {cfg.label}
        </span>
    )
}

const PAYMENT_MAP = {
    pending:    { label: 'Aguardando',  cls: 'bg-amber-100 text-amber-700',   Icon: Clock },
    approved:   { label: 'Pago',        cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle },
    failed:     { label: 'Recusado',    cls: 'bg-red-100 text-red-700',       Icon: XCircle },
    cancelled:  { label: 'Cancelado',   cls: 'bg-gray-100 text-gray-500',     Icon: XCircle },
    refunded:   { label: 'Reembolsado', cls: 'bg-blue-100 text-blue-700',     Icon: RotateCcw },
    chargeback: { label: 'Disputa',     cls: 'bg-red-100 text-red-700',       Icon: AlertTriangle },
}

const SHIPPING_MAP = {
    not_started:      { label: 'Não iniciado',   cls: 'bg-gray-100 text-gray-500' },
    quoted:           { label: 'Frete escolhido', cls: 'bg-blue-50 text-blue-600' },
    label_pending:    { label: 'Etiq. pendente', cls: 'bg-amber-100 text-amber-700' },
    label_generated:  { label: 'Etiqueta gerada', cls: 'bg-indigo-100 text-indigo-700' },
    posted:           { label: 'Postado',         cls: 'bg-violet-100 text-violet-700' },
    in_transit:       { label: 'Em transporte',   cls: 'bg-orange-100 text-orange-700' },
    delivered:        { label: 'Entregue',        cls: 'bg-emerald-100 text-emerald-700' },
    delivery_problem: { label: 'Problema',        cls: 'bg-red-100 text-red-700' },
    returned:         { label: 'Devolvido',       cls: 'bg-red-50 text-red-600' },
}

const FISCAL_MAP = {
    not_issued: { label: 'Não emitida', cls: 'bg-gray-100 text-gray-500' },
    issuing:    { label: 'Emitindo',    cls: 'bg-amber-100 text-amber-700' },
    issued:     { label: 'Emitida',     cls: 'bg-emerald-100 text-emerald-700' },
    error:      { label: 'Erro',        cls: 'bg-red-100 text-red-700' },
    cancelled:  { label: 'Cancelada',   cls: 'bg-gray-100 text-gray-500' },
}

const FRAUD_MAP = {
    allow:            { label: 'Baixo risco',     cls: 'bg-emerald-100 text-emerald-700', Icon: ShieldCheck },
    review:           { label: 'Em revisão',      cls: 'bg-amber-100 text-amber-700',   Icon: ShieldAlert },
    block:            { label: 'Bloqueado',        cls: 'bg-red-100 text-red-700',       Icon: ShieldX },
    blocked_manual:   { label: 'Bloq. manual',    cls: 'bg-red-100 text-red-700',       Icon: ShieldX },
    approved_manual:  { label: 'Aprovado manual', cls: 'bg-emerald-100 text-emerald-700', Icon: ShieldCheck },
}

function EventBullet({ event }) {
    const dt = event.createdAt ? new Date(event.createdAt) : null
    return (
        <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#C75D3B] mt-1.5" />
                <div className="w-px flex-1 bg-gray-100 mt-1" />
            </div>
            <div className="pb-4 flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#4A3B32] leading-snug">{event.message || event.eventType}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{event.eventType}</p>
                {dt && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        {dt.toLocaleDateString('pt-BR')} {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

export function OnlineOrderDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const qc = useQueryClient()

    const { data: order, isLoading, isError } = useQuery({
        queryKey: ['admin', 'order-full', id],
        queryFn: () => getOrderFull(id),
        enabled: !!id,
        staleTime: 1000 * 30,
    })

    const invoiceMut = useMutation({
        mutationFn: () => issueOrderInvoice(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'order-full', id] }); toast.success('NF-e solicitada.') },
        onError: (e) => toast.error(formatUserFriendlyError(e)),
    })
    const labelMut = useMutation({
        mutationFn: () => generateOrderShippingLabel(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'order-full', id] }); toast.success('Etiqueta solicitada.') },
        onError: (e) => toast.error(formatUserFriendlyError(e)),
    })
    const approveMut = useMutation({
        mutationFn: () => apiClient(`/admin-tools/fraud/orders/${id}/approve`, { method: 'PATCH' }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'order-full', id] }); toast.success('Envio aprovado.') },
        onError: (e) => toast.error(formatUserFriendlyError(e)),
    })
    const blockMut = useMutation({
        mutationFn: ({ blockCpf, blockEmail }) =>
            apiClient(`/admin-tools/fraud/orders/${id}/block`, { method: 'PATCH', body: JSON.stringify({ blockCpf, blockEmail, reason: 'Bloqueado manualmente' }) }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'order-full', id] }); toast.success('Pedido bloqueado.') },
        onError: (e) => toast.error(formatUserFriendlyError(e)),
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-[#C75D3B]" />
            </div>
        )
    }

    if (isError || !order) {
        return (
            <div className="text-center py-32 text-gray-500">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
                <p className="font-bold">Pedido não encontrado</p>
            </div>
        )
    }

    const snapshot = order.customerSnapshot || {}
    const addr = order.shippingAddress || {}
    const isReview = order.fraudAction === 'review'
    const fraudScore = order.fraudScore ?? null
    const fraudSignals = order.fraudSignals ? Object.values(order.fraudSignals) : []
    const shippingQuote = order.shippingQuote || {}

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div>
                <button
                    onClick={() => navigate('/admin/pedidos-online')}
                    className="flex items-center gap-2 text-sm font-semibold text-[#4A3B32]/50 hover:text-[#4A3B32] transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Pedidos Online
                </button>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl md:text-3xl font-display font-bold text-[#4A3B32]">
                                {order.orderNumber || `#${order.id}`}
                            </h1>
                            <StatusBadge value={order.paymentStatus} map={PAYMENT_MAP} />
                            <StatusBadge value={order.fiscalStatus} map={FISCAL_MAP} />
                            <StatusBadge value={order.shippingStatus} map={SHIPPING_MAP} />
                            {fraudScore !== null && <StatusBadge value={order.fraudAction} map={FRAUD_MAP} />}
                        </div>
                        <p className="text-sm text-[#4A3B32]/50 mt-1">
                            Criado em {order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : '—'}
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                        {isReview && order.paymentStatus === 'approved' && (
                            <>
                                <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
                                    <ShieldCheck className="w-4 h-4" /> Aprovar envio
                                </button>
                                <button
                                    onClick={() => { if (window.confirm('Bloquear pedido e cliente?')) blockMut.mutate({ blockCpf: true, blockEmail: true }) }}
                                    disabled={blockMut.isPending}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
                                    <ShieldX className="w-4 h-4" /> Bloquear
                                </button>
                            </>
                        )}
                        <button onClick={() => invoiceMut.mutate()}
                            disabled={order.paymentStatus !== 'approved' || invoiceMut.isPending}
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-colors">
                            <FileText className="w-4 h-4" />
                            {invoiceMut.isPending ? 'Solicitando...' : 'NF-e'}
                        </button>
                        <button onClick={() => labelMut.mutate()}
                            disabled={order.paymentStatus !== 'approved' || order.fiscalStatus !== 'issued' || isReview || labelMut.isPending}
                            title={isReview ? 'Aprove a revisão de fraude primeiro' : ''}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-colors">
                            <Truck className="w-4 h-4" />
                            {labelMut.isPending ? 'Gerando...' : 'Etiqueta'}
                        </button>
                        {order.abacatePaymentUrl && order.paymentStatus === 'pending' && (
                            <a href={order.abacatePaymentUrl} target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#4A3B32] text-sm font-bold rounded-xl transition-colors">
                                <ExternalLink className="w-4 h-4" /> Abrir checkout
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Customer */}
                <Section title="Cliente" icon={User}>
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-400">Nome</dt>
                            <dd className="font-semibold text-[#4A3B32]">{order.customer?.name || snapshot.name || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-400">E-mail</dt>
                            <dd className="font-semibold text-[#4A3B32]">{order.customer?.email || snapshot.email || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-400">Telefone</dt>
                            <dd className="font-semibold text-[#4A3B32]">{order.customer?.phone || snapshot.phone || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-400">CPF</dt>
                            <dd className="font-mono font-semibold text-[#4A3B32]">{order.customer?.cpf || snapshot.cpf || '—'}</dd>
                        </div>
                    </dl>
                </Section>

                {/* Payment */}
                <Section title="Pagamento" icon={CreditCard}>
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-400">Produtos</dt>
                            <dd className="font-semibold">{formatPrice(order.subtotalValue || 0)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-400">Frete {shippingQuote.service ? `(${shippingQuote.carrier})` : ''}</dt>
                            <dd className="font-semibold">{formatPrice(order.shippingValue || 0)}</dd>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-100">
                            <dt className="font-black text-[#4A3B32]">Total</dt>
                            <dd className="font-black text-[#C75D3B] text-base">{formatPrice(order.totalValue || 0)}</dd>
                        </div>
                        {order.paidAt && (
                            <div className="flex justify-between">
                                <dt className="text-gray-400">Pago em</dt>
                                <dd className="font-semibold text-[#4A3B32]">{new Date(order.paidAt).toLocaleString('pt-BR')}</dd>
                            </div>
                        )}
                        {order.abacateCheckoutId && (
                            <div className="flex justify-between">
                                <dt className="text-gray-400">Checkout ID</dt>
                                <dd className="font-mono text-xs text-gray-500 truncate max-w-[140px]">{order.abacateCheckoutId}</dd>
                            </div>
                        )}
                    </dl>
                </Section>

                {/* Shipping */}
                <Section title="Entrega" icon={Truck}>
                    {addr.street ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-2 text-gray-600">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <span>
                                    {addr.street}, {addr.number}{addr.complement ? `, ${addr.complement}` : ''}<br />
                                    {addr.district} — {addr.city}/{addr.state}<br />
                                    CEP {addr.zipCode}
                                </span>
                            </div>
                            {order.melhorEnvioTrackingCode && (
                                <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                                    <span className="font-mono font-bold text-[#4A3B32] text-sm">{order.melhorEnvioTrackingCode}</span>
                                    <a href={`https://www.linkcorreios.com.br/?id=${order.melhorEnvioTrackingCode}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-[#C75D3B] font-bold hover:underline flex items-center gap-1">
                                        Rastrear <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Endereço não disponível</p>
                    )}
                </Section>

                {/* Fraud */}
                <Section title={`Risco de fraude — Score ${fraudScore ?? '—'}`} icon={Shield}>
                    <div className="space-y-3">
                        <StatusBadge value={order.fraudAction || 'allow'} map={FRAUD_MAP} />
                        {fraudSignals.length > 0 ? (
                            <ul className="space-y-1.5">
                                {fraudSignals.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                        <span className="w-4 h-4 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[10px]">!</span>
                                        {s.label}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-400">Nenhum sinal de risco detectado.</p>
                        )}
                        {order.fraudLog && (
                            <p className="text-[11px] text-gray-400">
                                Avaliado em {new Date(order.fraudLog.createdAt).toLocaleString('pt-BR')}
                            </p>
                        )}
                    </div>
                </Section>
            </div>

            {/* Items */}
            {order.items?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#C75D3B]" />
                        <h3 className="font-bold text-[#4A3B32] text-sm">{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-400 uppercase">
                                <tr>
                                    <th className="px-5 py-3 text-left">Produto</th>
                                    <th className="px-4 py-3 text-left">Variante</th>
                                    <th className="px-4 py-3 text-center">Qtd</th>
                                    <th className="px-4 py-3 text-right">Unit.</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {order.items.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                {item.images?.[0] && (
                                                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                        <img src={getOptimizedImageUrl(item.images[0], 80)} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <span className="font-semibold text-[#4A3B32]">{item.product?.name || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {[item.selectedColor, item.selectedSize].filter(Boolean).join(' / ')}
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right font-semibold">{formatPrice(item.unitPrice || 0)}</td>
                                        <td className="px-4 py-3 text-right font-black text-[#C75D3B]">{formatPrice(item.totalPrice || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Events timeline */}
            {order.events?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#C75D3B]" />
                        <h3 className="font-bold text-[#4A3B32] text-sm">Histórico do pedido</h3>
                    </div>
                    <div className="p-5">
                        {order.events.map((ev, i) => (
                            <EventBullet key={i} event={ev} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
