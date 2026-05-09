import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Phone, Mail, MessageCircle, ShoppingBag, TrendingUp, Star, Package, Calendar, Tag, Pencil, Instagram, MapPin, CreditCard, Banknote, Smartphone, Award, AlertCircle, Clock } from 'lucide-react'
import { useAdminCustomer } from '@/hooks/useAdminCustomers'
import { apiClient } from '@/lib/api-client'
import { cn, calculateCustomerSizeAnalysis } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

const formatCurrency = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PAYMENT_LABELS = {
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

        // Análise de Tamanhos por Grupo (usando helper centralizado)
        const sizeAnalysis = calculateCustomerSizeAnalysis(allItems)

        return { totalGasto, totalPedidos, ticketMedio, ultimaCompra, diasSemComprar, totalPecas, categorias, topItens, metodoPref, sizeAnalysis }
    }, [customer, vendas])

    const segment = SEGMENT_CONFIG[customer?.segment] || SEGMENT_CONFIG.inactive

    if (customerLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
                <div className="h-48 bg-gray-100 rounded-3xl" />
                <div className="grid grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
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

            {/* ── HEADER ── */}
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

                {/* Profile Card */}
                <div className="relative bg-gradient-to-br from-[#4A3B32] via-[#5A4B42] to-[#4A3B32] rounded-3xl p-6 md:p-8 text-white overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#C75D3B]/30 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-2xl border border-white/20 flex-shrink-0">
                            {getInitials(customer.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h2 className="text-2xl md:text-3xl font-display font-bold truncate">{customer.name}</h2>
                                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border', segment.color)}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full', segment.dot)} />
                                    {segment.label}
                                </span>
                                {metrics.totalPedidos > 0 && (metrics.totalGasto / metrics.totalPedidos) > (metrics.totalGasto / Math.max(metrics.totalPedidos, 1)) * 1.5 && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-400/30 text-amber-200 text-xs font-bold">
                                        <Star className="w-3 h-3 fill-amber-300" /> VIP
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-white/70 text-sm">
                                {customer.phone && (
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5" /> {customer.phone}
                                    </span>
                                )}
                                {customer.email && (
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5" /> {customer.email}
                                    </span>
                                )}
                                {customer.instagram && (
                                    <span className="flex items-center gap-1.5">
                                        <Instagram className="w-3.5 h-3.5" /> @{customer.instagram}
                                    </span>
                                )}
                                {customer.birthDate && (
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" /> {formatDate(customer.birthDate)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 flex-shrink-0">
                            {customer.phone && (
                                <button
                                    onClick={openWhatsApp}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">WhatsApp</span>
                                </button>
                            )}
                            <Link
                                to={`/admin/customers/${id}/edit`}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-bold text-sm transition-all hover:scale-105"
                            >
                                <Pencil className="w-4 h-4" />
                                <span className="hidden sm:inline">Editar</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── KPI CARDS ── */}
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
                        <Card className="border border-gray-100 shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', kpi.bg)}>
                                    <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{kpi.label}</p>
                                    <p className={cn('text-lg font-bold', kpi.color)}>{kpi.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* ── SIZE ANALYSIS ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                <Card className="border-none shadow-lg overflow-hidden bg-white">
                    <CardHeader className="bg-[#FAF8F5] border-b border-[#4A3B32]/5 py-4">
                        <CardTitle className="text-[#4A3B32] flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-[#C75D3B]" />
                            Análise de Perfil & Tamanhos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {Object.entries(metrics.sizeAnalysis).map(([key, analysis]) => (
                                <div key={key} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{analysis.label}</p>
                                        <div className="px-2 py-1 bg-[#4A3B32]/5 rounded-lg text-[10px] font-black text-[#4A3B32]/40 uppercase">
                                            {key}
                                        </div>
                                    </div>
                                    
                                    {analysis.primary ? (
                                        <div className="bg-gradient-to-br from-[#FDFBF7] to-white p-4 rounded-2xl border border-[#4A3B32]/5 relative group overflow-hidden">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-[#C75D3B]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                                            <p className="text-xs text-[#4A3B32]/50 mb-1">Tamanho Principal</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-black text-[#C75D3B]">{analysis.primary}</span>
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">FIT</span>
                                            </div>
                                            
                                            <div className="mt-4 space-y-1.5">
                                                {Object.entries(analysis.counts).sort((a,b) => b[1]-a[1]).map(([size, count], idx) => (
                                                    <div key={size} className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "w-6 text-[10px] font-bold",
                                                            size === analysis.primary ? "text-[#C75D3B]" : "text-gray-400"
                                                        )}>{size}</span>
                                                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={cn("h-full rounded-full", size === analysis.primary ? "bg-[#C75D3B]" : "bg-gray-300")} 
                                                                style={{ width: `${(count / Object.values(analysis.counts).reduce((a,b) => a+b, 0)) * 100}%` }} 
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-medium">{count}x</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-[120px] bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-4">
                                            <Tag className="w-6 h-6 text-gray-200 mb-2" />
                                            <p className="text-[10px] text-gray-400 font-medium leading-tight">Sem histórico suficiente para este grupo</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* ── MAIN CONTENT ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Purchase History */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-[#4A3B32] flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-[#C75D3B]" />
                        Histórico de Compras
                        <span className="ml-auto text-sm font-normal text-gray-400">{vendas.length} vendas</span>
                    </h2>

                    {vendasLoading ? (
                        <div className="space-y-3">
                            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
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
                                        <Card className={cn('border shadow-sm', isCancelled && 'opacity-50')}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-xs text-gray-400 mb-0.5">{formatDate(venda.createdAt)}</p>
                                                        <p className="font-bold text-[#4A3B32] text-lg">{formatCurrency(venda.totalValue)}</p>
                                                        {venda.discountAmount > 0 && (
                                                            <p className="text-xs text-orange-500">Desconto: -{formatCurrency(venda.discountAmount)}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold', payConf.color)}>
                                                            <PayIcon className="w-3 h-3" />
                                                            {payConf.label}
                                                            {venda.isInstallment && venda.numInstallments > 1 && ` ${venda.numInstallments}x`}
                                                        </span>
                                                        {isCancelled && (
                                                            <span className="text-xs text-red-500 font-medium">Cancelada</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {venda.items && venda.items.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {venda.items.map((item, idx) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600">
                                                                <Package className="w-3 h-3 text-gray-400" />
                                                                {item.name || item.productName}
                                                                {item.selectedSize && <span className="text-gray-400">· {item.selectedSize}</span>}
                                                                {item.selectedColor && <span className="text-gray-400">· {item.selectedColor}</span>}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-4">
                    {/* Total de Peças */}
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
                                {metrics.totalPedidos > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Peças por pedido</span>
                                        <span className="font-bold text-[#4A3B32]">{(metrics.totalPecas / metrics.totalPedidos).toFixed(1)}</span>
                                    </div>
                                )}
                                {metrics.metodoPref && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Pagamento preferido</span>
                                        <span className="font-bold text-[#4A3B32]">{PAYMENT_LABELS[metrics.metodoPref]?.label || metrics.metodoPref}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Categorias */}
                    {metrics.categorias.length > 0 && (
                        <Card className="border border-gray-100 shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <Tag className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <p className="font-bold text-[#4A3B32]">Categorias</p>
                                </div>
                                <div className="space-y-2">
                                    {metrics.categorias.map(([cat, count]) => {
                                        const pct = metrics.totalPecas > 0 ? Math.round((count / metrics.totalPecas) * 100) : 0
                                        return (
                                            <div key={cat}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-gray-600 font-medium truncate">{cat}</span>
                                                    <span className="text-gray-400 ml-2 flex-shrink-0">{count} · {pct}%</span>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#C75D3B] rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top Itens */}
                    {metrics.topItens.length > 0 && (
                        <Card className="border border-gray-100 shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                                        <Award className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <p className="font-bold text-[#4A3B32]">Peças Favoritas</p>
                                </div>
                                <div className="space-y-2">
                                    {metrics.topItens.map(([name, count], i) => (
                                        <div key={name} className="flex items-center gap-2 text-sm">
                                            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                                                {i + 1}
                                            </span>
                                            <span className="text-gray-600 truncate flex-1">{name}</span>
                                            <span className="text-gray-400 flex-shrink-0">{count}x</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
