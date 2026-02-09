/**
 * ============================================================================
 * EntregasList - Gestão de Entregas (TikTok Shop Ready)
 * ============================================================================
 *
 * Seguindo os padrões visuais de CustomersList:
 * - Cards com gradientes vibrantes
 * - Filtros com contadores
 * - Modal de detalhes animado
 * - Ações rápidas
 * - Paleta de cores harmonizada
 */

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    PackageCheck,
    Truck,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    RefreshCw,
    ExternalLink,
    MapPin,
    Package,
    AlertTriangle,
    X,
    Copy,
    Phone,
    User,
    Calendar,
    Hash,
    ShoppingBag,
    Plus,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { toast } from 'sonner'
import { useEntregas, useEntregasMutations, useEntregasMetrics } from '@/hooks/useEntregas'

// 🎯 TIKTOK SHOP INTEGRATION - Ready for API credentials
// TODO: Add TikTok Shop API credentials in .env:
// VITE_TIKTOK_SHOP_APP_KEY=
// VITE_TIKTOK_SHOP_APP_SECRET=
// VITE_TIKTOK_SHOP_ACCESS_TOKEN=

const DELIVERY_STATUS = {
    pending: { label: 'Pendente', color: 'amber', bgClass: 'bg-amber-50', textClass: 'text-amber-700', borderClass: 'border-amber-200', icon: Clock },
    processing: { label: 'Processando', color: 'blue', bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-200', icon: Package },
    shipped: { label: 'Enviado', color: 'violet', bgClass: 'bg-violet-50', textClass: 'text-violet-700', borderClass: 'border-violet-200', icon: Truck },
    delivered: { label: 'Entregue', color: 'emerald', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-200', icon: CheckCircle2 },
    cancelled: { label: 'Cancelado', color: 'red', bgClass: 'bg-red-50', textClass: 'text-red-700', borderClass: 'border-red-200', icon: XCircle }
}

// Mock data - será substituído pela API do TikTok Shop
const initialDeliveries = [
    {
        id: 'ENT-001',
        orderId: 'TT-2024-001',
        customer: { name: 'Maria Silva', phone: '11999887766', address: 'Rua das Flores, 123 - São Paulo, SP, 01234-567' },
        items: [{ name: 'Blusa Rosa Elegante', qty: 1, price: 89.90 }, { name: 'Calça Jeans', qty: 1, price: 159.90 }],
        total: 249.80,
        status: 'pending',
        platform: 'tiktok',
        createdAt: new Date().toISOString(),
        trackingCode: null,
        notes: ''
    },
    {
        id: 'ENT-002',
        orderId: 'TT-2024-002',
        customer: { name: 'Ana Costa', phone: '21988776655', address: 'Av. Brasil, 456 - Rio de Janeiro, RJ, 20040-020' },
        items: [{ name: 'Vestido Floral', qty: 1, price: 199.90 }],
        total: 199.90,
        status: 'shipped',
        platform: 'tiktok',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        trackingCode: 'BR123456789BR',
        notes: 'Cliente pediu para entregar pela manhã'
    },
    {
        id: 'ENT-003',
        orderId: 'TT-2024-003',
        customer: { name: 'Carla Mendes', phone: '31977665544', address: 'Rua Minas Gerais, 789 - Belo Horizonte, MG, 30130-150' },
        items: [{ name: 'Conjunto Camila', qty: 1, price: 289.90 }],
        total: 289.90,
        status: 'delivered',
        platform: 'tiktok',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        trackingCode: 'BR987654321BR',
        notes: ''
    },
    {
        id: 'ENT-004',
        orderId: 'TT-2024-004',
        customer: { name: 'Julia Santos', phone: '41966554433', address: 'Av. Paraná, 321 - Curitiba, PR, 80010-010' },
        items: [{ name: 'Cropped Lari', qty: 2, price: 79.90 }],
        total: 159.80,
        status: 'processing',
        platform: 'tiktok',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
        trackingCode: null,
        notes: ''
    }
]

export function EntregasList() {
    const [activeFilter, setActiveFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(20)
    const [selectedDelivery, setSelectedDelivery] = useState(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isConfigured] = useState(false) // Will check for API credentials

    // ============================================================================
    // React Query: Fetch entregas from Backend
    // ============================================================================
    const {
        entregas: deliveries,
        total,
        totalPages,
        isLoading,
        isError,
        error,
        refetch
    } = useEntregas({
        page: currentPage,
        pageSize: itemsPerPage,
        status: activeFilter,
        search: searchTerm
    })

    // Fetch Metrics from Backend
    const { data: serverMetrics } = useEntregasMetrics()

    const { updateStatus: updateStatusMutation, isUpdating } = useEntregasMutations()

    // ============================================================================
    // Metrics (Use server metrics or fallback)
    // ============================================================================
    const metrics = useMemo(() => {
        if (serverMetrics) {
            return {
                total: serverMetrics.total || 0,
                pending: serverMetrics.pending || 0,
                processing: serverMetrics.processing || 0,
                shipped: serverMetrics.shipped || 0,
                delivered: serverMetrics.delivered || 0,
                cancelled: serverMetrics.cancelled || 0
            }
        }
        // Fallback placeholder
        return { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }
    }, [serverMetrics])

    // ============================================================================
    // Filters
    // ============================================================================
    const filters = [
        { id: 'all', label: 'Todos', icon: Package, count: metrics.total },
        { id: 'pending', label: 'Pendentes', icon: Clock, count: metrics.pending },
        { id: 'processing', label: 'Processando', icon: Package, count: metrics.processing },
        { id: 'shipped', label: 'Enviados', icon: Truck, count: metrics.shipped },
        { id: 'delivered', label: 'Entregues', icon: CheckCircle2, count: metrics.delivered },
    ]

    // ============================================================================
    // Filtered Deliveries (Already filtered by backend)
    // ============================================================================
    const filteredDeliveries = deliveries || []

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, activeFilter])

    // ============================================================================
    // Helpers
    // ============================================================================
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        toast.success('Copiado!')
    }

    const openWhatsApp = (phone, name) => {
        const cleanPhone = phone.replace(/\D/g, '')
        const message = `Olá ${name}! Atualizações sobre seu pedido:`
        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    // ============================================================================
    // Actions
    // ============================================================================
    const updateStatus = (deliveryId, newStatus, trackingCode = null) => {
        updateStatusMutation({ id: deliveryId, status: newStatus, trackingCode })
        setIsDetailOpen(false)
    }

    const addTrackingCode = (deliveryId) => {
        const code = prompt('Digite o código de rastreio:')
        if (code) {
            updateStatus(deliveryId, 'shipped', code)
        }
    }

    // ============================================================================
    // Loading State
    // ============================================================================
    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-[#C75D3B] animate-spin" />
                    <p className="text-[#4A3B32]/60 font-medium">Carregando entregas...</p>
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-[#4A3B32] font-bold mb-2">Erro ao carregar entregas</p>
                    <p className="text-gray-500 text-sm">{error?.message}</p>
                </div>
            </div>
        )
    }

    // ============================================================================
    // Render
    // ============================================================================
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
            {/* ========== HEADER ========== */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
            >
                <div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-[#4A3B32]">
                        Entregas
                    </h1>
                    <p className="text-sm md:text-base text-[#4A3B32]/60 mt-1">Gerencie suas entregas do TikTok Shop</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-[#4A3B32] hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Sincronizar
                    </button>
                    <ShimmerButton
                        className="shadow-lg h-10 px-5"
                        background="linear-gradient(135deg, #C75D3B 0%, #A64D31 100%)"
                        onClick={() => toast.info('Nova entrega manual - em breve!')}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Entrega
                    </ShimmerButton>
                </div>
            </motion.div>

            {/* ========== TIKTOK INTEGRATION NOTICE ========== */}
            {!isConfigured && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 md:p-5 bg-gradient-to-r from-[#00F2EA]/10 via-white to-[#FF0050]/10 border-2 border-dashed border-[#00F2EA]/40 rounded-2xl"
                >
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-gradient-to-br from-[#00F2EA] to-[#FF0050] rounded-xl shadow-lg flex-shrink-0">
                            <PackageCheck className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-[#4A3B32] text-lg">Integração TikTok Shop</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Configure suas credenciais da API do TikTok Shop para sincronizar automaticamente
                                pedidos, atualizar status de envio e rastrear entregas.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <a
                                    href="https://partner.tiktokshop.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00F2EA] to-[#FF0050] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg"
                                >
                                    Acessar TikTok Partner Center
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                                <span className="text-sm text-gray-400 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Credenciais pendentes no .env
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ========== METRICS CARDS ========== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Total */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-[#4A3B32] to-[#5A4B42] h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <Package className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">{metrics.total}</span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Total de Entregas</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Pendentes */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-amber-500 to-amber-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <Clock className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">{metrics.pending}</span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Pendentes</p>
                            <p className="text-xs text-white/70 mt-1">Aguardando envio</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Enviados */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-violet-500 to-violet-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <Truck className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">{metrics.shipped}</span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Enviados</p>
                            <p className="text-xs text-white/70 mt-1">Em trânsito</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Entregues */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-emerald-500 to-emerald-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">{metrics.delivered}</span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Entregues</p>
                            <p className="text-xs text-white/70 mt-1">Finalizados</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* ========== SEARCH & FILTERS ========== */}
            <Card className="shadow-lg border-none">
                <CardContent className="p-4 md:p-6 space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, pedido ou código de rastreio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-2xl focus:border-[#C75D3B] focus:bg-white transition-all outline-none text-sm"
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {filters.map((filter) => {
                            const Icon = filter.icon
                            const isActive = activeFilter === filter.id
                            return (
                                <button
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex-shrink-0",
                                        isActive
                                            ? "bg-[#C75D3B] text-white shadow-lg"
                                            : "bg-gray-100 text-[#4A3B32] hover:bg-gray-200"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{filter.label}</span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center",
                                        isActive ? "bg-white/20 text-white" : "bg-white text-[#4A3B32]"
                                    )}>
                                        {filter.count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* ========== DELIVERIES GRID ========== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                    {filteredDeliveries.map((delivery, index) => {
                        const status = DELIVERY_STATUS[delivery.status] || DELIVERY_STATUS.pending
                        const StatusIcon = status.icon

                        return (
                            <motion.div
                                key={delivery.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ delay: index * 0.02 }}
                            >
                                <Card className="border border-gray-100 hover:shadow-lg transition-all h-full bg-white rounded-2xl">
                                    <CardContent className="p-5 pt-6 flex flex-col h-full">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4A3B32] to-[#5A4B42] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                    {getInitials(delivery.customer?.name || 'Cliente')}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-[#4A3B32] text-sm mb-0.5 truncate">
                                                        {delivery.customer?.name || 'Cliente sem nome'}
                                                    </h3>
                                                    <p className="text-xs text-gray-400 truncate">{delivery.orderId}</p>
                                                </div>
                                            </div>
                                            {delivery.platform === 'tiktok' && (
                                                <span className="px-2 py-0.5 bg-gradient-to-r from-[#00F2EA]/20 to-[#FF0050]/20 text-[#FF0050] rounded-full font-bold text-[10px]">
                                                    TikTok
                                                </span>
                                            )}
                                        </div>

                                        {/* Status Badge */}
                                        <div className="mb-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                                                status.bgClass, status.textClass, status.borderClass
                                            )}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {status.label}
                                            </span>
                                        </div>

                                        {/* Divider */}
                                        <div className="border-t border-gray-100 my-4"></div>

                                        {/* Info */}
                                        <div className="space-y-2 mb-4 flex-grow">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">Valor</span>
                                                <span className="text-sm font-bold text-emerald-600">{formatCurrency(delivery.total || 0)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">Itens</span>
                                                <span className="text-sm font-medium text-[#4A3B32]">{delivery.items?.length || 0} produto(s)</span>
                                            </div>
                                            {delivery.trackingCode && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">Rastreio</span>
                                                    <span className="text-xs font-mono text-[#C75D3B] truncate max-w-[120px]">{delivery.trackingCode}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Divider */}
                                        <div className="border-t border-gray-100 my-4"></div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-2 mt-auto">
                                            <button
                                                onClick={() => {
                                                    setSelectedDelivery(delivery)
                                                    setIsDetailOpen(true)
                                                }}
                                                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-[#4A3B32] transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Detalhes
                                            </button>
                                            {delivery.status === 'pending' && (
                                                <button
                                                    onClick={() => addTrackingCode(delivery.id)}
                                                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-[#C75D3B] to-[#A64D31] hover:opacity-90 rounded-xl text-xs font-bold text-white transition-all"
                                                >
                                                    <Truck className="w-4 h-4" />
                                                    Enviar
                                                </button>
                                            )}
                                            {delivery.status === 'shipped' && (
                                                <button
                                                    onClick={() => updateStatus(delivery.id, 'delivered')}
                                                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold text-white transition-colors"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Entregue
                                                </button>
                                            )}
                                            {delivery.status === 'delivered' && (
                                                <button
                                                    onClick={() => openWhatsApp(delivery.customer?.phone || '', delivery.customer?.name || '')}
                                                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-500 hover:bg-green-600 rounded-xl text-xs font-bold text-white transition-colors"
                                                >
                                                    <Phone className="w-4 h-4" />
                                                    WhatsApp
                                                </button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-8 pb-8">
                    <nav className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Anterior
                        </button>
                        <span className="text-sm font-medium text-gray-600 px-2">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Próxima
                        </button>
                    </nav>
                </div>
            )}

            {/* Empty State */}
            {filteredDeliveries.length === 0 && (
                <Card className="shadow-lg">
                    <CardContent className="p-12 text-center">
                        <PackageCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-[#4A3B32] mb-2">Nenhuma entrega encontrada</h3>
                        <p className="text-gray-500 mb-6">
                            {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Configure a integração para sincronizar pedidos'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* ========== DETAIL MODAL ========== */}
            <AnimatePresence>
                {isDetailOpen && selectedDelivery && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDetailOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
                        />

                        {/* Modal Container */}
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="w-full max-w-lg pointer-events-auto"
                            >
                                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                                    {/* Header com gradiente */}
                                    <div className="relative bg-gradient-to-br from-[#4A3B32] via-[#5A4B42] to-[#4A3B32] p-6 md:p-8 text-white">
                                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#C75D3B]/30 via-[#C75D3B]/10 to-transparent pointer-events-none" />
                                        <button
                                            onClick={() => setIsDetailOpen(false)}
                                            className="absolute top-3 right-3 md:top-4 md:right-4 p-2 rounded-xl hover:bg-white/10 transition-colors z-10"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-lg md:text-xl border border-white/20 flex-shrink-0">
                                                    {getInitials(selectedDelivery.customer.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h2 className="text-xl md:text-2xl font-display font-bold mb-1 truncate">
                                                        {selectedDelivery.customer.name}
                                                    </h2>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white/70 text-sm">{selectedDelivery.orderId}</span>
                                                        <span className="px-2 py-0.5 bg-gradient-to-r from-[#00F2EA] to-[#FF0050] rounded-full text-[10px] font-bold">TikTok</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 md:p-8 space-y-6">
                                        {/* Status + Valor em Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <p className="text-xs text-gray-500 font-medium mb-1 uppercase">Status</p>
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border",
                                                    DELIVERY_STATUS[selectedDelivery.status].bgClass,
                                                    DELIVERY_STATUS[selectedDelivery.status].textClass,
                                                    DELIVERY_STATUS[selectedDelivery.status].borderClass
                                                )}>
                                                    {DELIVERY_STATUS[selectedDelivery.status].label}
                                                </span>
                                            </div>
                                            <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                                <p className="text-xs text-emerald-700 font-medium mb-1 uppercase">Valor Total</p>
                                                <p className="text-xl font-bold text-emerald-700">{formatCurrency(selectedDelivery.total)}</p>
                                            </div>
                                        </div>

                                        {/* Itens do Pedido */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-[#4A3B32] uppercase tracking-wide flex items-center gap-2">
                                                <ShoppingBag className="w-4 h-4" />
                                                Itens do Pedido
                                            </h3>
                                            <div className="space-y-2">
                                                {selectedDelivery.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                        <span className="text-sm text-gray-700">{item.qty}x {item.name}</span>
                                                        <span className="text-sm font-bold text-[#4A3B32]">{formatCurrency(item.price)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Endereço */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-[#4A3B32] uppercase tracking-wide flex items-center gap-2">
                                                <MapPin className="w-4 h-4" />
                                                Endereço de Entrega
                                            </h3>
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <p className="text-sm text-gray-700">{selectedDelivery.customer.address}</p>
                                            </div>
                                        </div>

                                        {/* Rastreio */}
                                        {selectedDelivery.trackingCode && (
                                            <div className="space-y-3">
                                                <h3 className="text-xs font-bold text-[#4A3B32] uppercase tracking-wide flex items-center gap-2">
                                                    <Hash className="w-4 h-4" />
                                                    Código de Rastreio
                                                </h3>
                                                <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-xl border border-violet-100">
                                                    <span className="text-sm font-mono text-violet-700 flex-1">{selectedDelivery.trackingCode}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(selectedDelivery.trackingCode)}
                                                        className="p-2 hover:bg-violet-100 rounded-lg transition-colors"
                                                    >
                                                        <Copy className="w-4 h-4 text-violet-600" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Data */}
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Calendar className="w-4 h-4" />
                                            Criado em {formatDate(selectedDelivery.createdAt)}
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={() => openWhatsApp(selectedDelivery.customer.phone, selectedDelivery.customer.name)}
                                                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
                                            >
                                                <Phone className="w-5 h-5" />
                                                WhatsApp
                                            </button>
                                            {selectedDelivery.status === 'pending' && (
                                                <button
                                                    onClick={() => {
                                                        setIsDetailOpen(false)
                                                        addTrackingCode(selectedDelivery.id)
                                                    }}
                                                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-br from-[#C75D3B] to-[#A64D31] text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
                                                >
                                                    <Truck className="w-5 h-5" />
                                                    Adicionar Rastreio
                                                </button>
                                            )}
                                            {selectedDelivery.status === 'shipped' && (
                                                <button
                                                    onClick={() => updateStatus(selectedDelivery.id, 'delivered')}
                                                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Marcar Entregue
                                                </button>
                                            )}
                                            {selectedDelivery.status === 'delivered' && (
                                                <Link
                                                    to="/admin/vendas"
                                                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-br from-[#C75D3B] to-[#A64D31] text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
                                                >
                                                    <ExternalLink className="w-5 h-5" />
                                                    Ver Venda
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

export default EntregasList
