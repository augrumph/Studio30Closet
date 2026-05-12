import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, RefreshCw, CreditCard, Truck, FileText, PackageCheck, ExternalLink, AlertTriangle, Clock, CheckCircle, XCircle, ShieldAlert, ShieldCheck, ShieldX, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { getOrders, issueOrderInvoice, generateOrderShippingLabel } from '@/lib/api/orders'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { cn, formatPrice } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { apiClient } from '@/lib/api-client'

const paymentLabels = {
    pending: { label: 'Aguardando', icon: Clock, className: 'bg-amber-50 text-amber-700' },
    approved: { label: 'Pago', icon: CheckCircle, className: 'bg-emerald-50 text-emerald-700' },
    failed: { label: 'Recusado', icon: XCircle, className: 'bg-red-50 text-red-700' },
    cancelled: { label: 'Cancelado', icon: XCircle, className: 'bg-gray-100 text-gray-600' },
    refunded: { label: 'Reembolsado', icon: RefreshCw, className: 'bg-blue-50 text-blue-700' },
    chargeback: { label: 'Disputa', icon: AlertTriangle, className: 'bg-red-50 text-red-700' }
}

const shippingLabels = {
    not_started: 'Nao iniciado',
    quoted: 'Frete escolhido',
    label_pending: 'Etiqueta pendente',
    label_generated: 'Etiqueta gerada',
    posted: 'Postado',
    in_transit: 'Em transporte',
    delivered: 'Entregue',
    delivery_problem: 'Problema',
    returned: 'Devolvido'
}

const fiscalLabels = {
    not_issued: 'Nao emitida',
    issuing: 'Emitindo',
    issued: 'Emitida',
    error: 'Erro',
    cancelled: 'Cancelada'
}

function RiskBadge({ score, action }) {
    if (!score && score !== 0) return null
    const cfg = action === 'block' || action === 'blocked_manual'
        ? { label: `Bloqueado ${score}`, cls: 'bg-red-100 text-red-700', Icon: ShieldX }
        : action === 'review'
            ? { label: `Revisão ${score}`, cls: 'bg-amber-100 text-amber-700', Icon: ShieldAlert }
            : action === 'approved_manual'
                ? { label: `Aprovado ${score}`, cls: 'bg-emerald-100 text-emerald-700', Icon: ShieldCheck }
                : score >= 20
                    ? { label: `${score} pts`, cls: 'bg-gray-100 text-gray-500', Icon: ShieldAlert }
                    : null

    if (!cfg) return null
    const { label, cls, Icon } = cfg
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold', cls)}>
            <Icon className="w-3 h-3" />{label}
        </span>
    )
}

function ReturnBadge({ status }) {
    if (!status || status === 'none') return null
    const map = {
        requested:      { label: 'Dev. solicitada', cls: 'bg-orange-100 text-orange-700' },
        approved:       { label: 'Dev. aprovada',   cls: 'bg-blue-100 text-blue-700' },
        received:       { label: 'Aguard. vistoria', cls: 'bg-purple-100 text-purple-700' },
        approved_refund:{ label: 'Reembolsado',     cls: 'bg-emerald-100 text-emerald-700' },
        rejected:       { label: 'Dev. rejeitada',  cls: 'bg-red-100 text-red-700' },
    }
    const cfg = map[status]
    if (!cfg) return null
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold', cfg.cls)}>
            <RotateCcw className="w-3 h-3" />{cfg.label}
        </span>
    )
}

function StatusPill({ value, type }) {
    if (type === 'payment') {
        const status = paymentLabels[value] || paymentLabels.pending
        const Icon = status.icon
        return (
            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold', status.className)}>
                <Icon className="w-3.5 h-3.5" />
                {status.label}
            </span>
        )
    }

    const label = type === 'fiscal' ? fiscalLabels[value] : shippingLabels[value]
    return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-600">
            {label || value || 'Pendente'}
        </span>
    )
}

