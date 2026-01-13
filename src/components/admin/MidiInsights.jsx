/**
 * MidiInsights Component
 * Exibe insights proativos da Midi no Dashboard
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertCircle, TrendingUp, Lightbulb, X, RefreshCw, ChevronRight } from 'lucide-react'
import { useMidiInsights, useDismissInsight, useGenerateInsights } from '@/hooks/useMidiInsights'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function MidiInsights({ limit = 5, category = null }) {
    const { data: insights = [], isLoading, error, refetch } = useMidiInsights({ limit, category })
    const dismissMutation = useDismissInsight()
    const generateMutation = useGenerateInsights()
    const [expandedId, setExpandedId] = useState(null)

    // Icon mapping
    const getIcon = (type) => {
        const icons = {
            alert: AlertCircle,
            opportunity: TrendingUp,
            trend: TrendingUp,
            recommendation: Lightbulb,
        }
        const Icon = icons[type] || Sparkles
        return Icon
    }

    // Color mapping
    const getColors = (severity) => {
        const colors = {
            critical: {
                bg: 'bg-red-50',
                border: 'border-red-200',
                icon: 'text-red-600',
                badge: 'bg-red-100 text-red-700',
            },
            high: {
                bg: 'bg-orange-50',
                border: 'border-orange-200',
                icon: 'text-orange-600',
                badge: 'bg-orange-100 text-orange-700',
            },
            medium: {
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                icon: 'text-yellow-600',
                badge: 'bg-yellow-100 text-yellow-700',
            },
            low: {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                icon: 'text-blue-600',
                badge: 'bg-blue-100 text-blue-700',
            },
        }
        return colors[severity] || colors.low
    }

    const handleDismiss = (insightId) => {
        dismissMutation.mutate({ insightId, dismissedBy: 'user' })
    }

    const handleGenerate = () => {
        generateMutation.mutate()
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 animate-spin text-brand-terracotta" />
                        <span className="text-sm text-gray-500">Analisando seus dados...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-sm text-red-500">
                        Erro ao carregar insights: {error.message}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-2 border-brand-peach/20 overflow-hidden">
            {/* Header */}
            <CardHeader className="bg-gradient-to-r from-brand-terracotta/5 to-brand-peach/5 border-b border-brand-peach/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-terracotta to-brand-rust flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white animate-pulse" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-display text-brand-brown">
                                Insights da Midi
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {insights.length} insight{insights.length !== 1 && 's'} ativo{insights.length !== 1 && 's'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={generateMutation.isPending}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            generateMutation.isPending
                                ? "text-gray-400 cursor-not-allowed"
                                : "hover:bg-brand-peach/20 text-brand-terracotta"
                        )}
                        title="Atualizar insights"
                    >
                        <RefreshCw className={cn("w-4 h-4", generateMutation.isPending && "animate-spin")} />
                    </button>
                </div>
            </CardHeader>

            {/* Content */}
            <CardContent className="p-0">
                {insights.length === 0 ? (
                    <div className="p-8 text-center">
                        <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Nenhum insight no momento.</p>
                        <p className="text-gray-400 text-xs mt-1">
                            A Midi está analisando seus dados...
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        <AnimatePresence>
                            {insights.map((insight) => {
                                const Icon = getIcon(insight.type)
                                const colors = getColors(insight.severity)
                                const isExpanded = expandedId === insight.id

                                return (
                                    <motion.div
                                        key={insight.id}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -100 }}
                                        className={cn(
                                            "p-4 hover:bg-gray-50/50 transition-all cursor-pointer group",
                                            colors.bg
                                        )}
                                        onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className={cn("mt-0.5 shrink-0", colors.icon)}>
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {/* Title & Badge */}
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="font-medium text-sm text-brand-brown">
                                                        {insight.title}
                                                    </h4>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", colors.badge)}>
                                                            {insight.severity === 'critical' && 'Crítico'}
                                                            {insight.severity === 'high' && 'Alto'}
                                                            {insight.severity === 'medium' && 'Médio'}
                                                            {insight.severity === 'low' && 'Baixo'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                <p className="text-xs text-gray-600 mb-2">
                                                    {insight.description}
                                                </p>

                                                {/* Expanded Details */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pt-2 border-t border-gray-200/50 mt-2">
                                                                {/* Context Data */}
                                                                {insight.context && Object.keys(insight.context).length > 0 && (
                                                                    <div className="text-xs text-gray-500 mb-2">
                                                                        {Object.entries(insight.context).map(([key, value]) => (
                                                                            <div key={key} className="inline-block mr-3">
                                                                                <span className="font-medium">{key}:</span> {value}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    {insight.actionLink && (
                                                        <Link
                                                            to={insight.actionLink}
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-terracotta hover:text-brand-rust transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {insight.actionText || 'Ver Detalhes'}
                                                            <ChevronRight className="w-3 h-3" />
                                                        </Link>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDismiss(insight.id)
                                                        }}
                                                        className="ml-auto p-1 rounded hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-colors"
                                                        title="Dispensar"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
