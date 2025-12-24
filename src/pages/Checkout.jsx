import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Plus, ArrowLeft, MessageCircle, ShoppingBag, Check, Heart, Truck, Gift, Loader } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { generateWhatsAppLink, formatMalinhaMessage, cn } from '@/lib/utils'
import { useAdminStore } from '@/store/admin-store'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/contexts/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'
import { triggerFireworks } from '@/components/magicui/confetti'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { supabase } from '@/lib/supabase'

// Gerar número de pedido profissional
function generateOrderNumber(orderId) {
    // Formato: MAL-YYMMDD-[ID base36]-[RANDOM]
    // Exemplo: MAL-241224-5K-A7X9M
    const now = new Date()
    const year = String(now.getFullYear()).slice(-2)
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const dateStr = `${year}${month}${day}`

    // Converter ID para base36 (mais compacto)
    const idBase36 = parseInt(orderId).toString(36).toUpperCase()

    // Gerar sufixo aleatório (3 caracteres: letras maiúsculas + números)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let randomSuffix = ''
    for (let i = 0; i < 5; i++) {
        randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return `MAL-${dateStr}-${idBase36}-${randomSuffix}`
}

export function Checkout() {
    const { items, removeItem, clearItems, customerData, setCustomerData, setAddressData } = useMalinhaStore()
    const { addOrder } = useAdminStore()
    const toast = useToast()
    const [step, setStep] = useState(items.length > 0 ? 1 : 0) // 0: empty, 1: review, 2: form, 3: success
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formErrors, setFormErrors] = useState({})
    const [loadingCep, setLoadingCep] = useState(false)
    const [cepError, setCepError] = useState('')
    const [productsData, setProductsData] = useState({}) // Cache de dados dos produtos
    const [loadingProducts, setLoadingProducts] = useState(true)
    const [successOrder, setSuccessOrder] = useState(null) // Dados do pedido criado com sucesso

    // Buscar dados dos produtos pelos IDs armazenados na malinha
    useEffect(() => {
        const fetchProductData = async () => {
            if (items.length === 0) {
                setLoadingProducts(false)
                return
            }

            try {
                setLoadingProducts(true)
                // Extrair IDs únicos dos produtos
                const productIds = [...new Set(items.map(item => item.productId))]

                console.log('📦 Buscando dados dos produtos:', productIds)

                // Buscar dados dos produtos do banco
                const { data, error } = await supabase
                    .from('products')
                    .select('id, name, images, price, cost_price, description, stock, sizes, color, category')
                    .in('id', productIds)

                if (error) {
                    console.error('❌ Erro ao buscar produtos:', error)
                    toast.error('Erro ao carregar imagens dos produtos')
                    return
                }

                // Criar mapa de produtos por ID
                const productsMap = {}
                data.forEach(product => {
                    productsMap[product.id] = product
                })

                console.log('✅ Produtos carregados:', productsMap)
                setProductsData(productsMap)
            } catch (err) {
                console.error('❌ Exceção ao buscar produtos:', err)
            } finally {
                setLoadingProducts(false)
            }
        }

        fetchProductData()
    }, [items, toast])

    // Garantir que addresses sempre existe e tem pelo menos um objeto
    useEffect(() => {
        if (!customerData.addresses || customerData.addresses.length === 0) {
            setCustomerData({
                addresses: [{
                    street: '',
                    number: '',
                    complement: '',
                    neighborhood: '',
                    city: 'Santos',
                    state: 'SP',
                    zipCode: '',
                    isDefault: true
                }]
            })
        }
    }, [])

    const itemSummary = items.reduce((acc, item) => {
        // Buscar dados do produto usando o productId
        const product = productsData[item.productId] || {};

        const key = `${product.name || 'Produto'}-${item.selectedSize}`; // Group by name and size
        if (acc[key]) {
            acc[key].count += 1;
            acc[key].itemIds.push(item.itemId);
        } else {
            acc[key] = {
                // Usar dados do produto + dados do item
                id: item.productId,
                productId: item.productId,
                itemId: item.itemId,
                name: product.name || 'Produto indisponível',
                price: product.price || 0,
                costPrice: product.costPrice || 0,
                images: product.images || [],
                image: product.images?.[0] || 'https://via.placeholder.com/300x400?text=Produto',
                description: product.description || '',
                color: product.color || '',
                category: product.category || '',
                selectedSize: item.selectedSize,
                count: 1,
                itemIds: [item.itemId],
            };
        }
        return acc;
    }, {});
    const groupedItems = Object.values(itemSummary);

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setCustomerData({ [name]: value })
    }
    
    const handleAddressChange = (e) => {
        const { name, value } = e.target
        setAddressData({ [name]: value })
    }

    // Função para buscar endereço por CEP usando ViaCEP
    const fetchAddressByCep = useCallback(async (cep) => {
        // Remove caracteres não numéricos
        const cleanCep = cep.replace(/\D/g, '')

        // Só busca se tiver 8 dígitos
        if (cleanCep.length !== 8) {
            setCepError('')
            return
        }

        setLoadingCep(true)
        setCepError('')

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
            const data = await response.json()

            if (data.erro) {
                setCepError('CEP não encontrado')
                setLoadingCep(false)
                return
            }

            // Preencher os campos automaticamente
            setAddressData({
                zipCode: cep, // Mantém o formato do CEP digitado
                street: data.logradouro || '',
                neighborhood: data.bairro || '',
                city: data.localidade || '',
                state: data.uf || '',
                complement: data.complemento || ''
            })

            setCepError('')
            toast.success('Endereço preenchido automaticamente!')
        } catch (error) {
            console.error('Erro ao buscar CEP:', error)
            setCepError('Erro ao buscar CEP. Tente novamente.')
        } finally {
            setLoadingCep(false)
        }
    }, [setAddressData, toast])

    // Handler especial para o campo de CEP
    const handleCepChange = (e) => {
        const { value } = e.target
        console.log('🔍 CEP input value:', value)

        // Formata o CEP enquanto digita (00000-000)
        let formattedCep = value.replace(/\D/g, '').slice(0, 8)
        if (formattedCep.length > 5) {
            formattedCep = formattedCep.slice(0, 5) + '-' + formattedCep.slice(5)
        }

        console.log('✍️ Formatted CEP:', formattedCep)

        // Atualiza o estado
        setAddressData({ zipCode: formattedCep })
        console.log('📝 Updated address data')

        // Busca se completou o CEP
        if (value.replace(/\D/g, '').length === 8) {
            console.log('🔎 CEP complete, fetching address...')
            fetchAddressByCep(formattedCep)
        } else {
            setCepError('')
        }
    }

    const validateForm = () => {
        const errors = {}
        const address = customerData?.addresses?.[0] || {}

        if (!customerData.name?.trim()) {
            errors.name = 'Nome é obrigatório'
        }

        if (!customerData.phone?.trim()) {
            errors.phone = 'Telefone é obrigatório'
        } else if (customerData.phone.replace(/\D/g, '').length < 10) {
            errors.phone = 'Telefone inválido'
        }

        if (!address.zipCode?.trim()) {
            errors.zipCode = 'CEP é obrigatório'
        } else if (address.zipCode.replace(/\D/g, '').length !== 8) {
            errors.zipCode = 'CEP deve ter 8 dígitos'
        }

        if (!address.street?.trim()) {
            errors.street = 'Rua é obrigatória'
        }

        if (!address.number?.trim()) {
            errors.number = 'Número é obrigatório'
        }

        if (!address.neighborhood?.trim()) {
            errors.neighborhood = 'Bairro é obrigatório'
        }

        if (!address.city?.trim()) {
            errors.city = 'Cidade é obrigatória'
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) {
            toast.error('Por favor, preencha todos os campos obrigatórios')
            return
        }

        setIsSubmitting(true)

        try {
            // 1. Save order to Admin System
            // Validar que todos os itens têm ID de produto
            const invalidItems = groupedItems.filter(item => !item.id);
            if (invalidItems.length > 0) {
                toast.error(`Erro: ${invalidItems.length} produto(s) sem ID válido`);
                setIsSubmitting(false);
                return;
            }

            // SIMPLIFICADO: Enviar apenas IDs dos produtos
            // Os dados completos (imagens, preço, etc) serão buscados do banco via getOrderById
            const orderPayload = {
                customer: {
                    name: customerData.name,
                    phone: customerData.phone,
                    email: customerData.email,
                    cpf: customerData.cpf,
                    addresses: customerData.addresses,
                },
                items: groupedItems.map(item => {
                    if (!item.id) {
                        throw new Error(`Item sem ID de produto: ${item.name}`);
                    }
                    return {
                        productId: item.id,           // APENAS ID do produto
                        quantity: item.count,         // Quantidade
                        selectedSize: item.selectedSize, // Tamanho selecionado
                        price: item.price,            // Preço no momento da compra
                        costPrice: item.costPrice || 0, // Custo no momento da compra
                        // NÃO enviar: name, images, description, etc
                        // Tudo será buscado do banco quando necessário
                    };
                }),
                notes: customerData.notes
            }

            console.log('📤 Checkout - Sending order payload:', orderPayload);
            console.log('🛒 Grouped items detail:', groupedItems);

            const result = await addOrder(orderPayload)

            console.log('📥 Checkout - Received result:', result);

            if (!result.success) {
                console.error("Erro ao registrar pedido no sistema:", result.error)
                toast.error('Erro ao criar pedido. Tente novamente.')
                setIsSubmitting(false)
                return
            }

            // ✅ Pedido criado com sucesso! Mostrar página de confirmação
            triggerFireworks()

            // Gerar mensagem do WhatsApp (para usar depois)
            const message = formatMalinhaMessage(groupedItems, customerData)
            const whatsappLink = generateWhatsAppLink('+5511999999999', message)

            // Salvar dados de sucesso
            const profesionalOrderNumber = generateOrderNumber(result.order?.id || 0)
            setSuccessOrder({
                orderId: result.order?.id || 'N/A',
                orderNumber: profesionalOrderNumber,
                customerName: customerData.name,
                itemsCount: groupedItems.length,
                totalValue: groupedItems.reduce((sum, item) => sum + (item.price * item.count), 0),
                whatsappLink,
                items: groupedItems
            })

            // Mostrar página de sucesso (step 3)
            setStep(3)
            setIsSubmitting(false)
        } catch (error) {
            console.error("Falha no checkout:", error)
            toast.error('Erro ao processar pedido. Tente novamente.')
            setIsSubmitting(false)
        }
    }
    
    const address = customerData?.addresses?.[0] || {};
    const isFormValid = !!(customerData.name && customerData.phone && address.street && address.number && address.neighborhood && address.city && address.zipCode);

    // Empty state
    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] pt-16 sm:pt-24 flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    <div className="text-center py-12 sm:py-16">
                        <div className="w-16 sm:w-24 h-16 sm:h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                            <ShoppingBag className="w-8 sm:w-10 h-8 sm:h-10 text-[#C75D3B]" />
                        </div>
                        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#4A3B32] mb-3 sm:mb-4">
                            Sua malinha está vazia
                        </h1>
                        <p className="text-xs sm:text-base text-[#4A3B32]/60 mb-6 sm:mb-8">
                            Navegue pelo catálogo e adicione até 20 peças para experimentar em casa.
                        </p>
                        <Link to="/catalogo" className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[#C75D3B] text-white rounded-full font-medium text-sm sm:text-base tracking-wide hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20 min-h-[44px] sm:min-h-[48px]">
                            <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
                            Ver catálogo
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] pt-16 sm:pt-24 pb-8 sm:pb-16">
            <div className="w-full px-4 sm:px-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
                    <div className="mb-4 sm:mb-0">
                        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#4A3B32]">
                            Sua Malinha
                        </h1>
                        <p className="text-sm sm:text-base text-[#4A3B32]/60 mt-1">
                            {items.length}/20 peças selecionadas
                        </p>
                    </div>
                    <Link
                        to="/catalogo"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base text-white bg-[#C75D3B] hover:bg-[#A64D31] rounded-full transition-colors font-medium min-h-[40px] sm:min-h-[48px]"
                    >
                        <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                        <span>Adicionar mais</span>
                    </Link>
                </div>

                {/* Steps Indicator - Scrollable on mobile */}
                <div className="overflow-x-auto mb-6 sm:mb-8 -mx-4 sm:mx-0 px-4 sm:px-0">
                    <div className="flex items-center justify-center gap-1 sm:gap-4 min-w-fit sm:min-w-0">
                        {[
                            { num: 1, label: 'Revisar', icon: ShoppingBag },
                            { num: 2, label: 'Dados', icon: Truck },
                            { num: 3, label: 'Confirmação', icon: Check },
                        ].map((s, i) => (
                            <div key={s.num} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: step === s.num ? 1.1 : 1,
                                    backgroundColor: step >= s.num ? '#C75D3B' : '#E8C4B0',
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className={cn(
                                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shadow-lg',
                                    step >= s.num ? 'text-white shadow-[#C75D3B]/30' : 'text-[#4A3B32] shadow-gray-200'
                                )}
                            >
                                <AnimatePresence mode="wait">
                                    {step > s.num ? (
                                        <motion.div
                                            key="check"
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            exit={{ scale: 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                        >
                                            <Check className="w-5 h-5" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="icon"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            <s.icon className="w-5 h-5" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                            <span className={cn(
                                'text-xs sm:text-sm font-bold transition-colors duration-300 whitespace-nowrap',
                                step >= s.num ? 'text-[#4A3B32]' : 'text-[#4A3B32]/40'
                            )}>
                                {s.label}
                            </span>
                            {i < 2 && (
                                <div className="relative w-8 sm:w-16 h-1 bg-gray-200 rounded-full mx-1 sm:mx-2 overflow-hidden flex-shrink-0">
                                    <motion.div
                                        initial={{ width: '0%' }}
                                        animate={{ width: step > s.num ? '100%' : '0%' }}
                                        transition={{ duration: 0.5, ease: "easeInOut" }}
                                        className="absolute left-0 top-0 h-full bg-[#C75D3B] rounded-full"
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                </div>

                <div className={cn(
                    "grid gap-6 sm:gap-8",
                    step === 3 ? "lg:grid-cols-1 lg:max-w-3xl lg:mx-auto" : "grid-cols-1 lg:grid-cols-3"
                )}>
                    {/* Items List */}
                    <div className={step === 3 ? "lg:col-span-1" : "lg:col-span-2"}>
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                // Step 1: Review items
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#4A3B32]/5 p-4 sm:p-6"
                                >
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                                    {groupedItems.map((item) => (
                                        <div key={item.itemIds[0]} className="group relative">
                                            <div className="aspect-[3/4] rounded-xl overflow-hidden relative bg-gray-100">
                                                <img
                                                    src={item.images?.[0] || item.image || 'https://via.placeholder.com/300x400?text=Produto'}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    onError={(e) => {
                                                        e.target.src = 'https://via.placeholder.com/300x400?text=Produto';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            </div>
                                            {item.count > 1 && (
                                                <Badge variant="primary" size="lg" className="absolute top-2 right-2 z-10">
                                                    {item.count}x
                                                </Badge>
                                            )}
                                            <button
                                                onClick={() => removeItem(item.itemIds[0])}
                                                className="absolute top-2 left-2 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm text-gray-500 hover:bg-white hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-0"
                                                aria-label="Remover item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="pt-3">
                                                <h3 className="font-display text-base text-[#4A3B32] line-clamp-1">
                                                    {item.name}
                                                </h3>
                                                <p className="text-sm text-[#4A3B32]/60">
                                                    Tamanho: {item.selectedSize}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : step === 3 ? (
                            // Step 3: Success Page
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.5 }}
                                className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#4A3B32]/5 p-8 lg:p-12"
                            >
                                {/* Success Header */}
                                <div className="text-center mb-6 sm:mb-8">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                                        className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                                    >
                                        <Check className="w-10 h-10 text-white" />
                                    </motion.div>

                                    <motion.h1
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#4A3B32] mb-2 sm:mb-3"
                                    >
                                        Pedido Confirmado! 🎉
                                    </motion.h1>

                                    <motion.p
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-base sm:text-lg text-[#4A3B32]/70 mb-2"
                                    >
                                        Oi {successOrder?.customerName}! Vamos preparar sua malinha.
                                    </motion.p>

                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="text-xs sm:text-sm text-[#4A3B32]/60"
                                    >
                                        Número do pedido: <span className="font-bold text-[#C75D3B] font-mono text-xs sm:text-sm block sm:inline mt-1 sm:mt-0">{successOrder?.orderNumber}</span>
                                    </motion.p>
                                </div>

                                {/* Order Summary */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="bg-gradient-to-br from-[#FDFBF7] to-[#FAF8F5] rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-[#C75D3B]/20"
                                >
                                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6">
                                        <div>
                                            <p className="text-xs sm:text-sm text-[#4A3B32]/60 font-medium mb-2">Total de peças</p>
                                            <p className="text-2xl sm:text-3xl font-bold text-[#C75D3B]">
                                                {successOrder?.itemsCount}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs sm:text-sm text-[#4A3B32]/60 font-medium mb-2">Valor total</p>
                                            <p className="text-2xl sm:text-3xl font-bold text-[#4A3B32]">
                                                R$ {(successOrder?.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Info Box */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 }}
                                    className="bg-blue-50 border-l-4 border-blue-500 p-4 sm:p-6 rounded-r-lg mb-6 sm:mb-8"
                                >
                                    <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
                                        <MessageCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                                        Próximo passo
                                    </h3>
                                    <p className="text-blue-800 text-xs sm:text-sm leading-relaxed">
                                        Clique no botão abaixo para entrar em contato via WhatsApp e agendar a entrega da sua malinha.
                                        Você terá alguns dias para experimentar e decidir quais peças quer manter! 💝
                                    </p>
                                </motion.div>

                                {/* Action Buttons */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                    className="flex flex-col gap-2 sm:gap-3"
                                >
                                    <button
                                        onClick={() => {
                                            window.open(successOrder?.whatsappLink, '_blank')
                                        }}
                                        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#C75D3B] to-[#A64D31] text-white rounded-full font-bold text-sm sm:text-base tracking-wide hover:shadow-lg shadow-[#C75D3B]/30 transition-all duration-300 flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[56px]"
                                    >
                                        <MessageCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                                        <span>Agendar no WhatsApp</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            clearItems()
                                            setStep(0)
                                            setSuccessOrder(null)
                                        }}
                                        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-white text-[#C75D3B] border-2 border-[#C75D3B] rounded-full font-bold text-sm sm:text-base tracking-wide hover:bg-[#FDFBF7] transition-all duration-300 flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[56px]"
                                    >
                                        <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
                                        <span>Continuar Comprando</span>
                                    </button>
                                </motion.div>
                            </motion.div>
                        ) : (
                            // Step 2: Customer Form
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#4A3B32]/5"
                            >
                                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                                    <h2 className="font-display text-lg sm:text-xl font-semibold text-[#4A3B32] mb-4">
                                        Seus Dados
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-[#4A3B32] mb-1">Nome completo *</label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={customerData.name || ''}
                                                onChange={handleInputChange}
                                                required
                                                aria-required="true"
                                                aria-invalid={!!formErrors.name}
                                                aria-describedby={formErrors.name ? "name-error" : undefined}
                                                placeholder="Seu nome"
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-lg border-2 focus:ring-0 outline-none transition-colors duration-300 text-base",
                                                    formErrors.name ? "border-red-400 focus:border-red-500 bg-red-50" : "border-gray-200 focus:border-[#C75D3B] bg-white"
                                                )}
                                            />
                                            {formErrors.name && (
                                                <p id="name-error" className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label htmlFor="phone" className="block text-sm font-medium text-[#4A3B32] mb-1">WhatsApp *</label>
                                            <input
                                                type="tel"
                                                id="phone"
                                                name="phone"
                                                value={customerData.phone || ''}
                                                onChange={handleInputChange}
                                                required
                                                aria-required="true"
                                                aria-invalid={!!formErrors.phone}
                                                aria-describedby={formErrors.phone ? "phone-error" : undefined}
                                                placeholder="(11) 99999-9999"
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-lg border-2 focus:ring-0 outline-none transition-colors duration-300 text-base",
                                                    formErrors.phone ? "border-red-400 focus:border-red-500 bg-red-50" : "border-gray-200 focus:border-[#C75D3B] bg-white"
                                                )}
                                            />
                                            {formErrors.phone && (
                                                <p id="phone-error" className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-[#4A3B32] mb-1">E-mail</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={customerData.email || ''}
                                                onChange={handleInputChange}
                                                placeholder="seu@email.com"
                                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 text-base bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="cpf" className="block text-sm font-medium text-[#4A3B32] mb-1">CPF (Opcional)</label>
                                            <input
                                                type="text"
                                                id="cpf"
                                                name="cpf"
                                                value={customerData.cpf || ''}
                                                onChange={handleInputChange}
                                                placeholder="000.000.000-00"
                                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 text-base bg-white"
                                            />
                                        </div>
                                    </div>
                                    
                                    <hr className="my-3 sm:my-4 border-gray-100" />

                                    <h3 className="font-display text-base sm:text-lg font-semibold text-[#4A3B32] pt-2">Endereço de Entrega</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                        <div className="md:col-span-2">
                                            <label htmlFor="zipCode" className="block text-sm font-medium text-[#4A3B32] mb-1">CEP *</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    id="zipCode"
                                                    name="zipCode"
                                                    value={address.zipCode || ''}
                                                    onChange={handleCepChange}
                                                    required
                                                    disabled={loadingCep}
                                                    aria-required="true"
                                                    aria-invalid={!!(formErrors.zipCode || cepError)}
                                                    aria-describedby={formErrors.zipCode || cepError ? "zipCode-error" : undefined}
                                                    placeholder="00000-000"
                                                    maxLength="9"
                                                    className={cn(
                                                        "w-full px-4 py-3 rounded-lg border-2 focus:ring-0 outline-none transition-colors duration-300 text-base disabled:opacity-60 pr-10",
                                                        formErrors.zipCode || cepError ? "border-red-400 focus:border-red-500 bg-red-50" : "border-gray-200 focus:border-[#C75D3B] bg-white"
                                                    )}
                                                />
                                                {loadingCep && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                        <Loader className="w-4 h-4 text-[#C75D3B] animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            {(formErrors.zipCode || cepError) && (
                                                <p id="zipCode-error" className="mt-1 text-sm text-red-600">{formErrors.zipCode || cepError}</p>
                                            )}
                                        </div>
                                        <div className="md:col-span-4">
                                            <label htmlFor="street" className="block text-sm font-medium text-[#4A3B32] mb-1">Rua *</label>
                                            <input
                                                type="text"
                                                id="street"
                                                name="street"
                                                value={address.street || ''}
                                                onChange={handleAddressChange}
                                                required
                                                aria-required="true"
                                                aria-invalid={!!formErrors.street}
                                                aria-describedby={formErrors.street ? "street-error" : undefined}
                                                placeholder="Ex: Avenida Paulista"
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-lg border-2 focus:ring-0 outline-none transition-colors duration-300 text-base",
                                                    formErrors.street ? "border-red-400 focus:border-red-500 bg-red-50" : "border-gray-200 focus:border-[#C75D3B] bg-white"
                                                )}
                                            />
                                            {formErrors.street && (
                                                <p id="street-error" className="mt-1 text-sm text-red-600">{formErrors.street}</p>
                                            )}
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="number" className="block text-sm font-medium text-[#4A3B32] mb-1">Número *</label>
                                            <input
                                                type="text"
                                                id="number"
                                                name="number"
                                                value={address.number || ''}
                                                onChange={handleAddressChange}
                                                required
                                                aria-required="true"
                                                aria-invalid={!!formErrors.number}
                                                aria-describedby={formErrors.number ? "number-error" : undefined}
                                                placeholder="Ex: 123"
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-lg border-2 focus:ring-0 outline-none transition-colors duration-300 text-base",
                                                    formErrors.number ? "border-red-400 focus:border-red-500 bg-red-50" : "border-gray-200 focus:border-[#C75D3B] bg-white"
                                                )}
                                            />
                                            {formErrors.number && (
                                                <p id="number-error" className="mt-1 text-sm text-red-600">{formErrors.number}</p>
                                            )}
                                        </div>
                                        <div className="md:col-span-3">
                                            <label htmlFor="neighborhood" className="block text-sm font-medium text-[#4A3B32] mb-1">Bairro *</label>
                                            <input
                                                type="text"
                                                id="neighborhood"
                                                name="neighborhood"
                                                value={address.neighborhood || ''}
                                                onChange={handleAddressChange}
                                                required
                                                aria-required="true"
                                                aria-invalid={!!formErrors.neighborhood}
                                                aria-describedby={formErrors.neighborhood ? "neighborhood-error" : undefined}
                                                placeholder="Ex: Centro"
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-lg border-2 focus:ring-0 outline-none transition-colors duration-300 text-base",
                                                    formErrors.neighborhood ? "border-red-400 focus:border-red-500 bg-red-50" : "border-gray-200 focus:border-[#C75D3B] bg-white"
                                                )}
                                            />
                                            {formErrors.neighborhood && (
                                                <p id="neighborhood-error" className="mt-1 text-sm text-red-600">{formErrors.neighborhood}</p>
                                            )}
                                        </div>
                                        <div className="md:col-span-3">
                                            <label htmlFor="complement" className="block text-sm font-medium text-[#4A3B32] mb-1">Complemento</label>
                                            <input
                                                type="text"
                                                id="complement"
                                                name="complement"
                                                value={address.complement || ''}
                                                onChange={handleAddressChange}
                                                placeholder="Ex: Apto 101"
                                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 text-base bg-white"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label htmlFor="city" className="block text-sm font-medium text-[#4A3B32] mb-1">Cidade *</label>
                                            <input
                                                type="text"
                                                id="city"
                                                name="city"
                                                value={address.city || ''}
                                                onChange={handleAddressChange}
                                                required
                                                aria-required="true"
                                                aria-invalid={!!formErrors.city}
                                                aria-describedby={formErrors.city ? "city-error" : undefined}
                                                placeholder="Ex: São Paulo"
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-lg border-2 focus:ring-0 outline-none transition-colors duration-300 text-base",
                                                    formErrors.city ? "border-red-400 focus:border-red-500 bg-red-50" : "border-gray-200 focus:border-[#C75D3B] bg-white"
                                                )}
                                            />
                                            {formErrors.city && (
                                                <p id="city-error" className="mt-1 text-sm text-red-600">{formErrors.city}</p>
                                            )}
                                        </div>
                                        <div className="md:col-span-3">
                                            <label htmlFor="state" className="block text-sm font-medium text-[#4A3B32] mb-1">Estado</label>
                                            <input
                                                type="text"
                                                id="state"
                                                name="state"
                                                value={address.state || ''}
                                                onChange={handleAddressChange}
                                                placeholder="SP"
                                                maxLength="2"
                                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 text-base bg-white uppercase"
                                            />
                                        </div>
                                    </div>

                                    <hr className="my-3 sm:my-4 border-gray-100" />

                                    <div>
                                        <label className="block text-sm font-medium text-[#4A3B32] mb-2">Observações</label>
                                        <textarea name="notes" value={customerData.notes || ''} onChange={handleInputChange} rows={2} className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1 resize-none text-base" placeholder="Preferência de horário, instruções..."></textarea>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                        </AnimatePresence>
                        {/* Clear All */}
                        {step === 1 && (
                            <button
                                onClick={clearItems}
                                className="mt-4 py-2 min-h-[40px] flex items-center justify-center text-xs sm:text-sm text-[#4A3B32]/50 hover:text-red-500 transition-colors font-medium"
                            >
                                Limpar toda a malinha
                            </button>
                        )}
                    </div>

                    {/* Summary - Hide on Success */}
                    {step !== 3 && (
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-6 sticky top-24 border border-[#4A3B32]/5">
                            {step === 1 ? (
                                <>
                                    <h2 className="font-display text-lg sm:text-xl font-semibold text-[#4A3B32] mb-3 sm:mb-4 text-center">
                                        Sua Malinha
                                    </h2>
                                    <p className="text-center text-[#4A3B32]/60 mb-4 sm:mb-6 text-xs sm:text-sm">
                                        Uma curadoria de estilo para você experimentar no conforto de casa.
                                    </p>

                                    <div className="bg-[#FDFBF7] rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <Gift className="w-4 sm:w-5 h-4 sm:h-5 text-[#C75D3B]" />
                                                <span className="font-medium text-xs sm:text-sm text-[#4A3B32]">Peças na malinha</span>
                                            </div>
                                            <span className="font-bold text-xl sm:text-2xl text-[#C75D3B]">
                                                <NumberTicker value={items.length} />
                                            </span>
                                        </div>

                                    </div>

                                    <div className="text-center mb-4 sm:mb-6">
                                        <Heart className="w-6 sm:w-8 h-6 sm:h-8 text-[#C75D3B] mx-auto mb-1 sm:mb-2" />
                                        <p className="text-xs sm:text-sm text-[#4A3B32]/70 font-medium">
                                            Fique apenas com o que amar!
                                        </p>
                                        <p className="text-xs text-[#4A3B32]/50 mt-1">
                                            Você terá alguns dias para decidir e só paga depois.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <h2 className="font-display text-lg sm:text-xl font-semibold text-[#4A3B32] mb-4 sm:mb-6">
                                    Finalizar Pedido
                                </h2>
                            )}

                            {step === 1 ? (
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-[#C75D3B] text-white rounded-full font-medium text-sm sm:text-base tracking-wide hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20 flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[56px]"
                                >
                                    Ir para a entrega
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !isFormValid}
                                        className={cn(
                                            'w-full px-6 sm:px-8 py-3 sm:py-4 bg-[#C75D3B] text-white rounded-full font-medium text-sm sm:text-base tracking-wide hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20 flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[56px]',
                                            (isSubmitting || !isFormValid) && 'opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        {isSubmitting ? (
                                            <span className="animate-pulse">Enviando...</span>
                                        ) : (
                                            <>
                                                <Gift className="w-4 sm:w-5 h-4 sm:h-5" />
                                                <span>Quero minha malinha!</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setStep(1)}
                                        className="w-full mt-2 sm:mt-3 py-2 text-[#C75D3B] hover:text-[#A64D31] transition-colors text-xs sm:text-sm font-medium min-h-[40px] flex items-center justify-center"
                                    >
                                        Voltar para revisão
                                    </button>
                                </>
                            )}

                            {/* Security note */}
                            <p className="text-xs text-center text-[#4A3B32]/40 mt-6">
                                🔒 Seus dados estão seguros e serão usados apenas para entrega
                            </p>
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </div>
    )
}
