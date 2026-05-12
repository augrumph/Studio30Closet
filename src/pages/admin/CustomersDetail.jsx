import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    ArrowLeft,
    Phone,
    Mail,
    MessageCircle,
    ShoppingBag,
    TrendingUp,
    Star,
    Package,
    Calendar,
    Tag,
    Pencil,
    Instagram,
    CreditCard,
    Banknote,
    Smartphone,
    Clock,
    Award,
} from 'lucide-react'
import { useAdminCustomer } from '@/hooks/useAdminCustomers'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { SizeProfileDeepDive } from '@/components/admin/dashboard'

const formatCurrency = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PAYMENT_LABELS = {
    pending_decision: { label: 'A decidir', icon: Clock, color: 'text-slate-600 bg-slate-50' },
    pix: { label: 'Pix', icon: Smartphone, color: 'text-emerald-600 bg-emerald-50' },
    debit: { label: 'Débito', icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
    card: { label: 'Crédito', icon: CreditCard, color: 'text-purple-600 bg-purple-50' },
    card_machine: { label: 'Maquininha', icon: CreditCard, color: 'text-indigo-600 bg-indigo-50' },
    credito_parcelado: { label: 'Parcelado', icon: CreditCard, color: 'text-violet-600 bg-violet-50' },
    fiado: { label: 'Fiado', icon: Banknote, color: 'text-amber-600 bg-amber-50' },
    fiado_parcelado: { label: 'Crediário', icon: Banknote, color: 'text-orange-600 bg-orange-50' },
    cash: { label: 'Dinheiro', icon: Banknote, color: 'text-green-600 bg-green-50' },
}

const SEGMENT_CONFIG = {
    active: { label: 'Ativo', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
    at_risk: { label: 'Em Risco', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
    churned: { label: 'Inativo', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
    inactive: { label: 'Sem Compras', color: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
}

function getInitials(name) {
    return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function CustomersDetail() {
    const { id } = useParams()

    const { data: customer, isLoading: customerLoading } = useAdminCustomer(id)
    const { data: vendas = [], isLoading: vendasLoading } = useQuery({
        queryKey: ['customer-vendas', id],
        queryFn: () => apiClient(`/customers/${id}/vendas`),
        enabled: !!id,
        staleTime: 1000 * 60 * 5
    })

    const allItems = useMemo(() => (
        vendas.flatMap((venda) => (venda.items || []).map((item) => ({
            ...item,
            category: item.category || item.productCategory || item.product_category || item.collection || '',
            name: item.name || item.productName || item.title || '',
            productName: item.productName || item.name || item.title || '',
            quantity: Number(item.quantity || item.qty || 1)
        })))
    ), [vendas])

    const metrics = useMemo(() => {
        const totalGasto = Number(customer?.lifetimeValue ?? vendas.reduce((sum, venda) => sum + Number(venda.totalValue || venda.total_value || 0), 0))
        const totalPedidos = Number(customer?.totalOrders ?? vendas.length)
        const ticketMedio = totalPedidos > 0 ? totalGasto / totalPedidos : 0

        const lastPurchaseDate = customer?.lastPurchaseDate || vendas.reduce((latest, venda) => {
            const current = new Date(venda.createdAt || venda.created_at || 0)
            if (!latest || current > latest) return current
            return latest
        }, null)

        const ultimaCompra = lastPurchaseDate instanceof Date && !Number.isNaN(lastPurchaseDate.getTime())
            ? lastPurchaseDate.toISOString()
            : customer?.lastPurchaseDate || null

        const diasSemComprar = ultimaCompra
            ? Math.floor((Date.now() - new Date(ultimaCompra)) / (1000 * 60 * 60 * 24))
            : null

        const totalPecas = allItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0)

        const categoriasMap = {}
        const topItensMap = {}
        const paymentMethodCounts = {}

        allItems.forEach((item) => {
            const category = (item.category || 'Sem categoria').trim()
            categoriasMap[category] = (categoriasMap[category] || 0) + Number(item.quantity || 1)

            const itemName = (item.name || item.productName || 'Item').trim()
            topItensMap[itemName] = (topItensMap[itemName] || 0) + Number(item.quantity || 1)
        })

        vendas.forEach((venda) => {
            const method = venda.paymentMethod || venda.payment_method
            if (!method) return
            paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1
        })

        const categorias = Object.entries(categoriasMap).sort((a, b) => b[1] - a[1])
        const topItens = Object.entries(topItensMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
        const metodoPref = Object.entries(paymentMethodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

        return {
            totalGasto,
            totalPedidos,
            ticketMedio,
            ultimaCompra,
            diasSemComprar,
            totalPecas,
            categorias,
            topItens,
            metodoPref,
        }
    }, [customer, vendas, allItems])

    const segment = SEGMENT_CONFIG[customer?.segment] || SEGMENT_CONFIG.inactive

    if (customerLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
                <div className="h-48 bg-gray-100 rounded-3xl" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
                </div>
            </div>
        )
    }

    if (!customer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-gray-500">Cliente não encontrado.</p>
                <Link to="/admin/customers" className="mt-4 text-[#C75D3B] font-bold hover:underline">← Voltar</Link>
            </div>
        )
    }

    const openWhatsApp = () => {
        const clean = customer.phone?.replace(/\D/g, '')
        if (!clean) return
        window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(`Olá ${customer.name}! Tudo bem?`)}`, '_blank')
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        to="/admin/customers"
                        className="p-2.5 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-gray-500 hover:text-[#4A3B32]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-[#4A3B32]">Perfil da Cliente</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Histórico completo e resumo de compras</p>
                    </div>
                </div>

                {/* ── Hero mobile (compacto) ── */}
                <div className="md:hidden bg-gradient-to-br from-[#4A3B32] to-[#5A4B42] rounded-2xl p-4 text-white overflow-hidden shadow-lg relative">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#C75D3B]/25 to-transparent pointer-events-none" />
                    <div className="relative flex items-center gap-3">
                        {/* Avatar */}
                        <div className="h-14 w-14 shrink-0 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xl border border-white/20">
                            {getInitials(customer.name)}
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-display font-bold text-[17px] truncate">{customer.name}</h2>
                                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border', segment.color)}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full', segment.dot)} />
                                    {segment.label}
                                </span>
                                {metrics.totalPedidos > 0 && (metrics.totalGasto / metrics.totalPedidos) > 400 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/30 text-amber-200 text-[10px] font-bold">
                                        <Star className="w-2.5 h-2.5 fill-amber-300" /> VIP
                                    </span>
                                )}
                            </div>
                            {customer.phone && (
                                <p className="text-[12px] text-white/70 mt-0.5 flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {customer.phone}
                                </p>
                            )}
                            {!customer.phone && customer.email && (
                                <p className="text-[12px] text-white/70 mt-0.5 truncate flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {customer.email}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Ações */}
                    <div className="relative flex items-center gap-2 mt-3">
                        {customer.phone && (
                            <button onClick={openWhatsApp}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 rounded-xl font-bold text-[13px] active:scale-95">
                                <MessageCircle className="w-4 h-4" /> WhatsApp
                            </button>
                        )}
                        <Link to={`/admin/customers/${id}/edit`}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/15 border border-white/20 rounded-xl font-bold text-[13px] active:scale-95">
                            <Pencil className="w-4 h-4" /> Editar
                        </Link>
                    </div>
                </div>

                {/* ── Hero desktop (original) ── */}
                <div className="hidden md:block relative bg-gradient-to-br from-[#4A3B32] via-[#5A4B42] to-[#4A3B32] rounded-3xl p-8 text-white overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#C75D3B]/30 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center text-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-2xl border border-white/20">
                            {getInitials(customer.name)}
                        </div>
                        <div className="min-w-0 max-w-3xl">
                            <div className="flex flex-wrap items-center justify-center gap-3 mb-2">
                                <h2 className="text-3xl font-display font-bold">{customer.name}</h2>
                                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border', segment.color)}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full', segment.dot)} />
                                    {segment.label}
                                </span>
                                {metrics.totalPedidos > 0 && (metrics.totalGasto / metrics.totalPedidos) > 400 && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-400/30 text-amber-200 text-xs font-bold">
                                        <Star className="w-3 h-3 fill-amber-300" /> VIP
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-4 text-white/70 text-sm">
                                {customer.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {customer.phone}</span>}
                                {customer.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>}
                                {customer.instagram && <span className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" /> @{customer.instagram}</span>}
                                {customer.birthDate && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(customer.birthDate)}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {customer.phone && (
                                <button onClick={openWhatsApp} className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-sm transition-all active:scale-95">
                                    <MessageCircle className="w-4 h-4" /> WhatsApp
                                </button>
                            )}
                            <Link to={`/admin/customers/${id}/edit`} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-bold text-sm transition-all">
                                <Pencil className="w-4 h-4" /> Editar
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Gasto', value: formatCurrency(metrics.totalGasto), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pedidos', value: metrics.totalPedidos, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Ticket Médio', value: formatCurrency(metrics.ticketMedio), icon: Tag, color: 'text-violet-600', bg: 'bg-violet-50' },
                    {
                        label: 'Última Compra',
                        value: metrics.diasSemComprar !== null ? `há ${metrics.diasSemComprar}d` : '—',
                        icon: Clock,
                        color: metrics.diasSemComprar > 60 ? 'text-red-600' : metrics.diasSemComprar > 30 ? 'text-orange-600' : 'text-emerald-600',
                        bg: metrics.diasSemComprar > 60 ? 'bg-red-50' : metrics.diasSemComprar > 30 ? 'bg-orange-50' : 'bg-emerald-50'
                    },
                ].map((kpi, i) => (
                    <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <div className={cn('rounded-2xl border p-3 flex items-center gap-2.5 border-gray-100 shadow-sm bg-white')}>
                            <div className={cn('h-9 w-9 shrink-0 rounded-xl flex items-center justify-center', kpi.bg)}>
                                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 truncate">{kpi.label}</p>
                                <p className={cn('text-[16px] md:text-lg font-bold leading-none mt-0.5', kpi.color)}>{kpi.value}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <SizeProfileDeepDive vendas={vendas} />

            {/* ── Resumo rápido (mobile only, 2×2) ── */}
            <div className="md:hidden grid grid-cols-2 gap-2">
                {[
                    { label: 'Peças',      value: metrics.totalPecas,  sub: `${metrics.totalPedidos > 0 ? (metrics.totalPecas / metrics.totalPedidos).toFixed(1) : '0'} por pedido` },
                    { label: 'Pagamento',  value: metrics.metodoPref ? (PAYMENT_LABELS[metrics.metodoPref]?.label || metrics.metodoPref) : '—', sub: 'preferido' },
                    { label: 'Categoria',  value: metrics.categorias[0]?.[0] || '—', sub: `${metrics.categorias[0]?.[1] || 0} compras` },
                    { label: 'Favorita',   value: metrics.topItens[0]?.[0]?.split(' ').slice(0, 2).join(' ') || '—', sub: `${metrics.topItens[0]?.[1] || 0}×` },
                ].map(item => (
                    <div key={item.label} className="bg-white border border-[#EDE0D8] rounded-2xl px-3 py-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#A07060]">{item.label}</p>
                        <p className="text-[14px] font-black text-[#2C1810] mt-0.5 truncate">{item.value}</p>
                        <p className="text-[10px] text-[#C4A090] mt-0.5 truncate">{item.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-[#4A3B32] flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-[#C75D3B]" />
                        Histórico de Compras
                        <span className="ml-auto text-sm font-normal text-gray-400">{vendas.length} vendas</span>
                    </h2>

                    {vendasLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
                        </div>
                    ) : vendas.length === 0 ? (
                        <Card className="border border-gray-100">
                            <CardContent className="p-8 text-center">
                                <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400 font-medium">Nenhuma compra registrada ainda</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {vendas.map((venda, i) => {
                                const payConf = PAYMENT_LABELS[venda.paymentMethod] || { label: venda.paymentMethod, icon: CreditCard, color: 'text-gray-600 bg-gray-50' }
                                const PayIcon = payConf.icon
                                const isCancelled = venda.paymentStatus === 'cancelled'

                                return (
                                    <motion.div
                                        key={venda.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                    >
                                        <div className={cn(
                                            'rounded-2xl border bg-white overflow-hidden',
                                            isCancelled ? 'opacity-50 border-gray-100' : 'border-[#EDE0D8]'
                                        )}>
                                            {/* Linha principal: data + valor + método */}
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="font-black text-[15px] text-[#2C1810]">{formatCurrency(venda.totalValue)}</p>
                                                        {venda.discountAmount > 0 && (
                                                            <p className="text-[10px] text-orange-500 font-semibold">-{formatCurrency(venda.discountAmount)}</p>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-[#A07060] mt-0.5">{formatDate(venda.createdAt)}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold', payConf.color)}>
                                                        <PayIcon className="w-3 h-3" />
                                                        {payConf.label}
                                                        {venda.isInstallment && venda.numInstallments > 1 && ` ${venda.numInstallments}×`}
                                                    </span>
                                                    {isCancelled && <span className="text-[10px] text-red-500 font-bold">Cancelada</span>}
                                                </div>
                                            </div>
                                            {venda.items && venda.items.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                                                    {venda.items.map((item, idx) => (
                                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-[#FAF7F4] border border-[#EDE0D8] rounded-lg text-[11px] text-[#6B4030] font-medium">
                                                            <Package className="w-2.5 h-2.5 text-[#C4A090] shrink-0" />
                                                            <span className="truncate max-w-[120px]">{item.name || item.productName}</span>
                                                            {item.selectedSize && <span className="text-[#C4A090]">{item.selectedSize}</span>}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <Card className="border border-gray-100 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-[#FAF3F0] flex items-center justify-center">
                                    <Package className="w-4 h-4 text-[#C75D3B]" />
                                </div>
                                <p className="font-bold text-[#4A3B32]">Resumo de Peças</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Total de peças</span>
                                    <span className="font-bold text-[#4A3B32]">{metrics.totalPecas}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Peças por pedido</span>
                                    <span className="font-bold text-[#4A3B32]">
                                        {metrics.totalPedidos > 0 ? (metrics.totalPecas / metrics.totalPedidos).toFixed(1) : '0'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Pagamento preferido</span>
                                    <span className="font-bold text-[#4A3B32]">
                                        {metrics.metodoPref ? (PAYMENT_LABELS[metrics.metodoPref]?.label || metrics.metodoPref) : '—'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-100 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-[#FAF3F0] flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-[#C75D3B]" />
                                </div>
                                <p className="font-bold text-[#4A3B32]">Categorias</p>
                            </div>
                            <div className="space-y-2">
                                {metrics.categorias.slice(0, 5).map(([cat, count]) => (
                                    <div key={cat} className="flex justify-between text-sm">
                                        <span className="text-gray-500 capitalize">{cat}</span>
                                        <span className="font-bold text-[#4A3B32]">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-100 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-[#FAF3F0] flex items-center justify-center">
                                    <Award className="w-4 h-4 text-[#C75D3B]" />
                                </div>
                                <p className="font-bold text-[#4A3B32]">Peças Favoritas</p>
                            </div>
                            <div className="space-y-2">
                                {metrics.topItens.map(([name, count], idx) => (
                                    <div key={name} className="flex justify-between text-sm">
                                        <span className="text-gray-500">
                                            {idx + 1}. {name}
                                        </span>
                                        <span className="font-bold text-[#4A3B32]">{count}x</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
