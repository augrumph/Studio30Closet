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

export function VendasForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)
    const { products, customers, coupons, loadCoupons, addVenda, editVenda, getVendaById, reloadAll } = useAdminStore()
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
    const [feeInfo, setFeeInfo] = useState({ feePercentage: 0, feeValue: 0, netValue: 0 })

    const [couponInput, setCouponInput] = useState('')
    const [couponLoading, setCouponLoading] = useState(false)

    const [itemSearch, setItemSearch] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')

    useEffect(() => {
        reloadAll()
        loadCoupons()
        if (isEdit) {
            const venda = getVendaById(parseInt(id))
            if (venda) {
                setFormData({
                    customerId: venda.customerId,
                    customerName: venda.customerName,
                    paymentMethod: venda.paymentMethod,
                    paymentStatus: venda.paymentStatus,
                    items: venda.items,
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
    }, [id, isEdit, getVendaById, reloadAll, navigate])

    // Calcular taxa automaticamente quando mudar método de pagamento, bandeira ou valor
    useEffect(() => {
        const calculatePaymentFee = async () => {
            if (formData.paymentMethod && formData.totalValue > 0 && formData.paymentStatus !== 'pending') {
                const valorFinal = formData.totalValue - formData.discountAmount

                // Buscar taxa da tabela payment_fees
                const feeData = await getPaymentFee(formData.paymentMethod, formData.cardBrand || null)

                if (feeData) {
                    const feePercentage = feeData.feePercentage || 0
                    const feeFixed = feeData.feeFixed || 0
                    const feeValue = (valorFinal * feePercentage / 100) + feeFixed
                    const netValue = valorFinal - feeValue

                    setFeeInfo({
                        feePercentage,
                        feeFixed,
                        feeValue,
                        netValue
                    })
                } else {
                    // Sem taxa configurada
                    setFeeInfo({ feePercentage: 0, feeFixed: 0, feeValue: 0, netValue: valorFinal })
                }
            } else {
                setFeeInfo({ feePercentage: 0, feeFixed: 0, feeValue: 0, netValue: formData.totalValue - formData.discountAmount })
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

        // Verificar se já atingiu o limite de estoque se o item já estiver na venda
        const existingItem = formData.items.find(item => item.productId === product.id)
        if (existingItem && existingItem.quantity >= product.stock) {
            toast.error('Limite de estoque atingido', {
                description: `Você já adicionou todas as ${product.stock} unidades disponíveis de ${product.name}.`
            })
            return
        }

        const newItem = {
            productId: product.id,
            name: product.name,
            price: product.price,
            costPrice: product.costPrice || 0,
            quantity: 1
        }
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem],
            totalValue: prev.totalValue + product.price
        }))
        toast.success(`${product.name} adicionado à venda.`, {
            description: `Valor: R$ ${product.price.toLocaleString('pt-BR')}`
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
                toast.error(`Valor mínimo para este cupom: R$ ${coupon.minPurchase.toLocaleString('pt-BR')}`)
                setCouponLoading(false)
                return
            }

            let discount = 0
            if (coupon.type === 'percent') {
                discount = (formData.totalValue * coupon.value) / 100
            } else {
                discount = coupon.value
            }

            setFormData(prev => ({
                ...prev,
                couponId: coupon.id,
                couponCode: coupon.code,
                discountAmount: discount
            }))

            toast.success(`Cupom ${code} aplicado!`, {
                description: `Desconto de R$ ${discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
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
            netAmount: feeInfo.netValue || (formData.totalValue - formData.discountAmount)
        }

        const action = isEdit ? editVenda(parseInt(id), payload) : addVenda(payload)
        const loadingMsg = isEdit ? 'Processando alterações e ajustando estoque...' : 'Registrando venda e baixando estoque...'
        const successTemplate = isEdit ? 'Venda e estoque atualizados com sucesso!' : `Venda registrada e estoque baixado para ${formData.customerName}!`

        toast.promise(action, {
            loading: loadingMsg,
            success: (result) => {
                if (result.success) {
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
                                                    <span className="font-bold text-[#C75D3B] block font-display">R$ {p.price.toLocaleString('pt-BR')}</span>
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
                                    {formData.items.map((item, idx) => (
                                        <motion.div
                                            key={`${item.productId}-${idx}`}
                                            initial={{ opacity: 0, height: 0, margin: 0 }}
                                            animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                                            exit={{ opacity: 0, height: 0, padding: 0 }}
                                            className="p-5 flex items-center justify-between gap-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#C75D3B]/20 transition-all group"
                                        >
                                            <div className="flex-1">
                                                <p className="font-bold text-[#4A3B32]">{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-bold text-[#C75D3B] bg-[#FDF0ED] px-2 py-0.5 rounded text-[10px]">UNIDADE</span>
                                                    <span className="text-xs text-[#4A3B32]/40">Cód: {item.productId}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="font-bold text-[#4A3B32]">R$ {item.price.toLocaleString('pt-BR')}</p>
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
                    <Card className="bg-white sticky top-8 shadow-2xl">
                        <CardHeader>
                            <CardTitle>Pagamento e Finalização</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-5">
                                <div>
                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-2.5 block">Meio de Pagamento</label>
                                    <select
                                        value={formData.paymentStatus === 'pending' ? 'fiado' : formData.paymentMethod}
                                        disabled={formData.paymentStatus === 'pending'}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, paymentMethod: e.target.value, cardBrand: '' }))
                                            if (e.target.value === 'credito_parcelado') {
                                                setParcelas(2)
                                            } else {
                                                setParcelas(1)
                                            }
                                        }}
                                        className={cn(
                                            "w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-bold text-[#4A3B32] transition-all",
                                            formData.paymentStatus === 'pending' && "opacity-80 cursor-not-allowed bg-amber-50/50"
                                        )}
                                    >
                                        <option value="pix">📱 PIX</option>
                                        <option value="card_machine">💳 Cartão na Máquina</option>
                                        <option value="payment_link">🔗 Link de Pagamento</option>
                                        <option value="fiado">🤝 Crediário (Conta Corrente)</option>
                                        <option value="cash">💵 Dinheiro Espécie</option>
                                    </select>
                                    {formData.paymentStatus === 'pending' && (
                                        <p className="mt-2 text-[10px] text-amber-600 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5 pl-1">
                                            <Info className="w-3 h-3" /> Automático: Aguardando = Crediário
                                        </p>
                                    )}
                                </div>

                                {/* Bandeira do Cartão - aparece se for card_machine ou payment_link */}
                                {(formData.paymentMethod === 'card_machine' || formData.paymentMethod === 'payment_link') && formData.paymentStatus !== 'pending' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-2.5 block">Bandeira do Cartão *</label>
                                        <select
                                            value={formData.cardBrand}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cardBrand: e.target.value }))}
                                            required
                                            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-bold text-[#4A3B32] transition-all"
                                        >
                                            <option value="">Selecione a bandeira...</option>
                                            <option value="visa">💳 Visa</option>
                                            <option value="mastercard">💳 Mastercard</option>
                                            <option value="amex">💳 American Express</option>
                                            <option value="elo">💳 Elo</option>
                                        </select>
                                    </motion.div>
                                )}

                                {/* Parcelas selector quando for crédito parcelado */}
                                {formData.paymentMethod === 'credito_parcelado' && formData.paymentStatus !== 'pending' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-2.5 block">Número de Parcelas</label>
                                        <select
                                            value={parcelas}
                                            onChange={(e) => setParcelas(Number(e.target.value))}
                                            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-bold text-[#4A3B32] transition-all"
                                        >
                                            <option value={2}>2x</option>
                                            <option value={3}>3x</option>
                                            <option value={4}>4x</option>
                                            <option value={5}>5x</option>
                                            <option value={6}>6x</option>
                                            <option value={7}>7x</option>
                                            <option value={8}>8x</option>
                                            <option value={9}>9x</option>
                                            <option value={10}>10x</option>
                                            <option value={11}>11x</option>
                                            <option value={12}>12x</option>
                                        </select>
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
                                        <span className="font-bold">R$ {formData.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Desconto */}
                                    {formData.discountAmount > 0 && (
                                        <div className="flex justify-between items-center text-emerald-600 text-sm">
                                            <span className="font-medium">Desconto</span>
                                            <span className="font-bold">- R$ {formData.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}

                                    {/* Total cobrado do cliente */}
                                    <div className="flex justify-between items-center text-[#4A3B32] text-base pt-2 border-t border-gray-100">
                                        <span className="font-bold">Valor da Venda</span>
                                        <span className="font-bold text-lg">R$ {(formData.totalValue - formData.discountAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>

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
                                            <span className="font-bold">- R$ {feeInfo.feeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                                            R$ {(feeInfo.feeValue > 0 && formData.paymentStatus !== 'pending'
                                                ? feeInfo.netValue
                                                : formData.totalValue - formData.discountAmount
                                            ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
        </div>
    )
}
