import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Plus, ArrowLeft, MessageCircle, ShoppingBag, Check, Truck, AlertTriangle, User, Phone, Mail, Hash, Calendar, MapPin } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatMalinhaMessage, generateWhatsAppLink, cn } from '@/lib/utils'
import { useAdminStore } from '@/store/admin-store'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/contexts/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'
import { triggerFireworks } from '@/components/magicui/confetti'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { sendNewMalinhaEmail } from '@/lib/email-service'
import { useStock } from '@/hooks/useStock'
import { trackCheckoutStarted, trackCheckoutCompleted, markCartCheckoutStarted, markCartConverted, saveCustomerDataToCart } from '@/lib/api/analytics'
import { SEO } from '@/components/SEO'

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
    const { items, removeItem, clearItems, resetAll, customerData, setCustomerData, setAddressData, resetCustomerData } = useMalinhaStore()
    const { addOrder } = useAdminStore()
    const toast = useToast()

    const [step, setStep] = useState(items.length > 0 ? 1 : 0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successOrder, setSuccessOrder] = useState(null)
    const [formErrors, setFormErrors] = useState({})

    // 🧹 Limpar dados de cliente antigos do localStorage ao iniciar novo checkout
    // Isso resolve o bug de dados do cliente anterior (ex: "Larissa") persistindo
    const hasCleanedOldData = useRef(false)
    useEffect(() => {
        if (!hasCleanedOldData.current && items.length > 0 && !customerData.name) {
            // Se tem items mas não tem nome preenchido, garantir que dados antigos estejam limpos
            hasCleanedOldData.current = true
            resetCustomerData()
        }
    }, [])

    // ⚡ REACT QUERY: Validação de Estoque e Busca de Dados em Tempo Real
    // Substitui o useEffect manual de fetchProductData
    const { data: productsData = [], isLoading: loadingProducts } = useStock(items)

    // Mapa de produtos para acesso rápido
    const productsMap = useMemo(() => {
        return productsData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})
    }, [productsData])

    // Detectar itens sem estoque (verifica variante específica cor+tamanho)
    const outOfStockItems = useMemo(() => {
        return items.filter(item => {
            const product = productsMap[item.productId]
            if (!product) return false

            // Verificar estoque da variante específica (cor + tamanho)
            if (product.variants?.length > 0 && item.selectedColor && item.selectedSize) {
                const variant = product.variants.find(v =>
                    (v.colorName || '').toLowerCase().trim() === (item.selectedColor || '').toLowerCase().trim()
                )
                if (variant?.sizeStock) {
                    const sizeEntry = variant.sizeStock.find(s =>
                        (s.size || '').toLowerCase().trim() === (item.selectedSize || '').toLowerCase().trim()
                    )
                    return !sizeEntry || sizeEntry.quantity <= 0
                }
            }

            // Fallback: checar stock total do produto
            return product.stock <= 0
        })
    }, [items, productsMap])

    // Consolidar itens da malinha com dados do produto
    const groupedItems = useMemo(() => {
        const itemSummary = items.reduce((acc, item) => {
            const product = productsMap[item.productId] || {}

            // Agrupar por Nome + Tamanho + Cor (para não mesclar cores diferentes)
            const key = `${product.name || 'Produto'}-${item.selectedSize}-${item.selectedColor || 'default'}`

            if (acc[key]) {
                acc[key].count += 1
                acc[key].itemIds.push(item.itemId)
            } else {
                acc[key] = {
                    id: item.productId,
                    itemId: item.itemId,
                    name: product.name || 'Produto indisponível',
                    price: product.price || 0,
                    // Tentar encontrar a imagem da variante selecionada (Case Insensitive & Robust)
                    image: (() => {
                        // 1. Tentar usar a imagem salva no momento da adição (Mais preciso)
                        if (item.image) return item.image

                        // 2. Fallback: Tentar encontrar via lógica de cores (para itens antigos)
                        const targetColor = item.selectedColor?.toLowerCase().trim()
                        if (targetColor && product.variants && Array.isArray(product.variants)) {
                            // Tenta encontrar cor correspondente (suporta camelCase e snake_case)
                            const variant = product.variants.find(v => {
                                const vColor = (v.colorName || v.color_name || '').toLowerCase().trim()
                                return vColor === targetColor
                            })
                            // Se achou variante e tem imagem, usa ela
                            if (variant?.images?.length > 0) return variant.images[0]
                        }
                        // 3. Fallback final: Imagem principal do produto
                        return product.images?.[0] || 'https://via.placeholder.com/300x400?text=Produto'
                    })(),
                    selectedSize: item.selectedSize,
                    selectedColor: item.selectedColor,
                    count: 1,
                    itemIds: [item.itemId],
                    stock: product.stock !== undefined ? product.stock : 999,
                    costPrice: product.costPrice || product.cost_price || 0
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

    // 📊 Analytics: Rastrear início do checkout
    const hasTrackedCheckoutStart = useRef(false)
    useEffect(() => {
        if (items.length > 0 && !hasTrackedCheckoutStart.current) {
            hasTrackedCheckoutStart.current = true
            const totalValue = groupedItems.reduce((sum, item) => sum + (item.price * item.count), 0)
            trackCheckoutStarted(items.length, totalValue)
            markCartCheckoutStarted()
        }
    }, [items.length])

    // 📊 Analytics: Salvar dados do cliente para malinhas abandonadas
    const lastSavedCustomerData = useRef('')
    useEffect(() => {
        const dataKey = `${customerData.name || ''}-${customerData.phone || ''}-${customerData.email || ''}`
        // Só salva se tiver pelo menos algum dado e se mudou desde a última vez
        if (dataKey !== '---' && dataKey !== lastSavedCustomerData.current) {
            lastSavedCustomerData.current = dataKey
            saveCustomerDataToCart(customerData)
        }
    }, [customerData.name, customerData.phone, customerData.email])

    // Form handlers
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target
        setCustomerData({ [name]: value })
    }, [setCustomerData])

    const handleAddressChange = useCallback((e) => {
        const { name, value } = e.target
        setAddressData({ [name]: value })
    }, [setAddressData])

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

        // Dados Pessoais
        if (!customerData.name?.trim()) errors.name = 'Obrigatório'
        if (!customerData.phone?.trim() || customerData.phone.length < 10) errors.phone = 'Inválido'
        if (!customerData.email?.trim()) errors.email = 'Obrigatório'
        if (!customerData.cpf?.trim()) errors.cpf = 'Obrigatório'
        if (!customerData.birth_date?.trim()) errors.birth_date = 'Obrigatório'

        // Endereço
        if (!addr.zipCode?.trim()) errors.zipCode = 'Obrigatório'
        if (!addr.street?.trim()) errors.street = 'Obrigatório'
        if (!addr.number?.trim()) errors.number = 'Obrigatório'
        if (!addr.neighborhood?.trim()) errors.neighborhood = 'Obrigatório'
        // Complemento é opcional — não validar como obrigatório
        if (!addr.city?.trim()) errors.city = 'Obrigatório'
        if (!addr.state?.trim()) errors.state = 'Obrigatório'

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
            const totalValue = groupedItems.reduce((sum, item) => sum + ((item.price || 0) * item.count), 0)
            const orderPayload = {
                customer: customerData,
                totalValue,
                items: groupedItems.map(item => ({
                    productId: item.id,
                    quantity: item.count,
                    selectedSize: item.selectedSize,
                    selectedColor: item.selectedColor,
                    price: item.price,
                    costPrice: item.costPrice || 0
                })),
                notes: customerData.notes
            }

            const result = await addOrder(orderPayload)
            if (!result.success) throw new Error(result.error)

            triggerFireworks()

            // 📧 Envio de email de notificação para o administrador (Via EmailJS)
            console.log('📧 Enviando email de notificação para studio30closet@gmail.com...')
            sendNewMalinhaEmail({
                customerName: customerData.name,
                customerEmail: customerData.email,
                itemsCount: groupedItems.length,
                orderId: result.order?.id
            }).then(res => {
                if (res.success) console.log('✅ Email enviado com sucesso via EmailJS!')
                else console.warn('⚠️ Email falhou:', res.error)
            }).catch(err => {
                console.error('❌ Erro ao enviar email:', err)
            })

            const msg = formatMalinhaMessage(groupedItems, customerData)
            const whatsappLink = generateWhatsAppLink('+5541996863879', msg)

            setSuccessOrder({
                orderNumber: generateOrderNumber(result.order?.id),
                customerName: customerData.name,
                itemsCount: groupedItems.length,
                whatsappLink
            })

            // 📊 Analytics: Rastrear checkout completado
            trackCheckoutCompleted(result.order?.id, items, totalValue)
            markCartConverted()

            // 🧹 Limpar carrinho imediatamente após sucesso (dados do cliente também serão limpos ao voltar à loja)
            clearItems()

            setStep(3)
        } catch (err) {
            console.error(err)
            if (err.message?.includes('Insufficient stock') || err.message?.includes('stock')) {
                toast.error('Uma peça da sua malinha acabou de esgotar. Remova-a e tente novamente.')
            } else {
                toast.error('Erro ao processar pedido. Tente novamente.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // EMPTY STATE - Não mostrar se estiver na tela de sucesso (step 3)
    if (items.length === 0 && step !== 3) {
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
            <SEO
                title="Minha Malinha"
                description="Finalize seu pedido da malinha personalizada Studio 30."
                noIndex={true}
            />
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

                {/* PREMIUM ANIMATED PROGRESS INDICATOR */}
                <div className="mb-8 px-4">
                    <div className="max-w-md mx-auto">
                        <div className="relative flex items-center justify-between px-6">
                            {/* Linha de Conexão Animada */}
                            <div className="absolute top-5 left-10 right-10 h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-[#C75D3B] via-[#E07B5D] to-[#C75D3B]"
                                    style={{ filter: 'drop-shadow(0 0 8px rgba(199, 93, 59, 0.3))' }}
                                    initial={{ width: '0%' }}
                                    animate={{
                                        width: step === 1 ? '0%' : step === 2 ? '50%' : '100%'
                                    }}
                                    transition={{
                                        duration: 0.6,
                                        ease: [0.4, 0, 0.2, 1],
                                        delay: 0.1
                                    }}
                                />
                            </div>

                            {/* Step 1: Revisar Itens */}
                            <motion.button
                                type="button"
                                onClick={() => step > 1 && setStep(1)}
                                disabled={step === 1}
                                className="flex flex-col items-center gap-2 relative z-10 focus:outline-none disabled:cursor-default cursor-pointer group"
                                whileHover={step > 1 ? { scale: 1.05 } : {}}
                                whileTap={step > 1 ? { scale: 0.95 } : {}}
                            >
                                <motion.div
                                    className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-500 ${step >= 1
                                        ? 'bg-gradient-to-br from-[#C75D3B] via-[#D66A4E] to-[#E07B5D] shadow-lg'
                                        : 'bg-white/90 border border-gray-200 shadow-sm'
                                        }`}
                                    style={step >= 1 ? { boxShadow: '0 4px 20px rgba(199, 93, 59, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset' } : {}}
                                    animate={step === 1 ? {
                                        scale: [1, 1.08, 1],
                                        rotate: [0, 3, -3, 0]
                                    } : {}}
                                    transition={{
                                        duration: 0.6,
                                        repeat: step === 1 ? 1 : 0,
                                        delay: 0.2,
                                        ease: [0.4, 0, 0.2, 1]
                                    }}
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    >
                                        {step > 1 ? (
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: "spring", stiffness: 200 }}
                                            >
                                                <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                            </motion.div>
                                        ) : (
                                            <ShoppingBag className={`w-[18px] h-[18px] ${step === 1 ? 'text-white' : 'text-gray-400'}`} strokeWidth={2} />
                                        )}
                                    </motion.div>
                                </motion.div>
                                <motion.span
                                    className={`text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${step === 1 ? 'text-[#C75D3B]' : step > 1 ? 'text-gray-500' : 'text-gray-400'
                                        }`}
                                    animate={step === 1 ? { scale: [1, 1.03, 1] } : {}}
                                    transition={{ duration: 0.4 }}
                                >
                                    Revisar
                                </motion.span>
                            </motion.button>

                            {/* Step 2: Dados */}
                            <motion.button
                                type="button"
                                onClick={() => {
                                    if (step === 1) setStep(2)
                                    if (step === 3) setStep(2)
                                }}
                                disabled={step === 2}
                                className="flex flex-col items-center gap-2 relative z-10 focus:outline-none disabled:cursor-default cursor-pointer group"
                                whileHover={step !== 2 ? { scale: 1.05 } : {}}
                                whileTap={step !== 2 ? { scale: 0.95 } : {}}
                            >
                                <motion.div
                                    className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-500 ${step >= 2
                                        ? 'bg-gradient-to-br from-[#C75D3B] via-[#D66A4E] to-[#E07B5D] shadow-lg'
                                        : 'bg-white/90 border border-gray-200 shadow-sm'
                                        }`}
                                    style={step >= 2 ? { boxShadow: '0 4px 20px rgba(199, 93, 59, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset' } : {}}
                                    animate={step === 2 ? {
                                        scale: [1, 1.08, 1],
                                        rotate: [0, 3, -3, 0]
                                    } : {}}
                                    transition={{
                                        duration: 0.6,
                                        repeat: step === 2 ? 1 : 0,
                                        delay: 0.2,
                                        ease: [0.4, 0, 0.2, 1]
                                    }}
                                >
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                    >
                                        {step > 2 ? (
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                                            >
                                                <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                                            </motion.div>
                                        ) : (
                                            <User className={`w-[18px] h-[18px] ${step === 2 ? 'text-white' : 'text-gray-400'}`} strokeWidth={2} />
                                        )}
                                    </motion.div>
                                </motion.div>
                                <motion.span
                                    className={`text-[11px] font-semibold transition-all duration-300 tracking-wide ${step === 2 ? 'text-[#C75D3B]' : step > 2 ? 'text-gray-500' : 'text-gray-400'
                                        }`}
                                    animate={step === 2 ? { scale: [1, 1.03, 1] } : {}}
                                    transition={{ duration: 0.4 }}
                                >
                                    Seus Dados
                                </motion.span>
                            </motion.button>

                            {/* Step 3: Confirmação */}
                            <motion.div
                                className="flex flex-col items-center gap-2 relative z-10"
                            >
                                <motion.div
                                    className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-500 ${step >= 3
                                        ? 'bg-gradient-to-br from-emerald-500 via-emerald-550 to-emerald-600 shadow-lg'
                                        : 'bg-white/90 border border-gray-200 shadow-sm'
                                        }`}
                                    style={step >= 3 ? { boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset' } : {}}
                                    animate={step === 3 ? {
                                        scale: [1, 1.12, 1.04, 1.12, 1],
                                        rotate: [0, 8, -8, 8, 0]
                                    } : {}}
                                    transition={{
                                        duration: 0.9,
                                        repeat: step === 3 ? 2 : 0,
                                        delay: 0.2,
                                        ease: [0.4, 0, 0.2, 1]
                                    }}
                                >
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: step === 3 ? 1 : 0.8, opacity: step === 3 ? 1 : 0.5 }}
                                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                    >
                                        {step === 3 ? (
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                                            >
                                                <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                                            </motion.div>
                                        ) : (
                                            <Check className="w-[18px] h-[18px] text-gray-400" strokeWidth={2} />
                                        )}
                                    </motion.div>
                                </motion.div>
                                <motion.span
                                    className={`text-[11px] font-semibold transition-all duration-300 tracking-wide ${step === 3 ? 'text-emerald-600' : 'text-gray-400'
                                        }`}
                                    animate={step === 3 ? {
                                        scale: [1, 1.08, 1.03, 1.08, 1],
                                    } : {}}
                                    transition={{ duration: 0.7, repeat: step === 3 ? 2 : 0 }}
                                >
                                    Confirmado!
                                </motion.span>
                            </motion.div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto">
                    {/* COLUNA PRINCIPAL */}
                    <div>
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
                                                                <button onClick={() => removeItem(item.itemIds[0])} className="text-gray-400 hover:text-red-500 p-1" aria-label="Remover item">
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
                                    {/* FORMULÁRIO PREMIUM */}
                                    <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
                                        {/* DADOS PESSOAIS */}
                                        <div className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100">
                                                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-[#4A3B32]">
                                                    <User className="w-5 h-5 text-[#C75D3B]" />
                                                    Dados Pessoais
                                                </h3>
                                            </div>
                                            <div className="p-6 grid md:grid-cols-2 gap-6">
                                                {/* Nome Completo */}
                                                <div className="md:col-span-2">
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        Nome Completo
                                                    </label>
                                                    <input
                                                        required
                                                        type="text"
                                                        name="name"
                                                        value={customerData.name}
                                                        onChange={handleInputChange}
                                                        placeholder="Ex: Maria Oliveira"
                                                        className={`w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-base ${formErrors.name ? 'ring-2 ring-red-300' : ''}`}
                                                    />
                                                </div>

                                                {/* WhatsApp */}
                                                <div>
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        WhatsApp / Telefone
                                                    </label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            required
                                                            type="tel"
                                                            name="phone"
                                                            value={customerData.phone}
                                                            onChange={handleInputChange}
                                                            placeholder="(41) 99999-9999"
                                                            className={`w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-base ${formErrors.phone ? 'ring-2 ring-red-300' : ''}`}
                                                        />
                                                    </div>
                                                </div>

                                                {/* E-mail */}
                                                <div>
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        E-mail
                                                    </label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            required
                                                            type="email"
                                                            name="email"
                                                            value={customerData.email || ''}
                                                            onChange={handleInputChange}
                                                            placeholder="cliente@email.com"
                                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-base"
                                                        />
                                                    </div>
                                                </div>

                                                {/* CPF */}
                                                <div>
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        CPF
                                                    </label>
                                                    <div className="relative">
                                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            required
                                                            type="text"
                                                            name="cpf"
                                                            value={customerData.cpf || ''}
                                                            onChange={handleInputChange}
                                                            placeholder="000.000.000-00"
                                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-base"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Data de Nascimento */}
                                                <div>
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        Data de Nascimento
                                                    </label>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            required
                                                            type="date"
                                                            name="birth_date"
                                                            value={customerData.birth_date || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-gray-600 text-base"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ENDEREÇO DE ENTREGA */}
                                        <div className="bg-white rounded-2xl shadow-sm border border-[#4A3B32]/5 overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100">
                                                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-[#4A3B32]">
                                                    <MapPin className="w-5 h-5 text-[#C75D3B]" />
                                                    Endereço de Entrega
                                                </h3>
                                            </div>
                                            <div className="p-6 grid md:grid-cols-6 gap-6">
                                                {/* CEP */}
                                                <div className="md:col-span-2">
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        CEP
                                                    </label>
                                                    <input
                                                        required
                                                        type="text"
                                                        name="zipCode"
                                                        value={customerData.addresses[0]?.zipCode || ''}
                                                        onChange={handleCepChange}
                                                        placeholder="00000-000"
                                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-base"
                                                    />
                                                </div>

                                                {/* Rua */}
                                                <div className="md:col-span-4">
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        Logradouro / Rua
                                                    </label>
                                                    <input
                                                        required
                                                        type="text"
                                                        name="street"
                                                        value={customerData.addresses[0]?.street || ''}
                                                        onChange={handleAddressChange}
                                                        placeholder="Av. Paraná"
                                                        className={`w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-base ${formErrors.street ? 'ring-2 ring-red-300' : ''}`}
                                                    />
                                                </div>

                                                {/* Número */}
                                                <div className="md:col-span-2">
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        Número
                                                    </label>
                                                    <input
                                                        required
                                                        type="text"
                                                        name="number"
                                                        value={customerData.addresses[0]?.number || ''}
                                                        onChange={handleAddressChange}
                                                        placeholder="123"
                                                        className={`w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-base ${formErrors.number ? 'ring-2 ring-red-300' : ''}`}
                                                    />
                                                </div>

                                                {/* Bairro */}
                                                <div className="md:col-span-2">
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        Bairro
                                                    </label>
                                                    <input
                                                        required
                                                        type="text"
                                                        name="neighborhood"
                                                        value={customerData.addresses[0]?.neighborhood || ''}
                                                        onChange={handleAddressChange}
                                                        placeholder="Centro"
                                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-base"
                                                    />
                                                </div>

                                                {/* Complemento */}
                                                <div className="md:col-span-2">
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        Complemento
                                                    </label>
                                                    <input
                                                        required
                                                        type="text"
                                                        name="complement"
                                                        value={customerData.addresses[0]?.complement || ''}
                                                        onChange={handleAddressChange}
                                                        placeholder="Apto 42"
                                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-base"
                                                    />
                                                </div>

                                                {/* Cidade */}
                                                <div className="md:col-span-3">
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        Cidade
                                                    </label>
                                                    <input
                                                        required
                                                        type="text"
                                                        name="city"
                                                        value={customerData.addresses[0]?.city || ''}
                                                        onChange={handleAddressChange}
                                                        placeholder="Curitiba"
                                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all text-base"
                                                    />
                                                </div>

                                                {/* Estado */}
                                                <div className="md:col-span-3">
                                                    <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">
                                                        Estado
                                                    </label>
                                                    <input
                                                        required
                                                        type="text"
                                                        name="state"
                                                        value={customerData.addresses[0]?.state || ''}
                                                        onChange={handleAddressChange}
                                                        placeholder="PR"
                                                        maxLength="2"
                                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all uppercase text-base"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* BOTÕES DE AÇÃO */}
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="flex-1 py-4 text-[#C75D3B] font-bold border-2 border-[#C75D3B] rounded-2xl hover:bg-[#C75D3B] hover:text-white transition-all"
                                            >
                                                Voltar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="flex-[2] btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSubmitting ? <span className="animate-spin">⏳</span> : 'Finalizar Pedido'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                                >
                                    {/* TELA DE SUCESSO PREMIUM */}
                                    <div className="bg-gradient-to-br from-white via-emerald-50/30 to-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden">
                                        {/* Header com gradiente */}
                                        <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 px-8 py-10 text-center relative overflow-hidden">
                                            {/* Círculos decorativos */}
                                            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                                            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />

                                            <motion.div
                                                className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                                            >
                                                <Check className="w-10 h-10 text-white" strokeWidth={3} />
                                            </motion.div>
                                            <motion.h2
                                                className="text-3xl font-display font-bold text-white mb-2"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                            >
                                                Pedido Confirmado! 🎉
                                            </motion.h2>
                                            <motion.p
                                                className="text-emerald-100"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                            >
                                                Sua malinha está quase a caminho!
                                            </motion.p>
                                        </div>

                                        {/* Corpo */}
                                        <div className="p-8 space-y-6">
                                            {/* Número do Pedido */}
                                            <motion.div
                                                className="bg-gradient-to-r from-[#C75D3B]/5 to-[#C75D3B]/10 rounded-2xl p-6 text-center border border-[#C75D3B]/10"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 }}
                                            >
                                                <p className="text-sm text-gray-500 mb-1">Número do seu pedido</p>
                                                <p className="text-2xl font-mono font-bold text-[#C75D3B] tracking-wider">
                                                    {successOrder?.orderNumber || 'Processando...'}
                                                </p>
                                            </motion.div>

                                            {/* Resumo do Pedido */}
                                            <motion.div
                                                className="bg-gray-50 rounded-2xl p-6 space-y-4"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.6 }}
                                            >
                                                <h3 className="font-bold text-[#4A3B32] flex items-center gap-2">
                                                    <ShoppingBag className="w-5 h-5 text-[#C75D3B]" />
                                                    Resumo do Pedido
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div className="bg-white rounded-xl p-4 shadow-sm">
                                                        <p className="text-gray-500">Cliente</p>
                                                        <p className="font-bold text-[#4A3B32] truncate">{successOrder?.customerName || 'N/A'}</p>
                                                    </div>
                                                    <div className="bg-white rounded-xl p-4 shadow-sm">
                                                        <p className="text-gray-500">Total de Peças</p>
                                                        <p className="font-bold text-[#4A3B32]">{successOrder?.itemsCount || 0} peças</p>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            {/* Próximos Passos */}
                                            <motion.div
                                                className="bg-blue-50 border border-blue-100 rounded-2xl p-6"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.7 }}
                                            >
                                                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                                                    <Truck className="w-5 h-5" />
                                                    Próximos Passos
                                                </h3>
                                                <ol className="text-sm text-blue-800 space-y-2">
                                                    <li className="flex items-start gap-2">
                                                        <span className="bg-blue-200 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                                        <span>Envie seus dados pelo WhatsApp clicando no botão abaixo</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="bg-blue-200 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                                        <span>Aguarde a confirmação do agendamento de entrega</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="bg-blue-200 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                                        <span>Experimente as peças em casa por até 24 horas!</span>
                                                    </li>
                                                </ol>
                                            </motion.div>

                                            {/* Botão WhatsApp - Destaque Principal */}
                                            <motion.button
                                                onClick={() => window.open(successOrder?.whatsappLink, '_blank')}
                                                className="w-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 text-white py-5 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.8 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <MessageCircle className="w-6 h-6" />
                                                Enviar Pedido no WhatsApp
                                            </motion.button>

                                            {/* Link para voltar */}
                                            <motion.div
                                                className="text-center pt-2"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.9 }}
                                            >
                                                <Link
                                                    to="/catalogo"
                                                    onClick={() => resetAll()}
                                                    className="text-sm font-medium text-gray-500 hover:text-[#C75D3B] transition-colors inline-flex items-center gap-1"
                                                >
                                                    <ArrowLeft className="w-4 h-4" />
                                                    Continuar Navegando
                                                </Link>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Checkout
