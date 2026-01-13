import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Receipt, DollarSign, Calendar, FileText, Tag } from 'lucide-react'
import { useAdminExpense, useAdminExpensesMutations } from '@/hooks/useAdminExpenses'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function ExpensesForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEdit = Boolean(id)

    // Hooks
    const { createExpense, updateExpense, isCreating, isUpdating } = useAdminExpensesMutations()
    const { data: expenseData, isLoading: isLoadingExpense } = useAdminExpense(id ? parseInt(id) : null)

    const expensesLoading = isCreating || isUpdating || isLoadingExpense

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        value: '',
        recurrence: 'monthly',
        dueDay: '',
        notes: ''
    })

    useEffect(() => {
        if (isEdit && expenseData) {
            setFormData({
                name: expenseData.name || '',
                category: expenseData.category || '',
                value: expenseData.value?.toString() || '',
                recurrence: expenseData.recurrence || 'monthly',
                dueDay: expenseData.dueDay?.toString() || '',
                notes: expenseData.notes || ''
            })
        }
    }, [isEdit, expenseData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const payload = {
            ...formData,
            value: parseFloat(formData.value.replace(',', '.')) || 0,
            dueDay: formData.dueDay ? parseInt(formData.dueDay) : null
        }

        const action = isEdit ? updateExpense({ id: parseInt(id), data: payload }) : createExpense(payload)

        toast.promise(action, {
            loading: isEdit ? 'Salvando alterações...' : 'Cadastrando gasto...',
            success: () => {
                navigate('/admin/expenses')
                return isEdit ? 'Gasto atualizado com sucesso!' : 'Gasto cadastrado com sucesso!'
            },
            error: (err) => `Erro: ${err.message}`
        })
    }

    const recurrenceOptions = [
        { value: 'daily', label: 'Diário' },
        { value: 'weekly', label: 'Semanal' },
        { value: 'monthly', label: 'Mensal' },
        { value: 'quarterly', label: 'Trimestral' },
        { value: 'yearly', label: 'Anual' }
    ]

    const categoryOptions = [
        'Taxa de Maquininha',
        'Gasolina',
        'Luz',
        'Água',
        'Internet',
        'Telefone',
        'Aluguel',
        'Contador',
        'Marketing',
        'Embalagens',
        'Outro'
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/admin/expenses')}
                        className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all"
                    >
                        <ArrowLeft className="w-6 h-6 text-[#4A3B32]" />
                    </motion.button>
                    <div>
                        <h2 className="text-4xl font-display font-semibold text-[#4A3B32] tracking-tight">
                            {id ? 'Editar Gasto' : 'Novo Gasto Fixo'}
                        </h2>
                        <p className="text-[#4A3B32]/40 font-medium italic">Cadastro de gastos recorrentes.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    {/* Informações do Gasto */}
                    <Card className="rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md">
                        <CardHeader className="p-6 md:p-8">
                            <CardTitle className="flex items-center gap-3 text-lg md:text-xl">
                                <div className="p-2 md:p-3 bg-red-100 rounded-xl">
                                    <Receipt className="w-5 h-5 text-red-600" />
                                </div>
                                Informações do Gasto
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                    Nome do Gasto *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="Ex: Taxa Mercado Pago, Gasolina..."
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium transition-all"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Categoria
                                    </label>
                                    <select
                                        name="category"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium appearance-none"
                                        value={formData.category}
                                        onChange={handleChange}
                                    >
                                        <option value="">Selecione uma categoria</option>
                                        {categoryOptions.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Valor (R$) *
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                        <input
                                            type="text"
                                            name="value"
                                            required
                                            placeholder="0,00"
                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-bold text-red-600"
                                            value={formData.value}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Recorrência *
                                    </label>
                                    <select
                                        name="recurrence"
                                        required
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium appearance-none"
                                        value={formData.recurrence}
                                        onChange={handleChange}
                                    >
                                        {recurrenceOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Dia do Vencimento
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                        <input
                                            type="number"
                                            name="dueDay"
                                            min="1"
                                            max="31"
                                            placeholder="Ex: 5"
                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                            value={formData.dueDay}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    {/* Observações */}
                    <Card className="rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md">
                        <CardHeader className="p-6 md:p-8">
                            <CardTitle className="flex items-center gap-3 text-lg md:text-xl">
                                <div className="p-2 md:p-3 bg-blue-100 rounded-xl">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                Observações
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8">
                            <textarea
                                name="notes"
                                rows="6"
                                placeholder="Adicione detalhes sobre este gasto..."
                                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium leading-relaxed transition-all resize-none"
                                value={formData.notes}
                                onChange={handleChange}
                            />
                        </CardContent>
                    </Card>

                    {/* Submit Actions */}
                    <div className="sticky bottom-8 space-y-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={expensesLoading}
                            className="w-full flex items-center justify-center gap-2 py-4 md:py-5 bg-red-600 text-white rounded-2xl md:rounded-[20px] font-bold shadow-lg hover:shadow-xl hover:bg-red-700 transition-all disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            {id ? 'Salvar Alterações' : 'Cadastrar Gasto'}
                        </motion.button>
                        <button
                            type="button"
                            onClick={() => navigate('/admin/expenses')}
                            className="w-full py-3 md:py-4 text-[#4A3B32]/60 font-bold tracking-wider uppercase text-[10px] hover:text-[#4A3B32] hover:bg-gray-100 rounded-2xl transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
