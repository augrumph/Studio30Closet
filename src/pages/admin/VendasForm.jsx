import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, User, Search, Package, Info, Ticket, X, CreditCard } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { useOperationalCostsStore } from '@/store/operational-costs-store'
import { getPaymentFee } from '@/lib/api'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

export function VendasForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)
    const { products, customers, coupons, loadCoupons, loadCustomers, addVenda, editVenda, getVendaById, reloadAll, createInstallments } = useAdminStore()
    const { calculateFee } = useOperationalCostsStore()

    const [formData, setFormData] = useState({
        customerId: '',
        customerName: '',
        paymentMethod: 'pix',
        cardBrand: '', // Nova: bandeira do cartão
        paymentStatus: 'paid',
        items: [],
        totalValue: 0,
        notes: '',
        couponId: '',
        couponCode: '',
        discountAmount: 0
    })

    const [parcelas, setParcelas] = useState(1)
    const [isInstallment, setIsInstallment] = useState(false)
    const [entryPayment, setEntryPayment] = useState(0)
    const [installmentStartDate, setInstallmentStartDate] = useState('')
    const [feeInfo, setFeeInfo] = useState({ feePercentage: 0, feeValue: 0, netValue: 0 })
    const [paymentFee, setPaymentFee] = useState(null)

    const [couponInput, setCouponInput] = useState('')
    const [couponLoading, setCouponLoading] = useState(false)

    const [itemSearch, setItemSearch] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')

    // Estado para modal de seleção de cor/tamanho
    const [selectedProductForVariant, setSelectedProductForVariant] = useState(null)
    const [selectedColor, setSelectedColor] = useState(null)
    const [selectedSize, setSelectedSize] = useState(null)

    useEffect(() => {
        // Carregar produtos e todos os clientes para o formulário
        reloadAll()
        loadCustomers()
        loadCoupons()
        if (isEdit) {
            const venda = getVendaById(parseInt(id))
            if (venda) {
                // Garantir que items é um array (pode vir como string JSON do banco)
                let parsedItems = venda.items
                if (typeof parsedItems === 'string') {
                    try {
                        parsedItems = JSON.parse(parsedItems)
                    } catch (e) {
                        parsedItems = []
                    }
                }
                if (!Array.isArray(parsedItems)) {
                    parsedItems = []
                }

                setFormData({
                    customerId: venda.customerId,
                    customerName: venda.customerName,
                    paymentMethod: venda.paymentMethod,
                    paymentStatus: venda.paymentStatus,
                    items: parsedItems,
                    totalValue: venda.originalTotal || venda.totalValue, // Usar o total original para cálculos
                    notes: venda.notes || '',
                    couponId: venda.couponId || '',
                    couponCode: venda.couponCode || '',
                    discountAmount: venda.discountAmount || 0
                })
                if (venda.parcelas) {
                    setParcelas(venda.parcelas)
                }
            } else {
                toast.error('Venda não localizada.')
                navigate('/admin/vendas')
            }
        }
    }, [id, isEdit, getVendaById, reloadAll, loadCustomers, navigate])

    // Calcular taxa automaticamente quando mudar método de pagamento, bandeira ou valor
    useEffect(() => {
        const calculatePaymentFee = async () => {
            if (formData.paymentMethod && formData.totalValue > 0 && formData.paymentStatus !== 'pending') {
                const valorFinal = formData.totalValue - formData.discountAmount

                try {
                    // Buscar taxa da tabela payment_fees
                    const feeData = await getPaymentFee(formData.paymentMethod, formData.cardBrand || null)

                    if (feeData) {
                        const feePercentage = feeData.feePercentage || 0
                        const feeFixed = feeData.feeFixed || 0
                        const feeValue = (valorFinal * feePercentage / 100) + feeFixed
                        const netValue = valorFinal - feeValue

                        // Validar que os cálculos fazem sentido
                        if (isNaN(feeValue) || isNaN(netValue) || netValue < 0) {
                            throw new Error('Cálculo de taxa resultou em valores inválidos')
                        }

                        setFeeInfo({
                            feePercentage,
                            feeFixed,
                            feeValue,
                            netValue
                        })

                        // Armazenar o objeto completo de taxa para exibição (especialmente para card_machine)
                        setPaymentFee(feeData)
                    } else {
                        // Sem taxa configurada - avisar o usuário
                        console.warn('Nenhuma taxa configurada para:', formData.paymentMethod, formData.cardBrand)
                        toast.warning('Taxa não configurada para este método de pagamento')
                        setFeeInfo({ feePercentage: 0, feeFixed: 0, feeValue: 0, netValue: valorFinal })
                        setPaymentFee(null)
                    }
                } catch (error) {
                    console.error('Erro ao calcular taxa de pagamento:', error)
                    toast.error('Erro ao calcular taxa de pagamento. Verifique a configuração de taxas.')
                    // Usar valores zerados em caso de erro para não quebrar o fluxo
                    setFeeInfo({ feePercentage: 0, feeFixed: 0, feeValue: 0, netValue: valorFinal })
                    setPaymentFee(null)
                }
            } else {
                setFeeInfo({ feePercentage: 0, feeFixed: 0, feeValue: 0, netValue: formData.totalValue - formData.discountAmount })
                setPaymentFee(null)
            }
        }

        calculatePaymentFee()
    }, [formData.paymentMethod, formData.cardBrand, formData.totalValue, formData.discountAmount, formData.paymentStatus])

    const addItem = (product) => {
        // Validação de estoque
        if (!product.stock || product.stock <= 0) {
            toast.error('Produto sem estoque', {
                description: `O item ${product.name} não possui unidades disponíveis.`
            })
            return
        }

        // Se o produto tem variantes (cores), abrir modal de seleção
        if (product.variants && product.variants.length > 0) {
            setSelectedProductForVariant(product)
            setSelectedColor(product.variants[0].colorName) // Pre-selecionar primeira cor
            setSelectedSize(product.variants[0].sizeStock?.[0]?.size) // Pre-selecionar primeiro tamanho
            return
        }

        // Caso contrário, adicionar direto (produtos sem variantes)
        addItemToVenda(product, null, null)
    }

    const addItemToVenda = (product, color, size) => {
        // Verificar se já atingiu o limite de estoque se o item já estiver na venda
        const existingItem = formData.items.find(item =>
            item.productId === product.id &&
            item.selectedColor === (color || null) &&
            item.selectedSize === (size || null)
        )

        if (existingItem && existingItem.quantity >= product.stock) {
            toast.error('Limite de estoque atingido', {
                description: `Você já adicionou todas as unidades disponíveis de ${product.name} (${color || 'Padrão'}) - ${size || 'Único'}.`
            })
            return
        }

        const newItem = {
            productId: product.id,
            name: product.name,
            price: product.price,
            costPrice: product.costPrice || 0,
            quantity: 1,
            selectedColor: color,
            selectedSize: size
        }
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem],
            totalValue: prev.totalValue + product.price
        }))

        const colorText = color ? ` (${color})` : ''
        const sizeText = size ? ` - ${size}` : ''
        toast.success(`${product.name}${colorText}${sizeText} adicionado à venda.`, {
            description: `Valor: R$ ${(product.price || 0).toLocaleString('pt-BR')}`,
            icon: '🛒'
        })

        // Fechar modal se estava aberto
        setSelectedProductForVariant(null)
        setSelectedColor(null)
        setSelectedSize(null)
    }

    const removeItem = (index) => {
        const item = formData.items[index]
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
            totalValue: prev.totalValue - (item.price * item.quantity)
        }))
        toast.info(`Item removido da lista.`)
    }

    const selectCustomer = (customer) => {
        setFormData(prev => ({
            ...prev,
            customerId: customer.id,
            customerName: customer.name
        }))
        setCustomerSearch('')
        toast.success(`Cliente ${customer.name} selecionado.`)
    }

    const applyCoupon = async () => {
        if (!couponInput.toUpperCase().trim()) return

        setCouponLoading(true)
        try {
            const code = couponInput.toUpperCase().trim()
            const coupon = coupons.find(c => c.code === code && c.isActive)

            if (!coupon) {
                toast.error('Cupom inválido ou inativo.')
                setCouponLoading(false)
                return
            }

            // Validar expiração
            if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
                toast.error('Este cupom já expirou.')
                setCouponLoading(false)
                return
            }

            // Validar valor mínimo
            if (coupon.minPurchase && formData.totalValue < coupon.minPurchase) {
                toast.error(`Valor mínimo para este cupom: R$ ${(coupon.minPurchase || 0).toLocaleString('pt-BR')}`)
                setCouponLoading(false)
                return
            }

            let discount = 0
            let description = ''

            if (coupon.type === 'percent') {
                discount = (formData.totalValue * coupon.value) / 100
                description = `Desconto de R$ ${(discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            } else if (coupon.type === 'cost_price') {
                // Cupom especial: define todos os produtos pelo preço de custo
                discount = formData.items.reduce((total, item) => {
                    const itemDiscount = (item.price - (item.costPrice || 0)) * item.quantity
                    return total + itemDiscount
                }, 0)
                description = `🔥 PREÇO DE CUSTO! Desconto de R$ ${(discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

                // Validar que todos os produtos têm preço de custo
                const itemsWithoutCost = formData.items.filter(item => !item.costPrice || item.costPrice <= 0)
                if (itemsWithoutCost.length > 0) {
                    toast.warning('Atenção', {
                        description: `${itemsWithoutCost.length} produto(s) sem preço de custo cadastrado. O desconto pode não ser preciso.`
                    })
                }
            } else {
                // Desconto fixo
                discount = coupon.value
                description = `Desconto de R$ ${(discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            }

            setFormData(prev => ({
                ...prev,
                couponId: coupon.id,
                couponCode: coupon.code,
                discountAmount: discount
            }))

            toast.success(`Cupom ${code} aplicado!`, {
                description: description
            })
            setCouponInput('')
        } catch (error) {
            toast.error('Erro ao validar cupom.')
        } finally {
            setCouponLoading(false)
        }
    }

    const removeCoupon = () => {
        setFormData(prev => ({
            ...prev,
            couponId: '',
            couponCode: '',
            discountAmount: 0
        }))
        toast.info('Cupom removido.')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.customerId || formData.items.length === 0) {
            toast.error('Campos incompletos', {
                description: 'Por favor, selecione um cliente e adicione pelo menos um produto.'
            })
            return
        }

        // Validar crediário parcelado
        if (formData.paymentMethod === 'credito_parcelado') {
            if (!installmentStartDate) {
                toast.error('Data de início das parcelas obrigatória', {
                    description: 'Defina quando a primeira parcela vence.'
                })
                return
            }
            if (parcelas < 2) {
                toast.error('Número de parcelas inválido', {
                    description: 'Escolha pelo menos 2 parcelas.'
                })
                return
            }
        }

        // Se o status for pendente, forçar pagamento como crediário (fiado internamente)
        const finalPaymentMethod = formData.paymentStatus === 'pending' ? 'fiado' : formData.paymentMethod

        const payload = {
            ...formData,
            paymentMethod: finalPaymentMethod,
            cardBrand: formData.cardBrand || null,
            totalValue: formData.totalValue - formData.discountAmount, // Valor final com desconto (cobrado do cliente)
            originalTotal: formData.totalValue, // Valor original para log
            costPrice: formData.items.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0),
            // Incluir informações de taxa automáticas
            feePercentage: feeInfo.feePercentage || 0,
            feeAmount: feeInfo.feeValue || 0,
            netAmount: feeInfo.netValue || (formData.totalValue - formData.discountAmount),
            // Crediário
            isInstallment: formData.paymentMethod === 'credito_parcelado',
            numInstallments: formData.paymentMethod === 'credito_parcelado' ? parcelas : 1,
            entryPayment: formData.paymentMethod === 'credito_parcelado' ? entryPayment : 0,
            installmentStartDate: formData.paymentMethod === 'credito_parcelado' ? installmentStartDate : null
        }

        const action = isEdit ? editVenda(parseInt(id), payload) : addVenda(payload)
        const loadingMsg = isEdit ? 'Processando alterações e ajustando estoque...' : 'Registrando venda e baixando estoque...'
        const successTemplate = isEdit ? 'Venda e estoque atualizados com sucesso!' : `Venda registrada e estoque baixado para ${formData.customerName}!`

        toast.promise(action, {
            loading: loadingMsg,
            success: async (result) => {
                if (result.success) {
                    // Se é crediário, criar parcelas automaticamente
                    if (formData.paymentMethod === 'credito_parcelado' && !isEdit) {
                        const vendaId = result.venda.id
                        const installmentsResult = await createInstallments(
                            vendaId,
                            parcelas,
                            entryPayment,
                            installmentStartDate
                        )
                        if (!installmentsResult.success) {
                            toast.error('Erro ao criar parcelas', {
                                description: installmentsResult.error
                            })
                        } else {
                            toast.success(`✅ ${installmentsResult.installments.length} parcelas criadas automaticamente!`)
                        }
                    }
                    navigate('/admin/vendas')
                    return successTemplate
                }
                throw new Error(result.error)
            },
            error: (err) => `Erro na operação: ${err.message}`
        })
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(itemSearch.toLowerCase())
    ).slice(0, 5)

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase())
    ).slice(0, 5)

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header with Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/admin/vendas')}
                        className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-[#4A3B32]" />
                    </motion.button>
                    <div>
                        <h2 className="text-3xl font-display font-semibold text-[#4A3B32] tracking-tight">
                            {isEdit ? 'Editar Registro de Venda' : 'Nova Venda Manual'}
                        </h2>
                        <p className="text-sm text-[#4A3B32]/40 font-medium">
                            {isEdit ? `Atualizando informações da venda ref: #${id}` : 'Registre vendas rápidas fora do fluxo do site.'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {/* Cliente Selector */}
                    <Card className="overflow-visible">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5 text-[#C75D3B]" />
                                Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AnimatePresence mode="wait">
                                {formData.customerId ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex items-center justify-between p-5 bg-[#FDFBF7] rounded-3xl border border-[#C75D3B]/20 shadow-inner"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-[#C75D3B] flex items-center justify-center text-white font-bold text-xl">
                                                {formData.customerName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-xl text-[#4A3B32]">{formData.customerName}</p>
                                                <p className="text-xs text-[#C75D3B] font-bold uppercase tracking-wider">Cliente Selecionado</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, customerId: '', customerName: '' }))}
                                            className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            Trocar Cliente
                                        </button>
                                    </motion.div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nome ou CPF do cliente..."
                                            className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg transition-all"
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                        />
                                        {customerSearch.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 shadow-2xl rounded-3xl z-50 overflow-hidden divide-y divide-gray-50"
                                            >
                                                {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => selectCustomer(c)}
                                                        className="w-full p-5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <span className="font-bold text-[#4A3B32] block">{c.name}</span>
                                                            <span className="text-xs text-gray-400">{c.phone}</span>
                                                        </div>
                                                        <Plus className="w-5 h-5 text-[#C75D3B] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </button>
                                                )) : (
                                                    <div className="p-8 text-center text-gray-400 italic">Nenhum cliente encontrado.</div>
                                                )}
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>

                    {/* Produtos List */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-[#C75D3B]" />
                                Produtos Vendidos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Adicionar produto pelo nome..."
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg transition-all"
                                    value={itemSearch}
                                    onChange={(e) => setItemSearch(e.target.value)}
                                />
                                {itemSearch.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 shadow-2xl rounded-3xl z-40 overflow-hidden divide-y divide-gray-50"
                                    >
                                        {filteredProducts.length > 0 ? filteredProducts.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => { addItem(p); setItemSearch(''); }}
                                                className="w-full p-5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                                            >
                                                <div>
                                                    <span className="font-bold text-[#4A3B32] block">{p.name}</span>
                                                    <span className="text-xs text-gray-400">Em estoque: {p.stock || 0}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-[#C75D3B] block font-display">R$ ${(p.price || 0).toLocaleString('pt-BR')}</span>
                                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                        <div className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            p.stock > 5 ? "bg-emerald-400" : p.stock > 0 ? "bg-amber-400" : "bg-red-400"
                                                        )} />
                                                        <span className={cn(
                                                            "text-[9px] font-bold uppercase tracking-widest",
                                                            p.stock > 0 ? "text-gray-300" : "text-red-400"
                                                        )}>
                                                            {p.stock > 0 ? `${p.stock} em estoque` : 'Esgotado'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        )) : (
                                            <div className="p-8 text-center text-gray-400 italic">Produto não localizado.</div>
                                        )}
                                    </motion.div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <AnimatePresence initial={false}>
                                    {(formData.items && Array.isArray(formData.items) ? formData.items : []).map((item, idx) => (
                                        <motion.div
                                            key={`${item.productId}-${idx}`}
                                            initial={{ opacity: 0, height: 0, margin: 0 }}
                                            animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                                            exit={{ opacity: 0, height: 0, padding: 0 }}
                                            className="p-5 flex items-center justify-between gap-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#C75D3B]/20 transition-all group"
                                        >
                                            <div className="flex-1">
                                                <p className="font-bold text-[#4A3B32]">{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-xs font-bold text-[#C75D3B] bg-[#FDF0ED] px-2 py-0.5 rounded text-[10px]">UNIDADE</span>
                                                    <span className="text-xs text-[#4A3B32]/40">Cód: {item.productId}</span>
                                                    {item.selectedColor && (
                                                        <span className="text-xs font-semibold text-white bg-[#4A3B32] px-2 py-0.5 rounded text-[10px]">
                                                            🎨 {item.selectedColor}
                                                        </span>
                                                    )}
                                                    {item.selectedSize && (
                                                        <span className="text-xs font-semibold text-white bg-[#C75D3B] px-2 py-0.5 rounded text-[10px]">
                                                            📏 {item.selectedSize}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="font-bold text-[#4A3B32]">R$ ${(item.price || 0).toLocaleString('pt-BR')}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="p-3 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {formData.items.length === 0 && (
                                    <div className="py-20 text-center space-y-3 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/30">
                                        <Package className="w-12 h-12 text-gray-200 mx-auto" />
                                        <div>
                                            <p className="text-gray-400 font-medium">Nenhum produto adicionado ainda.</p>
                                            <p className="text-xs text-gray-400/60">Use a busca acima para incluir itens na venda.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* Payment & Action Card */}
                    <Card className="bg-white lg:sticky lg:top-8 shadow-2xl">
                        <CardHeader>
                            <CardTitle>Pagamento e Finalização</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-5">
                                {/* Meio de Pagamento */}
                                <div>
                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-3 block">Método de Pagamento</label>
                                    <select
                                        value={formData.paymentMethod}
                                        onChange={(e) => {
                                            const newMethod = e.target.value
                                            setFormData(prev => ({ ...prev, paymentMethod: newMethod, cardBrand: '' }))
                                            if (newMethod === 'credito_parcelado') {
                                                setParcelas(2)
                                                setIsInstallment(true)
                                            } else {
                                                setParcelas(1)
                                                setIsInstallment(false)
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-[#4A3B32] transition-all"
                                    >
                                        <option value="pix">PIX</option>
                                        <option value="card_machine">Cartão na Máquina</option>
                                        <option value="payment_link">Link de Pagamento</option>
                                        <option value="fiado">Crediário (Conta Corrente)</option>
                                        <option value="credito_parcelado">Crediário Parcelado (Sem Taxa)</option>
                                        <option value="cash">Dinheiro Espécie</option>
                                    </select>
                                </div>

                                {/* Cartão na Máquina - Bandeira e Taxa */}
                                {(formData.paymentMethod === 'card_machine' || formData.paymentMethod === 'payment_link') && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-3 block">Bandeira *</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {['visa', 'mastercard', 'amex', 'elo'].map((brand) => (
                                                    <button
                                                        key={brand}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, cardBrand: brand }))}
                                                        className={cn(
                                                            "py-2.5 px-3 rounded-lg font-medium text-sm transition-all",
                                                            formData.cardBrand === brand
                                                                ? "bg-[#C75D3B] text-white shadow-md"
                                                                : "bg-gray-100 text-[#4A3B32] hover:bg-gray-200"
                                                        )}
                                                    >
                                                        {brand === 'mastercard' ? 'MC' : brand.charAt(0).toUpperCase() + brand.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Cartão na Máquina - Taxa e Parcelamento */}
                                        {formData.paymentMethod === 'card_machine' && (
                                            <div className="space-y-4">
                                                {/* Taxa automática */}
                                                {paymentFee && (
                                                    <div className="bg-white/50 p-3 rounded-lg border border-[#C75D3B]/20">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium text-[#4A3B32]">Taxa {formData.cardBrand?.toUpperCase()}:</span>
                                                            <span className="text-lg font-bold text-[#C75D3B]">{paymentFee.feePercentage}%</span>
                                                        </div>
                                                        <p className="mt-2 text-[10px] text-[#4A3B32]/50">
                                                            Valor cobrado: <span className="font-bold text-[#C75D3B]">R$ {((formData.totalValue - formData.discountAmount) * (paymentFee.feePercentage || 0) / 100).toFixed(2)}</span>
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Parcelamento do Cartão */}
                                                <div>
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-2 block">Parcelado em Quantas Vezes?</label>
                                                    <select
                                                        value={parcelas}
                                                        onChange={(e) => setParcelas(Number(e.target.value))}
                                                        className="w-full px-3 py-2.5 bg-white border border-[#C75D3B]/20 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-sm text-[#4A3B32] transition-all"
                                                    >
                                                        <option value={1}>À Vista</option>
                                                        {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                                                            <option key={n} value={n}>{n}x</option>
                                                        ))}
                                                    </select>
                                                    {parcelas > 1 && (
                                                        <p className="mt-1 text-[10px] text-[#4A3B32]/50">
                                                            Valor de cada parcela: <span className="font-bold text-[#C75D3B]">R$ {((formData.totalValue - formData.discountAmount) / parcelas).toFixed(2)}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Crediário Parcelado - Campos de configuração */}
                                {formData.paymentMethod === 'credito_parcelado' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4 p-4 bg-[#FDF0ED]/50 rounded-2xl border-2 border-[#C75D3B]/30"
                                    >
                                        <p className="text-xs text-[#C75D3B] font-bold uppercase tracking-widest">Configuração de Parcelamento</p>

                                        {/* Grid 2 colunas em mobile/tablet */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Número de Parcelas */}
                                            <div>
                                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-2 block">Parcelas</label>
                                                <select
                                                    value={parcelas}
                                                    onChange={(e) => setParcelas(Number(e.target.value))}
                                                    className="w-full px-3 py-2.5 bg-white border border-[#C75D3B]/20 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-sm text-[#4A3B32] transition-all"
                                                >
                                                    {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                                                        <option key={n} value={n}>{n}x sem taxa</option>
                                                    ))}
                                                </select>
                                                <p className="mt-1 text-[10px] text-[#4A3B32]/50">
                                                    Parcela: <span className="font-bold text-[#C75D3B]">R$ {((formData.totalValue - formData.discountAmount - entryPayment) / parcelas).toFixed(2)}</span>
                                                </p>
                                            </div>

                                            {/* Valor de Entrada */}
                                            <div>
                                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-2 block">Entrada</label>
                                                <input
                                                    type="number"
                                                    value={entryPayment}
                                                    onChange={(e) => setEntryPayment(parseFloat(e.target.value) || 0)}
                                                    placeholder="0,00"
                                                    className="w-full px-3 py-2.5 bg-white border border-[#C75D3B]/20 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-sm text-[#4A3B32] transition-all"
                                                    step="0.01"
                                                    min="0"
                                                />
                                                <p className="mt-1 text-[10px] text-[#4A3B32]/50">
                                                    A parcelar: <span className="font-bold text-[#C75D3B]">R$ {(formData.totalValue - formData.discountAmount - entryPayment).toFixed(2)}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Data de Início das Parcelas - Full width */}
                                        <div>
                                            <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-2 block">1ª Parcela em</label>
                                            <input
                                                type="date"
                                                value={installmentStartDate}
                                                onChange={(e) => setInstallmentStartDate(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-white border border-[#C75D3B]/20 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-sm text-[#4A3B32] transition-all"
                                            />
                                            <p className="mt-1 text-[10px] text-[#4A3B32]/50">Próximas parcelas: mensais</p>
                                        </div>

                                        {/* Resumo Compacto */}
                                        <div className="bg-white/70 p-3 rounded-xl border border-[#C75D3B]/20 space-y-1.5 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-[#4A3B32]">Total:</span>
                                                <span className="font-bold text-[#C75D3B]">R$ {(formData.totalValue - formData.discountAmount).toFixed(2)}</span>
                                            </div>
                                            {entryPayment > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-[#4A3B32]">Entrada:</span>
                                                    <span className="font-bold text-[#C75D3B]">- R$ {entryPayment.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-[#C75D3B]/20 pt-1.5 flex justify-between font-bold">
                                                <span className="text-[#4A3B32]">{parcelas}x de:</span>
                                                <span className="text-[#C75D3B]">R$ {((formData.totalValue - formData.discountAmount - entryPayment) / parcelas).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                <div>
                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-2.5 block">Cupom de Desconto</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="text"
                                                placeholder="CÓDIGO"
                                                className="w-full pl-10 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-bold text-[#4A3B32] uppercase placeholder:text-gray-200"
                                                value={couponInput}
                                                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={applyCoupon}
                                            disabled={couponLoading || !couponInput}
                                            className="px-6 bg-[#C75D3B] text-white rounded-2xl font-bold hover:bg-[#A64D31] transition-all disabled:opacity-50"
                                        >
                                            {couponLoading ? '...' : 'Aplicar'}
                                        </button>
                                    </div>
                                    {formData.couponCode && (
                                        <div className="mt-3 flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <div className="flex items-center gap-2">
                                                <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{formData.couponCode} ATIVO</span>
                                            </div>
                                            <button type="button" onClick={removeCoupon} className="p-1 hover:bg-emerald-100 rounded-full transition-colors">
                                                <X className="w-3.5 h-3.5 text-emerald-600" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-2.5 block">Status da Transação</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, paymentStatus: 'paid' }))}
                                            className={cn(
                                                "py-3.5 rounded-2xl text-xs font-bold border-2 transition-all active:scale-95",
                                                formData.paymentStatus === 'paid'
                                                    ? "bg-[#C75D3B]/5 border-[#C75D3B] text-[#C75D3B] shadow-sm shadow-[#C75D3B]/10"
                                                    : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                                            )}
                                        >
                                            LIQUIDADO
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, paymentStatus: 'pending' }))}
                                            className={cn(
                                                "py-3.5 rounded-2xl text-xs font-bold border-2 transition-all active:scale-95",
                                                formData.paymentStatus === 'pending'
                                                    ? "bg-amber-50 border-amber-500 text-amber-600 shadow-sm shadow-amber-500/10"
                                                    : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                                            )}
                                        >
                                            PENDENTE
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-100 space-y-4">
                                {/* Breakdown de valores */}
                                <div className="space-y-2.5 px-1">
                                    {/* Subtotal */}
                                    <div className="flex justify-between items-center text-[#4A3B32]/60 text-sm">
                                        <span className="font-medium">Subtotal</span>
                                        <span className="font-bold">R$ ${(formData.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Desconto */}
                                    {formData.discountAmount > 0 && (
                                        <div className="flex justify-between items-center text-emerald-600 text-sm">
                                            <span className="font-medium">Desconto</span>
                                            <span className="font-bold">- R$ ${(formData.discountAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}

                                    {/* Total cobrado do cliente */}
                                    <div className="flex justify-between items-center text-[#4A3B32] text-base pt-2 border-t border-gray-100">
                                        <span className="font-bold">Valor da Venda</span>
                                        <span className="font-bold text-lg">R$ {((formData.totalValue || 0) - (formData.discountAmount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Parcelamento */}
                                    {(isInstallment || (formData.paymentMethod === 'card_machine' && parcelas > 1)) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex justify-between items-center text-[#C75D3B] text-sm pt-2"
                                        >
                                            <span className="font-medium">Parcelado em {parcelas}x</span>
                                            <span className="font-bold">R$ {(((formData.totalValue || 0) - (formData.discountAmount || 0) - (isInstallment ? entryPayment : 0)) / parcelas).toFixed(2)}</span>
                                        </motion.div>
                                    )}

                                    {/* Taxa da maquininha */}
                                    {feeInfo.feeValue > 0 && formData.paymentStatus !== 'pending' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex justify-between items-center text-red-500 text-sm pt-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-3.5 h-3.5" />
                                                <span className="font-medium">Taxa ({feeInfo.feePercentage}%)</span>
                                            </div>
                                            <span className="font-bold">- R$ ${(feeInfo.feeValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Total líquido (o que vai entrar de fato) */}
                                <div className="flex justify-between items-end pt-4 border-t-2 border-[#C75D3B]/10">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            {feeInfo.feeValue > 0 && formData.paymentStatus !== 'pending' ? 'Valor Líquido Recebido' : 'Total da Venda'}
                                        </p>
                                        <p className="text-3xl font-display font-bold text-[#4A3B32]">
                                            R$ {((feeInfo.feeValue > 0 && formData.paymentStatus !== 'pending'
                                                ? feeInfo.netValue
                                                : (formData.totalValue || 0) - (formData.discountAmount || 0)
                                            ) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-[#C75D3B] bg-[#FDF0ED] px-2 py-1 rounded">Venda Direta</span>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={formData.items.length === 0}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-bold transition-all shadow-xl",
                                        formData.items.length > 0
                                            ? "bg-[#4A3B32] text-white shadow-[#4A3B32]/20 hover:bg-[#342922]"
                                            : "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
                                    )}
                                >
                                    <Save className="w-6 h-6" />
                                    {isEdit ? 'Atualizar Registro' : 'Finalizar Registro'}
                                </motion.button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#FAF3F0] border-none">
                        <CardContent className="pt-6">
                            <div className="flex gap-4">
                                <Info className="w-5 h-5 text-[#C75D3B] shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-xs text-[#C75D3B] font-bold uppercase tracking-wider">Lembrete Ágil</p>
                                    <p className="text-sm text-[#4A3B32]/60 italic font-medium leading-relaxed">
                                        As estatísticas de consumo deste cliente serão atualizadas instantaneamente após a confirmação.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </form>

            {/* Modal de Seleção de Cor e Tamanho */}
            {selectedProductForVariant && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8">
                        <h2 className="text-2xl font-bold text-[#4A3B32] mb-6">
                            Selecione Cor e Tamanho
                        </h2>

                        {/* Seleção de Cor */}
                        <div className="mb-8">
                            <label className="text-sm font-bold text-[#4A3B32] uppercase tracking-wider block mb-3">
                                🎨 Cor
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {selectedProductForVariant.variants?.map((variant) => (
                                    <button
                                        key={variant.colorName}
                                        onClick={() => {
                                            setSelectedColor(variant.colorName)
                                            setSelectedSize(variant.sizeStock?.[0]?.size)
                                        }}
                                        className={cn(
                                            'p-4 rounded-xl font-semibold transition-all border-2',
                                            selectedColor === variant.colorName
                                                ? 'border-[#C75D3B] bg-[#FDF0ED] text-[#C75D3B] shadow-lg'
                                                : 'border-gray-200 bg-white text-[#4A3B32] hover:border-[#C75D3B]/50'
                                        )}
                                    >
                                        {variant.colorName}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Seleção de Tamanho */}
                        <div className="mb-8">
                            <label className="text-sm font-bold text-[#4A3B32] uppercase tracking-wider block mb-3">
                                📏 Tamanho
                            </label>
                            <div className="grid grid-cols-auto gap-3">
                                {selectedProductForVariant.variants
                                    ?.find(v => v.colorName === selectedColor)
                                    ?.sizeStock?.map((sizeStock) => (
                                        <button
                                            key={sizeStock.size}
                                            onClick={() => setSelectedSize(sizeStock.size)}
                                            className={cn(
                                                'px-4 py-3 rounded-xl font-semibold transition-all border-2 min-w-max',
                                                selectedSize === sizeStock.size
                                                    ? 'border-[#C75D3B] bg-[#FDF0ED] text-[#C75D3B] shadow-lg'
                                                    : 'border-gray-200 bg-white text-[#4A3B32] hover:border-[#C75D3B]/50'
                                            )}
                                        >
                                            {sizeStock.size}
                                            <span className="text-xs ml-2 text-gray-400">({sizeStock.quantity} est.)</span>
                                        </button>
                                    ))}
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => {
                                    setSelectedProductForVariant(null)
                                    setSelectedColor(null)
                                    setSelectedSize(null)
                                }}
                                className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-[#4A3B32] font-semibold hover:bg-gray-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedColor && selectedSize) {
                                        addItemToVenda(selectedProductForVariant, selectedColor, selectedSize)
                                    }
                                }}
                                disabled={!selectedColor || !selectedSize}
                                className="flex-1 px-6 py-3 rounded-full bg-[#C75D3B] text-white font-semibold hover:bg-[#B84A2B] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                ✓ Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
