import { useEffect, useState, useMemo } from 'react'
import {
    Users,
    ShoppingBag,
    TrendingUp,
    Calendar,
    ArrowUpRight,
    Plus,
    Target,
    Zap,
    Search,
    CreditCard
} from 'lucide-react'
// import { useAdminStore } from '@/store/admin-store' // REMOVIDO: Substituído por React Query
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

// Hooks
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics'
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData' // ⚡ NOVO HOOK OTIMIZADO

// Componentes
import { FinancialScoreboard, CashFlowSection, ParcelinhasModal } from '@/components/admin/dashboard'
import { DashboardSkeleton } from '@/components/admin/PageSkeleton'
// import { MidiInsights } from '@/components/admin/MidiInsights' // Temporariamente oculto

export function Dashboard() {
    // ⚡ REACT QUERY: Carregamento otimizado de todos os dados necessários
    const {
        vendas,
        products,
        orders,
        customers, // Se necessário para contagem
        purchases,
        suppliers,
        dashboardMetricsRaw,
        isLoading: isLoadingData,
        isInitialLoading, // ← Usar para skeleton
        refetchAll
    } = useAdminDashboardData()

    const [currentTime, setCurrentTime] = useState(new Date())
    // const [dashboardData, setDashboardData] = useState(null) // REMOVIDO: Vem do hook
    const [periodFilter, setPeriodFilter] = useState('all')
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
    const [showParcelinhasModal, setShowParcelinhasModal] = useState(false)

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    // Determina se a página ainda está carregando
    const isLoading = isLoadingData

    // Cálculo de período dinâmico
    const periodDays = useMemo(() => {
        const now = new Date()
        if (periodFilter === 'all') {
            // Para 'Tudo', calcular dias desde a primeira venda
            if (vendas.length > 0) {
                const oldestDate = new Date(Math.min(...vendas.map(v => new Date(v.createdAt).getTime())))
                return Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            }
            return 365 // Fallback para 1 ano se não houver vendas
        }
        if (periodFilter === 'last7days') return 7
        if (periodFilter === 'last30days') return 30
        if (periodFilter === 'currentMonth') {
            return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        }
        if (periodFilter === 'custom' && customDateRange.start && customDateRange.end) {
            const diff = new Date(customDateRange.end).getTime() - new Date(customDateRange.start).getTime()
            return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
        }
        return 30
    }, [periodFilter, customDateRange, vendas])

    // Filtragem de vendas por período
    const filteredVendas = useMemo(() => {
        const now = new Date()
        // Filtro 'all' retorna todas as vendas
        if (periodFilter === 'all') return vendas

        return vendas.filter(v => {
            const saleDate = new Date(v.createdAt)
            if (periodFilter === 'last7days') {
                const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                return saleDate >= cutoff
            }
            if (periodFilter === 'last30days') {
                const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                return saleDate >= cutoff
            }
            if (periodFilter === 'currentMonth') {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
                return saleDate >= monthStart && saleDate <= monthEnd
            }
            if (periodFilter === 'custom' && customDateRange.start && customDateRange.end) {
                const start = new Date(customDateRange.start)
                const end = new Date(customDateRange.end)
                end.setHours(23, 59, 59)
                return saleDate >= start && saleDate <= end
            }
            return true
        })
    }, [vendas, periodFilter, customDateRange])

    // Usar hooks de cálculo (MANTIDOS INTACTOS para garantir precisão)
    const financialMetrics = useDashboardMetrics({
        filteredVendas,
        allVendas: vendas,
        orders,
        purchases,
        dashboardData: dashboardMetricsRaw,
        periodDays,
        periodFilter,
        customDateRange
    })

    const {
        weeklyData,
        maxWeeklyValue,
        monthlyData,
        maxMonthlyValue,
        accumulatedData,
        maxAccumulatedValue,
        topCustomers,
        topTrends // Não usado no JSX atual mas calculado
    } = useDashboardAnalytics(vendas, products, suppliers)

    const greetings = () => {
        const hour = currentTime.getHours()
        if (hour < 12) return "Bom dia"
        if (hour < 18) return "Boa tarde"
        return "Boa noite"
    }

    // Gera insights dinâmicos baseados nos dados reais
    const getPowerInsight = () => {
        const insights = []

        // 1. Insight de Margem
        const margin = financialMetrics.netMarginPercent || 0
        if (margin < 25) {
            insights.push({
                priority: 1,
                text: `Sua margem está em ${margin.toFixed(1)}% — abaixo do ideal (25%). Revise seus custos ou aumente os preços para melhorar a rentabilidade.`,
                type: 'warning'
            })
        } else if (margin >= 40) {
            insights.push({
                priority: 3,
                text: `Excelente! Margem de ${margin.toFixed(1)}% está muito saudável. Seu controle de custos está funcionando.`,
                type: 'success'
            })
        }

        // 2. Insight de Inadimplência
        const toReceive = financialMetrics.toReceiveAmount || 0
        const received = financialMetrics.receivedAmount || 0

        if (toReceive > 1000) {
            insights.push({
                priority: 2,
                text: `Você tem R$ ${toReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a receber. Considere fazer cobrança ativa para melhorar o fluxo de caixa.`,
                type: 'info'
            })
        }

        // 3. Insight de Meta
        const progress = ((financialMetrics.netRevenue || 0) / 15000) * 100
        if (progress >= 80 && progress < 100) {
            insights.push({
                priority: 2,
                text: `Faltam apenas R$ ${(15000 - (financialMetrics.netRevenue || 0)).toLocaleString('pt-BR')} para bater a meta! Você está quase lá.`,
                type: 'success'
            })
        } else if (progress < 30 && periodDays > 15) {
            insights.push({
                priority: 1,
                text: `Com ${progress.toFixed(0)}% da meta e metade do mês já passado, é hora de intensificar as vendas.`,
                type: 'warning'
            })
        }

        // 4. Insight de Ticket Médio
        const ticket = financialMetrics.averageTicket || 0
        if (ticket < 150 && financialMetrics.totalSalesCount > 5) {
            insights.push({
                priority: 3,
                text: `Ticket médio de R$ ${ticket.toFixed(0)}. Que tal oferecer peças complementares para aumentar o valor por venda?`,
                type: 'info'
            })
        } else if (ticket > 300) {
            insights.push({
                priority: 4,
                text: `Ticket médio de R$ ${ticket.toFixed(0)} — suas clientes estão investindo em peças de maior valor.`,
                type: 'success'
            })
        }

        // 5. Insight de Volume de Vendas
        if (financialMetrics.totalSalesCount === 0) {
            insights.push({
                priority: 1,
                text: `Nenhuma venda registrada no período. Hora de ativar suas clientes no WhatsApp!`,
                type: 'warning'
            })
        }

        // Ordenar por prioridade e retornar o primeiro (mais importante)
        insights.sort((a, b) => a.priority - b.priority)
        return insights[0] || { text: 'Mantenha o foco e boas vendas!', type: 'info' }
    }

    const powerInsight = getPowerInsight()

    // Loading inicial - exibe skeleton completo
    if (isInitialLoading) {
        return <DashboardSkeleton />
    }

    return (
        <div className="space-y-4 md:space-y-6 max-w-[1600px] mx-auto">

            {/* 1. UNIFIED COMPACT HEADER */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 md:p-4"
            >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Greeting + Quick Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <h1 className="text-base md:text-lg font-display font-bold text-[#4A3B32]">
                            {greetings()}, <span className="text-[#C75D3B]">Studio 30</span>
                        </h1>

                        <div className="flex gap-2">
                            <Link
                                to="/admin/vendas/new"
                                className="px-3 py-1.5 bg-[#C75D3B] hover:bg-[#A64D31] rounded-lg transition-all text-white text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Venda</span>
                            </Link>
                            <Link
                                to="/admin/malinhas/new"
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-[#4A3B32] text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                            >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Malinha</span>
                            </Link>
                            <button
                                onClick={() => setShowParcelinhasModal(true)}
                                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg transition-all text-white text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                            >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Crediário</span>
                            </button>
                        </div>
                    </div>

                    {/* Right: Period Selector */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#4A3B32] hidden sm:inline">Período:</span>
                        {[
                            { value: 'all', label: 'Tudo' },
                            { value: 'last7days', label: '7d' },
                            { value: 'last30days', label: '30d' },
                            { value: 'currentMonth', label: 'Mês' },
                            { value: 'custom', label: 'Custom' }
                        ].map(period => (
                            <button
                                key={period.value}
                                onClick={() => setPeriodFilter(period.value)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg font-semibold text-xs transition-all',
                                    periodFilter === period.value
                                        ? 'bg-[#C75D3B] text-white shadow-sm'
                                        : 'bg-gray-100 text-[#4A3B32] hover:bg-gray-200'
                                )}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>
                </div>

                {periodFilter === 'custom' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-gray-100 flex gap-3"
                    >
                        <div className="flex-1">
                            <input
                                type="date"
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm text-[#4A3B32]"
                            />
                        </div>
                        <div className="flex-1">
                            <input
                                type="date"
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm text-[#4A3B32]"
                            />
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* 1.2 MIDI INSIGHTS - Análise Proativa - TEMPORARIAMENTE OCULTO */}
            {/* <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
            >
                <MidiInsights limit={5} />
            </motion.div> */}

            {/* 2. TOP SELLING INSIGHTS (Componente extraído) */}
            <CashFlowSection metrics={financialMetrics} trends={topTrends} />

            {/* 3. FINANCIAL SCOREBOARD - DRE GERENCIAL (Componente extraído) */}
            <FinancialScoreboard metrics={financialMetrics} isLoading={isLoading} />

            {/* 3. TRENDS & TOP CUSTOMERS */}
            <div className="grid lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                {/* Trend Chart Area */}
                <Card className="lg:col-span-2 rounded-2xl md:rounded-[32px] overflow-hidden border border-gray-100 shadow-md bg-white">
                    <CardHeader className="p-6 md:p-8 pb-0">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg md:text-2xl font-display text-[#4A3B32]">Tendência de Vendas</CardTitle>
                                <p className="text-xs md:text-sm text-gray-500 mt-2 font-medium">Performance dos últimos 7 dias</p>
                            </div>
                            <div className="p-3 md:p-4 bg-[#FDF0ED] rounded-2xl flex-shrink-0">
                                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-[#C75D3B]" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 md:p-8">
                        <div className="h-[180px] md:h-[250px] w-full flex items-end gap-2 md:gap-3 lg:gap-6 mt-6 md:mt-8">
                            {weeklyData.map((day, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-3 md:gap-4 group">
                                    <div className="relative w-full flex flex-col justify-end h-[140px] md:h-[200px]">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${(day.value / maxWeeklyValue) * 100}%` }}
                                            transition={{ delay: idx * 0.1, duration: 1, ease: "easeOut" }}
                                            className={cn(
                                                "w-full rounded-t-xl md:rounded-t-2xl transition-all relative touch-manipulation",
                                                idx === 6 ? "bg-[#C75D3B]" : "bg-gray-100 group-active:bg-gray-200 md:group-hover:bg-gray-200"
                                            )}
                                        >
                                            {day.value > 0 && (
                                                <div className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 bg-[#4A3B32] text-white text-[8px] md:text-[9px] font-bold py-1 px-1.5 md:px-2 rounded-lg opacity-0 group-active:opacity-100 md:group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                    R$ {(day.value || 0).toLocaleString('pt-BR')}
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>
                                    <span className="text-[8px] md:text-[10px] font-bold text-gray-300 uppercase tracking-widest group-active:text-[#4A3B32] md:group-hover:text-[#4A3B32] transition-colors font-mono">
                                        {day.date.split('-').slice(1).reverse().join('/')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3.2 RANKINGS - TOP CUSTOMERS */}
            <Card className="rounded-2xl md:rounded-[32px] overflow-hidden border border-gray-100 shadow-md bg-white">
                <CardHeader className="p-6 md:p-8 border-b border-gray-50">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg md:text-2xl font-display text-[#4A3B32]">Clientes VIP</CardTitle>
                            <p className="text-xs md:text-sm text-gray-500 mt-2 font-medium">Top 5 por faturamento e frequência</p>
                        </div>
                        <div className="p-3 md:p-4 bg-[#FDF0ED] rounded-2xl flex-shrink-0">
                            <Users className="w-5 h-5 md:w-6 md:h-6 text-[#C75D3B]" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {topCustomers.length > 0 ? (
                        topCustomers.map((customer, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-8 border-b border-gray-50 last:border-b-0 active:bg-[#FDFBF7] md:hover:bg-[#FDFBF7] transition-all group">
                                <div className="flex items-center gap-3 md:gap-5 mb-3 md:mb-0">
                                    <div className={cn(
                                        "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-bold text-white text-lg md:text-xl ring-4 ring-transparent group-active:ring-[#C75D3B]/10 md:group-hover:ring-[#C75D3B]/10 transition-all flex-shrink-0",
                                        idx === 0 ? "bg-gradient-to-br from-[#C75D3B] to-[#FF8C6B]" :
                                            idx === 1 ? "bg-gradient-to-br from-amber-400 to-amber-500" :
                                                idx === 2 ? "bg-gradient-to-br from-orange-300 to-orange-400" :
                                                    "bg-gray-200 text-gray-600"
                                    )}>
                                        {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : customer.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-[#4A3B32] text-base md:text-lg">{customer.name}</p>
                                        <p className="text-xs md:text-sm text-gray-400 font-medium">{customer.frequency} {customer.frequency === 1 ? 'compra' : 'compras'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-3 md:gap-10">
                                    <div className="text-right">
                                        <p className="font-black text-[#4A3B32] text-lg md:text-xl">R$ {(customer.revenue || 0).toLocaleString('pt-BR')}</p>
                                        <p className="text-[9px] md:text-[10px] text-gray-300 font-bold uppercase tracking-tight">Total gasto</p>
                                    </div>
                                    {idx < 3 && (
                                        <div className="text-2xl md:text-3xl flex-shrink-0">
                                            {idx === 0 ? '👑' : idx === 1 ? '⭐' : '✨'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center text-gray-300 italic text-sm">Aguardando dados de clientes...</div>
                    )}
                </CardContent>
            </Card>

            {/* 3.5 TEMPORAL ANALYSIS - MONTHLY & ACCUMULATED */}
            <div className="grid lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                {/* Monthly Trend */}
                <Card className="rounded-2xl md:rounded-[32px] overflow-hidden border border-gray-100 shadow-md bg-white">
                    <CardHeader className="p-6 md:p-8 pb-0">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg md:text-2xl font-display text-[#4A3B32]">Desempenho Semanal</CardTitle>
                                <p className="text-xs md:text-sm text-gray-500 mt-2 font-medium">Últimas 4 semanas</p>
                            </div>
                            <div className="p-3 md:p-4 bg-[#FDF0ED] rounded-2xl flex-shrink-0">
                                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-[#C75D3B]" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 md:p-8">
                        <div className="h-[180px] md:h-[250px] w-full flex items-end gap-2 md:gap-4 mt-6 md:mt-8">
                            {monthlyData.map((week, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-3 md:gap-4 group">
                                    <div className="relative w-full flex flex-col justify-end h-[140px] md:h-[200px]">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${(week.value / maxMonthlyValue) * 100}%` }}
                                            transition={{ delay: idx * 0.1, duration: 1, ease: "easeOut" }}
                                            className={cn(
                                                "w-full rounded-t-xl md:rounded-t-2xl transition-all relative touch-manipulation",
                                                idx === 3 ? "bg-[#C75D3B]" : "bg-gray-100 group-active:bg-gray-200 md:group-hover:bg-gray-200"
                                            )}
                                        >
                                            {week.value > 0 && (
                                                <div className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 bg-[#4A3B32] text-white text-[8px] md:text-[9px] font-bold py-1 px-1.5 md:px-2 rounded-lg opacity-0 group-active:opacity-100 md:group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                    R$ {(week.value || 0).toLocaleString('pt-BR')}
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>
                                    <span className="text-[8px] md:text-[10px] font-bold text-gray-300 uppercase tracking-widest group-active:text-[#4A3B32] md:group-hover:text-[#4A3B32] transition-colors font-mono">
                                        {week.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Accumulated Sales */}
                <Card className="rounded-2xl md:rounded-[32px] overflow-hidden border border-gray-100 shadow-md bg-white">
                    <CardHeader className="p-6 md:p-8 pb-0">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg md:text-2xl font-display text-[#4A3B32]">Crescimento Acumulado</CardTitle>
                                <p className="text-xs md:text-sm text-gray-500 mt-2 font-medium">Faturamento total ao longo do tempo</p>
                            </div>
                            <div className="p-3 md:p-4 bg-[#FDF0ED] rounded-2xl flex-shrink-0">
                                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-[#C75D3B]" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 md:p-8">
                        {accumulatedData.length > 0 ? (
                            <div className="h-[180px] md:h-[250px] w-full flex items-center justify-between mt-6 md:mt-8 px-2">
                                {accumulatedData.slice(-12).map((point, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="relative w-full flex flex-col justify-end h-[140px] md:h-[200px]">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${(point.value / maxAccumulatedValue) * 100}%` }}
                                                transition={{ delay: idx * 0.05, duration: 1, ease: "easeOut" }}
                                                className="w-full bg-gradient-to-t from-[#C75D3B] to-[#FF8C6B] rounded-t-xl md:rounded-t-2xl transition-all relative touch-manipulation opacity-70 group-active:opacity-100 md:group-hover:opacity-100"
                                            >
                                                {point.value > 0 && (
                                                    <div className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 bg-[#4A3B32] text-white text-[7px] md:text-[8px] font-bold py-0.5 px-1 md:px-1.5 rounded opacity-0 group-active:opacity-100 md:group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                        R$ {(point.value || 0).toLocaleString('pt-BR')}
                                                    </div>
                                                )}
                                            </motion.div>
                                        </div>
                                        <span className="text-[7px] md:text-[9px] font-bold text-gray-300 uppercase tracking-widest font-mono">
                                            +{idx}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-gray-300 italic">
                                Aguardando dados de vendas...
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 4. RECENT ACTIVITY & MONTHLY GOAL */}
            <div className="grid lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8">
                {/* Recent Items List */}
                <Card className="lg:col-span-8 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md bg-white overflow-hidden">
                    <CardHeader className="p-6 md:p-8 border-b border-gray-50 flex flex-row items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg md:text-2xl font-display text-[#4A3B32] truncate">Atividade Operacional</CardTitle>
                            <p className="text-xs md:text-sm text-gray-500 mt-2 font-medium hidden sm:block">Últimas interações processadas</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button className="p-2 md:p-3 bg-gray-100 hover:bg-gray-200 rounded-xl active:bg-gray-200 transition-colors" aria-label="Buscar">
                                <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                            </button>
                            <button className="p-2 md:p-3 bg-gray-100 hover:bg-gray-200 rounded-xl active:bg-gray-200 transition-colors" aria-label="Adicionar">
                                <Plus className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                            </button>
                        </div>
                    </CardHeader>
                    <div className="p-0">
                        {vendas.slice(0, 5).map((venda, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-8 border-b border-gray-50 active:bg-[#FDFBF7] md:hover:bg-[#FDFBF7] transition-all group">
                                <div className="flex items-center gap-3 md:gap-5">
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-[#FAF3F0] flex items-center justify-center text-[#C75D3B] font-bold text-lg md:text-xl ring-4 ring-transparent group-active:ring-[#C75D3B]/10 md:group-hover:ring-[#C75D3B]/10 transition-all flex-shrink-0">
                                        {venda.customerName?.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-[#4A3B32] text-base md:text-lg truncate">{venda.customerName}</p>
                                            <span className="text-[9px] md:text-[10px] font-bold text-[#C75D3B] px-1.5 py-0.5 bg-[#FDF0ED] rounded flex-shrink-0">VENDA</span>
                                        </div>
                                        <p className="text-xs md:text-sm text-gray-400 font-medium truncate">Processado via {venda.paymentMethod === 'fiado' ? 'Crediário' : venda.paymentMethod?.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="mt-3 md:mt-0 flex items-center justify-between md:justify-end gap-3 md:gap-10">
                                    <div className="text-left md:text-right">
                                        <p className="font-black text-[#4A3B32] text-lg md:text-xl">R$ {(venda.totalValue || 0).toLocaleString('pt-BR')}</p>
                                        <p className="text-[9px] md:text-[10px] text-gray-300 font-bold uppercase tracking-tight">{venda.createdAt ? new Date(venda.createdAt).toLocaleDateString('pt-BR') : '-'}</p>
                                    </div>
                                    <div className={cn(
                                        "px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest flex-shrink-0",
                                        venda.paymentStatus === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                    )}>
                                        {venda.paymentStatus === 'paid' ? 'Liquidado' : 'Aguardando'}
                                    </div>
                                    <Link to={`/admin/vendas/${venda.id}`} className="p-2 md:p-3 bg-gray-50 rounded-xl active:bg-[#4A3B32] active:text-white md:hover:bg-[#4A3B32] md:hover:text-white transition-all" aria-label={`Ver venda de ${venda.customerName}`}>
                                        <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Performance Goal & Customers */}
                <div className="lg:col-span-4 space-y-4 md:space-y-6 lg:space-y-8">
                    <Card className="rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm bg-white p-6 md:p-8 overflow-hidden relative">
                        <CardHeader className="p-0 mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-[#FAF3F0] rounded-xl">
                                    <Target className="w-5 h-5 text-[#C75D3B]" />
                                </div>
                                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-[#4A3B32]/40">Meta Mensal</span>
                            </div>
                            <CardTitle className="text-xl md:text-2xl font-display font-bold text-[#4A3B32]">Objetivo de Crescimento</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="space-y-6">
                                {/* Progress Section */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-2xl md:text-3xl font-display font-bold text-[#4A3B32]">R$ {(financialMetrics.netRevenue || 0).toLocaleString('pt-BR')}</p>
                                            <p className="text-[10px] md:text-xs text-gray-400 font-medium">Faturamento atual</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg md:text-xl font-display font-bold text-gray-300">R$ 15.000</p>
                                            <p className="text-[10px] md:text-xs text-gray-400 font-medium">Objetivo</p>
                                        </div>
                                    </div>
                                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(((financialMetrics.netRevenue || 0) / 15000) * 100, 100)}%` }}
                                            transition={{ duration: 2, ease: "circOut" }}
                                            className="h-full bg-gradient-to-r from-[#C75D3B] to-[#FF8C6B] rounded-full"
                                        />
                                    </div>
                                    <p className="text-center text-[10px] font-medium text-gray-400">
                                        {((financialMetrics.netRevenue || 0) / 15000 * 100).toFixed(0)}% da meta • Faltam R$ {Math.max(0, 15000 - (financialMetrics.netRevenue || 0)).toLocaleString('pt-BR')}
                                    </p>
                                </div>

                                {/* Power Insight */}
                                <div className="p-4 bg-[#FAF3F0] rounded-xl border border-[#C75D3B]/10">
                                    <div className="flex items-center gap-2.5 mb-2.5">
                                        <Zap className="w-4 h-4 text-[#C75D3B]" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#C75D3B]">Insight</p>
                                    </div>
                                    <p className="text-sm text-[#4A3B32] font-medium leading-relaxed">
                                        {powerInsight.text}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md bg-white p-6 md:p-8">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                                <Users className="w-8 h-8 md:w-10 md:h-10 text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="text-2xl md:text-3xl font-display font-bold text-[#4A3B32]">{customers?.length || 0}</h4>
                                <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">Clientes na Base</p>
                            </div>
                            <div className="flex -space-x-3">
                                {customers?.slice(0, 5).map((c, i) => (
                                    <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-[#FDF0ED] flex items-center justify-center text-[#C75D3B] font-bold text-sm shadow-sm">
                                        {c.name?.charAt(0)}
                                    </div>
                                ))}
                                {(customers?.length || 0) > 5 && (
                                    <div className="w-12 h-12 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs">
                                        +{(customers?.length || 0) - 5}
                                    </div>
                                )}
                            </div>
                            <Link to="/admin/customers" className="text-[10px] md:text-xs font-bold text-[#C75D3B] uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all pt-2 md:pt-4">
                                Gestão de Relacionamento
                                <ArrowUpRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
            {/* Modal de Parcelinhas */}
            <ParcelinhasModal
                isOpen={showParcelinhasModal}
                onClose={() => setShowParcelinhasModal(false)}
            />
        </div>
    )
}