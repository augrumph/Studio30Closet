import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, ShoppingCart, DollarSign, Calendar, Package, FileText, User } from 'lucide-react'
import { useAdminPurchase, useAdminPurchasesMutations } from '@/hooks/useAdminPurchases'
import { useAdminSuppliers } from '@/hooks/useAdminSuppliers'
import { motion } from 'framer-motion'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export function PurchasesForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEdit = Boolean(id)

    // Hooks
    const { createPurchase, updatePurchase, isCreating, isUpdating } = useAdminPurchasesMutations()
    const { data: purchaseData, isLoading: isLoadingPurchase } = useAdminPurchase(id ? parseInt(id) : null)
    const { suppliers } = useAdminSuppliers()

    const purchasesLoading = isCreating || isUpdating || isLoadingPurchase

    const [formData, setFormData] = useState({
        supplierId: '',
        paymentMethod: 'pix',
        value: '',
        date: new Date().toISOString().split('T')[0],
        pieces: '',
        parcelas: '',
        notes: '',
        purchaseType: 'produto',
        spentBy: 'loja'
    })

    useEffect(() => {
        if (isEdit && purchaseData) {
            setFormData({
                supplierId: purchaseData.supplierId || '',
                paymentMethod: purchaseData.paymentMethod || 'pix',
                value: purchaseData.value?.toString() || '',
                date: purchaseData.date ? new Date(purchaseData.date).toISOString().split('T')[0] : '',
                pieces: purchaseData.pieces?.toString() || '',
                parcelas: purchaseData.parcelas?.toString() || '',
                notes: purchaseData.notes || '',
                purchaseType: purchaseData.purchaseType || 'produto',
                spentBy: purchaseData.spentBy || 'loja'
            })
        }
    }, [isEdit, purchaseData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const payload = {
            ...formData,
            supplierId: parseInt(formData.supplierId),
            value: parseFloat(formData.value.replace(',', '.')) || 0,
            pieces: parseInt(formData.pieces) || 0,
            parcelas: formData.paymentMethod === 'credito_parcelado' ? parseInt(formData.parcelas) : null,
            purchaseType: formData.purchaseType,
            spentBy: formData.spentBy
        }

        const action = isEdit ? updatePurchase({ id: parseInt(id), data: payload }) : createPurchase(payload)

        toast.promise(action, {
            loading: isEdit ? 'Salvando alterações...' : 'Registrando compra...',
            success: () => {
                navigate('/admin/purchases')
                return isEdit ? 'Compra atualizada com sucesso!' : 'Compra registrada com sucesso!'
            },
            error: (err) => formatUserFriendlyError(err)
        })
    }

    const paymentMethods = [
        { value: 'pix', label: 'PIX' },
        { value: 'credito_vista', label: 'Crédito à Vista' },
        { value: 'credito_parcelado', label: 'Crédito Parcelado' },
        { value: 'boleto', label: 'Boleto' },
        { value: 'dinheiro', label: 'Dinheiro' }
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/admin/purchases')}
                        className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all"
                    >
                        <ArrowLeft className="w-6 h-6 text-[#4A3B32]" />
                    </motion.button>
                    <div>
                        <h2 className="text-4xl font-display font-semibold text-[#4A3B32] tracking-tight">
                            {id ? 'Editar Compra' : 'Nova Compra'}
                        </h2>
                        <p className="text-[#4A3B32]/40 font-medium italic">Registro de compras de fornecedores.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    {/* Informações da Compra */}
                    <Card className="rounded-2xl md:rounded-[32px] border border-gray-100 shadow-md">
                        <CardHeader className="p-6 md:p-8">
                            <CardTitle className="flex items-center gap-3 text-lg md:text-xl">
                                <div className="p-2 md:p-3 bg-blue-100 rounded-xl">
                                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                                </div>
                                Informações da Compra
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                    Fornecedor *
                                </label>
                                <select
                                    name="supplierId"
                                    required
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium appearance-none"
                                    value={formData.supplierId}
                                    onChange={handleChange}
                                >
                                    <option value="">Selecione um fornecedor</option>
                                    {suppliers.map(supplier => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Forma de Pagamento *
                                    </label>
                                    <select
                                        name="paymentMethod"
                                        required
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium appearance-none"
                                        value={formData.paymentMethod}
                                        onChange={handleChange}
                                    >
                                        {paymentMethods.map(method => (
                                            <option key={method.value} value={method.value}>
                                                {method.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {formData.paymentMethod === 'credito_parcelado' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                            Número de Parcelas
                                        </label>
                                        <input
                                            type="number"
                                            name="parcelas"
                                            min="1"
                                            placeholder="Ex: 3"
                                            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                            value={formData.parcelas}
                                            onChange={handleChange}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid md:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Tipo de Compra *
                                    </label>
                                    <select
                                        name="purchaseType"
                                        required
                                        className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium appearance-none"
                                        value={formData.purchaseType}
                                        onChange={handleChange}
                                    >
                                        <option value="produto">Compra de Produto</option>
                                        <option value="material">Compra de Material</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Compra de Quem? *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                        <select
                                            name="spentBy"
                                            required
                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium appearance-none"
                                            value={formData.spentBy}
                                            onChange={handleChange}
                                        >
                                            <option value="loja">🏪 Loja</option>
                                            <option value="augusto">👤 Augusto</option>
                                            <option value="thais">👤 Thais</option>
                                        </select>
                                    </div>
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
                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-bold text-[#C75D3B]"
                                            value={formData.value}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Data *
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                        <input
                                            type="date"
                                            name="date"
                                            required
                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                            value={formData.date}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Peças
                                    </label>
                                    <div className="relative">
                                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                        <input
                                            type="number"
                                            name="pieces"
                                            min="0"
                                            placeholder="0"
                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                            value={formData.pieces}
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
                                <div className="p-2 md:p-3 bg-green-100 rounded-xl">
                                    <FileText className="w-5 h-5 text-green-600" />
                                </div>
                                Observações
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8">
                            <textarea
                                name="notes"
                                rows="6"
                                placeholder="Adicione detalhes sobre esta compra..."
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
                            disabled={purchasesLoading}
                            className="w-full flex items-center justify-center gap-2 py-4 md:py-5 bg-blue-600 text-white rounded-2xl md:rounded-[20px] font-bold shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            {id ? 'Salvar Alterações' : 'Registrar Compra'}
                        </motion.button>
                        <button
                            type="button"
                            onClick={() => navigate('/admin/purchases')}
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
