
import {
    Eye,
    ShoppingCart,
    MousePointer,
    TrendingUp,
    Smartphone,
    Monitor,
    Globe,
    Share2,
    Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export function SitePulse({ summary, isLoading }) {
    if (isLoading || !summary) {
        return <SitePulseSkeleton />
    }

    const {
        pageViews,
        catalogViews,
        conversionRate,
        trafficSources,
        deviceBreakdown,
        checkoutsStarted,
        checkoutsCompleted
    } = summary

    // Cálculos de porcentagem para barras
    const totalTraffic = (trafficSources?.google || 0) + (trafficSources?.social || 0) + (trafficSources?.direct || 0) + (trafficSources?.other || 0) || 1
    const totalDevices = (deviceBreakdown?.mobile || 0) + (deviceBreakdown?.desktop || 0) + (deviceBreakdown?.tablet || 0) || 1

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* 1. Header Section */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-lg">
                    <Zap className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                    <h2 className="text-xl font-display font-bold text-[#4A3B32]">Pulso do Site</h2>
                    <p className="text-xs text-gray-500 font-medium">Monitoramento em tempo real da sua campanha</p>
                </div>
            </div>

            {/* 2. Top KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KpiCard
                    title="Visitas Totais"
                    value={pageViews}
                    icon={Eye}
                    color="blue"
                    subtext="Pessoas no site"
                />
                <KpiCard
                    title="No Catálogo"
                    value={catalogViews}
                    icon={MousePointer}
                    color="purple"
                    subtext="Interesse real"
                />
                <KpiCard
                    title="Checkout"
                    value={checkoutsStarted}
                    icon={ShoppingCart}
                    color="amber"
                    subtext="Botaram dados"
                />
                <KpiCard
                    title="Conversão"
                    value={`${conversionRate}%`}
                    icon={TrendingUp}
                    color="emerald"
                    subtext={`${checkoutsCompleted} vendas hoje`}
                />
            </div>

            {/* 3. Deep Dive Row */}
            <div className="grid lg:grid-cols-3 gap-6">

                {/* Traffic Sources */}
                <Card className="lg:col-span-2 border-none shadow-md bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2 border-b border-gray-50">
                        <CardTitle className="text-sm font-bold text-[#4A3B32] uppercase tracking-wider flex items-center gap-2">
                            <Globe className="w-4 h-4 text-rose-500" />
                            Origem do Tráfego (Google Ads Focus)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            {/* Google Bar */}
                            <TrafficBar
                                label="Google / Ads"
                                value={trafficSources?.google || 0}
                                total={totalTraffic}
                                color="bg-blue-500"
                                icon="🔍"
                            />
                            {/* Social Bar */}
                            <TrafficBar
                                label="Instagram / Social"
                                value={trafficSources?.social || 0}
                                total={totalTraffic}
                                color="bg-purple-500"
                                icon="📸"
                            />
                            {/* Direct Bar */}
                            <TrafficBar
                                label="Acesso Direto / WhatsApp"
                                value={trafficSources?.direct || 0}
                                total={totalTraffic}
                                color="bg-emerald-500"
                                icon="🔗"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Device Breakdown */}
                <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2 border-b border-gray-50">
                        <CardTitle className="text-sm font-bold text-[#4A3B32] uppercase tracking-wider flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-amber-500" />
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
                                    {Math.round(((deviceBreakdown?.mobile || 0) / totalDevices) * 100)}%
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
                                    {Math.round(((deviceBreakdown?.desktop || 0) / totalDevices) * 100)}%
                                </p>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pc/Note</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function KpiCard({ title, value, icon: Icon, color, subtext }) {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600",
        purple: "bg-purple-50 text-purple-600",
        amber: "bg-amber-50 text-amber-600",
        emerald: "bg-emerald-50 text-emerald-600"
    }

    return (
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className={cn("p-2 rounded-lg", colorStyles[color])}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">{title}</span>
                </div>
                <div className="space-y-1">
                    <p className="text-2xl font-bold text-[#4A3B32]">{value}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-medium">{subtext}</p>
                </div>
            </CardContent>
        </Card>
    )
}

function TrafficBar({ label, value, total, color, icon }) {
    const percentage = Math.round((value / total) * 100)

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

function SitePulseSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl" />)}
            </div>
        </div>
    )
}
