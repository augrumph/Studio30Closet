import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowUpCircle, Search, Calendar, CreditCard, HandCoins } from 'lucide-react'
import { useState, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function ReceivedAmountModal({ isOpen, onClose, details, metrics }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'venda' | 'parcela'

    if (!isOpen) return null

    const inflows = details?.inflows || []

    // Agrupar por tipo para estatísticas
    const vendaTotal = inflows
        .filter(i => i.type === 'Venda')
        .reduce((sum, i) => sum + i.value, 0)

    const parcelaTotal = inflows
        .filter(i => i.type === 'Parcela')
        .reduce((sum, i) => sum + i.value, 0)

    const vendaCount = inflows.filter(i => i.type === 'Venda').length
    const parcelaCount = inflows.filter(i => i.type === 'Parcela').length

    // Filtrar lista
    const filteredList = inflows.filter(item => {
        const matchesSearch =
            item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.type.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesFilter =
            activeFilter === 'all' ||
            (activeFilter === 'venda' && item.type === 'Venda') ||
            (activeFilter === 'parcela' && item.type === 'Parcela')

        return matchesSearch && matchesFilter
    })

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 m-auto w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-emerald-50/50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">💰 Valores Recebidos</h2>
                                <p className="text-sm text-gray-500 mt-1">Detalhamento de todas as entradas no período</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4 p-6 bg-white shrink-0">
                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                <span className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                                    <CreditCard size={16} /> Vendas à Vista
                                </span>
                                <p className="text-2xl font-bold text-emerald-700 mt-2">
                                    {formatCurrency(vendaTotal)}
                                </p>
                                <p className="text-xs text-emerald-500 mt-1">{vendaCount} venda(s)</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <span className="text-sm font-medium text-blue-600 flex items-center gap-2">
                                    <HandCoins size={16} /> Parcelas Recebidas
                                </span>
                                <p className="text-2xl font-bold text-blue-700 mt-2">
                                    {formatCurrency(parcelaTotal)}
                                </p>
                                <p className="text-xs text-blue-500 mt-1">{parcelaCount} parcela(s)</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[#FAF3F0] border border-[#f0e4de]">
                                <span className="text-sm font-medium text-[#C75D3B] flex items-center gap-2">
                                    <ArrowUpCircle size={16} /> Total Recebido
                                </span>
                                <p className="text-2xl font-bold text-[#C75D3B] mt-2">
                                    {formatCurrency(metrics?.receivedAmount || 0)}
                                </p>
                                <p className="text-xs text-[#C75D3B]/70 mt-1">{inflows.length} entrada(s)</p>
                            </div>
                        </div>

                        {/* Filters & Search */}
                        <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-white border-b border-gray-100">
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveFilter('all')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeFilter === 'all'
                                        ? 'bg-white text-gray-800 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setActiveFilter('venda')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeFilter === 'venda'
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Vendas
                                </button>
                                <button
                                    onClick={() => setActiveFilter('parcela')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeFilter === 'parcela'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Parcelas
                                </button>
                            </div>

                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar entrada..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            {filteredList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <div className="p-4 bg-gray-100 rounded-full mb-3">
                                        <Search size={32} />
                                    </div>
                                    <p className="font-medium">Nenhuma entrada encontrada</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredList.map((item, index) => (
                                        <motion.div
                                            key={item.id || index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${item.type === 'Venda'
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {item.type === 'Venda' ? <CreditCard size={20} /> : <HandCoins size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{item.description}</p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                        <span className={`px-2 py-0.5 rounded font-medium ${item.type === 'Venda'
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : 'bg-blue-100 text-blue-600'
                                                            }`}>
                                                            {item.type}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            {item.date ? format(new Date(item.date), "dd 'de' MMM, HH:mm", { locale: ptBR }) : '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold text-lg ${item.type === 'Venda' ? 'text-emerald-600' : 'text-blue-600'
                                                    }`}>
                                                    + {formatCurrency(item.value)}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
