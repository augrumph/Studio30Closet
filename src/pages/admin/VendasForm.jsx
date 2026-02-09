import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ArrowLeft,
    Check,
    ChevronDown,
    CreditCard,
    DollarSign,
    Package,
    Percent,
    Plus,
    QrCode,
    Receipt,
    Search,
    ShoppingBag,
    Sparkles,
    Trash2,
    User,
    Wallet,
    X,
    Calendar,
    Banknote,
    Clock,
    BadgePercent,
    Loader2
} from 'lucide-react'
import { useAdminSalesMutations, useAdminSale } from '@/hooks/useAdminSales'
import { useCustomerSearch } from '@/hooks/useAdminCustomers'
import { useAdminProducts } from '@/hooks/useAdminProducts' // Usar hook de produtos já existente
import { getPaymentFee, createInstallments } from '@/lib/api'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { DatePicker } from '@/components/ui/DatePicker'

// Configuração dos métodos de pagamento
const PAYMENT_METHODS = [
    { id: 'pix', label: 'PIX', icon: QrCode, color: 'emerald' },
    { id: 'debit', label: 'Débito', icon: CreditCard, color: 'blue' },
    { id: 'card_machine', label: 'Crédito', icon: CreditCard, color: 'violet' },
    { id: 'credito_parcelado', label: 'Parcelado', icon: Calendar, color: 'orange' },
    { id: 'fiado_parcelado', label: 'Crediário', icon: Receipt, color: 'amber' },
    { id: 'cash', label: 'Dinheiro', icon: Banknote, color: 'green' },
]

const CARD_BRANDS = [
    { id: 'visa', label: 'Visa' },
    { id: 'mastercard', label: 'Master' },
    { id: 'elo', label: 'Elo' },
]

