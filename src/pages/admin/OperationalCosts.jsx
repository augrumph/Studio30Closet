import { useEffect, useState } from 'react'
import { Save, CreditCard, Package, Plus, Trash2, Edit2, TrendingDown, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react'
import { useOperationalCostsStore } from '@/store/operational-costs-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { supabase } from '@/lib/supabase'

export function OperationalCosts() {
    const {
        paymentFees,
        updatePaymentFees,
        materialsStock,
        materialsLoading,
        loadMaterialsStock,
        addMaterial,
        updateMaterial,
        removeMaterial,
        addStockEntry,
        removeStockExit,
        initialize
    } = useOperationalCostsStore()

    const [fees, setFees] = useState([])
    const [feesLoading, setFeesLoading] = useState(true)
    const [savingFees, setSavingFees] = useState(false)
    const [showMaterialForm, setShowMaterialForm] = useState(false)
    const [editingMaterial, setEditingMaterial] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, materialId: null })
    const [stockAdjustment, setStockAdjustment] = useState({ isOpen: false, material: null, type: 'entry' })

    const [materialForm, setMaterialForm] = useState({
        name: '',
        category: 'embalagem',
        quantity: 0,
        totalPrice: '',
        unitCost: 0,
        minStock: 0,
        notes: ''
    })

    useEffect(() => {
        initialize()
    }, [initialize])

    useEffect(() => {
        // Convert the array of fee objects to a map for easier handling in the UI
        // Initialize with default values for all brands and payment methods
        const feesMap = {}

        // All brands that need to have fees configured
        const allBrands = ['visa', 'mastercard', 'amex', 'elo', 'pix', 'debito'];
        // All payment methods
        const paymentMethods = ['pix', 'debito', 'credito_vista', 'credito_2x', 'credito_3x', 'credito_4x', 'credito_5x', 'credito_6x'];

        // Initialize all combinations to 0
        allBrands.forEach(brand => {
            paymentMethods.forEach(method => {
                feesMap[`${brand}_${method}`] = 0;
            });
        });

        // Override with actual values from the database
        paymentFees.forEach(fee => {
            // Determine the brand (card brand or null for general methods)
            let brand = fee.card_brand || fee.payment_method;

            // Determine the payment method
            let method = fee.payment_method;

            // Handle specific installment methods
            if (fee.payment_method === 'credito_parcelado') {
                if (fee.description && fee.description.includes('2x')) {
                    method = 'credito_2x';
                } else if (fee.description && fee.description.includes('3x')) {
                    method = 'credito_3x';
                } else if (fee.description && fee.description.includes('4x')) {
                    method = 'credito_4x';
                } else if (fee.description && fee.description.includes('5x')) {
                    method = 'credito_5x';
                } else {
                    method = 'credito_6x'; // 6x+
                }
            }

            // Set the fee value
            feesMap[`${brand}_${method}`] = fee.fee_percentage;
        })

        setFees(feesMap)
    }, [paymentFees])

    // Calcular automaticamente o custo unitário quando mudar quantidade ou preço total
    useEffect(() => {
        const qty = parseInt(materialForm.quantity) || 0
        const total = parseFloat(materialForm.totalPrice.replace(',', '.')) || 0

        if (qty > 0 && total > 0) {
            const unitCost = total / qty
            setMaterialForm(prev => ({ ...prev, unitCost }))
        } else {
            setMaterialForm(prev => ({ ...prev, unitCost: 0 }))
        }
    }, [materialForm.quantity, materialForm.totalPrice])

    const handleFeesChange = (e) => {
        const { name, value } = e.target
        setFees(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
    }

    const handleBrandFeeChange = (brand, method, value) => {
        const feeKey = `${brand}_${method}`;
        setFees(prev => ({ ...prev, [feeKey]: value }));
    }

    const handleSaveFees = async () => {
        // Convert the fees object back to an array of fee objects for the API
        let feesArray = []

        // All brands that need to have fees configured
        const allBrands = ['visa', 'mastercard', 'amex', 'elo', 'pix', 'debito'];
        // All payment methods
        const paymentMethods = ['pix', 'debito', 'credito_vista', 'credito_2x', 'credito_3x', 'credito_4x', 'credito_5x', 'credito_6x'];

        allBrands.forEach(brand => {
            paymentMethods.forEach(method => {
                const feeKey = `${brand}_${method}`;
                const feeValue = fees[feeKey];

                if (feeValue !== undefined && feeValue !== null) {
                    // Determine if this is a card brand (visa, mastercard, amex, elo) or general method
                    const isCardBrand = ['visa', 'mastercard', 'amex', 'elo'].includes(brand);

                    let paymentMethod = method;
                    let cardBrand = null;

                    // Map the internal method names to the actual payment methods
                    if (method === 'credito_2x') {
                        paymentMethod = 'credito_parcelado';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'credito_3x') {
                        paymentMethod = 'credito_parcelado';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'credito_4x') {
                        paymentMethod = 'credito_parcelado';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'credito_5x') {
                        paymentMethod = 'credito_parcelado';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'credito_6x') {
                        paymentMethod = 'credito_parcelado';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'credito_vista') {
                        paymentMethod = 'credito_vista';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'debito') {
                        paymentMethod = 'debito';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'pix') {
                        paymentMethod = 'pix';
                        cardBrand = isCardBrand ? brand : null;
                    } else {
                        // Default case for other methods
                        paymentMethod = method;
                        cardBrand = isCardBrand ? brand : null;
                    }

                    feesArray.push({
                        payment_method: paymentMethod,
                        card_brand: cardBrand,
                        fee_percentage: feeValue,
                        description: `Taxa para ${method} ${cardBrand ? `na bandeira ${cardBrand}` : 'geral'}`
                    });
                }
            });
        });

        const result = await updatePaymentFees(feesArray)
        if (result.success) {
            toast.success('Taxas atualizadas com sucesso!')
        } else {
            toast.error(`Erro ao atualizar taxas: ${result.error}`)
        }
    }

    const handleMaterialFormChange = (e) => {
        const { name, value } = e.target
        setMaterialForm(prev => ({ ...prev, [name]: value }))
    }

    const handleSaveMaterial = () => {
        const payload = {
            ...materialForm,
            quantity: parseInt(materialForm.quantity) || 0,
            totalPrice: parseFloat(materialForm.totalPrice.replace(',', '.')) || 0,
            unitCost: materialForm.unitCost, // Já calculado automaticamente
            minStock: parseInt(materialForm.minStock) || 0
        }

        if (editingMaterial) {
            updateMaterial(editingMaterial.id, payload)
            toast.success('Material atualizado!')
        } else {
            addMaterial(payload)
            toast.success('Material adicionado!')
        }

        setMaterialForm({ name: '', category: 'embalagem', quantity: 0, totalPrice: '', unitCost: 0, minStock: 0, notes: '' })
        setShowMaterialForm(false)
        setEditingMaterial(null)
    }

    const handleEditMaterial = (material) => {
        setEditingMaterial(material)
        setMaterialForm({
            name: material.name,
            category: material.category,
            quantity: material.quantity,
            totalPrice: (material.totalPrice || 0).toString(),
            unitCost: material.unitCost || 0,
            minStock: material.minStock || 0,
            notes: material.notes || ''
        })
        setShowMaterialForm(true)
    }

    const handleDeleteMaterial = (id) => {
        setConfirmDelete({ isOpen: true, materialId: id })
    }

    const onConfirmDelete = () => {
        removeMaterial(confirmDelete.materialId)
        toast.success('Material removido!')
        setConfirmDelete({ isOpen: false, materialId: null })
    }

    const handleStockAdjustment = (material, type) => {
        setStockAdjustment({ isOpen: true, material, type, quantity: 0 })
    }

    const handleSaveStockAdjustment = () => {
        const { material, type, quantity } = stockAdjustment
        const qty = parseInt(quantity) || 0

        if (qty <= 0) {
            toast.error('Quantidade deve ser maior que zero!')
            return
        }

        if (type === 'entry') {
            addStockEntry(material.id, qty)
            toast.success(`Adicionado ${qty} unidades ao estoque!`)
        } else {
            if (qty > material.quantity) {
                toast.error('Quantidade maior que o estoque disponível!')
                return
            }
            removeStockExit(material.id, qty)
            toast.success(`Removido ${qty} unidades do estoque!`)
        }

        setStockAdjustment({ isOpen: false, material: null, type: 'entry', quantity: 0 })
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const categories = [
        { value: 'embalagem', label: 'Embalagem' },
        { value: 'tag', label: 'Tag/Etiqueta' },
        { value: 'adesivo', label: 'Adesivo' },
        { value: 'sacola', label: 'Sacola' },
        { value: 'papel', label: 'Papel de Seda' },
        { value: 'outro', label: 'Outro' }
    ]

    const getTotalStockValue = () => {
        return materialsStock.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0)
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="space-y-1">
                <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Custos Operacionais</h2>
                <p className="text-[#4A3B32]/40 font-medium">Configuração de taxas e controle de estoque de materiais.</p>
            </div>

            {/* Seção 1: Taxas da Maquininha */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-[#C75D3B]" />
                            Taxas Infinity Pay
                        </CardTitle>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSaveFees}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#4A3B32] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#342922] transition-all"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Taxas
                        </motion.button>
                    </div>
                </CardHeader>
                <CardContent className="p-5 md:p-6">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {['visa', 'mastercard', 'amex', 'elo', 'pix', 'debito'].map((brand) => (
                                <div key={brand} className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-[#4A3B32] capitalize">
                                        {brand === 'debito' ? 'Débito' : brand}
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-600 font-medium block">PIX (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                placeholder="0.00"
                                                value={fees[`${brand}_pix`] || 0}
                                                onChange={(e) => handleBrandFeeChange(brand, 'pix', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-600 font-medium block">Débito (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                placeholder="0.00"
                                                value={fees[`${brand}_debito`] || 0}
                                                onChange={(e) => handleBrandFeeChange(brand, 'debito', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-600 font-medium block">Crédito à Vista (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                placeholder="0.00"
                                                value={fees[`${brand}_credito_vista`] || 0}
                                                onChange={(e) => handleBrandFeeChange(brand, 'credito_vista', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-600 font-medium block">Crédito 2x (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                placeholder="0.00"
                                                value={fees[`${brand}_credito_2x`] || 0}
                                                onChange={(e) => handleBrandFeeChange(brand, 'credito_2x', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-600 font-medium block">Crédito 3x (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                placeholder="0.00"
                                                value={fees[`${brand}_credito_3x`] || 0}
                                                onChange={(e) => handleBrandFeeChange(brand, 'credito_3x', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-600 font-medium block">Crédito 4x (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                placeholder="0.00"
                                                value={fees[`${brand}_credito_4x`] || 0}
                                                onChange={(e) => handleBrandFeeChange(brand, 'credito_4x', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-600 font-medium block">Crédito 5x (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                placeholder="0.00"
                                                value={fees[`${brand}_credito_5x`] || 0}
                                                onChange={(e) => handleBrandFeeChange(brand, 'credito_5x', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-600 font-medium block">Crédito 6x+ (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                placeholder="0.00"
                                                value={fees[`${brand}_credito_6x`] || 0}
                                                onChange={(e) => handleBrandFeeChange(brand, 'credito_6x', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-blue-50 rounded-xl">
                            <p className="text-sm text-blue-800 font-medium">
                                💡 <strong>Dica:</strong> Configure as taxas específicas para cada bandeira de cartão. Cada bandeira terá suas próprias taxas para PIX, débito e todos os tipos de crédito.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Seção 2: Estoque de Materiais */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 mb-2">
                                <Package className="w-5 h-5 text-[#C75D3B]" />
                                Estoque de Materiais
                            </CardTitle>
                            <p className="text-sm text-[#4A3B32]/60">
                                Valor total em estoque: <span className="font-bold text-[#C75D3B]">{formatCurrency(getTotalStockValue())}</span>
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setShowMaterialForm(true)
                                setEditingMaterial(null)
                                setMaterialForm({ name: '', category: 'embalagem', quantity: 0, totalPrice: '', unitCost: 0, minStock: 0, notes: '' })
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#C75D3B] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#B84830] transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Novo Material
                        </motion.button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Formulário de Material */}
                    <AnimatePresence>
                        {showMaterialForm && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-6 p-6 bg-gray-50 rounded-xl"
                            >
                                <h3 className="font-bold text-[#4A3B32] text-base md:text-lg mb-4">
                                    {editingMaterial ? 'Editar Material' : 'Novo Material'}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 font-bold">Nome *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            placeholder="Ex: Saco plástico 20x30"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                                            value={materialForm.name}
                                            onChange={handleMaterialFormChange}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 font-bold">Categoria</label>
                                        <select
                                            name="category"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium appearance-none"
                                            value={materialForm.category}
                                            onChange={handleMaterialFormChange}
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 font-bold">Quantidade Inicial</label>
                                        <input
                                            type="number"
                                            name="quantity"
                                            min="0"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                                            value={materialForm.quantity}
                                            onChange={handleMaterialFormChange}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 font-bold">Preço Total Pago (R$)</label>
                                        <input
                                            type="text"
                                            name="totalPrice"
                                            placeholder="0,00"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                                            value={materialForm.totalPrice}
                                            onChange={handleMaterialFormChange}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 font-bold">Custo Unitário (Calculado)</label>
                                        <div className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-[#C75D3B]">
                                            {formatCurrency(materialForm.unitCost)}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 font-bold">Estoque Mínimo</label>
                                        <input
                                            type="number"
                                            name="minStock"
                                            min="0"
                                            placeholder="0"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                                            value={materialForm.minStock}
                                            onChange={handleMaterialFormChange}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 font-bold">Observações</label>
                                        <input
                                            type="text"
                                            name="notes"
                                            placeholder="Opcional"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                                            value={materialForm.notes}
                                            onChange={handleMaterialFormChange}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleSaveMaterial}
                                        className="px-6 py-2.5 bg-[#4A3B32] text-white rounded-xl text-sm font-bold hover:bg-[#342922] transition-all"
                                    >
                                        {editingMaterial ? 'Atualizar' : 'Adicionar'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMaterialForm(false)
                                            setEditingMaterial(null)
                                        }}
                                        className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-300 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Tabela de Materiais */}
                    {materialsLoading ? (
                        <div className="p-20 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#C75D3B] border-t-transparent"></div>
                        </div>
                    ) : materialsStock.length === 0 ? (
                        <div className="p-10 text-center">
                            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm text-gray-400">Nenhum material cadastrado ainda.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Material</th>
                                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Categoria</th>
                                        <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase">Estoque</th>
                                        <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase">Preço Total</th>
                                        <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase">Custo Unit.</th>
                                        <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase">Valor em Estoque</th>
                                        <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {materialsStock.map((material, idx) => {
                                            const isLowStock = material.quantity <= material.minStock
                                            return (
                                                <motion.tr
                                                    key={material.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className={cn(
                                                        "border-b border-gray-50 hover:bg-gray-50 transition-colors",
                                                        isLowStock && "bg-red-50"
                                                    )}
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-[#4A3B32]">{material.name}</span>
                                                            {isLowStock && (
                                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">BAIXO</span>
                                                            )}
                                                        </div>
                                                        {material.notes && (
                                                            <p className="text-xs text-gray-400 mt-0.5">{material.notes}</p>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="text-sm text-gray-600">
                                                            {categories.find(c => c.value === material.category)?.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className={cn(
                                                            "font-bold text-sm",
                                                            isLowStock ? "text-red-600" : "text-[#4A3B32]"
                                                        )}>
                                                            {material.quantity}
                                                        </span>
                                                        {material.minStock > 0 && (
                                                            <span className="text-xs text-gray-400 ml-1">(mín: {material.minStock})</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-sm font-medium text-gray-600">
                                                        {formatCurrency(material.totalPrice || 0)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-sm font-medium text-[#4A3B32]">
                                                        {formatCurrency(material.unitCost)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-sm font-bold text-[#C75D3B]">
                                                        {formatCurrency(material.quantity * material.unitCost)}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => handleStockAdjustment(material, 'entry')}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                                title="Adicionar ao estoque"
                                                            >
                                                                <ArrowUpCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleStockAdjustment(material, 'exit')}
                                                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                                title="Remover do estoque"
                                                            >
                                                                <ArrowDownCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditMaterial(material)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteMaterial(material.id)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Excluir"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            )
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-3">
                            {materialsStock.map((material, idx) => {
                                const isLowStock = material.quantity <= material.minStock
                                return (
                                    <motion.div
                                        key={material.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={cn(
                                            "bg-white p-4 rounded-2xl border shadow-sm space-y-3",
                                            isLowStock ? "border-red-200 bg-red-50/50" : "border-gray-100"
                                        )}
                                    >
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-sm text-[#4A3B32] truncate">{material.name}</h4>
                                                    {isLowStock && (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded flex-shrink-0">BAIXO</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">{categories.find(c => c.value === material.category)?.label}</p>
                                                {material.notes && (
                                                    <p className="text-xs text-gray-400 mt-1 italic">{material.notes}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info Grid */}
                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Estoque</p>
                                                <p className={cn(
                                                    "text-lg font-bold",
                                                    isLowStock ? "text-red-600" : "text-[#4A3B32]"
                                                )}>
                                                    {material.quantity}
                                                    {material.minStock > 0 && (
                                                        <span className="text-xs text-gray-400 font-normal ml-1">(mín: {material.minStock})</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Valor Total</p>
                                                <p className="text-lg font-bold text-[#C75D3B]">{formatCurrency(material.quantity * material.unitCost)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Preço Total</p>
                                                <p className="text-sm font-medium text-gray-600">{formatCurrency(material.totalPrice || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Custo Unit.</p>
                                                <p className="text-sm font-medium text-[#4A3B32]">{formatCurrency(material.unitCost)}</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => handleStockAdjustment(material, 'entry')}
                                                className="p-3 text-green-600 bg-green-50 active:bg-green-100 rounded-xl transition-all flex items-center justify-center"
                                                title="Adicionar"
                                            >
                                                <ArrowUpCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleStockAdjustment(material, 'exit')}
                                                className="p-3 text-orange-600 bg-orange-50 active:bg-orange-100 rounded-xl transition-all flex items-center justify-center"
                                                title="Remover"
                                            >
                                                <ArrowDownCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleEditMaterial(material)}
                                                className="p-3 text-blue-600 bg-blue-50 active:bg-blue-100 rounded-xl transition-all flex items-center justify-center"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMaterial(material.id)}
                                                className="p-3 text-red-600 bg-red-50 active:bg-red-100 rounded-xl transition-all flex items-center justify-center"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </>
                    )}
                </CardContent>
            </Card>

            {/* Dialogs */}
            <AlertDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, materialId: null })}
                onConfirm={onConfirmDelete}
                title="Excluir Material?"
                description="Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita."
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
            />

            {/* Stock Adjustment Dialog */}
            {stockAdjustment.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-6 max-w-md w-full mx-4"
                    >
                        <h3 className="text-xl font-bold text-[#4A3B32] mb-4">
                            {stockAdjustment.type === 'entry' ? 'Adicionar ao Estoque' : 'Remover do Estoque'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            {stockAdjustment.material?.name} - Estoque atual: <strong>{stockAdjustment.material?.quantity}</strong>
                        </p>
                        <div className="space-y-2 mb-6">
                            <label className="text-xs text-gray-500 font-bold">Quantidade</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="0"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-bold"
                                value={stockAdjustment.quantity}
                                onChange={(e) => setStockAdjustment(prev => ({ ...prev, quantity: e.target.value }))}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveStockAdjustment}
                                className="flex-1 px-6 py-3 bg-[#4A3B32] text-white rounded-xl font-bold hover:bg-[#342922] transition-all"
                            >
                                Confirmar
                            </button>
                            <button
                                onClick={() => setStockAdjustment({ isOpen: false, material: null, type: 'entry', quantity: 0 })}
                                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
