import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, User, Search, Package, Info, Ticket, X, CreditCard } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { getPaymentFee, createInstallments } from '@/lib/api'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { DatePicker } from '@/components/ui/DatePicker'

export function VendasForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)
    const { products, customers, coupons, loadCoupons, loadCustomers, addVenda, editVenda, getVendaById, reloadAll } = useAdminStore()

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

    // Modal de seleção de variante (cor/tamanho)
    const [variantModal, setVariantModal] = useState({
        open: false,
        product: null,
        selectedColor: null,
        selectedSize: null
    })

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

                // ✅ AJUSTAR payment_method se for parcelado
                let adjustedPaymentMethod = venda.paymentMethod
                if (venda.isInstallment && venda.numInstallments > 1) {
                    if (venda.paymentMethod === 'fiado') {
                        adjustedPaymentMethod = 'fiado_parcelado'
                    } else if (venda.paymentMethod === 'credito') {
                        adjustedPaymentMethod = 'credito_parcelado'
                    }
                }

                setFormData({
                    customerId: venda.customerId,
                    customerName: venda.customerName,
                    paymentMethod: adjustedPaymentMethod,
                    cardBrand: venda.cardBrand || '',
                    paymentStatus: venda.paymentStatus,
                    items: parsedItems,
                    totalValue: venda.originalTotal || venda.totalValue, // Usar o total original para cálculos
                    notes: venda.notes || '',
                    couponId: venda.couponId || '',
                    couponCode: venda.couponCode || '',
                    discountAmount: venda.discountAmount || 0
                })
                // ✅ CARREGAR DADOS DE PARCELAMENTO (CORRIGIDO)
                if (venda.isInstallment) {
                    setIsInstallment(true)
                    setParcelas(venda.numInstallments || 2)
                    setEntryPayment(venda.entryPayment || 0)
                    setInstallmentStartDate(venda.installmentStartDate || '')
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
            // Para crédito parcelado, calcular mesmo com status pending. Para outros, só se liquidado
            const shouldCalculate = formData.paymentMethod && formData.totalValue > 0 &&
                (formData.paymentMethod === 'credito_parcelado' || formData.paymentStatus !== 'pending')

            if (shouldCalculate) {
                const valorFinal = formData.totalValue - formData.discountAmount

                try {
                    // Mapear método de pagamento para a tabela payment_fees
                    let paymentMethod = null
                    let numInstallments = null

                    // Mapear valores do formulário para valores do banco
                    if (formData.paymentMethod === 'pix') {
                        paymentMethod = 'pix'
                        numInstallments = null
                    } else if (formData.paymentMethod === 'debit') {
                        paymentMethod = 'debito'
                        numInstallments = null
                    } else if (formData.paymentMethod === 'card_machine') {
                        // Crédito à vista = crédito com 1 parcela
                        paymentMethod = 'credito'
                        numInstallments = 1
                    } else if (formData.paymentMethod === 'credito_parcelado') {
                        // Crédito parcelado
                        paymentMethod = 'credito'
                        numInstallments = parcelas || 2
                    } else if (formData.paymentMethod === 'fiado_parcelado' || formData.paymentMethod === 'fiado') {
                        // Crediário: sem taxa
                        setFeeInfo({
                            feePercentage: 0,
                            feeFixed: 0,
                            feeValue: 0,
                            netValue: valorFinal
                        })
                        setPaymentFee(null)
                        return
                    } else if (formData.paymentMethod === 'cash') {
                        // Dinheiro em espécie: sem taxa
                        setFeeInfo({
                            feePercentage: 0,
                            feeFixed: 0,
                            feeValue: 0,
                            netValue: valorFinal
                        })
                        setPaymentFee(null)
                        return
                    }

                    // Buscar taxa do banco de dados com bandeira e parcelas
                    const feeData = await getPaymentFee(paymentMethod, formData.cardBrand || null, numInstallments)

                    if (feeData) {
                        const feePercentage = feeData.feePercentage || 0
                        const feeValue = (valorFinal * feePercentage / 100)
                        const netValue = valorFinal - feeValue

                        setFeeInfo({
                            feePercentage,
                            feeFixed: 0,
                            feeValue,
                            netValue
                        })
                        setPaymentFee(feeData)
                    } else {
                        // Sem taxa configurada - apenas log, sem avisar (PIX é normal)
                        console.warn('Nenhuma taxa configurada para:', formData.paymentMethod, formData.cardBrand)
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
    }, [formData.paymentMethod, formData.cardBrand, formData.totalValue, formData.discountAmount, formData.paymentStatus, parcelas])

    const addItem = (product) => {
        // Validação de estoque
        if (!product.stock || product.stock <= 0) {
            toast.error('Produto sem estoque', {
                description: `O item ${product.name} não possui unidades disponíveis.`
            })
            return
        }

        // Verificar se produto tem variantes com estoque
        const hasVariants = product.variants && product.variants.length > 0
        const hasMultipleColors = hasVariants && product.variants.length > 1
        const hasMultipleSizes = hasVariants && product.variants.some(v => (v.sizeStock || []).length > 1)

        // Se tem apenas uma cor e um tamanho, adicionar direto
        if (hasVariants && !hasMultipleColors && !hasMultipleSizes) {
            const color = product.variants[0].colorName
            const size = product.variants[0].sizeStock?.[0]?.size
            if (color && size) {
                addItemToVenda(product, color, size)
                return
            }
        }

        // Se tem variantes, abrir modal de seleção
        if (hasVariants) {
            const firstColorWithStock = product.variants.find(v =>
                (v.sizeStock || []).some(s => s.quantity > 0)
            )
            setVariantModal({
                open: true,
                product: product,
                selectedColor: firstColorWithStock?.colorName || product.variants[0].colorName,
                selectedSize: null
            })
            setItemSearch('') // Limpar busca ao abrir modal
            return
        }

        // Produto sem variantes - adicionar direto
        addItemToVenda(product, null, null)
    }

    // Handler para selecionar cor no modal
    const handleColorSelect = (colorName) => {
        setVariantModal(prev => ({
            ...prev,
            selectedColor: colorName,
            selectedSize: null // Resetar tamanho ao trocar cor
        }))
    }

    // Handler para selecionar tamanho no modal
    const handleSizeSelect = (size) => {
        setVariantModal(prev => ({
            ...prev,
            selectedSize: size
        }))
    }

    // Handler para confirmar adição do item
    const handleConfirmVariant = () => {
        const { product, selectedColor, selectedSize } = variantModal
        if (!product || !selectedColor || !selectedSize) {
            toast.error('Selecione cor e tamanho')
            return
        }
        addItemToVenda(product, selectedColor, selectedSize)
        setVariantModal({ open: false, product: null, selectedColor: null, selectedSize: null })
    }

    // Fechar modal
    const closeVariantModal = () => {
        setVariantModal({ open: false, product: null, selectedColor: null, selectedSize: null })
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
            selectedSize: size,
            image: product.images?.[0] || product.image || null
        }
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem],
            totalValue: prev.totalValue + product.price
        }))

        // Limpar o campo de busca IMEDIATAMENTE
        setItemSearch('')

        const colorText = color ? ` (${color})` : ''
        const sizeText = size ? ` - ${size}` : ''
        toast.success(`${product.name}${colorText}${sizeText} adicionado à venda.`, {
            description: `Valor: R$ ${(product.price || 0).toLocaleString('pt-BR')}`,
            icon: '🛒'
        })
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

        // ========== VALIDAÇÃO: CREDIÁRIO PARCELADO ==========
        if (formData.paymentMethod === 'credito_parcelado' || formData.paymentMethod === 'fiado_parcelado') {
            const valorTotal = formData.totalValue - formData.discountAmount

            // 1️⃣ Validar número de parcelas
            if (parcelas < 2) {
                toast.error('Parcelas inválidas', {
                    description: 'Mínimo 2 parcelas para crediário.'
                })
                return
            }

            // 2️⃣ Validar entrada (deve ser >= 0 e <= valor total)
            if (entryPayment < 0) {
                toast.error('Entrada inválida', {
                    description: 'A entrada não pode ser negativa.'
                })
                return
            }

            if (entryPayment > valorTotal) {
                toast.error('Entrada maior que o total', {
                    description: `Entrada máxima: R$ ${valorTotal.toFixed(2)}`
                })
                return
            }

            // 3️⃣ Validar data da primeira parcela (obrigatória)
            if (!installmentStartDate) {
                toast.error('Data da primeira parcela obrigatória', {
                    description: 'Informe quando começa a primeira parcela.'
                })
                return
            }

            // 4️⃣ Avisar se entrada é 0 (opcional, mas bom avisar)
            if (entryPayment === 0) {
                console.info('💡 Nenhuma entrada no crediário - 100% parcelado')
            }
        }

        // Se o status for pendente, forçar pagamento como crediário (preservando se é parcelado)
        let finalPaymentMethod = formData.paymentMethod
        if (formData.paymentStatus === 'pending' && !formData.paymentMethod.includes('fiado')) {
            // Se não for já fiado/fiado_parcelado, forçar para fiado
            finalPaymentMethod = 'fiado'
        }

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
            isInstallment: formData.paymentMethod === 'credito_parcelado' || formData.paymentMethod === 'fiado_parcelado',
            numInstallments: (formData.paymentMethod === 'credito_parcelado' || formData.paymentMethod === 'fiado_parcelado') ? parcelas : 1,
            entryPayment: (formData.paymentMethod === 'credito_parcelado' || formData.paymentMethod === 'fiado_parcelado') ? entryPayment : 0,
            installmentStartDate: (formData.paymentMethod === 'credito_parcelado' || formData.paymentMethod === 'fiado_parcelado') ? installmentStartDate : null
        }

        const action = isEdit ? editVenda(parseInt(id), payload) : addVenda(payload)
        const loadingMsg = isEdit ? 'Processando alterações e ajustando estoque...' : 'Registrando venda e baixando estoque...'
        const successTemplate = isEdit ? 'Venda e estoque atualizados com sucesso!' : `Venda registrada e estoque baixado para ${formData.customerName}!`

        toast.promise(action, {
            loading: loadingMsg,
            success: async (result) => {
                if (result.success) {
                    // Se é crediário/parcelado, criar parcelas automaticamente
                    if ((formData.paymentMethod === 'credito_parcelado' || formData.paymentMethod === 'fiado_parcelado') && !isEdit) {
                        const installmentsResult = await createInstallments(
                            result.venda.id,
                            parcelas,
                            entryPayment,
                            installmentStartDate
                        )
                        if (!installmentsResult.success) {
                            toast.error('Erro ao criar parcelas', {
                                description: installmentsResult.error
                            })
                        } else {
                            toast.success(`✅ ${installmentsResult.count}x criadas!`)
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
                            <div className="relative z-40">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Adicionar produto pelo nome..."
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg transition-all"
                                    value={itemSearch}
                                    onChange={(e) => setItemSearch(e.target.value)}
                                    autoComplete="off"
                                />
                                <AnimatePresence mode="wait">
                                    {itemSearch.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl z-50 overflow-hidden max-h-96 overflow-y-auto"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {filteredProducts.length > 0 ? filteredProducts.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => { addItem(p); setItemSearch(''); }}
                                                    className="w-full p-4 text-left active:bg-[#FDF0ED] flex items-center gap-3 border-b border-gray-50 last:border-b-0 group touch-manipulation"
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-gray-100 overflow-hidden">
                                                        {p.images?.[0] ? (
                                                            <img
                                                                src={p.images[0]}
                                                                alt={p.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Package className="w-6 h-6 text-gray-300" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-[#4A3B32] text-sm truncate">{p.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-bold text-[#C75D3B]">R$ {(p.price || 0).toLocaleString('pt-BR')}</span>
                                                            <span className={cn(
                                                                "text-[9px] font-bold px-1.5 py-0.5 rounded",
                                                                p.stock > 5 ? "bg-emerald-100 text-emerald-700" : p.stock > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                                            )}>
                                                                {p.stock > 0 ? `${p.stock}x` : 'Esgotado'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Add Button */}
                                                    <Plus className="w-5 h-5 text-[#C75D3B] opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                                </button>
                                            )) : (
                                                <div className="p-6 text-center text-gray-400 text-sm">Produto não localizado.</div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="space-y-3">
                                <AnimatePresence initial={false}>
                                    {(formData.items && Array.isArray(formData.items) ? formData.items : []).map((item, idx) => (
                                        <motion.div
                                            key={`${item.productId}-${idx}`}
                                            initial={{ opacity: 0, height: 0, margin: 0 }}
                                            animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                                            exit={{ opacity: 0, height: 0, padding: 0 }}
                                            className="p-4 flex items-center justify-between gap-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#C75D3B]/20 transition-all group"
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                                        <Package className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1">
                                                <p className="font-bold text-[#4A3B32] text-sm">{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-xs font-bold text-[#C75D3B] bg-[#FDF0ED] px-2 py-0.5 rounded text-[10px]">QTD: {item.quantity}</span>
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

                                            {/* Price & Action */}
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="font-bold text-[#4A3B32] text-sm">R$ ${(item.price || 0).toLocaleString('pt-BR')}</p>
                                                    <p className="text-xs text-[#4A3B32]/50">x{item.quantity}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
                    <Card className="bg-white lg:sticky lg:top-8 shadow-2xl overflow-visible">
                        <CardHeader>
                            <CardTitle>Pagamento e Finalização</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 overflow-visible">
                            <div className="space-y-5 overflow-visible">
                                {/* Meio de Pagamento Principal */}
                                <div>
                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-3 block">Método de Pagamento</label>
                                    <select
                                        value={formData.paymentMethod || ''}
                                        onChange={(e) => {
                                            const newMethod = e.target.value
                                            // Pré-selecionar bandeira para métodos de cartão
                                            let newBrand = ''
                                            if (newMethod === 'debit' || newMethod === 'card_machine' || newMethod === 'credito_parcelado') {
                                                newBrand = formData.cardBrand || 'visa' // Usar bandeira anterior ou Visa como padrão
                                            }
                                            setFormData(prev => ({ ...prev, paymentMethod: newMethod, cardBrand: newBrand }))
                                            if (newMethod === 'credito_parcelado' || newMethod === 'fiado_parcelado') {
                                                setParcelas(2)
                                                setIsInstallment(true)
                                            } else {
                                                setParcelas(1)
                                                setIsInstallment(false)
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-[#4A3B32] transition-all"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="pix">PIX</option>
                                        <option value="debit">Débito</option>
                                        <option value="card_machine">Crédito à Vista</option>
                                        <option value="credito_parcelado">Crédito Parcelado (Máquina)</option>
                                        <option value="fiado_parcelado">Crediário Parcelado</option>
                                        <option value="fiado">Crediário (À Vista)</option>
                                        <option value="cash">Dinheiro Espécie</option>
                                    </select>
                                </div>

                                {/* Bandeira - Para Débito e Crédito à Vista */}
                                {(formData.paymentMethod === 'debit' || formData.paymentMethod === 'card_machine') && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-3 block">Bandeira *</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {['visa', 'mastercard', 'elo'].map((brand) => (
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

                                        {/* Parcelamento apenas para Crédito à Vista */}
                                        {formData.paymentMethod === 'card_machine' && (
                                            <div>
                                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-2 block">Parcelado em Quantas Vezes?</label>
                                                <select
                                                    value={parcelas}
                                                    onChange={(e) => setParcelas(Number(e.target.value))}
                                                    className="w-full px-3 py-2.5 bg-white border border-[#C75D3B]/20 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-sm text-[#4A3B32] transition-all"
                                                >
                                                    <option value={1}>À Vista</option>
                                                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                                        <option key={n} value={n}>{n}x</option>
                                                    ))}
                                                </select>
                                                {parcelas > 1 && (
                                                    <p className="mt-1 text-[10px] text-[#4A3B32]/50">
                                                        Valor de cada parcela: <span className="font-bold text-[#C75D3B]">R$ {((formData.totalValue - formData.discountAmount) / parcelas).toFixed(2)}</span>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Bandeira - Para Crédito Parcelado */}
                                {formData.paymentMethod === 'credito_parcelado' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-3 block">Bandeira *</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {['visa', 'mastercard', 'elo'].map((brand) => (
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
                                    </motion.div>
                                )}

                                {/* CREDIÁRIO PARCELADO - LAYOUT REFORMULADO */}
                                {(formData.paymentMethod === 'credito_parcelado' || formData.paymentMethod === 'fiado_parcelado') && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-6 p-6 bg-gradient-to-br from-[#FDF0ED] to-[#FEF5F2] rounded-3xl border-2 border-[#C75D3B]/20 shadow-sm"
                                    >
                                        {/* Título */}
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-bold text-[#4A3B32]">⚙️ Configuração de Parcelamento</h3>
                                            <p className="text-xs text-[#4A3B32]/50">Defina como as parcelas serão distribuídas</p>
                                        </div>

                                        {/* ===== SEÇÃO 1: INPUTS PRINCIPAIS ===== */}
                                        <div className="space-y-6">
                                            {/* Linha 1: Parcelas */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-bold text-[#4A3B32]">Número de Parcelas</label>
                                                    <span className="text-2xl font-bold text-[#C75D3B]">{parcelas}x</span>
                                                </div>
                                                <select
                                                    value={parcelas}
                                                    onChange={(e) => setParcelas(Number(e.target.value))}
                                                    className="w-full px-4 py-3 bg-white border-2 border-[#C75D3B]/20 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/30 outline-none font-medium text-[#4A3B32] transition-all hover:border-[#C75D3B]/40"
                                                >
                                                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                                        <option key={n} value={n}>
                                                            {n}x {n <= 3 ? '(Taxa: cobrida)' : `(Taxa: ${feeInfo.feePercentage}%)`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="bg-white/50 p-3 rounded-lg border border-[#C75D3B]/10">
                                                    <p className="text-sm text-[#4A3B32]/70">
                                                        Cada parcela: <span className="font-bold text-[#C75D3B] text-base">R$ {((formData.totalValue - formData.discountAmount - entryPayment) / parcelas).toFixed(2)}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Linha 2: Entrada */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-[#4A3B32]">Valor de Entrada (Opcional)</label>
                                                <input
                                                    type="number"
                                                    value={entryPayment}
                                                    onChange={(e) => setEntryPayment(parseFloat(e.target.value) || 0)}
                                                    placeholder="R$ 0,00"
                                                    className="w-full px-4 py-3 bg-white border-2 border-[#C75D3B]/20 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/30 outline-none font-medium text-[#4A3B32] transition-all hover:border-[#C75D3B]/40"
                                                    step="0.01"
                                                    min="0"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/50">
                                                        <p className="text-xs text-emerald-600/70">Entrada</p>
                                                        <p className="font-bold text-emerald-700 text-lg">R$ {entryPayment.toFixed(2)}</p>
                                                    </div>
                                                    <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200/50">
                                                        <p className="text-xs text-amber-600/70">A Parcelar</p>
                                                        <p className="font-bold text-amber-700 text-lg">R$ {(formData.totalValue - formData.discountAmount - entryPayment).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Linha 3: Data da 1ª Parcela */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-[#4A3B32]">Data da 1ª Parcela <span className="text-red-500">*</span></label>
                                                <DatePicker
                                                    date={installmentStartDate}
                                                    onDateChange={setInstallmentStartDate}
                                                    placeholder="Escolha a data da 1ª parcela"
                                                    className="w-full px-4 py-3 bg-white border-2 border-[#C75D3B]/20 rounded-xl hover:border-[#C75D3B]/40 focus:ring-2 focus:ring-[#C75D3B]/30 h-auto"
                                                />
                                                <p className="text-sm text-[#4A3B32]/70 flex items-center gap-2">
                                                    📅 {installmentStartDate ? `Primeira parcela vence em ${new Date(installmentStartDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}` : 'Escolha uma data (obrigatório)'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* ===== SEÇÃO 2: TAXA (se 4x+) ===== */}
                                        {parcelas >= 4 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="bg-yellow-50/80 p-4 rounded-2xl border-2 border-yellow-200/60 space-y-3"
                                            >
                                                <p className="font-bold text-yellow-800 flex items-center gap-2">⚠️ Taxa de Processamento</p>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    <div className="bg-white/70 p-3 rounded-lg">
                                                        <p className="text-xs text-yellow-700/70">Taxa</p>
                                                        <p className="text-2xl font-bold text-yellow-700">{isNaN(feeInfo.feePercentage) ? '0' : feeInfo.feePercentage}%</p>
                                                    </div>
                                                    <div className="bg-white/70 p-3 rounded-lg">
                                                        <p className="text-xs text-red-600/70">Descontado</p>
                                                        <p className="text-lg font-bold text-red-600">R$ {isNaN(feeInfo.feeValue) ? '0.00' : feeInfo.feeValue.toFixed(2)}</p>
                                                    </div>
                                                    <div className="bg-white/70 p-3 rounded-lg col-span-2 md:col-span-1">
                                                        <p className="text-xs text-green-600/70">Você recebe</p>
                                                        <p className="text-lg font-bold text-green-600">R$ {isNaN(feeInfo.netValue) ? '0.00' : feeInfo.netValue.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* ===== SEÇÃO 3: RESUMO FINAL ===== */}
                                        <div className="bg-white/80 p-4 rounded-2xl border-2 border-[#C75D3B]/30 space-y-3">
                                            <p className="font-bold text-[#4A3B32] text-sm uppercase tracking-wide">📊 Resumo da Operação</p>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between py-2 border-b border-[#C75D3B]/10">
                                                    <span className="text-[#4A3B32]/70">Valor Total:</span>
                                                    <span className="font-bold text-[#4A3B32]">R$ {(formData.totalValue - formData.discountAmount).toFixed(2)}</span>
                                                </div>
                                                {entryPayment > 0 && (
                                                    <div className="flex justify-between py-2 border-b border-green-200">
                                                        <span className="text-green-700">Entrada (no ato):</span>
                                                        <span className="font-bold text-green-700">R$ {entryPayment.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between py-3 bg-[#C75D3B]/5 px-3 rounded-lg font-bold text-[#C75D3B]">
                                                    <span>{parcelas}x de:</span>
                                                    <span className="text-lg">R$ {((formData.totalValue - formData.discountAmount - entryPayment) / parcelas).toFixed(2)}</span>
                                                </div>
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

                                    {/* Taxa da maquininha - Sempre mostrar para Crédito Parcelado */}
                                    {formData.paymentMethod === 'credito_parcelado' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex justify-between items-center text-red-500 text-sm pt-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-3.5 h-3.5" />
                                                <span className="font-medium">Taxa Máquina ({feeInfo.feePercentage}%)</span>
                                            </div>
                                            <span className="font-bold">- R$ ${(feeInfo.feeValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </motion.div>
                                    )}

                                    {/* Taxa da maquininha - Outros métodos */}
                                    {feeInfo.feeValue > 0 && formData.paymentStatus !== 'pending' && formData.paymentMethod !== 'credito_parcelado' && (
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

            {/* Modal de Seleção de Variante (Cor/Tamanho) */}
            <AnimatePresence>
                {variantModal.open && variantModal.product && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={closeVariantModal}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100">
                                            {variantModal.product.images?.[0] || variantModal.product.variants?.[0]?.images?.[0] ? (
                                                <img
                                                    src={variantModal.product.images?.[0] || variantModal.product.variants?.[0]?.images?.[0]}
                                                    alt={variantModal.product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Package className="w-6 h-6 text-gray-300" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#4A3B32] text-lg">{variantModal.product.name}</h3>
                                            <p className="text-sm text-[#C75D3B] font-bold">R$ {(variantModal.product.price || 0).toLocaleString('pt-BR')}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeVariantModal}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Cores */}
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                                        Selecione a Cor
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {variantModal.product.variants?.map((variant, idx) => {
                                            const hasStock = (variant.sizeStock || []).some(s => s.quantity > 0)
                                            const isSelected = variantModal.selectedColor === variant.colorName
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => hasStock && handleColorSelect(variant.colorName)}
                                                    disabled={!hasStock}
                                                    className={cn(
                                                        "px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
                                                        isSelected
                                                            ? "bg-[#4A3B32] text-white shadow-lg"
                                                            : hasStock
                                                                ? "bg-gray-100 text-[#4A3B32] hover:bg-gray-200"
                                                                : "bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                                                    )}
                                                >
                                                    {variant.colorName || `Cor ${idx + 1}`}
                                                    {!hasStock && " (Esgotado)"}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Tamanhos da cor selecionada */}
                                {variantModal.selectedColor && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                                            Selecione o Tamanho
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(() => {
                                                const selectedVariant = variantModal.product.variants?.find(v => v.colorName === variantModal.selectedColor)
                                                const sizeStock = selectedVariant?.sizeStock || []

                                                return sizeStock.map((item, idx) => {
                                                    const hasStock = item.quantity > 0
                                                    const isSelected = variantModal.selectedSize === item.size
                                                    return (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => hasStock && handleSizeSelect(item.size)}
                                                            disabled={!hasStock}
                                                            className={cn(
                                                                "p-3 rounded-xl font-bold transition-all text-center",
                                                                isSelected
                                                                    ? "bg-[#C75D3B] text-white shadow-lg"
                                                                    : hasStock
                                                                        ? "bg-gray-100 text-[#4A3B32] hover:bg-gray-200"
                                                                        : "bg-gray-50 text-gray-300 cursor-not-allowed"
                                                            )}
                                                        >
                                                            <span className="block text-lg">{item.size}</span>
                                                            <span className={cn(
                                                                "text-[10px] block mt-0.5",
                                                                isSelected ? "text-white/70" : hasStock ? "text-gray-400" : "text-gray-300"
                                                            )}>
                                                                {hasStock ? `${item.quantity} un.` : "Esgotado"}
                                                            </span>
                                                        </button>
                                                    )
                                                })
                                            })()}
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={closeVariantModal}
                                        className="flex-1 py-3 px-4 border-2 border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmVariant}
                                        disabled={!variantModal.selectedColor || !variantModal.selectedSize}
                                        className={cn(
                                            "flex-1 py-3 px-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                                            variantModal.selectedColor && variantModal.selectedSize
                                                ? "bg-[#C75D3B] text-white hover:bg-[#A64D31]"
                                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        )}
                                    >
                                        <Plus className="w-5 h-5" />
                                        Adicionar
                                    </button>
                                </div>
                                {variantModal.selectedColor && variantModal.selectedSize && (
                                    <p className="text-xs text-center text-gray-400 mt-3">
                                        {variantModal.product.name} • {variantModal.selectedColor} • {variantModal.selectedSize}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}
