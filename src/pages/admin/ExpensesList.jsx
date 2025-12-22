import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Receipt, Calendar, DollarSign, Trash2, Edit2, TrendingDown } from 'lucide-react'
import { useSuppliersStore } from '@/store/suppliers-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function ExpensesList() {
    const { expenses, expensesLoading, loadExpenses, removeExpense } = useSuppliersStore()
    const [search, setSearch] = useState('')
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, expenseId: null })

    useEffect(() => {
        loadExpenses()
    }, [loadExpenses])

    const filteredExpenses = expenses.filter(expense =>
        expense.name?.toLowerCase().includes(search.toLowerCase()) ||
        expense.category?.toLowerCase().includes(search.toLowerCase())
    )

    const handleDelete = (id) => {
        setConfirmDelete({ isOpen: true, expenseId: id })
    }

    const onConfirmDelete = async () => {
        const result = await removeExpense(confirmDelete.expenseId)
        if (result.success) {
            toast.success('Gasto excluído com sucesso.')
        } else {
            toast.error(`Erro ao excluir: ${result.error}`)
        }
        setConfirmDelete({ isOpen: false, expenseId: null })
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const getTotalMonthly = () => {
        return filteredExpenses.reduce((sum, e) => sum + (e.value || 0), 0)
    }

    const getRecurrenceLabel = (recurrence) => {
        const labels = {
            'monthly': 'Mensal',
            'quarterly': 'Trimestral',
            'yearly': 'Anual',
            'daily': 'Diário',
            'weekly': 'Semanal'
        }
        return labels[recurrence] || recurrence
    }

    const getRecurrenceColor = (recurrence) => {
        const colors = {
            'monthly': 'bg-blue-100 text-blue-700',
            'quarterly': 'bg-purple-100 text-purple-700',
            'yearly': 'bg-green-100 text-green-700',
            'daily': 'bg-orange-100 text-orange-700',
            'weekly': 'bg-pink-100 text-pink-700'
        }
        return colors[recurrence] || 'bg-gray-100 text-gray-700'
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Gastos Fixos</h2>
                    <p className="text-[#4A3B32]/40 font-medium">Gerencie seus gastos recorrentes.</p>
                </div>

                <Link
                    to="/admin/expenses/new"
                    className="flex items-center gap-2 px-6 py-3 bg-[#4A3B32] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#4A3B32]/10 hover:scale-105 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Novo Gasto
                </Link>
            </div>

            {/* Stats Card */}
            <Card className="bg-gradient-to-br from-red-500 to-red-600">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100 text-sm font-bold uppercase tracking-widest mb-2">Total Mensal</p>
                            <p className="text-4xl font-bold text-white">{formatCurrency(getTotalMonthly())}</p>
                            <p className="text-red-100 text-xs mt-1">{filteredExpenses.length} {filteredExpenses.length === 1 ? 'gasto' : 'gastos'} cadastrados</p>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                            <TrendingDown className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Card */}
            <Card className="overflow-hidden border-none shadow-2xl shadow-gray-100">
                <div className="p-6 border-b border-gray-50 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou categoria..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <CardContent className="p-0">
                    {expensesLoading ? (
                        <div className="p-20 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#C75D3B] border-t-transparent"></div>
                            <p className="mt-4 text-sm text-[#4A3B32]/40 font-medium">Carregando gastos...</p>
                        </div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FAF3F0] flex items-center justify-center">
                                <Receipt className="w-8 h-8 text-[#C75D3B]/40" />
                            </div>
                            <p className="text-sm text-[#4A3B32]/40 font-medium">
                                {search ? 'Nenhum gasto encontrado.' : 'Nenhum gasto cadastrado ainda.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {filteredExpenses.map((expense, idx) => (
                                    <motion.div
                                        key={expense.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-6 hover:bg-[#FDFBF7] transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-6">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                                    <Receipt className="w-6 h-6 text-red-600" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-bold text-[#4A3B32] text-lg">
                                                            {expense.name}
                                                        </h3>
                                                        <span className={cn(
                                                            "text-xs font-bold px-3 py-1 rounded-full",
                                                            getRecurrenceColor(expense.recurrence)
                                                        )}>
                                                            {getRecurrenceLabel(expense.recurrence)}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#4A3B32]/60">
                                                        <div className="flex items-center gap-1.5">
                                                            <DollarSign className="w-3.5 h-3.5" />
                                                            <span className="font-bold text-red-600">{formatCurrency(expense.value)}</span>
                                                        </div>
                                                        {expense.category && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[#4A3B32]/40">•</span>
                                                                <span>{expense.category}</span>
                                                            </div>
                                                        )}
                                                        {expense.dueDay && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                <span>Vence dia {expense.dueDay}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {expense.notes && (
                                                        <p className="mt-2 text-sm text-[#4A3B32]/50 italic line-clamp-2">
                                                            {expense.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/admin/expenses/${expense.id}`}
                                                    className="p-3 text-[#4A3B32]/40 hover:text-[#C75D3B] hover:bg-[#FDF0ED] rounded-xl transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="p-3 text-[#4A3B32]/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, expenseId: null })}
                onConfirm={onConfirmDelete}
                title="Excluir Gasto?"
                description="Tem certeza que deseja excluir este gasto? Esta ação não pode ser desfeita."
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
            />
        </div>
    )
}
