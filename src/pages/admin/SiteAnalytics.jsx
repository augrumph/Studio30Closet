/**
 * ============================================================================
 * SiteAnalytics - Dashboard de Observabilidade do Site
 * ============================================================================
 *
 * Métricas de comportamento dos usuários:
 * - Page Views
 * - Visualizações do Catálogo
 * - Produtos mais visualizados
 * - Taxa de adição ao carrinho
 * - Carrinhos abandonados
 * - Taxa de conversão
 */

import { useState } from 'react'
import {
    Eye, ShoppingCart, MousePointer, TrendingUp,
    Users, Package, AlertTriangle, BarChart3,
    ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react'
import {
    useAnalyticsSummary,
    useTopViewedProducts,
    useTopAddedToCart,
    useAbandonedCarts
} from '@/hooks/useAnalytics'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useQueryClient } from '@tanstack/react-query'
import { SiteAnalyticsSkeleton } from '@/components/admin/PageSkeleton'

export function SiteAnalytics() {
    const [dateRange, setDateRange] = useState('today')
    const queryClient = useQueryClient()

    // Hooks de dados
    const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useAnalyticsSummary(dateRange)
    const { data: topViewed, isLoading: loadingTopViewed } = useTopViewedProducts(5)
    const { data: topCart, isLoading: loadingTopCart } = useTopAddedToCart(5)
    const { data: abandonedCarts, isLoading: loadingAbandoned } = useAbandonedCarts()

    // Loading inicial - mostrar skeleton completo
    const isInitialLoading = loadingSummary && !summary

    if (isInitialLoading) {
        return <SiteAnalyticsSkeleton />
    }

    // Date range options
    const dateRanges = [
        { id: 'today', label: 'Hoje' },
        { id: '7days', label: '7 Dias' },
        { id: '30days', label: '30 Dias' },
        { id: 'all', label: 'Todo Período' }
    ]

    // Refresh all data
    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
    }

    // Format number with K suffix
    const formatNumber = (num) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K'
        }
        return num?.toString() || '0'
    }

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0)
    }

    // Loading skeleton
    const SkeletonCard = () => (
        <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-2xl"></div>
        </div>
    )

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
                        Observabilidade do Site
                    </h1>
                    <p className="text-sm md:text-base text-[#4A3B32]/60 mt-1">
                        Métricas de comportamento dos usuários
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200"
                        title="Atualizar dados"
                    >
                        <RefreshCw className="w-5 h-5 text-[#4A3B32]" />
                    </button>
                </div>
            </motion.div>

            {/* ========== DATE RANGE FILTER ========== */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {dateRanges.map((range) => (
                    <button
                        key={range.id}
                        onClick={() => setDateRange(range.id)}
                        className={cn(
                            "px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all",
                            dateRange === range.id
                                ? "bg-[#4A3B32] text-white shadow-lg"
                                : "bg-white text-[#4A3B32] hover:bg-gray-100 border border-gray-200"
                        )}
                    >
                        {range.label}
                    </button>
                ))}
            </div>

            {/* ========== KPI CARDS ========== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Page Views */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-500 to-blue-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <Eye className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingSummary ? '...' : formatNumber(summary?.pageViews)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Visualizações</p>
                            <p className="text-xs text-white/70 mt-1">Acessos totais</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Catalog Views */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-500 to-purple-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <Package className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingSummary ? '...' : formatNumber(summary?.catalogViews)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Catálogo</p>
                            <p className="text-xs text-white/70 mt-1">Visitas ao catálogo</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Product Views */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-[#C75D3B] to-[#A64D31] h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <MousePointer className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingSummary ? '...' : formatNumber(summary?.productViews)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Produtos Vistos</p>
                            <p className="text-xs text-white/70 mt-1">Abriram o modal</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Add to Cart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-500 to-green-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <ShoppingCart className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingSummary ? '...' : formatNumber(summary?.addToCart)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Adicionados</p>
                            <p className="text-xs text-white/70 mt-1">Taxa: {summary?.addToCartRate || 0}%</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* ========== SECOND ROW KPIs ========== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Unique Sessions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-[#4A3B32] to-[#5A4B42] h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <Users className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingSummary ? '...' : formatNumber(summary?.uniqueSessions)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Visitantes</p>
                            <p className="text-xs text-white/70 mt-1">Sessões únicas</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Checkouts Started */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-amber-500 to-amber-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingSummary ? '...' : formatNumber(summary?.checkoutsStarted)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Malinhas</p>
                            <p className="text-xs text-white/70 mt-1">Iniciadas</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Checkouts Completed */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-emerald-500 to-emerald-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingSummary ? '...' : formatNumber(summary?.checkoutsCompleted)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Finalizados</p>
                            <p className="text-xs text-white/70 mt-1">Conversão: {summary?.conversionRate || 0}%</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Abandoned Carts */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-red-500 to-red-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingAbandoned ? '...' : abandonedCarts?.length || 0}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Abandonadas</p>
                            <p className="text-xs text-white/70 mt-1">Malinhas ativas</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* ========== TABLES ROW ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Top Viewed Products */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Card className="shadow-lg border-none h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold text-[#4A3B32] flex items-center gap-2">
                                <Eye className="w-5 h-5 text-blue-500" />
                                Produtos Mais Visualizados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingTopViewed ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : topViewed?.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Nenhum dado ainda</p>
                            ) : (
                                <div className="space-y-2">
                                    {topViewed?.map((product, idx) => (
                                        <div
                                            key={product.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                    idx === 0 ? "bg-amber-100 text-amber-700" :
                                                        idx === 1 ? "bg-gray-200 text-gray-700" :
                                                            idx === 2 ? "bg-orange-100 text-orange-700" :
                                                                "bg-gray-100 text-gray-500"
                                                )}>
                                                    {idx + 1}
                                                </span>
                                                <span className="font-medium text-[#4A3B32] truncate max-w-[180px]">
                                                    {product.name}
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                                {product.views} vizualizações
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Top Added to Cart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                >
                    <Card className="shadow-lg border-none h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold text-[#4A3B32] flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-green-500" />
                                Mais Adicionados à Malinha
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingTopCart ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : topCart?.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Nenhum dado ainda</p>
                            ) : (
                                <div className="space-y-2">
                                    {topCart?.map((product, idx) => (
                                        <div
                                            key={product.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                    idx === 0 ? "bg-amber-100 text-amber-700" :
                                                        idx === 1 ? "bg-gray-200 text-gray-700" :
                                                            idx === 2 ? "bg-orange-100 text-orange-700" :
                                                                "bg-gray-100 text-gray-500"
                                                )}>
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <span className="font-medium text-[#4A3B32] block truncate max-w-[150px]">
                                                        {product.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatCurrency(product.price)}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                                {product.count}x
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* ========== MALINHAS ABANDONADAS ========== */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <Card className="shadow-lg border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-[#4A3B32] flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Malinhas Abandonadas
                            {abandonedCarts?.length > 0 && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                                    {abandonedCarts.length}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingAbandoned ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : abandonedCarts?.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Nenhuma malinha abandonada 🎉</p>
                        ) : (
                            <div className="space-y-4">
                                {abandonedCarts?.slice(0, 10).map((cart) => {
                                    const items = cart.items || []
                                    const customerData = cart.customer_data

                                    return (
                                        <div
                                            key={cart.id}
                                            className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                                        >
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "text-xs font-medium px-2 py-1 rounded-full",
                                                        cart.checkout_started
                                                            ? "bg-amber-100 text-amber-700"
                                                            : "bg-gray-200 text-gray-600"
                                                    )}>
                                                        {cart.checkout_started ? 'Iniciou Checkout' : 'Só Navegou'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(cart.last_activity_at).toLocaleString('pt-BR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-mono text-gray-400">
                                                    #{cart.session_id?.slice(0, 8)}
                                                </span>
                                            </div>

                                            {/* Produtos na Malinha */}
                                            <div className="mb-3">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                                                    Produtos na Malinha ({items.length})
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {items.length > 0 ? items.map((item, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs border border-gray-200"
                                                        >
                                                            <Package className="w-3 h-3 text-[#C75D3B]" />
                                                            <span className="font-medium text-[#4A3B32]">
                                                                {item.productName || item.name || `Produto #${item.productId}`}
                                                            </span>
                                                            {item.selectedSize && (
                                                                <span className="text-gray-400">
                                                                    • Tam {item.selectedSize}
                                                                </span>
                                                            )}
                                                        </span>
                                                    )) : (
                                                        <span className="text-xs text-gray-400">Sem detalhes disponíveis</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Dados do Cliente (se disponível) */}
                                            {customerData && (customerData.name || customerData.phone || customerData.email) && (
                                                <div className="pt-3 border-t border-gray-200">
                                                    <p className="text-xs font-bold text-green-600 uppercase mb-2 flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        Cliente Identificado
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        {customerData.name && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <span className="font-bold text-[#4A3B32]">{customerData.name}</span>
                                                            </div>
                                                        )}
                                                        {customerData.phone && (
                                                            <a
                                                                href={`https://wa.me/55${customerData.phone.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
                                                            >
                                                                📱 {customerData.phone}
                                                            </a>
                                                        )}
                                                        {customerData.email && (
                                                            <a
                                                                href={`mailto:${customerData.email}`}
                                                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                                            >
                                                                ✉️ {customerData.email}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Se não tem dados do cliente */}
                                            {(!customerData || (!customerData.name && !customerData.phone && !customerData.email)) && (
                                                <div className="pt-3 border-t border-gray-200">
                                                    <p className="text-xs text-gray-400 italic">
                                                        Cliente não preencheu dados de contato
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}

export default SiteAnalytics
