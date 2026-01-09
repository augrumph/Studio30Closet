import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowUpCircle, ArrowDownCircle, Search, Calendar } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function CashFlowModal({ isOpen, onClose, details, metrics }) {
    const [activeTab, setActiveTab] = useState('inflows') // 'inflows' | 'outflows'
    const [searchTerm, setSearchTerm] = useState('')

    if (!isOpen) return null

    const inflows = details?.inflows || []
    const outflows = details?.outflows || []

    const currentList = activeTab === 'inflows' ? inflows : outflows
    const filteredList = currentList.filter(item =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalInflows = metrics?.receivedAmount || 0
    const totalOutflows = (metrics?.purchasesInPeriod || 0) + (metrics?.totalExpensesInPeriod || 0)
    const balance = metrics?.cashBalance || 0

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
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Detalhamento de Caixa</h2>
                                <p className="text-sm text-gray-500 mt-1">Extrato completo de movimentações do período</p>
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
                                    <ArrowUpCircle size={16} /> Entradas
                                </span>
                                <p className="text-2xl font-bold text-emerald-700 mt-2">
                                    {formatCurrency(totalInflows)}
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                                <span className="text-sm font-medium text-red-600 flex items-center gap-2">
                                    <ArrowDownCircle size={16} /> Saídas
                                </span>
                                <p className="text-2xl font-bold text-red-700 mt-2">
                                    {formatCurrency(totalOutflows)}
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-[#FAF3F0] border border-[#f0e4de]">
                                <span className="text-sm font-medium text-[#C75D3B] flex items-center gap-2">
                                    Saldo Final
                                </span>
                                <p className="text-2xl font-bold text-[#C75D3B] mt-2">
                                    {formatCurrency(balance)}
                                </p>
                            </div>
                        </div>

                        {/* Tabs & Search */}
                        <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-white border-b border-gray-100">
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('inflows')}
                                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'inflows'
                                            ? 'bg-white text-emerald-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Entradas
                                </button>
                                <button
                                    onClick={() => setActiveTab('outflows')}
                                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'outflows'
                                            ? 'bg-white text-red-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Saídas
                                </button>
                            </div>

                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar movimentação..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C75D3B]/20 focus:border-[#C75D3B]"
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
                                    <p className="font-medium">Nenhuma movimentação encontrada</p>
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
                                                <div className={`p-3 rounded-full ${activeTab === 'inflows' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                    {activeTab === 'inflows' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{item.description}</p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
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
                                                <p className={`font-bold text-lg ${activeTab === 'inflows' ? 'text-emerald-600' : 'text-red-600'
                                                    }`}>
                                                    {activeTab === 'inflows' ? '+' : '-'} {formatCurrency(item.value)}
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