export function OnlineOrdersList() {
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const queryClient = useQueryClient()

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['admin', 'online-orders', { searchTerm, statusFilter }],
        queryFn: () => getOrders({
            page: 1,
            limit: 100,
            orderType: 'ecommerce',
            status: statusFilter,
            searchTerm
        }),
        staleTime: 1000 * 20,
        refetchInterval: 1000 * 30
    })

    const invoiceMutation = useMutation({
        mutationFn: issueOrderInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'online-orders'] })
            toast.success('Fluxo de NF-e registrado.')
        },
        onError: (error) => toast.error(formatUserFriendlyError(error))
    })

    const labelMutation = useMutation({
        mutationFn: generateOrderShippingLabel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'online-orders'] })
            toast.success('Fluxo de etiqueta registrado.')
        },
        onError: (error) => toast.error(formatUserFriendlyError(error))
    })

    const approveFraudMutation = useMutation({
        mutationFn: (id) => apiClient(`/admin-tools/fraud/orders/${id}/approve`, { method: 'PATCH' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'online-orders'] })
            toast.success('Pedido aprovado para envio.')
        },
        onError: (err) => toast.error(formatUserFriendlyError(err))
    })

    const blockFraudMutation = useMutation({
        mutationFn: ({ id, blockCpf, blockEmail }) =>
            apiClient(`/admin-tools/fraud/orders/${id}/block`, { method: 'PATCH', body: JSON.stringify({ blockCpf, blockEmail, reason: 'Bloqueado manualmente pelo admin' }) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'online-orders'] })
            toast.success('Pedido bloqueado.')
        },
        onError: (err) => toast.error(formatUserFriendlyError(err))
    })

    const orders = data?.orders || []
    const metrics = useMemo(() => ({
        pending: orders.filter(order => order.paymentStatus === 'pending').length,
        paid: orders.filter(order => order.paymentStatus === 'approved').length,
        labelPending: orders.filter(order => order.shippingStatus === 'label_pending').length,
        total: orders.reduce((sum, order) => sum + Number(order.totalValue || 0), 0)
    }), [orders])

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#4A3B32] rounded-2xl shadow-lg">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Pedidos Online</h2>
                    </div>
                    <p className="text-[#4A3B32]/60 font-medium mt-2">E-commerce com pagamento, frete, NF-e e etiqueta.</p>
                </div>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-100 font-bold text-[#4A3B32] shadow-sm"
                >
                    <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
                    Atualizar
                </button>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
                <Card><CardContent className="p-5"><p className="text-xs text-gray-400 font-bold uppercase">Aguardando</p><p className="text-2xl font-black text-amber-600">{metrics.pending}</p></CardContent></Card>
                <Card><CardContent className="p-5"><p className="text-xs text-gray-400 font-bold uppercase">Pagos</p><p className="text-2xl font-black text-emerald-600">{metrics.paid}</p></CardContent></Card>
                <Card><CardContent className="p-5"><p className="text-xs text-gray-400 font-bold uppercase">Etiqueta pendente</p><p className="text-2xl font-black text-blue-600">{metrics.labelPending}</p></CardContent></Card>
                <Card><CardContent className="p-5"><p className="text-xs text-gray-400 font-bold uppercase">Total listado</p><p className="text-2xl font-black text-[#C75D3B]">{formatPrice(metrics.total)}</p></CardContent></Card>
            </div>

            <Card className="border-none shadow-xl">
                <CardHeader className="border-b border-gray-50">
                    <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                        <CardTitle>Fila operacional</CardTitle>
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Buscar pedido, cliente, telefone..."
                                    className="w-full md:w-80 pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-[#4A3B32] outline-none"
                            >
                                <option value="all">Todos</option>
                                <option value="awaiting_payment">Aguardando pagamento</option>
                                <option value="paid">Pago</option>
                                <option value="invoice_issued">NF-e emitida</option>
                                <option value="label_generated">Etiqueta gerada</option>
                                <option value="cancelled">Cancelado</option>
                                    <option value="fraud_review">⚠️ Em revisão de fraude</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-10 text-center text-gray-400">Carregando pedidos...</div>
                    ) : orders.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">Nenhum pedido online encontrado.</div>
                    ) : (
                        <>
                        <div className="md:hidden divide-y divide-gray-100 bg-[#FAF8F5]">
                            {orders.map(order => {
                                const isReview = order.fraudAction === 'review'
                                return (
                                    <div
                                        key={order.id}
                                        onClick={() => navigate(`/admin/pedidos-online/${order.id}`)}
                                        className={cn('bg-white p-4 active:bg-[#FDF0ED] transition-colors', isReview && 'bg-amber-50/70')}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-black text-[#4A3B32] text-base">{order.orderNumber}</p>
                                                <p className="text-sm font-bold text-[#4A3B32]/80 truncate">
                                                    {order.customer?.name || order.customerName || 'Cliente'}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate">{order.customer?.email || order.customerEmail}</p>
                                            </div>
                                            <p className="text-lg font-black text-[#C75D3B] shrink-0">{formatPrice(order.totalValue || 0)}</p>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <StatusPill type="payment" value={order.paymentStatus} />
                                            <StatusPill type="fiscal" value={order.fiscalStatus} />
                                            <StatusPill type="shipping" value={order.shippingStatus} />
                                            <RiskBadge score={order.fraudScore} action={order.fraudAction} />
                                            <ReturnBadge status={order.returnStatus} />
                                        </div>

                                        {order.melhorEnvioTrackingCode && (
                                            <p className="mt-2 text-xs font-black text-[#4A3B32]">Rastreio: {order.melhorEnvioTrackingCode}</p>
                                        )}

                                        <div className="mt-3 flex gap-2 justify-end flex-wrap">
                                            {isReview && order.paymentStatus === 'approved' && (
                                                <>
                                                    <button type="button" onClick={(event) => { event.stopPropagation(); approveFraudMutation.mutate(order.id) }}
                                                        disabled={approveFraudMutation.isPending}
                                                        className="min-h-[44px] w-12 inline-flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 disabled:opacity-40" title="Aprovar envio" aria-label="Aprovar envio">
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </button>
                                                    <button type="button"
                                                        onClick={(event) => { event.stopPropagation(); if (window.confirm('Bloquear este pedido e o CPF/e-mail do cliente?')) blockFraudMutation.mutate({ id: order.id, blockCpf: true, blockEmail: true }) }}
                                                        disabled={blockFraudMutation.isPending}
                                                        className="min-h-[44px] w-12 inline-flex items-center justify-center rounded-2xl bg-red-50 text-red-700 disabled:opacity-40" title="Bloquear pedido e cliente" aria-label="Bloquear pedido e cliente">
                                                        <ShieldX className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {order.abacatePaymentUrl && order.paymentStatus === 'pending' && (
                                                <a href={order.abacatePaymentUrl} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer" className="min-h-[44px] w-12 inline-flex items-center justify-center rounded-2xl bg-gray-50 text-gray-600" title="Abrir checkout" aria-label="Abrir checkout">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                            <button type="button" onClick={(event) => { event.stopPropagation(); invoiceMutation.mutate(order.id) }}
                                                disabled={order.paymentStatus !== 'approved' || invoiceMutation.isPending}
                                                className="min-h-[44px] w-12 inline-flex items-center justify-center rounded-2xl bg-amber-50 text-amber-700 disabled:opacity-40" title="Emitir NF-e" aria-label="Emitir NF-e">
                                                <FileText className="w-4 h-4" />
                                            </button>
                                            <button type="button" onClick={(event) => { event.stopPropagation(); labelMutation.mutate(order.id) }}
                                                disabled={order.paymentStatus !== 'approved' || order.fiscalStatus !== 'issued' || (isReview && order.fraudAction === 'review') || labelMutation.isPending}
                                                className="min-h-[44px] w-12 inline-flex items-center justify-center rounded-2xl bg-blue-50 text-blue-700 disabled:opacity-40" title={isReview ? 'Aguardando aprovação de fraude' : 'Gerar etiqueta'} aria-label={isReview ? 'Aguardando aprovação de fraude' : 'Gerar etiqueta'}>
                                                <Truck className="w-4 h-4" />
                                            </button>
                                            <a href={`/pedido/${order.id}`} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer" className="min-h-[44px] w-12 inline-flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700" title="Ver página do cliente" aria-label="Ver página do cliente">
                                                <PackageCheck className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-4 py-4 text-left">Pedido</th>
                                        <th className="px-4 py-4 text-left">Cliente</th>
                                        <th className="px-4 py-4 text-left">Risco</th>
                                        <th className="px-4 py-4 text-left">Pagamento</th>
                                        <th className="px-4 py-4 text-left">Fiscal</th>
                                        <th className="px-4 py-4 text-left">Envio</th>
                                        <th className="px-4 py-4 text-right">Total</th>
                                        <th className="px-4 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {orders.map(order => {
                                        const isReview = order.fraudAction === 'review'
                                        return (
                                        <tr
                                            key={order.id}
                                            onClick={() => navigate(`/admin/pedidos-online/${order.id}`)}
                                            className={cn('transition-colors cursor-pointer', isReview ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-[#FDFBF7]')}
                                        >
                                            <td className="px-4 py-4">
                                                <Link to={`/admin/pedidos-online/${order.id}`} className="hover:text-[#C75D3B] transition-colors">
                                                    <p className="font-black text-[#4A3B32] text-sm hover:underline">{order.orderNumber}</p>
                                                </Link>
                                                <p className="text-xs text-gray-400">#{order.id}</p>
                                                <ReturnBadge status={order.returnStatus} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-[#4A3B32] text-sm">{order.customer?.name || order.customerName || 'Cliente'}</p>
                                                <p className="text-xs text-gray-400">{order.customer?.email || order.customerEmail}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <RiskBadge score={order.fraudScore} action={order.fraudAction} />
                                                {order.fraudSignals && Object.keys(order.fraudSignals).length > 0 && (
                                                    <p className="text-[10px] text-gray-400 mt-1 max-w-[140px] truncate" title={Object.values(order.fraudSignals).map(s => s.label).join(', ')}>
                                                        {Object.values(order.fraudSignals).map(s => s.label).join(', ')}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-4"><StatusPill type="payment" value={order.paymentStatus} /></td>
                                            <td className="px-4 py-4"><StatusPill type="fiscal" value={order.fiscalStatus} /></td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <StatusPill type="shipping" value={order.shippingStatus} />
                                                    {order.melhorEnvioTrackingCode && <p className="text-xs font-bold text-[#4A3B32]">{order.melhorEnvioTrackingCode}</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-[#C75D3B] text-sm">{formatPrice(order.totalValue || 0)}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-1.5 flex-wrap">
                                                    {/* Aprovar/bloquear revisão de fraude */}
                                                    {isReview && order.paymentStatus === 'approved' && (
                                                        <>
                                                            <button type="button" onClick={(event) => { event.stopPropagation(); approveFraudMutation.mutate(order.id) }}
                                                                disabled={approveFraudMutation.isPending}
                                                                className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40" title="Aprovar envio">
                                                                <ShieldCheck className="w-4 h-4" />
                                                            </button>
                                                            <button type="button"
                                                                onClick={(event) => { event.stopPropagation(); if (window.confirm('Bloquear este pedido e o CPF/e-mail do cliente?')) blockFraudMutation.mutate({ id: order.id, blockCpf: true, blockEmail: true }) }}
                                                                disabled={blockFraudMutation.isPending}
                                                                className="p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40" title="Bloquear pedido e cliente">
                                                                <ShieldX className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {order.abacatePaymentUrl && order.paymentStatus === 'pending' && (
                                                        <a href={order.abacatePaymentUrl} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100" title="Abrir checkout">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    <button type="button" onClick={(event) => { event.stopPropagation(); invoiceMutation.mutate(order.id) }}
                                                        disabled={order.paymentStatus !== 'approved' || invoiceMutation.isPending}
                                                        className="p-2 rounded-xl bg-amber-50 text-amber-700 disabled:opacity-40" title="Emitir NF-e">
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                    <button type="button" onClick={(event) => { event.stopPropagation(); labelMutation.mutate(order.id) }}
                                                        disabled={order.paymentStatus !== 'approved' || order.fiscalStatus !== 'issued' || (isReview && order.fraudAction === 'review') || labelMutation.isPending}
                                                        className="p-2 rounded-xl bg-blue-50 text-blue-700 disabled:opacity-40" title={isReview ? 'Aguardando aprovação de fraude' : 'Gerar etiqueta'}>
                                                        <Truck className="w-4 h-4" />
                                                    </button>
                                                    <a href={`/pedido/${order.id}`} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-emerald-50 text-emerald-700" title="Ver página do cliente">
                                                        <PackageCheck className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
