import { useEffect, useState, useMemo } from 'react'
import {
    Users,
    ShoppingBag,
    Package,
    TrendingUp,
    Clock,
    DollarSign,
    Calendar,
    ArrowUpRight,
    Plus,
    Target,
    Zap,
    CreditCard,
    ArrowDownRight,
    MoreHorizontal,
    Search,
    AlertTriangle,
    TrendingDown
} from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { getDashboardMetrics } from '@/lib/api'

export function Dashboard() {
    const vendas = useAdminStore(state => state.vendas)
    const customers = useAdminStore(state => state.customers)
    const vendasLoading = useAdminStore(state => state.vendasLoading)
    const reloadAll = useAdminStore(state => state.reloadAll)

    const [currentTime, setCurrentTime] = useState(new Date())
    const [dashboardData, setDashboardData] = useState(null)
    const [dashboardLoading, setDashboardLoading] = useState(false)

    useEffect(() => {
        // Carregar dados apenas uma vez quando componente monta
        // Dashboard apenas precisa de vendas para suas métricas
        if (!vendas.length) {
            reloadAll()
        }
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(timer)
    }, [reloadAll, vendas])

    // Carregar dados adicionais para analytics completo
    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setDashboardLoading(true)
                const data = await getDashboardMetrics()
                setDashboardData(data)
            } catch (error) {
                console.error('Erro ao carregar métricas do dashboard:', error)
            } finally {
                setDashboardLoading(false)
            }
        }

        if (vendas.length) {
            loadDashboardData()
        }
    }, [vendas])

    // --- CÁLCULOS FINANCEIROS COMPLETOS (DRE GERENCIAL) ---
    const financialMetrics = useMemo(() => {
        // (1) RECEITA BRUTA - Apenas vendas pagas
        const paidSales = vendas.filter(v => v.paymentStatus === 'paid');
        const grossRevenue = paidSales.reduce((sum, v) => sum + (v.totalValue || 0), 0);

        // (2) RECEITA LÍQUIDA - Após taxas
        const netRevenue = paidSales.reduce((sum, v) => sum + (v.netAmount || v.totalValue - (v.feeAmount || 0)), 0);

        // (3) NÚMERO DE VENDAS E TICKET MÉDIO
        const totalPaidSales = paidSales.length;
        const averageTicket = totalPaidSales > 0 ? grossRevenue / totalPaidSales : 0;

        // (4) CPV - Custo dos Produtos Vendidos (usando custo armazenado)
        const totalCPV = paidSales.reduce((sum, v) => sum + (v.costPrice || 0), 0);

        // (5) LUCRO BRUTO
        const grossProfit = grossRevenue - totalCPV;

        // (6) MARGEM BRUTA PERCENTUAL
        const grossMarginPercent = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

        // (7) TAXAS - Total e percentual
        const totalFees = paidSales.reduce((sum, v) => sum + (v.feeAmount || 0), 0);
        const feePercent = grossRevenue > 0 ? (totalFees / grossRevenue) * 100 : 0;

        // (8) DESCONTOS - Cupons + diferença de preço
        const totalDiscounts = paidSales.reduce((sum, v) => {
            const discount = (v.totalValue || 0) - (v.netAmount || v.totalValue);
            return sum + discount;
        }, 0);

        // (9) DESPESAS FIXAS MENSALIZADAS
        let monthlyExpenses = 0;
        if (dashboardData?.expenses && dashboardData.expenses.length > 0) {
            monthlyExpenses = dashboardData.expenses.reduce((sum, expense) => {
                let monthlyValue = expense.value || 0;
                const recurrence = expense.recurrence?.toLowerCase() || 'mensal';

                if (recurrence === 'diário' || recurrence === 'daily') {
                    monthlyValue *= 30;
                } else if (recurrence === 'semanal' || recurrence === 'weekly') {
                    monthlyValue *= 4.33;
                } else if (recurrence === 'trimestral' || recurrence === 'quarterly') {
                    monthlyValue /= 3;
                } else if (recurrence === 'anual' || recurrence === 'yearly') {
                    monthlyValue /= 12;
                }
                return sum + monthlyValue;
            }, 0);
        }

        // (10) LUCRO OPERACIONAL
        const operatingProfit = grossProfit - monthlyExpenses;

        // (11) MARGEM LÍQUIDA
        const netMarginPercent = grossRevenue > 0 ? (operatingProfit / grossRevenue) * 100 : 0;

        // (12) FLUXO DE CAIXA
        const receivedAmount = netRevenue;
        const toReceiveAmount = dashboardData?.installments ?
            dashboardData.installments.reduce((sum, inst) => {
                const paid = inst.installmentPayments?.reduce((s, p) => s + (p.paymentAmount || 0), 0) || 0;
                const remaining = (inst.originalAmount || 0) - paid;
                return sum + Math.max(0, remaining);
            }, 0) : 0;

        // (13) INDICADORES DE RISCO
        let overdueAmount = 0;
        let overdueCount = 0;
        if (dashboardData?.installments) {
            dashboardData.installments.forEach(inst => {
                const dueDate = new Date(inst.dueDate);
                if (dueDate < new Date()) {
                    const paid = inst.installmentPayments?.reduce((s, p) => s + (p.paymentAmount || 0), 0) || 0;
                    const remaining = (inst.originalAmount || 0) - paid;
                    if (remaining > 0) {
                        overdueAmount += remaining;
                        overdueCount += 1;
                    }
                }
            });
        }
        const defaultPercent = grossRevenue > 0 ? (overdueAmount / (grossRevenue + toReceiveAmount + overdueAmount)) * 100 : 0;

        // Pending fiado (not paid)
        const pendingFiado = vendas
            .filter(v => v.paymentMethod === 'fiado' && v.paymentStatus === 'pending')
            .reduce((acc, curr) => acc + (curr.totalValue || 0), 0);

        return {
            // DRE Metrics
            grossRevenue,                // (1) Receita Bruta
            netRevenue,                  // (2) Receita Líquida
            totalPaidSales,              // (3) Número de vendas pagas
            averageTicket,               // (3) Ticket Médio
            totalCPV,                    // (4) CPV
            grossProfit,                 // (5) Lucro Bruto
            grossMarginPercent,          // (6) Margem Bruta %
            totalFees,                   // (7) Total de Taxas
            feePercent,                  // (7) % Taxas
            totalDiscounts,              // (8) Total Descontos
            monthlyExpenses,             // (9) Despesas Fixas
            operatingProfit,             // (10) Lucro Operacional
            netMarginPercent,            // (11) Margem Líquida %
            // Cash Flow
            receivedAmount,              // (12) Valores Recebidos
            toReceiveAmount,             // (12) Valores a Receber
            // Risk Indicators
            overdueAmount,               // (13) Parcelas Atrasadas
            overdueCount,                // (13) Número de Parcelas Vencidas
            defaultPercent,              // (13) Inadimplência %
            // Legacy metrics
            totalSales: grossRevenue,
            totalGrossMarginValue: grossProfit,
            totalNetMarginValue: operatingProfit,
            totalCostPrice: totalCPV,
            overallGrossMarginPercent: grossMarginPercent,
            overallNetMarginPercent: netMarginPercent,
            pendingFiado
        };
    }, [vendas, dashboardData])

    // --- TREND ANALYTICS (Últimos 7 dias) ---
    const weeklyData = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - i)
            return d.toISOString().split('T')[0]
        }).reverse()

        return last7Days.map(date => {
            const daySales = vendas.filter(v => v.createdAt.startsWith(date))
                .reduce((acc, v) => acc + v.totalValue, 0)
            return { date, value: daySales }
        })
    }, [vendas])

    const maxValue = Math.max(...weeklyData.map(d => d.value), 100)

    // --- TOP PRODUCTS ---
    const topProducts = useMemo(() => {
        const productSales = {}
        vendas.forEach(v => {
            v.items?.forEach(item => {
                const id = item.productId
                if (!productSales[id]) {
                    productSales[id] = {
                        name: item.name,
                        quantity: 0,
                        revenue: 0,
                        productId: id
                    }
                }
                productSales[id].quantity += (item.quantity || 1)
                productSales[id].revenue += (item.price * (item.quantity || 1))
            })
        })

        return Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 4)
    }, [vendas])

    const greetings = () => {
        const hour = currentTime.getHours()
        if (hour < 12) return "Bom dia"
        if (hour < 18) return "Boa tarde"
        return "Boa noite"
    }

    return (
        <div className="space-y-6 md:space-y-10 max-w-[1600px] mx-auto">

            {/* 1. HERO SECTION & QUICK ACTIONS */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative overflow-hidden rounded-3xl md:rounded-[40px] bg-gradient-to-br from-[#4A3B32] via-[#5A4B42] to-[#4A3B32] p-6 md:p-8 lg:p-12 text-white shadow-2xl border border-white/5"
            >
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#C75D3B]/30 via-[#C75D3B]/10 to-transparent pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[#C75D3B]/20 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-10">
                    <div className="space-y-3 md:space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1 md:py-1.5 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/80">Monitor Studio 30 • Ao Vivo</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl lg:text-6xl font-display font-bold leading-tight">
                            {greetings()}, <br />
                            <span className="text-[#C75D3B]">Equipe Studio 30</span>
                        </h1>
                        <p className="text-white/40 font-medium text-sm md:text-base lg:text-lg leading-relaxed max-w-md italic">
                            Sua curadoria de moda com a agilidade que suas clientes merecem.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <Link
                            to="/admin/vendas/new"
                            className="p-4 md:p-6 bg-[#C75D3B] active:bg-[#A64D31] md:hover:bg-[#A64D31] rounded-2xl md:rounded-3xl transition-all shadow-xl group flex flex-col gap-2 md:gap-3"
                        >
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center group-active:scale-95 md:group-hover:scale-110 transition-transform">
                                <Zap className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <span className="font-bold text-xs md:text-sm tracking-tight uppercase">Venda Rápida</span>
                        </Link>
                        <Link
                            to="/admin/malinhas/new"
                            className="p-4 md:p-6 bg-white/10 active:bg-white/20 md:hover:bg-white/20 rounded-2xl md:rounded-3xl transition-all shadow-xl border border-white/5 group flex flex-col gap-2 md:gap-3"
                        >
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center group-active:scale-95 md:group-hover:scale-110 transition-transform">
                                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <span className="font-bold text-xs md:text-sm tracking-tight uppercase">Montar Malinha</span>
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* 2. FINANCIAL SCOREBOARD - DRE GERENCIAL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                    // Receita
                    { label: 'Receita Bruta', value: financialMetrics.grossRevenue, icon: DollarSign, color: 'blue', description: 'Vendas pagas' },
                    { label: 'Receita Líquida', value: financialMetrics.netRevenue, icon: DollarSign, color: 'cyan', description: 'Após taxas' },
                    { label: 'Ticket Médio', value: financialMetrics.averageTicket, icon: ShoppingBag, color: 'sky', description: `${financialMetrics.totalPaidSales} vendas pagas` },

                    // Custos e Margens
                    { label: 'CPV', value: financialMetrics.totalCPV, icon: Package, color: 'amber', description: 'Custo produtos vendidos' },
                    { label: 'Lucro Bruto', value: financialMetrics.grossProfit, icon: ArrowUpRight, color: 'green', description: 'Receita - CPV' },
                    { label: 'Margem Bruta', value: financialMetrics.grossMarginPercent, icon: TrendingUp, color: 'emerald', description: (financialMetrics.grossMarginPercent).toFixed(1) + '%', isPercentage: true },

                    // Taxas e Descontos
                    { label: 'Taxas Pagto', value: financialMetrics.totalFees, icon: CreditCard, color: 'orange', description: (financialMetrics.feePercent).toFixed(1) + '% da receita' },
                    { label: 'Descontos', value: financialMetrics.totalDiscounts, icon: ArrowDownRight, color: 'red', description: 'Cupons e ajustes' },

                    // Despesas e Lucro
                    { label: 'Despesas Fixas', value: financialMetrics.monthlyExpenses, icon: Calendar, color: 'slate', description: 'Mensalizadas' },
                    { label: 'Lucro Operacional', value: financialMetrics.operatingProfit, icon: Target, color: 'purple', description: 'Lucro Bruto - Despesas' },
                    { label: 'Margem Líquida', value: financialMetrics.netMarginPercent, icon: TrendingUp, color: 'indigo', description: (financialMetrics.netMarginPercent).toFixed(1) + '%', isPercentage: true }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        transition={{ delay: i * 0.08, duration: 0.4 }}
                        className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn(
                                    "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all",
                                    stat.color === 'blue' ? "bg-blue-100 text-blue-600" :
                                    stat.color === 'cyan' ? "bg-cyan-100 text-cyan-600" :
                                    stat.color === 'sky' ? "bg-sky-100 text-sky-600" :
                                    stat.color === 'amber' ? "bg-amber-100 text-amber-600" :
                                    stat.color === 'emerald' ? "bg-emerald-100 text-emerald-600" :
                                    stat.color === 'purple' ? "bg-purple-100 text-purple-600" :
                                    stat.color === 'indigo' ? "bg-indigo-100 text-indigo-600" :
                                    stat.color === 'orange' ? "bg-orange-100 text-orange-600" :
                                    stat.color === 'slate' ? "bg-slate-100 text-slate-600" :
                                    stat.color === 'green' ? "bg-green-100 text-green-600" :
                                    "bg-red-100 text-red-600"
                                )}>
                                    <stat.icon className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                            </div>
                            <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                            <h3 className="text-2xl md:text-3xl font-display font-bold text-[#4A3B32] mb-3 leading-tight">
                                {stat.isPercentage ?
                                    `${(stat.value || 0).toFixed(1)}%` :
                                    `R$ ${(stat.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                }
                            </h3>
                            <p className="text-xs text-gray-500 font-medium line-clamp-2">{stat.description}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* CASH FLOW & RISK INDICATORS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Fluxo de Caixa - Recebido */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ delay: 0.48, duration: 0.4 }}
                    className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <ArrowDownRight className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">Valores Recebidos</p>
                        <h3 className="text-2xl md:text-3xl font-display font-bold text-emerald-600 mb-3 leading-tight">
                            R$ {(financialMetrics.receivedAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">Caixa efetivo</p>
                    </div>
                </motion.div>

                {/* Fluxo de Caixa - A Receber */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ delay: 0.56, duration: 0.4 }}
                    className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center",
                                financialMetrics.toReceiveAmount > 0 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                            )}>
                                <Clock className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">Valores a Receber</p>
                        <h3 className={cn(
                            "text-2xl md:text-3xl font-display font-bold mb-3 leading-tight",
                            financialMetrics.toReceiveAmount > 0 ? "text-amber-600" : "text-green-600"
                        )}>
                            R$ {(financialMetrics.toReceiveAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">Parcelas pendentes</p>
                    </div>
                </motion.div>

                {/* Inadimplência */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ delay: 0.64, duration: 0.4 }}
                    className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center",
                                financialMetrics.overdueAmount > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                            )}>
                                <AlertTriangle className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">Inadimplência</p>
                        <h3 className={cn(
                            "text-2xl md:text-3xl font-display font-bold mb-3 leading-tight",
                            financialMetrics.overdueAmount > 0 ? "text-red-600" : "text-green-600"
                        )}>
                            {(financialMetrics.defaultPercent || 0).toFixed(1)}%
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                            {financialMetrics.overdueCount > 0 ? `${financialMetrics.overdueCount} parcelas atrasadas` : 'Nenhuma parcela vencida'}
                        </p>
                    </div>
                </motion.div>

                {/* Crediário Pendente (legacy) */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ delay: 0.72, duration: 0.4 }}
                    className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md hover:shadow-lg active:shadow-lg transition-all group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all",
                                financialMetrics.pendingFiado > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                            )}>
                                <CreditCard className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                        </div>
                        <p className="text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">Fiado Pendente</p>
                        <h3 className={cn(
                            "text-2xl md:text-3xl font-display font-bold mb-3 leading-tight",
                            financialMetrics.pendingFiado > 0 ? "text-red-600" : "text-emerald-600"
                        )}>
                            R$ {(financialMetrics.pendingFiado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">Vendas não pagas</p>
                    </div>
                </motion.div>
            </div>

            {/* 3. TRENDS & TOP PRODUCTS */}
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
                                            animate={{ height: `${(day.value / maxValue) * 100}%` }}
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

                {/* Top Products */}
                <Card className="rounded-2xl md:rounded-[32px] overflow-hidden border border-gray-100 shadow-md bg-white">
                    <CardHeader className="p-6 md:p-8">
                        <CardTitle className="text-lg md:text-2xl font-display text-[#4A3B32]">Produtos Estrela</CardTitle>
                        <p className="text-xs md:text-sm text-gray-500 mt-2 font-medium">Os queridinhos do Studio 30</p>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8 pt-0">
                        <div className="space-y-4 md:space-y-6">
                            {topProducts.length > 0 ? topProducts.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-3 md:gap-4 group">
                                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100 group-active:scale-105 md:group-hover:scale-105 transition-transform">
                                        {p.image ? (
                                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                <Package className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-[#4A3B32] truncate text-sm">{p.name}</p>
                                        <p className="text-xs text-gray-400 font-medium">{p.quantity} unidades vendidas</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-[#C75D3B] text-sm">R$ {(p.revenue || 0).toLocaleString('pt-BR')}</p>
                                        <div className="flex items-center justify-end gap-1 mt-0.5">
                                            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Top {idx + 1}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-10 text-center text-gray-300 italic text-sm">Nenhum dado de venda ainda.</div>
                            )}
                        </div>
                        <Link to="/admin/products" className="mt-10 w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:border-[#C75D3B]/20 hover:text-[#C75D3B] transition-all">
                            Ver Catálogo Completo
                        </Link>
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
                            <button className="p-2 md:p-3 bg-gray-100 hover:bg-gray-200 rounded-xl active:bg-gray-200 transition-colors"><Search className="w-4 h-4 md:w-5 md:h-5 text-gray-600" /></button>
                            <button className="p-2 md:p-3 bg-gray-100 hover:bg-gray-200 rounded-xl active:bg-gray-200 transition-colors"><Plus className="w-4 h-4 md:w-5 md:h-5 text-gray-600" /></button>
                        </div>
                    </CardHeader>
                    <div className="p-0">
                        {vendas.slice(0, 5).map((venda, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-8 border-b border-gray-50 active:bg-[#FDFBF7] md:hover:bg-[#FDFBF7] transition-all group">
                                <div className="flex items-center gap-3 md:gap-5">
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-[#FAF3F0] flex items-center justify-center text-[#C75D3B] font-bold text-lg md:text-xl ring-4 ring-transparent group-active:ring-[#C75D3B]/10 md:group-hover:ring-[#C75D3B]/10 transition-all flex-shrink-0">
                                        {venda.customerName.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-[#4A3B32] text-base md:text-lg truncate">{venda.customerName}</p>
                                            <span className="text-[9px] md:text-[10px] font-bold text-[#C75D3B] px-1.5 py-0.5 bg-[#FDF0ED] rounded flex-shrink-0">VENDA</span>
                                        </div>
                                        <p className="text-xs md:text-sm text-gray-400 font-medium truncate">Processado via {venda.paymentMethod === 'fiado' ? 'Crediário' : venda.paymentMethod.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="mt-3 md:mt-0 flex items-center justify-between md:justify-end gap-3 md:gap-10">
                                    <div className="text-left md:text-right">
                                        <p className="font-black text-[#4A3B32] text-lg md:text-xl">R$ {(venda.totalValue || 0).toLocaleString('pt-BR')}</p>
                                        <p className="text-[9px] md:text-[10px] text-gray-300 font-bold uppercase tracking-tight">{new Date(venda.createdAt).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className={cn(
                                        "px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest flex-shrink-0",
                                        venda.paymentStatus === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                    )}>
                                        {venda.paymentStatus === 'paid' ? 'Liquidado' : 'Aguardando'}
                                    </div>
                                    <Link to={`/admin/vendas/${venda.id}`} className="p-2 md:p-3 bg-gray-50 rounded-xl active:bg-[#4A3B32] active:text-white md:hover:bg-[#4A3B32] md:hover:text-white transition-all">
                                        <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Performance Goal Mastery */}
                <div className="lg:col-span-4 space-y-4 md:space-y-6 lg:space-y-8">
                    <Card className="rounded-2xl md:rounded-[32px] border border-white/10 shadow-md bg-[#4A3B32] text-white p-6 md:p-8 overflow-hidden relative group">
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover:bg-white/10 transition-colors" />
                        <CardHeader className="p-0 mb-6 md:mb-10">
                            <div className="flex items-center gap-3 mb-4 md:mb-5">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md"><Target className="w-5 h-5 md:w-6 md:h-6 text-[#C75D3B]" /></div>
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/50">Objetivo Mensal</span>
                            </div>
                            <CardTitle className="text-xl md:text-3xl font-display font-bold text-white">Meta de Crescimento</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="space-y-6 md:space-y-10">
                                <div className="space-y-3 md:space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-3xl md:text-4xl font-display font-bold">R$ {(financialMetrics.totalSales || 0).toLocaleString('pt-BR')}</p>
                                            <p className="text-[10px] md:text-xs text-white/30 font-medium">Acumulado do período</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg md:text-xl font-display font-bold text-white/60">R$ 50.000</p>
                                            <p className="text-[10px] md:text-xs text-white/30 font-medium">Objetivo</p>
                                        </div>
                                    </div>
                                    <div className="h-3 md:h-4 w-full bg-white/10 rounded-full overflow-hidden p-0.5 md:p-1 border border-white/5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((financialMetrics.totalSales / 50000) * 100, 100)}%` }}
                                            transition={{ duration: 2, ease: "circOut" }}
                                            className="h-full bg-gradient-to-r from-[#C75D3B] to-[#FF8C6B] rounded-full shadow-[0_0_20px_rgba(199,93,59,0.5)]"
                                        />
                                    </div>
                                    <p className="text-center text-[9px] md:text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] md:tracking-[0.3em]">
                                        Faltam R$ {(50000 - (financialMetrics.totalSales || 0)).toLocaleString('pt-BR')} para o próximo nível
                                    </p>
                                </div>

                                <div className="p-4 md:p-6 bg-white/5 rounded-2xl md:rounded-[32px] border border-white/5 backdrop-blur-sm space-y-3 md:space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#C75D3B]/20 flex items-center justify-center border border-[#C75D3B]/20">
                                            <Zap className="w-5 h-5 text-[#C75D3B]" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-[#C75D3B]">Power Insight</p>
                                    </div>
                                    <p className="text-sm text-white/60 italic font-medium leading-relaxed">
                                        "Suas clientes estão comprando 15% mais via WhatsApp esta semana. Considere focar suas novas peças lá."
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
                                        {c.name.charAt(0)}
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
        </div>
    )
}
