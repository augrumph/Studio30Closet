import { useState, useCallback } from 'react'
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

export function Checkout() {
    const { items, removeItem, clearItems, customerData, setCustomerData, setAddressData } = useMalinhaStore()
    const { addOrder } = useAdminStore()
    const toast = useToast()
    const [step, setStep] = useState(items.length > 0 ? 1 : 0) // 0: empty, 1: review, 2: form
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formErrors, setFormErrors] = useState({})
    const [loadingCep, setLoadingCep] = useState(false)
    const [cepError, setCepError] = useState('')

    const itemSummary = items.reduce((acc, item) => {
        const key = `${item.name}-${item.selectedSize}`; // Group by name and size
        if (acc[key]) {
            acc[key].count += 1;
            acc[key].itemIds.push(item.itemId);
        } else {
            acc[key] = {
                ...item,
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
            const orderPayload = {
                customer: {
                    name: customerData.name,
                    phone: customerData.phone,
                    email: customerData.email,
                    cpf: customerData.cpf,
                    addresses: customerData.addresses,
                },
                items: groupedItems.map(item => ({
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.count,
                    selectedSize: item.selectedSize,
                    images: item.images,
                    costPrice: item.costPrice,
                })),
                notes: customerData.notes
            }

            console.log('📤 Checkout - Sending order payload:', orderPayload);
            console.log('🛒 Grouped items detail:', groupedItems);

            const result = await addOrder(orderPayload)

            console.log('📥 Checkout - Received result:', result);

            if (!result.success) {
                console.error("Erro ao registrar pedido no sistema:", result.error)
                toast.warning('Pedido não foi salvo no sistema, mas prosseguindo com WhatsApp')
            }

            // 2. Generate WhatsApp message
            const message = formatMalinhaMessage(groupedItems, customerData)
            const whatsappLink = generateWhatsAppLink('+5511999999999', message) // Replace with actual number

            // 3. Open WhatsApp
            window.open(whatsappLink, '_blank')

            // 4. Trigger success effects
            triggerFireworks()
            toast.success('Pedido enviado! Aguarde o contato via WhatsApp.')

            // Clear cart after successful submission
            setTimeout(() => {
                clearItems()
            }, 2000)

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
            <div className="min-h-screen bg-[#FDFBF7] pt-24 flex items-center justify-center">
                <div className="container-custom">
                    <div className="max-w-md mx-auto text-center py-16">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <ShoppingBag className="w-10 h-10 text-[#C75D3B]" />
                        </div>
                        <h1 className="font-display text-3xl font-semibold text-[#4A3B32] mb-4">
                            Sua malinha está vazia
                        </h1>
                        <p className="text-[#4A3B32]/60 mb-8">
                            Navegue pelo catálogo e adicione até 20 peças para experimentar em casa.
                        </p>
                        <Link to="/catalogo" className="inline-flex items-center gap-2 px-8 py-3 bg-[#C75D3B] text-white rounded-full font-medium tracking-wide hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20">
                            <ArrowLeft className="w-5 h-5" />
                            Ver catálogo
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] pt-24">
            <div className="container-custom py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-display text-3xl font-semibold text-[#4A3B32]">
                            Sua Malinha
                        </h1>
                        <p className="text-[#4A3B32]/60 mt-1">
                            {items.length}/20 peças selecionadas
                        </p>
                    </div>
                    <Link
                        to="/catalogo"
                        className="flex items-center gap-2 text-[#C75D3B] hover:text-[#A64D31] transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Adicionar mais
                    </Link>
                </div>

                {/* Steps Indicator */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {[
                        { num: 1, label: 'Revisar', icon: ShoppingBag },
                        { num: 2, label: 'Dados', icon: Truck },
                    ].map((s, i) => (
                        <div key={s.num} className="flex items-center gap-2">
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
                                'text-sm font-bold transition-colors duration-300',
                                step >= s.num ? 'text-[#4A3B32]' : 'text-[#4A3B32]/40'
                            )}>
                                {s.label}
                            </span>
                            {i < 1 && (
                                <div className="relative w-16 h-1 bg-gray-200 rounded-full mx-2 overflow-hidden">
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

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Items List */}
                    <div className="lg:col-span-2">
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
                                            <div className="aspect-[3/4] rounded-xl overflow-hidden relative">
                                                <img
                                                    src={item.images[0]}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                                                className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm text-gray-500 hover:bg-white hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
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
                                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                    <h2 className="font-display text-xl font-semibold text-[#4A3B32] mb-4">
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
                                    
                                    <hr className="my-4 border-gray-100" />

                                    <h3 className="font-display text-lg font-semibold text-[#4A3B32] pt-2">Endereço de Entrega</h3>
                                    
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

                                    <hr className="my-4 border-gray-100" />

                                    <div>
                                        <label className="block text-sm font-medium text-[#4A3B32] mb-1">Observações</label>
                                        <textarea name="notes" value={customerData.notes || ''} onChange={handleInputChange} rows={2} className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1 resize-none" placeholder="Preferência de horário, instruções..."></textarea>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                        </AnimatePresence>
                        {/* Clear All */}
                        {step === 1 && (
                            <button
                                onClick={clearItems}
                                className="mt-4 text-sm text-[#4A3B32]/50 hover:text-red-500 transition-colors"
                            >
                                Limpar toda a malinha
                            </button>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-6 sticky top-24 border border-[#4A3B32]/5">
                            {step === 1 ? (
                                <>
                                    <h2 className="font-display text-xl font-semibold text-[#4A3B32] mb-4 text-center">
                                        Sua Malinha
                                    </h2>
                                    <p className="text-center text-[#4A3B32]/60 mb-6 text-sm">
                                        Uma curadoria de estilo para você experimentar no conforto de casa.
                                    </p>

                                    <div className="bg-[#FDFBF7] rounded-xl p-4 space-y-4 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Gift className="w-5 h-5 text-[#C75D3B]" />
                                                <span className="font-medium text-[#4A3B32]">Peças na malinha</span>
                                            </div>
                                            <span className="font-bold text-2xl text-[#C75D3B]">
                                                <NumberTicker value={items.length} />
                                            </span>
                                        </div>

                                    </div>

                                    <div className="text-center mb-6">
                                        <Heart className="w-8 h-8 text-[#C75D3B] mx-auto mb-2" />
                                        <p className="text-sm text-[#4A3B32]/70 font-medium">
                                            Fique apenas com o que amar!
                                        </p>
                                        <p className="text-xs text-[#4A3B32]/50 mt-1">
                                            Você terá alguns dias para decidir e só paga depois.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <h2 className="font-display text-xl font-semibold text-[#4A3B32] mb-6">
                                    Finalizar Pedido
                                </h2>
                            )}

                            {step === 1 ? (
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full px-8 py-3 bg-[#C75D3B] text-white rounded-full font-medium tracking-wide hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20 flex items-center justify-center gap-2"
                                >
                                    Ir para a entrega
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !isFormValid}
                                        className={cn(
                                            'w-full px-8 py-3 bg-[#C75D3B] text-white rounded-full font-medium tracking-wide hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20 flex items-center justify-center gap-2',
                                            (isSubmitting || !isFormValid) && 'opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        {isSubmitting ? (
                                            <span className="animate-pulse">Enviando...</span>
                                        ) : (
                                            <>
                                                <Gift className="w-5 h-5" />
                                                Quero minha malinha!
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setStep(1)}
                                        className="w-full mt-3 text-[#C75D3B] hover:text-[#A64D31] transition-colors text-sm"
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
                </div>
            </div>
        </div>
    )
}
