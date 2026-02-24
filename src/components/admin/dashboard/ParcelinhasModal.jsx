import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar, Phone, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'
import { getUpcomingInstallments } from '@/lib/api'
import { cn } from '@/lib/utils'


/**
 * Modal de Parcelinhas - Visual Estático Amber/Orange com Portal
 */
export function ParcelinhasModal({ isOpen, onClose }) {
    const [filter, setFilter] = useState('today') // today, 7days, 30days
    const [installments, setInstallments] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, valor: 0, atrasadas: 0 })

    useEffect(() => {
        if (isOpen) {
            loadInstallments()
            // Bloquear scroll do body quando modal abre
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, filter])

    const loadInstallments = async () => {
        setLoading(true)
        try {
            // ✅ Usar a API centralizada que já contém a lógica de "parcelas virtuais"
            const data = await getUpcomingInstallments()

            let filtered = []
            if (filter === 'today') {
                filtered = data.today
            } else {
                // Para 7 e 30 dias usamos o que a API trouxe (hoje + semana)
                // Se o usuário quiser 30 dias real teria que carregar mais, 
                // mas para o dashboard os próximos 7 dias costumam ser o foco.
                filtered = [...data.today, ...data.thisWeek]
            }

            const totalValor = filtered.reduce((sum, i) => sum + (i.remainingAmount || 0), 0)

            setInstallments(filtered)
            setStats({
                total: filtered.length,
                valor: totalValor,
                atrasadas: data.overdueCount || 0
            })
        } catch (err) {
            console.error('Erro ao carregar parcelas:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T12:00:00')
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)
        const todayStr = today.toISOString().split('T')[0]
        const tomorrowStr = tomorrow.toISOString().split('T')[0]

        if (dateStr === todayStr) return { text: 'Hoje', isToday: true, color: 'text-amber-700', bg: 'bg-amber-100' }
        if (dateStr === tomorrowStr) return { text: 'Amanhã', isToday: false, color: 'text-blue-700', bg: 'bg-blue-100' }
        return {
            text: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }),
            isToday: false,
            color: 'text-gray-600',
            bg: 'bg-gray-100'
        }
    }

    if (!isOpen) return null

    return createPortal(
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200"
            style={{ zIndex: 9999 }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col relative transition-transform duration-200 transform scale-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Header com Gradiente Amber/Orange */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 md:p-8 text-white relative flex-shrink-0">
                    {/* Elementos decorativos sutis */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl pointer-events-none" />

                    <div className="relative z-10 flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-display font-bold mb-1 tracking-tight">Vencimentos</h2>
                            <p className="text-amber-100 font-medium text-sm">Controle de Crediário</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors active:scale-95 backdrop-blur-sm"
                            aria-label="Fechar"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-3 gap-3 relative z-10">
                        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 md:p-4 border border-white/10">
                            <p className="text-[10px] md:text-xs font-bold text-amber-100 uppercase tracking-wider mb-1">Quantidade</p>
                            <p className="text-xl md:text-2xl font-display font-bold">{stats.total}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 md:p-4 border border-white/10">
                            <p className="text-[10px] md:text-xs font-bold text-amber-100 uppercase tracking-wider mb-1">Total a Receber</p>
                            <p className="text-xl md:text-2xl font-display font-bold text-white">
                                <span className="text-sm font-normal text-amber-200 mr-1">R$</span>
                                {stats.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div className={cn(
                            "backdrop-blur-md rounded-2xl p-3 md:p-4 border transition-colors",
                            stats.atrasadas > 0 ? "bg-red-500/30 border-red-200/30" : "bg-white/20 border-white/10"
                        )}>
                            <div className="flex items-center gap-2 mb-1">
                                <p className={cn("text-[10px] md:text-xs font-bold uppercase tracking-wider", stats.atrasadas > 0 ? "text-red-100" : "text-amber-100")}>Atrasadas</p>
                                {stats.atrasadas > 0 && <AlertCircle className="w-3 h-3 text-red-100" />}
                            </div>
                            <p className={cn("text-xl md:text-2xl font-display font-bold", stats.atrasadas > 0 ? "text-red-50" : "text-white")}>
                                {stats.atrasadas}
                            </p>
                        </div>
                    </div>

                    {/* Abas de Filtro */}
                    <div className="flex p-1 bg-black/10 backdrop-blur-sm rounded-xl mt-6 relative z-10 w-fit">
                        {[
                            { value: 'today', label: 'Hoje' },
                            { value: '7days', label: '7 Dias' }
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all relative z-10",
                                    filter === f.value
                                        ? "bg-white text-amber-700 shadow-sm"
                                        : "text-amber-100 hover:text-white"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista de Parcelas */}
                <div className="flex-1 overflow-y-auto bg-gray-50/80 p-4">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-white rounded-2xl animate-pulse shadow-sm border border-gray-100" />
                            ))}
                        </div>
                    ) : installments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-gray-900 font-bold text-lg">Tudo limpo!</h3>
                            <p className="text-gray-500 text-sm mt-1">Nenhuma parcela vencendo neste período.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {installments.map((item) => {
                                const dateInfo = formatDate(item.dueDate)

                                return (
                                    <div
                                        key={item.id}
                                        className="group bg-white p-4 rounded-2xl border border-gray-100 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/5 transition-all relative overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-3 md:gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm transition-transform group-hover:scale-105",
                                                    dateInfo.isToday
                                                        ? "bg-gradient-to-br from-amber-500 to-orange-500"
                                                        : "bg-gradient-to-br from-gray-400 to-gray-500"
                                                )}>
                                                    {item.customerName?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm md:text-base leading-tight mb-1">{item.customerName}</p>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-md font-bold flex items-center gap-1",
                                                            dateInfo.bg, dateInfo.color
                                                        )}>
                                                            <Calendar className="w-3 h-3" />
                                                            {dateInfo.text}
                                                        </span>
                                                        <span className="text-gray-400 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                                                            <TrendingUp className="w-3 h-3" />
                                                            {item.installmentNumber}/{item.totalInstallments}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1">
                                                <p className={cn(
                                                    "font-display font-bold text-lg md:text-xl",
                                                    dateInfo.isToday ? "text-orange-600" : "text-gray-700"
                                                )}>
                                                    <span className="text-xs font-normal text-gray-400 mr-1">R$</span>
                                                    {(item.remainingAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>

                                                {item.customerPhone && (
                                                    <a
                                                        href={`https://wa.me/55${item.customerPhone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] md:text-xs font-bold hover:bg-green-100 transition-colors bg-green-50/50"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