export function VendasForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)

    // ⚡ REACT QUERY: Hooks
    const { createSale, updateSale, isCreating, isUpdating } = useAdminSalesMutations()
    const { data: vendaData, isLoading: isLoadingVenda } = useAdminSale(id)

    // UI States
    const [productSearch, setProductSearch] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerSearch, setShowCustomerSearch] = useState(false)
    const [activeSection, setActiveSection] = useState('payment') // payment, products, customer

    // Search Hooks
    const { customers: filteredCustomers, isFetching: isSearchingCustomers } = useCustomerSearch(customerSearch)

    // TODO: Adicionar suporte a busca no useAdminProducts ou filtrar local (como já faz, mas otimizado)
    // Por enquanto, vamos carregar tudo e filtrar localmente, mas o ideal seria busca no servidor.
    // O useAdminProducts carrega tudo (getAllProductsAdmin).
    const { products: allProducts } = useAdminProducts()

    // Estados do formulário
    const [formData, setFormData] = useState({
        customerId: '',
        customerName: '',
        paymentMethod: 'pix',
        cardBrand: 'visa',
        paymentStatus: 'paid',
        items: [],
        totalValue: 0,
        couponCode: '',
        discountAmount: 0
    })

    const [parcelas, setParcelas] = useState(1)
    const [entryPayment, setEntryPayment] = useState(0)
    const [installmentStartDate, setInstallmentStartDate] = useState('')
    const [feeInfo, setFeeInfo] = useState({ feePercentage: 0, feeValue: 0, netValue: 0 })

    // Desconto manual
    const [manualDiscount, setManualDiscount] = useState({ type: 'percent', value: '' })

    // Modal de variante
    const [variantModal, setVariantModal] = useState({ open: false, product: null, selectedColor: null, selectedSize: null })

    // Carregar dados da venda em edição
    useEffect(() => {
        if (isEdit && vendaData) {
            const venda = vendaData
            let parsedItems = venda.items

            // Garantir que items seja array (no novo API vem como array se venda_items, ou string se JSON column)
            if (typeof parsedItems === 'string') {
                try { parsedItems = JSON.parse(parsedItems) } catch { parsedItems = [] }
            }
            if (!Array.isArray(parsedItems)) parsedItems = []

            let adjustedPaymentMethod = venda.paymentMethod
            if (venda.isInstallment && venda.numInstallments > 1) {
                if (venda.paymentMethod === 'fiado') adjustedPaymentMethod = 'fiado_parcelado'
                else if (venda.paymentMethod === 'credito') adjustedPaymentMethod = 'credito_parcelado'
            }

            setFormData({
                customerId: venda.customerId,
                customerName: venda.customerName,
                paymentMethod: adjustedPaymentMethod,
                cardBrand: venda.cardBrand || 'visa',
                paymentStatus: venda.paymentStatus,
                items: parsedItems,
                totalValue: venda.originalTotal || venda.totalValue,
                couponCode: venda.couponCode || '',
                discountAmount: venda.discountAmount || 0
            })
            if (venda.isInstallment) {
                setParcelas(venda.numInstallments || 2)
                setEntryPayment(venda.entryPayment || 0)
                setInstallmentStartDate(venda.installmentStartDate || '')
            }
        }
    }, [isEdit, vendaData])

    // Calcular desconto manual
    useEffect(() => {
        if (formData.couponCode) return
        let discount = 0
        const val = parseFloat(manualDiscount.value) || 0
        if (val > 0) {
            discount = manualDiscount.type === 'percent'
                ? (formData.totalValue * val) / 100
                : val
        }
        setFormData(prev => ({ ...prev, discountAmount: discount }))
    }, [manualDiscount.type, manualDiscount.value, formData.totalValue, formData.couponCode])

    // Calcular taxas
    useEffect(() => {
        const calculateFee = async () => {
            const finalValue = formData.totalValue - formData.discountAmount
            if (!formData.paymentMethod || finalValue <= 0) {
                setFeeInfo({ feePercentage: 0, feeValue: 0, netValue: finalValue })
                return
            }

            // Métodos sem taxa
            if (['fiado', 'fiado_parcelado', 'cash', 'pix'].includes(formData.paymentMethod)) {
                setFeeInfo({ feePercentage: 0, feeValue: 0, netValue: finalValue })
                return
            }

            try {
                let method = formData.paymentMethod === 'debit' ? 'debito' : 'credito'
                let installments = formData.paymentMethod === 'credito_parcelado' ? parcelas : 1

                const feeData = await getPaymentFee(method, formData.cardBrand, installments)
                if (feeData) {
                    const shouldCharge = installments > 3
                    const effectiveFee = shouldCharge ? feeData.feePercentage : 0
                    const feeValue = (finalValue * effectiveFee) / 100
                    setFeeInfo({
                        feePercentage: effectiveFee,
                        feeValue,
                        netValue: finalValue - feeValue,
                        originalFee: feeData.feePercentage,
                        absorbed: !shouldCharge && feeData.feePercentage > 0
                    })
                } else {
                    setFeeInfo({ feePercentage: 0, feeValue: 0, netValue: finalValue })
                }
            } catch {
                setFeeInfo({ feePercentage: 0, feeValue: 0, netValue: finalValue })
            }
        }
        calculateFee()
    }, [formData.paymentMethod, formData.cardBrand, formData.totalValue, formData.discountAmount, parcelas])

    // Produtos filtrados (Client-side filtering for simplicity, as we have all products)
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return []
        return (allProducts || [])
            .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.stock > 0)
            .slice(0, 6)
    }, [allProducts, productSearch])

    // Clientes filtrados (Já vem do hook filteredCustomers, não precisamos de useMemo local)
    // const filteredCustomers = ... (REMOVED)

    // Valores calculados
    const subtotal = formData.totalValue
    const discount = formData.discountAmount
    const finalValue = subtotal - discount
    const netValue = feeInfo.netValue || finalValue
    const isParcelado = ['credito_parcelado', 'fiado_parcelado'].includes(formData.paymentMethod)
    const needsCardBrand = ['debit', 'card_machine', 'credito_parcelado'].includes(formData.paymentMethod)
    const parcelaValue = isParcelado ? ((finalValue - entryPayment) / parcelas) : 0

    // Handlers
    const handlePaymentMethodChange = (methodId) => {
        const isCredit = ['fiado', 'fiado_parcelado'].includes(methodId)
        setFormData(prev => ({
            ...prev,
            paymentMethod: methodId,
            // ✅ Automar status: Se for crediário, coloca como pendente
            paymentStatus: isCredit ? 'pending' : 'paid'
        }))

        if (methodId === 'credito_parcelado') {
            setParcelas(2)
        } else if (methodId === 'fiado_parcelado') {
            setParcelas(1)
        } else {
            setParcelas(1)
        }
        setEntryPayment(0)
    }

    const addProduct = (product) => {
        if (!product.stock || product.stock <= 0) {
            toast.error('Produto sem estoque')
            return
        }

        const hasVariants = product.variants?.length > 0
        const hasMultipleOptions = hasVariants && (
            product.variants.length > 1 ||
            product.variants.some(v => (v.sizeStock || []).length > 1)
        )

        if (hasVariants && !hasMultipleOptions) {
            const color = product.variants[0].colorName
            const size = product.variants[0].sizeStock?.[0]?.size
            if (color && size) {
                addItemToCart(product, color, size)
                return
            }
        }

        if (hasVariants) {
            const firstAvailable = product.variants.find(v => v.sizeStock?.some(s => s.quantity > 0))
            setVariantModal({
                open: true,
                product,
                selectedColor: firstAvailable?.colorName || product.variants[0].colorName,
                selectedSize: null
            })
            return
        }

        addItemToCart(product, null, null)
    }

    const addItemToCart = (product, color, size) => {
        const newItem = {
            productId: product.id,
            name: product.name,
            price: product.price,
            costPrice: product.costPrice || 0,
            quantity: 1,
            selectedColor: color,
            selectedSize: size,
            category: product.category || 'Geral',
            image: product.images?.[0] || null
        }

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem],
            totalValue: prev.totalValue + product.price
        }))

        setProductSearch('')
        toast.success(`${product.name} adicionado`, { duration: 1500 })
    }

    const removeItem = (index) => {
        const item = formData.items[index]
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
            totalValue: prev.totalValue - (item.price * item.quantity)
        }))
    }

    const selectCustomer = (customer) => {
        setFormData(prev => ({ ...prev, customerId: customer.id, customerName: customer.name }))
        setCustomerSearch('')
        setShowCustomerSearch(false)
        toast.success(`Cliente: ${customer.name}`, { duration: 1500 })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.customerId) {
            toast.error('Selecione um cliente')
            setActiveSection('customer')
            return
        }

        if (formData.items.length === 0) {
            toast.error('Adicione pelo menos um produto')
            setActiveSection('products')
            return
        }

        if (isParcelado && !installmentStartDate) {
            toast.error('Informe a data da primeira parcela')
            return
        }

        const payload = {
            ...formData,
            totalValue: finalValue,
            originalTotal: subtotal,
            costPrice: formData.items.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0),
            feePercentage: feeInfo.feePercentage || 0,
            feeAmount: feeInfo.feeValue || 0,
            netAmount: netValue,
            isInstallment: isParcelado,
            numInstallments: isParcelado ? parcelas : 1,
            entryPayment: isParcelado ? entryPayment : 0,
            installmentStartDate: isParcelado ? installmentStartDate : null
        }

        const action = isEdit ? updateSale({ id: parseInt(id), data: payload }) : createSale(payload)

        // Loading já é tratado pelos hooks isCreating/isUpdating
        // Mas para manter feedback visual consistente com toast:
        toast.promise(action, {
            loading: isEdit ? 'Atualizando...' : 'Registrando venda...',
            success: async (result) => {
                if (result.success || result.id) { // create/update usually return object with id
                    const vendaId = result.id || result.data?.id
                    if (isParcelado && !isEdit && vendaId) {
                        // TODO: Mover criação de parcelas para o servidor ou hook, mas ok por agora
                        try {
                            await createInstallments(vendaId, parcelas, entryPayment, installmentStartDate)
                        } catch (e) {
                            console.error("Erro ao criar parcelas", e)
                            toast.error("Venda salva, mas erro ao gerar parcelas.")
                        }
                    }
                    navigate('/admin/vendas')
                    return isEdit ? 'Venda atualizada!' : 'Venda registrada!'
                }
                // Se result for void/undefined (comum em mutations que retornam true/null), assumimos sucesso se não caiu no catch
                navigate('/admin/vendas')
                return isEdit ? 'Venda atualizada!' : 'Venda registrada!'
            },
            error: (err) => formatUserFriendlyError(err)
        })
    }

    // Combine loading states
    const isSaving = isCreating || isUpdating

    if (isLoadingVenda && isEdit) { // Só mostra loading se for edição e estiver buscando dados iniciais
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-[#C75D3B] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[#4A3B32]/60 font-medium">Carregando...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#FDFBF7] to-[#F5F0EB]">
            {/* Header Fixo */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-[#4A3B32]/5">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/admin/vendas')}
                            className="p-2 -ml-2 rounded-xl hover:bg-[#4A3B32]/5 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-[#4A3B32]" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-[#4A3B32]">
                                {isEdit ? 'Editar Venda' : 'Nova Venda'}
                            </h1>
                            {isEdit && <p className="text-xs text-[#4A3B32]/40">#{id}</p>}
                        </div>
                    </div>

                    {/* Mini resumo no header */}
                    <div className="text-right">
                        <p className="text-xs text-[#4A3B32]/50">Total</p>
                        <p className="text-lg font-bold text-[#C75D3B]">
                            R$ {finalValue.toFixed(2)}
                        </p>
                    </div>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-6 space-y-4">

                {/* === SEÇÃO: PAGAMENTO === */}
                <section className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setActiveSection(activeSection === 'payment' ? '' : 'payment')}
                        className="w-full p-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C75D3B] to-[#A64D31] flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <h2 className="font-semibold text-[#4A3B32]">Pagamento</h2>
                                <p className="text-xs text-[#4A3B32]/50">
                                    {PAYMENT_METHODS.find(m => m.id === formData.paymentMethod)?.label || 'Selecione'}
                                    {isParcelado && ` • ${parcelas}x`}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={cn(
                            "w-5 h-5 text-[#4A3B32]/30 transition-transform",
                            activeSection === 'payment' && "rotate-180"
                        )} />
                    </button>

                    <AnimatePresence>
                        {activeSection === 'payment' && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 space-y-4">
                                    {/* Métodos de Pagamento */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {PAYMENT_METHODS.map((method) => {
                                            const Icon = method.icon
                                            const isActive = formData.paymentMethod === method.id
                                            return (
                                                <button
                                                    key={method.id}
                                                    type="button"
                                                    onClick={() => handlePaymentMethodChange(method.id)}
                                                    className={cn(
                                                        "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
                                                        isActive
                                                            ? "bg-[#C75D3B] text-white shadow-lg shadow-[#C75D3B]/20"
                                                            : "bg-[#4A3B32]/5 text-[#4A3B32] hover:bg-[#4A3B32]/10"
                                                    )}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="text-[10px] font-medium">{method.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Bandeira do Cartão */}
                                    {needsCardBrand && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex gap-2"
                                        >
                                            {CARD_BRANDS.map((brand) => (
                                                <button
                                                    key={brand.id}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, cardBrand: brand.id }))}
                                                    className={cn(
                                                        "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                                                        formData.cardBrand === brand.id
                                                            ? "bg-[#4A3B32] text-white"
                                                            : "bg-[#4A3B32]/5 text-[#4A3B32]"
                                                    )}
                                                >
                                                    {brand.label}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}

                                    {/* Configuração de Parcelamento */}
                                    {isParcelado && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-3 p-4 bg-gradient-to-br from-[#FDF0ED] to-[#FEFAF9] rounded-xl"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-[#4A3B32]">Parcelas</span>
                                                <span className="text-lg font-bold text-[#C75D3B]">{parcelas}x</span>
                                            </div>

                                            <div className="grid grid-cols-6 gap-1.5">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                                    <button
                                                        key={n}
                                                        type="button"
                                                        onClick={() => setParcelas(n)}
                                                        className={cn(
                                                            "py-2 rounded-lg text-sm font-bold transition-all",
                                                            parcelas === n
                                                                ? "bg-[#C75D3B] text-white"
                                                                : "bg-white text-[#4A3B32] hover:bg-[#4A3B32]/5"
                                                        )}
                                                    >
                                                        {n === 1 ? '1x' : `${n}x`}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-[#4A3B32]/60 mb-1 block">Entrada</label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3B32]/30" />
                                                        <input
                                                            type="number"
                                                            value={entryPayment || ''}
                                                            onChange={(e) => setEntryPayment(parseFloat(e.target.value) || 0)}
                                                            placeholder="0,00"
                                                            className="w-full pl-9 pr-3 py-2.5 bg-white rounded-lg text-sm font-medium"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-[#4A3B32]/60 mb-1 block">1ª Parcela *</label>
                                                    <DatePicker
                                                        date={installmentStartDate}
                                                        onDateChange={setInstallmentStartDate}
                                                        placeholder="Data"
                                                        className="w-full h-[42px] bg-white rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-[#C75D3B]/10">
                                                <span className="text-sm text-[#4A3B32]/70">Valor por parcela</span>
                                                <span className="text-lg font-bold text-[#C75D3B]">
                                                    R$ {parcelaValue.toFixed(2)}
                                                </span>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Status */}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, paymentStatus: 'paid' }))}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all",
                                                formData.paymentStatus === 'paid'
                                                    ? "bg-emerald-500 text-white"
                                                    : "bg-[#4A3B32]/5 text-[#4A3B32]"
                                            )}
                                        >
                                            <Check className="w-4 h-4" />
                                            Pago
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, paymentStatus: 'pending' }))}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all",
                                                formData.paymentStatus === 'pending'
                                                    ? "bg-amber-500 text-white"
                                                    : "bg-[#4A3B32]/5 text-[#4A3B32]"
                                            )}
                                        >
                                            <Clock className="w-4 h-4" />
                                            Pendente
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* === SEÇÃO: CLIENTE === */}
                <section className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveSection(activeSection === 'customer' ? '' : 'customer')
                            setShowCustomerSearch(!formData.customerId)
                        }}
                        className="w-full p-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                formData.customerId
                                    ? "bg-emerald-500"
                                    : "bg-[#4A3B32]/10"
                            )}>
                                {formData.customerId ? (
                                    <span className="text-white font-bold">
                                        {formData.customerName?.charAt(0)}
                                    </span>
                                ) : (
                                    <User className="w-5 h-5 text-[#4A3B32]/50" />
                                )}
                            </div>
                            <div className="text-left">
                                <h2 className="font-semibold text-[#4A3B32]">Cliente</h2>
                                <p className="text-xs text-[#4A3B32]/50">
                                    {formData.customerName || 'Selecione um cliente'}
                                </p>
                            </div>
                        </div>
                        {formData.customerId ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setFormData(prev => ({ ...prev, customerId: '', customerName: '' }))
                                }}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        ) : (
                            <ChevronDown className={cn(
                                "w-5 h-5 text-[#4A3B32]/30 transition-transform",
                                activeSection === 'customer' && "rotate-180"
                            )} />
                        )}
                    </button>

                    <AnimatePresence>
                        {activeSection === 'customer' && !formData.customerId && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3B32]/30" />
                                        <input
                                            type="text"
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                            placeholder="Buscar cliente..."
                                            className="w-full pl-10 pr-4 py-3 bg-[#4A3B32]/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C75D3B]/20"
                                            autoFocus
                                        />
                                    </div>

                                    {filteredCustomers.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {filteredCustomers.map(customer => (
                                                <button
                                                    key={customer.id}
                                                    type="button"
                                                    onClick={() => selectCustomer(customer)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#4A3B32]/5 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-[#C75D3B]/10 flex items-center justify-center">
                                                        <span className="text-sm font-bold text-[#C75D3B]">
                                                            {customer.name.charAt(0)}
                                                        </span>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-medium text-[#4A3B32]">{customer.name}</p>
                                                        {customer.phone && (
                                                            <p className="text-xs text-[#4A3B32]/50">{customer.phone}</p>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* === SEÇÃO: PRODUTOS === */}
                <section className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setActiveSection(activeSection === 'products' ? '' : 'products')}
                        className="w-full p-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                formData.items.length > 0
                                    ? "bg-gradient-to-br from-violet-500 to-purple-600"
                                    : "bg-[#4A3B32]/10"
                            )}>
                                <ShoppingBag className={cn(
                                    "w-5 h-5",
                                    formData.items.length > 0 ? "text-white" : "text-[#4A3B32]/50"
                                )} />
                            </div>
                            <div className="text-left">
                                <h2 className="font-semibold text-[#4A3B32]">Produtos</h2>
                                <p className="text-xs text-[#4A3B32]/50">
                                    {formData.items.length > 0
                                        ? `${formData.items.length} ${formData.items.length === 1 ? 'item' : 'itens'} • R$ ${subtotal.toFixed(2)}`
                                        : 'Adicione produtos'
                                    }
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={cn(
                            "w-5 h-5 text-[#4A3B32]/30 transition-transform",
                            activeSection === 'products' && "rotate-180"
                        )} />
                    </button>

                    <AnimatePresence>
                        {activeSection === 'products' && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 space-y-3">
                                    {/* Busca de Produtos */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3B32]/30" />
                                        <input
                                            type="text"
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            placeholder="Buscar produto..."
                                            className="w-full pl-10 pr-4 py-3 bg-[#4A3B32]/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C75D3B]/20"
                                        />
                                    </div>

                                    {/* Resultados da Busca */}
                                    <AnimatePresence>
                                        {filteredProducts.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="grid grid-cols-2 gap-2"
                                            >
                                                {filteredProducts.map(product => (
                                                    <button
                                                        key={product.id}
                                                        type="button"
                                                        onClick={() => addProduct(product)}
                                                        className="flex items-center gap-2 p-2 bg-[#4A3B32]/5 rounded-xl hover:bg-[#C75D3B]/10 transition-colors text-left"
                                                    >
                                                        <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0">
                                                            {product.images?.[0] ? (
                                                                <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Package className="w-5 h-5 text-[#4A3B32]/20" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-medium text-[#4A3B32] truncate">{product.name}</p>
                                                            <p className="text-xs font-bold text-[#C75D3B]">R$ {product.price?.toFixed(2)}</p>
                                                        </div>
                                                        <Plus className="w-4 h-4 text-[#C75D3B] flex-shrink-0" />
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Lista de Itens */}
                                    {formData.items.length > 0 && (
                                        <div className="space-y-2 pt-2 border-t border-[#4A3B32]/5">
                                            {formData.items.map((item, idx) => (
                                                <motion.div
                                                    key={`${item.productId}-${idx}`}
                                                    layout
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    className="flex items-center gap-3 p-2 bg-[#4A3B32]/5 rounded-xl"
                                                >
                                                    <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0">
                                                        {item.image ? (
                                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Package className="w-5 h-5 text-[#4A3B32]/20" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-[#4A3B32] truncate">{item.name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {item.selectedColor && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-[#4A3B32] text-white rounded">
                                                                    {item.selectedColor}
                                                                </span>
                                                            )}
                                                            {item.selectedSize && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-[#C75D3B] text-white rounded">
                                                                    {item.selectedSize}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-bold text-[#4A3B32]">
                                                        R$ {(item.price * item.quantity).toFixed(2)}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(idx)}
                                                        className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {formData.items.length === 0 && !productSearch && (
                                        <div className="py-8 text-center">
                                            <ShoppingBag className="w-10 h-10 text-[#4A3B32]/10 mx-auto mb-2" />
                                            <p className="text-sm text-[#4A3B32]/40">Busque produtos para adicionar</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* === SEÇÃO: DESCONTO === */}
                <section className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                            <BadgePercent className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="font-semibold text-[#4A3B32]">Desconto</h2>
                    </div>

                    <div className="space-y-3">
                        {/* Toggle Tipo Desconto */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setManualDiscount(prev => ({ ...prev, type: 'percent' }))}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                                    manualDiscount.type === 'percent'
                                        ? "bg-[#4A3B32] text-white"
                                        : "bg-[#4A3B32]/5 text-[#4A3B32]"
                                )}
                            >
                                <Percent className="w-4 h-4" />
                                Porcentagem
                            </button>
                            <button
                                type="button"
                                onClick={() => setManualDiscount(prev => ({ ...prev, type: 'fixed' }))}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                                    manualDiscount.type === 'fixed'
                                        ? "bg-[#4A3B32] text-white"
                                        : "bg-[#4A3B32]/5 text-[#4A3B32]"
                                )}
                            >
                                <DollarSign className="w-4 h-4" />
                                Valor Fixo
                            </button>
                        </div>

                        {/* Input Desconto */}
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A3B32]/40 font-bold">
                                {manualDiscount.type === 'percent' ? '%' : 'R$'}
                            </span>
                            <input
                                type="number"
                                value={manualDiscount.value}
                                onChange={(e) => setManualDiscount(prev => ({ ...prev, value: e.target.value }))}
                                placeholder="0"
                                className="w-full pl-12 pr-4 py-3 bg-[#4A3B32]/5 rounded-xl text-lg font-bold text-[#4A3B32] focus:outline-none focus:ring-2 focus:ring-[#C75D3B]/20"
                            />
                        </div>

                        {discount > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl"
                            >
                                <span className="text-sm text-emerald-700">Desconto aplicado</span>
                                <span className="text-sm font-bold text-emerald-600">-R$ {discount.toFixed(2)}</span>
                            </motion.div>
                        )}
                    </div>
                </section>

                {/* === RESUMO FINAL === */}
                <section className="bg-gradient-to-br from-[#4A3B32] to-[#3A2B22] rounded-2xl p-4 text-white">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm text-white/60">
                            <span>Subtotal</span>
                            <span>R$ {subtotal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-400">
                                <span>Desconto</span>
                                <span>-R$ {discount.toFixed(2)}</span>
                            </div>
                        )}
                        {feeInfo.feeValue > 0 && (
                            <div className="flex justify-between text-sm text-red-400">
                                <span>Taxa ({feeInfo.feePercentage}%)</span>
                                <span>-R$ {feeInfo.feeValue.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-end justify-between pt-3 border-t border-white/10">
                        <div>
                            <p className="text-xs text-white/40 mb-0.5">
                                {feeInfo.feeValue > 0 ? 'Valor Líquido' : 'Total'}
                            </p>
                            <p className="text-3xl font-bold">R$ {(feeInfo.feeValue > 0 ? netValue : finalValue).toFixed(2)}</p>
                        </div>
                        {isParcelado && (
                            <div className="text-right">
                                <p className="text-xs text-white/40">Parcela</p>
                                <p className="text-lg font-bold text-[#C75D3B]">{parcelas}x R$ {parcelaValue.toFixed(2)}</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* === BOTÃO FINALIZAR === */}
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={formData.items.length === 0 || !formData.customerId}
                    className={cn(
                        "w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg transition-all",
                        formData.items.length > 0 && formData.customerId
                            ? "bg-[#C75D3B] text-white shadow-xl shadow-[#C75D3B]/30"
                            : "bg-[#4A3B32]/10 text-[#4A3B32]/30"
                    )}
                >
                    <Sparkles className="w-5 h-5" />
                    {isEdit ? 'Salvar Alterações' : 'Finalizar Venda'}
                </motion.button>
            </form>

            {/* Modal de Variante */}
            <AnimatePresence>
                {variantModal.open && variantModal.product && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
                        onClick={() => setVariantModal({ open: false, product: null, selectedColor: null, selectedSize: null })}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[80vh] overflow-y-auto"
                        >
                            <div className="p-4 border-b border-[#4A3B32]/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-[#4A3B32]/5 overflow-hidden">
                                        {variantModal.product.images?.[0] ? (
                                            <img src={variantModal.product.images[0]} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-5 h-5 text-[#4A3B32]/20" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#4A3B32]">{variantModal.product.name}</h3>
                                        <p className="text-sm text-[#C75D3B] font-bold">R$ {variantModal.product.price?.toFixed(2)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setVariantModal({ open: false, product: null, selectedColor: null, selectedSize: null })}
                                    className="p-2 hover:bg-[#4A3B32]/5 rounded-xl"
                                >
                                    <X className="w-5 h-5 text-[#4A3B32]/50" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Cores */}
                                <div>
                                    <p className="text-xs font-bold text-[#4A3B32]/50 uppercase mb-2">Cor</p>
                                    <div className="flex flex-wrap gap-2">
                                        {variantModal.product.variants?.map((v, i) => {
                                            const hasStock = v.sizeStock?.some(s => s.quantity > 0)
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => hasStock && setVariantModal(prev => ({
                                                        ...prev,
                                                        selectedColor: v.colorName,
                                                        selectedSize: null
                                                    }))}
                                                    disabled={!hasStock}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                                        variantModal.selectedColor === v.colorName
                                                            ? "bg-[#4A3B32] text-white"
                                                            : hasStock
                                                                ? "bg-[#4A3B32]/5 text-[#4A3B32]"
                                                                : "bg-[#4A3B32]/5 text-[#4A3B32]/30 line-through"
                                                    )}
                                                >
                                                    {v.colorName}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Tamanhos */}
                                {variantModal.selectedColor && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <p className="text-xs font-bold text-[#4A3B32]/50 uppercase mb-2">Tamanho</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {variantModal.product.variants
                                                ?.find(v => v.colorName === variantModal.selectedColor)
                                                ?.sizeStock?.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => s.quantity > 0 && setVariantModal(prev => ({
                                                            ...prev,
                                                            selectedSize: s.size
                                                        }))}
                                                        disabled={s.quantity <= 0}
                                                        className={cn(
                                                            "py-3 rounded-xl text-sm font-bold transition-all",
                                                            variantModal.selectedSize === s.size
                                                                ? "bg-[#C75D3B] text-white"
                                                                : s.quantity > 0
                                                                    ? "bg-[#4A3B32]/5 text-[#4A3B32]"
                                                                    : "bg-[#4A3B32]/5 text-[#4A3B32]/30"
                                                        )}
                                                    >
                                                        {s.size}
                                                        <span className="block text-[10px] font-normal opacity-60">
                                                            {s.quantity > 0 ? `${s.quantity}un` : 'Esgotado'}
                                                        </span>
                                                    </button>
                                                ))}
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="p-4 border-t border-[#4A3B32]/5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (variantModal.selectedColor && variantModal.selectedSize) {
                                            addItemToCart(variantModal.product, variantModal.selectedColor, variantModal.selectedSize)
                                            setVariantModal({ open: false, product: null, selectedColor: null, selectedSize: null })
                                        }
                                    }}
                                    disabled={!variantModal.selectedColor || !variantModal.selectedSize}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all",
                                        variantModal.selectedColor && variantModal.selectedSize
                                            ? "bg-[#C75D3B] text-white"
                                            : "bg-[#4A3B32]/10 text-[#4A3B32]/30"
                                    )}
                                >
                                    <Plus className="w-5 h-5" />
                                    Adicionar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
