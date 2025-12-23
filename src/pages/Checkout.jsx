import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Plus, ArrowLeft, MessageCircle, ShoppingBag, Check, Heart, Truck, Gift } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { generateWhatsAppLink, formatMalinhaMessage, cn } from '@/lib/utils'
import { useAdminStore } from '@/store/admin-store'
import { Badge } from '@/components/ui/Badge'

export function Checkout() {
    const { items, removeItem, clearItems, customerData, setCustomerData, setAddressData } = useMalinhaStore()
    const { addOrder } = useAdminStore()
    const [step, setStep] = useState(items.length > 0 ? 1 : 0) // 0: empty, 1: review, 2: form
    const [isSubmitting, setIsSubmitting] = useState(false)

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

    const handleSubmit = async (e) => {
        e.preventDefault()

        const address = customerData?.addresses?.[0] || {};
        if (!customerData.name || !customerData.phone || !address.street || !address.number || !address.neighborhood || !address.city || !address.zipCode) {
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
                items: items,
                itemsCount: items.length,
                notes: customerData.notes
            }

            const result = await addOrder(orderPayload)

            if (!result.success) {
                console.error("Erro ao registrar pedido no sistema:", result.error)
                // We proceed to WhatsApp anyway as it's the main channel
            }

            // 2. Generate WhatsApp message
            const message = formatMalinhaMessage(items, customerData)
            const whatsappLink = generateWhatsAppLink('+5511999999999', message) // Replace with actual number

            // 3. Open WhatsApp
            window.open(whatsappLink, '_blank')

            setIsSubmitting(false)
        } catch (error) {
            console.error("Falha no checkout:", error)
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

                {/* Steps */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {[
                        { num: 1, label: 'Revisar' },
                        { num: 2, label: 'Dados' },
                    ].map((s, i) => (
                        <div key={s.num} className="flex items-center gap-2">
                            <div
                                className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                                    step >= s.num
                                        ? 'bg-[#C75D3B] text-white'
                                        : 'bg-[#E8C4B0] text-[#4A3B32]'
                                )}
                            >
                                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                            </div>
                            <span className={cn(
                                'text-sm font-medium',
                                step >= s.num ? 'text-[#4A3B32]' : 'text-[#4A3B32]/50'
                            )}>
                                {s.label}
                            </span>
                            {i < 1 && <div className="w-12 h-0.5 bg-[#E8C4B0] mx-2" />}
                        </div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Items List */}
                    <div className="lg:col-span-2">
                        {step === 1 ? (
                            // Step 1: Review items
                            <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#4A3B32]/5 p-4 sm:p-6">
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
                            </div>
                        ) : (
                            // Step 2: Customer Form
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#4A3B32]/5">
                                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                    <h2 className="font-display text-xl font-semibold text-[#4A3B32] mb-4">
                                        Seus Dados
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[#4A3B32] mb-1">Nome completo *</label>
                                            <input type="text" name="name" value={customerData.name || ''} onChange={handleInputChange} required className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1" placeholder="Seu nome" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#4A3B32] mb-1">WhatsApp *</label>
                                            <input type="tel" name="phone" value={customerData.phone || ''} onChange={handleInputChange} required className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1" placeholder="(11) 99999-9999" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#4A3B32] mb-1">E-mail</label>
                                            <input type="email" name="email" value={customerData.email || ''} onChange={handleInputChange} className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1" placeholder="seu@email.com" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#4A3B32] mb-1">CPF (Opcional)</label>
                                            <input type="text" name="cpf" value={customerData.cpf || ''} onChange={handleInputChange} className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1" placeholder="000.000.000-00" />
                                        </div>
                                    </div>
                                    
                                    <hr className="my-4 border-gray-100" />

                                    <h3 className="font-display text-lg font-semibold text-[#4A3B32] pt-2">Endereço de Entrega</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium text-[#4A3B32] mb-1">Rua *</label>
                                            <input type="text" name="street" value={address.street || ''} onChange={handleAddressChange} required className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-[#4A3B32] mb-1">Número *</label>
                                            <input type="text" name="number" value={address.number || ''} onChange={handleAddressChange} required className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1" />
                                        </div>
                                         <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-[#4A3B32] mb-1">Bairro *</label>
                                            <input type="text" name="neighborhood" value={address.neighborhood || ''} onChange={handleAddressChange} required className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1" />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-[#4A3B32] mb-1">Complemento</label>
                                            <input type="text" name="complement" value={address.complement || ''} onChange={handleAddressChange} className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1" />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-[#4A3B32] mb-1">Cidade *</label>
                                            <input type="text" name="city" value={address.city || ''} onChange={handleAddressChange} required className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1" />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-[#4A3B32] mb-1">CEP *</label>
                                            <input type="text" name="zipCode" value={address.zipCode || ''} onChange={handleAddressChange} required className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1" />
                                        </div>
                                    </div>

                                    <hr className="my-4 border-gray-100" />

                                    <div>
                                        <label className="block text-sm font-medium text-[#4A3B32] mb-1">Observações</label>
                                        <textarea name="notes" value={customerData.notes || ''} onChange={handleInputChange} rows={2} className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#C75D3B] focus:ring-0 outline-none transition-colors duration-300 py-3 px-1 resize-none" placeholder="Preferência de horário, instruções..."></textarea>
                                    </div>
                                </form>
                            </div>
                        )}
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
                                            <span className="font-bold text-[#4A3B32]">{items.length}</span>
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
