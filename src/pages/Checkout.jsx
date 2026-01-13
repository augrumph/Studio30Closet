import { useState, useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Plus, ArrowLeft, MessageCircle, ShoppingBag, Check, Truck, AlertTriangle } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatMalinhaMessage, generateWhatsAppLink, cn } from '@/lib/utils'
import { useAdminStore } from '@/store/admin-store'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/contexts/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'
import { triggerFireworks } from '@/components/magicui/confetti'
import { getBlurPlaceholder, getOptimizedImageUrl } from '@/lib/image-optimizer'
import { sendNewMalinhaEmail } from '@/lib/email-service'
import { useStock } from '@/hooks/useStock'

// Helper para gerar número do pedido
function generateOrderNumber(orderId) {
    const now = new Date()
    const dateStr = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const idBase36 = parseInt(orderId).toString(36).toUpperCase()
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let randomSuffix = ''
    for (let i = 0; i < 5; i++) randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length))
    return `MAL-${dateStr}-${idBase36}-${randomSuffix}`
}

export function Checkout() {
    const { items, removeItem, clearItems, customerData, setCustomerData, setAddressData } = useMalinhaStore()
    const { addOrder } = useAdminStore()
    const toast = useToast()

    const [step, setStep] = useState(items.length > 0 ? 1 : 0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successOrder, setSuccessOrder] = useState(null)
    const [formErrors, setFormErrors] = useState({})

    // ⚡ REACT QUERY: Validação de Estoque e Busca de Dados em Tempo Real
    // Substitui o useEffect manual de fetchProductData
    const { data: productsData = [], isLoading: loadingProducts } = useStock(items)

    // Mapa de produtos para acesso rápido
    const productsMap = useMemo(() => {
        return productsData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})
    }, [productsData])

    // Detectar itens sem estoque
    const outOfStockItems = useMemo(() => {
        return items.filter(item => {
            const product = productsMap[item.productId]
            return product && product.stock <= 0
        })
    }, [items, productsMap])

    // Consolidar itens da malinha com dados do produto
    const groupedItems = useMemo(() => {
        const itemSummary = items.reduce((acc, item) => {
            const product = productsMap[item.productId] || {}
            // Agrupar por Nome + Tamanho
            const key = `${product.name || 'Produto'}-${item.selectedSize}`

            if (acc[key]) {
                acc[key].count += 1
                acc[key].itemIds.push(item.itemId)
            } else {
                acc[key] = {
                    id: item.productId,
                    itemId: item.itemId,
                    name: product.name || 'Produto indisponível',
                    price: product.price || 0,
                    image: product.images?.[0] || 'https://via.placeholder.com/300x400?text=Produto',
                    selectedSize: item.selectedSize,
                    selectedColor: item.selectedColor,
                    count: 1,
                    itemIds: [item.itemId],
                    stock: product.stock !== undefined ? product.stock : 999
                }
            }
            return acc
        }, {})
        return Object.values(itemSummary)
    }, [items, productsMap])

    // Scroll top effect
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [step])

    // Form handlers
    const handleInputChange = (e) => setCustomerData({ [e.target.name]: e.target.value })

    const handleAddressChange = (e) => setAddressData({ [e.target.name]: e.target.value })

    const handleCepChange = async (e) => {
        let value = e.target.value.replace(/\D/g, '').slice(0, 8)
        if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5)
        setAddressData({ zipCode: value })

        if (value.replace(/\D/g, '').length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${value.replace(/\D/g, '')}/json/`)
                const data = await res.json()
                if (!data.erro) {
                    setAddressData({
                        street: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf,
                        complement: data.complemento,
                        zipCode: value
                    })
                    toast.success('Endereço encontrado!')
                }
            } catch (err) {
                console.error(err)
            }
        }
    }

    const validateForm = () => {
        const errors = {}
        const addr = customerData.addresses?.[0] || {}
        if (!customerData.name?.trim()) errors.name = 'Obrigatório'
        if (!customerData.phone?.trim() || customerData.phone.length < 10) errors.phone = 'Inválido'
        if (!addr.street?.trim()) errors.street = 'Obrigatório'
        if (!addr.number?.trim()) errors.number = 'Obrigatório'
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateForm()) return toast.error('Preencha os campos obrigatórios')

        // Bloquear se houver itens sem estoque
        if (outOfStockItems.length > 0) {
            return toast.error('Remova os itens esgotados para continuar.')
        }

        setIsSubmitting(true)
        try {
            const orderPayload = {
                customer: customerData,
                items: groupedItems.map(item => ({
                    productId: item.id,
                    quantity: item.count,
                    selectedSize: item.selectedSize,
                    selectedColor: item.selectedColor,
                    price: item.price
                })),
                notes: customerData.notes
            }

            const result = await addOrder(orderPayload)
            if (!result.success) throw new Error(result.error)

            triggerFireworks()

            // Email silencioso
            sendNewMalinhaEmail({
                customerName: customerData.name,
                itemsCount: groupedItems.length,
                orderId: result.order?.id
            }).catch(console.error)

            const msg = formatMalinhaMessage(groupedItems, customerData)
            const whatsappLink = generateWhatsAppLink('+5511999999999', msg)

            setSuccessOrder({
                orderNumber: generateOrderNumber(result.order?.id),
                customerName: customerData.name,
                itemsCount: groupedItems.length,
                whatsappLink
            })
            setStep(3)
        } catch (err) {
            console.error(err)
            toast.error('Erro ao processar pedido.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // EMPTY STATE
    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <ShoppingBag className="w-8 h-8 text-[#C75D3B]" />
                    </div>
                    <h2 className="text-2xl font-display text-[#4A3B32] mb-3">Sua malinha está vazia</h2>
                    <p className="text-gray-500 mb-8">Adicione peças incríveis para experimentar.</p>
                    <Link to="/catalogo" className="btn-primary inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Ir para o Catálogo
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] pt-6 pb-20">
            <div className="container-custom max-w-4xl">
                {/* HEADLINE */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-display text-[#4A3B32]">Sua Malinha</h1>
                        <p className="text-sm text-gray-500">{items.length}/20 peças selecionadas</p>
                    </div>
                    <Link to="/catalogo" className="text-sm font-bold text-[#C75D3B] hover:underline">
                        + Adicionar
                    </Link>
                </div>

                {/* ALERTA DE ESTOQUE */}
                {outOfStockItems.length > 0 && step < 3 && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-red-800 text-sm">Atenção: Itens Esgotados</h3>
                            <p className="text-xs text-red-700 mt-1">
                                Algumas peças da sua malinha acabaram de esgotar. Remova-as para finalizar.
                            </p>
                        </div>
                    </div>
                )}

                {/* PROGRESS STEPS */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-4">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`w-3 h-3 rounded-full transition-all ${step >= s ? 'bg-[#C75D3B] scale-125' : 'bg-gray-300'}`} />
                        ))}
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* COLUNA PRINCIPAL */}
                    <div className="lg:col-span-2">
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {/* LISTA DE ITENS */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 p-4 sm:p-6 space-y-4">
                                        {loadingProducts ? (
                                            <div className="py-12 text-center text-gray-400">Carregando detalhes...</div>
                                        ) : (
                                            groupedItems.map((item) => (
                                                <div key={item.itemIds[0]} className={`flex gap-4 p-3 rounded-xl border ${item.stock <= 0 ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-white'}`}>
                                                    <div className="w-20 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                                        <img src={getOptimizedImageUrl(item.image, 200)} alt={item.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                        <div>
                                                            <div className="flex justify-between items-start">
                                                                <h3 className="font-bold text-[#4A3B32] text-sm truncate pr-2">{item.name}</h3>
                                                                <button onClick={() => removeItem(item.itemIds[0])} className="text-gray-400 hover:text-red-500 p-1">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            <div className="flex gap-2 mt-1">
                                                                <Badge variant="outline" className="text-xs">{item.selectedSize}</Badge>
                                                                {item.stock <= 0 && <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">Esgotado</Badge>}
                                                            </div>
                                                        </div>
                                                        {item.count > 1 && <div className="text-xs text-gray-500">{item.count} unidades</div>}
                                                    </div>
                                                </div>
                                            ))
                                        )}

                                        <button
                                            onClick={() => setStep(2)}
                                            disabled={outOfStockItems.length > 0}
                                            className="w-full mt-4 btn-primary py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Continuar para Dados
                                        </button>
                                    </div>
                                </motion.div>
                            ) : step === 2 ? (
                                <motion.div key="step2" initial={{ x: 20 }} animate={{ x: 0 }}>
                                    {/* FORMULÁRIO */}
                                    <form id="checkout-form" onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 p-6 space-y-4">
                                        <h2 className="font-display text-lg font-bold text-[#4A3B32]">Seus Dados</h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Nome</label>
                                                <input
                                                    name="name"
                                                    value={customerData.name}
                                                    onChange={handleInputChange}
                                                    className={`w-full input-field ${formErrors.name ? 'border-red-300' : ''}`}
                                                    placeholder="Seu nome completo"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                                                <input
                                                    name="phone"
                                                    value={customerData.phone}
                                                    onChange={handleInputChange}
                                                    className={`w-full input-field ${formErrors.phone ? 'border-red-300' : ''}`}
                                                    placeholder="(11) 99999-9999"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <h2 className="font-display text-lg font-bold text-[#4A3B32] mb-4">Endereço de Entrega</h2>
                                            <div className="grid grid-cols-3 gap-4 mb-4">
                                                <div className="col-span-1 space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">CEP</label>
                                                    <input
                                                        name="zipCode"
                                                        value={customerData.addresses[0]?.zipCode || ''}
                                                        onChange={handleCepChange}
                                                        className="w-full input-field"
                                                        placeholder="00000-000"
                                                    />
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Rua</label>
                                                    <input
                                                        name="street"
                                                        value={customerData.addresses[0]?.street || ''}
                                                        onChange={handleAddressChange}
                                                        className="w-full input-field"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Número</label>
                                                    <input
                                                        name="number"
                                                        value={customerData.addresses[0]?.number || ''}
                                                        onChange={handleAddressChange}
                                                        className="w-full input-field"
                                                    />
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                                                    <input
                                                        name="neighborhood"
                                                        value={customerData.addresses[0]?.neighborhood || ''}
                                                        onChange={handleAddressChange}
                                                        className="w-full input-field"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-6">
                                            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 text-[#C75D3B] font-bold border border-[#C75D3B] rounded-lg">
                                                Voltar
                                            </button>
                                            <button type="submit" disabled={isSubmitting} className="flex-[2] btn-primary py-3 flex items-center justify-center gap-2">
                                                {isSubmitting ? <span className="animate-spin">⏳</span> : 'Finalizar Pedido'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div key="step3" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                                    {/* SUCESSO */}
                                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-[#4A3B32]/5">
                                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Check className="w-10 h-10" />
                                        </div>
                                        <h2 className="text-3xl font-display font-bold text-[#4A3B32] mb-2">Pedido Confirmado!</h2>
                                        <p className="text-gray-500 mb-6">Seu pedido <span className="font-mono font-bold text-[#C75D3B]">{successOrder?.orderNumber}</span> foi registrado.</p>

                                        <button
                                            onClick={() => window.open(successOrder?.whatsappLink, '_blank')}
                                            className="w-full btn-primary py-4 mb-3 flex items-center justify-center gap-2"
                                        >
                                            <MessageCircle className="w-5 h-5" /> Enviar no WhatsApp
                                        </button>
                                        <button onClick={() => { clearItems(); setStep(0); }} className="text-sm font-bold text-[#C75D3B] hover:underline">
                                            Voltar à Loja
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RESUMO LATERAL (DESKTOP) */}
                    {step < 3 && (
                        <div className="hidden lg:block space-y-6">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#4A3B32]/5 sticky top-24">
                                <h3 className="font-bold text-[#4A3B32] mb-4">Resumo</h3>
                                <div className="space-y-2 text-sm text-gray-600 mb-4">
                                    <div className="flex justify-between">
                                        <span>Total de Peças</span>
                                        <span className="font-bold">{items.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Frete</span>
                                        <span className="text-emerald-600 font-bold">Grátis (Malinha)</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800 leading-relaxed">
                                    Você não paga nada agora! Experimente em casa e pague apenas o que amar. 💖
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Checkout
