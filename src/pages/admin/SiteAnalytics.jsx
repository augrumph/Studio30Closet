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
    ArrowUpRight, ArrowDownRight, RefreshCw, Info, X,
    Globe, Smartphone, Monitor, Trash2
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

// Componente de tooltip clicável
function InfoTooltip({ text }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(!isOpen)
                }}
                className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
                <Info className="w-3 h-3 text-white" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop para fechar ao clicar fora */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Popover - abre para cima */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 bottom-7 z-50 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-100"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <p className="text-sm text-[#4A3B32] leading-relaxed pr-4">
                                {text}
                            </p>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

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

    // Reset Metrics
    const handleReset = async () => {
        if (!window.confirm('⚠️ ATENÇÃO: Isso irá apagar PERMANENTEMENTE todos os dados de observabilidade (visualizações, sessões e carrinhos abandonados). Deseja continuar?')) {
            return
        }

        try {
            const response = await fetch('/api/analytics/reset', { method: 'DELETE' })
            if (!response.ok) throw new Error('Erro ao resetar dados')

            import('sonner').then(({ toast }) => {
                toast.success('Métricas resetadas com sucesso!')
            })

            queryClient.invalidateQueries({ queryKey: ['analytics'] })
        } catch (error) {
            console.error(error)
            import('sonner').then(({ toast }) => {
                toast.error('Erro ao resetar métricas')
            })
        }
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

    // Helper Component for Traffic Bars
    const TrafficBar = ({ label, value, total, color, icon }) => {
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0

        return (
            <div>
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-[#4A3B32] flex items-center gap-2">
                        <span>{icon}</span> {label}
                    </span>
                    <span className="font-bold text-gray-600">{value} ({percentage}%)</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: "circOut" }}
                        className={cn("h-full rounded-full", color)}
                    />
                </div>
            </div>
        )
    }

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
                        onClick={handleReset}
                        className="p-3 bg-red-50 hover:bg-red-100 rounded-xl shadow-sm transition-all border border-red-100 text-red-600"
                        title="Resetar métricas (Limpar tudo)"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
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
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-500 to-blue-600 h-full relative">
                        <div className="absolute bottom-3 right-3">
                            <InfoTooltip text="Total de vezes que alguém acessou qualquer página do site" />
                        </div>
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
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-500 to-purple-600 h-full relative">
                        <div className="absolute bottom-3 right-3">
                            <InfoTooltip text="Quantas vezes a página do catálogo de produtos foi acessada" />
                        </div>
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
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-[#C75D3B] to-[#A64D31] h-full relative">
                        <div className="absolute bottom-3 right-3">
                            <InfoTooltip text="Quantas vezes clicaram em um produto para ver detalhes (abrir modal)" />
                        </div>
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
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-500 to-green-600 h-full relative">
                        <div className="absolute bottom-3 right-3">
                            <InfoTooltip text="Quantas vezes um produto foi adicionado à malinha. Taxa = % de quem viu e adicionou" />
                        </div>
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
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-[#4A3B32] to-[#5A4B42] h-full relative">
                        <div className="absolute bottom-3 right-3">
                            <InfoTooltip text="Número de visitantes únicos (pessoas diferentes que acessaram o site)" />
                        </div>
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
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-amber-500 to-amber-600 h-full relative">
                        <div className="absolute bottom-3 right-3">
                            <InfoTooltip text="Quantidade de malinhas que foram para a tela de checkout (preencheram dados)" />
                        </div>
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
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-emerald-500 to-emerald-600 h-full relative">
                        <div className="absolute bottom-3 right-3">
                            <InfoTooltip text="Malinhas que o cliente finalizou com sucesso (enviou pelo WhatsApp). Conversão = % de quem iniciou e finalizou" />
                        </div>
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingSummary ? '...' : formatNumber(summary?.checkoutsCompleted)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Malinhas Finalizadas</p>
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
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-red-500 to-red-600 h-full relative">
                        <div className="absolute bottom-3 right-3">
                            <InfoTooltip text="Malinhas com produtos que o cliente adicionou mas não finalizou. São oportunidades de recuperação de vendas!" />
                        </div>
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingAbandoned ? '...' : abandonedCarts?.length || 0}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Malinhas Abandonadas</p>
                            <p className="text-xs text-white/70 mt-1">Com produtos no carrinho</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* ========== SOCIAL MEDIA CLICKS ========== */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                {/* WhatsApp Clicks */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-500 to-green-600 h-full relative">
                        <div className="absolute bottom-3 right-3">
                            <InfoTooltip text="Quantas vezes o botão do WhatsApp na navbar foi clicado" />
                        </div>
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <svg className="w-6 h-6 md:w-8 md:h-8 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingSummary ? '...' : formatNumber(summary?.whatsappClicks)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Cliques WhatsApp</p>
                            <p className="text-xs text-white/70 mt-1">Na navbar</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Instagram Clicks */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 h-full relative">
                        <div className="absolute bottom-3 right-3">
                            <InfoTooltip text="Quantas vezes o botão do Instagram na navbar foi clicado" />
                        </div>
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <svg className="w-6 h-6 md:w-8 md:h-8 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                </svg>
                                <span className="text-2xl md:text-3xl font-bold text-white">
                                    {loadingSummary ? '...' : formatNumber(summary?.instagramClicks)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Cliques Instagram</p>
                            <p className="text-xs text-white/70 mt-1">Na navbar</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* ========== TRAFFIC & DEVICES (NEW) ========== */}
            <div className="grid lg:grid-cols-3 gap-6">

                {/* Traffic Sources */}
                <Card className="lg:col-span-2 border-none shadow-lg bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2 border-b border-gray-50">
                        <CardTitle className="text-lg font-bold text-[#4A3B32] flex items-center gap-2">
                            <Globe className="w-5 h-5 text-rose-500" />
                            Origem do Tráfego (Campanhas)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            {/* Google Bar */}
                            <TrafficBar
                                label="Google / Ads"
                                value={summary?.trafficSources?.google || 0}
                                total={(summary?.trafficSources?.google || 0) + (summary?.trafficSources?.social || 0) + (summary?.trafficSources?.direct || 0) + (summary?.trafficSources?.other || 0)}
                                color="bg-blue-500"
                                icon="🔍"
                            />
                            {/* Social Bar */}
                            <TrafficBar
                                label="Instagram / Social"
                                value={summary?.trafficSources?.social || 0}
                                total={(summary?.trafficSources?.google || 0) + (summary?.trafficSources?.social || 0) + (summary?.trafficSources?.direct || 0) + (summary?.trafficSources?.other || 0)}
                                color="bg-purple-500"
                                icon="📸"
                            />
                            {/* Direct Bar */}
                            <TrafficBar
                                label="Acesso Direto / WhatsApp"
                                value={summary?.trafficSources?.direct || 0}
                                total={(summary?.trafficSources?.google || 0) + (summary?.trafficSources?.social || 0) + (summary?.trafficSources?.direct || 0) + (summary?.trafficSources?.other || 0)}
                                color="bg-emerald-500"
                                icon="🔗"
                            />
                            {/* Other Bar */}
                            {(summary?.trafficSources?.other > 0) && (
                                <div className="relative">
                                    <TrafficBar
                                        label={
                                            <span className="flex items-center gap-2">
                                                Outros / Referência
                                                <InfoTooltip text="Links de outros sites, blogs, e-mail marketing ou campanhas não rastreadas automaticamente." />
                                            </span>
                                        }
                                        value={summary?.trafficSources?.other || 0}
                                        total={(summary?.trafficSources?.google || 0) + (summary?.trafficSources?.social || 0) + (summary?.trafficSources?.direct || 0) + (summary?.trafficSources?.other || 0)}
                                        color="bg-gray-500"
                                        icon="🌐"
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Device Breakdown */}
                <Card className="border-none shadow-lg bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2 border-b border-gray-50">
                        <CardTitle className="text-lg font-bold text-[#4A3B32] flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-amber-500" />
                            Dispositivos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-center gap-8 h-full">
                            {/* Mobile Stat */}
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-3 mx-auto">
                                    <Smartphone className="w-8 h-8 text-rose-500" />
                                </div>
                                <p className="text-2xl font-bold text-[#4A3B32]">
                                    {Math.round(((summary?.deviceBreakdown?.mobile || 0) / ((summary?.deviceBreakdown?.mobile || 0) + (summary?.deviceBreakdown?.desktop || 0) + (summary?.deviceBreakdown?.tablet || 0) || 1)) * 100)}%
                                </p>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mobile</p>
                            </div>

                            <div className="h-12 w-px bg-gray-100"></div>

                            {/* Desktop Stat */}
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 mx-auto">
                                    <Monitor className="w-8 h-8 text-blue-500" />
                                </div>
                                <p className="text-2xl font-bold text-[#4A3B32]">
                                    {Math.round(((summary?.deviceBreakdown?.desktop || 0) / ((summary?.deviceBreakdown?.mobile || 0) + (summary?.deviceBreakdown?.desktop || 0) + (summary?.deviceBreakdown?.tablet || 0) || 1)) * 100)}%
                                </p>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pc/Note</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
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
        </div >
    )
}

export default SiteAnalytics
