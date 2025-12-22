import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ArrowLeft, MessageCircle, ShoppingBag, Check } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatPrice, generateWhatsAppLink, formatMalinhaMessage, cn } from '@/lib/utils'
import { useAdminStore } from '@/store/admin-store'

export function Checkout() {
    const { items, removeItem, clearItems, customerData, setCustomerData } = useMalinhaStore()
    const { addOrder } = useAdminStore()
    const [step, setStep] = useState(items.length > 0 ? 1 : 0) // 0: empty, 1: review, 2: form
    const [isSubmitting, setIsSubmitting] = useState(false)

    const totalPrice = items.reduce((sum, item) => sum + item.price, 0)

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setCustomerData({ [name]: value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!customerData.name || !customerData.phone || !customerData.address) {
            return
        }

        setIsSubmitting(true)

        try {
            // 1. Save order to Admin System (JSON/LocalStorage)
            const orderPayload = {
                customer: {
                    name: customerData.name,
                    phone: customerData.phone,
                    email: customerData.email || '',
                    address: customerData.address,
                    complement: customerData.complement || ''
                },
                items: items,
                totalValue: totalPrice,
                itemsCount: items.length
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

            // 4. Optional: clear cart after success
            // clearItems()

            setIsSubmitting(false)
        } catch (error) {
            console.error("Falha no checkout:", error)
            setIsSubmitting(false)
        }
    }

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
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#4A3B32]/5">
                            {step === 1 ? (
                                // Step 1: Review items
                                <div className="divide-y divide-[#E8C4B0]/30">
                                    {items.map((item) => (
                                        <div key={item.itemId} className="p-4 flex gap-4 group">
                                            <div className="w-20 h-24 rounded-lg overflow-hidden flex-shrink-0">
                                                <img
                                                    src={item.images[0]}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-[#4A3B32] line-clamp-1">
                                                    {item.name}
                                                </h3>
                                                <p className="text-sm text-[#4A3B32]/60 mt-1">
                                                    Tamanho: {item.selectedSize}
                                                </p>
                                                <p className="text-[#C75D3B] font-semibold mt-1">
                                                    {formatPrice(item.price)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.itemId)}
                                                className="p-2 text-[#4A3B32]/40 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Step 2: Customer Form
                                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                    <h2 className="font-display text-xl font-semibold text-[#4A3B32] mb-4">
                                        Seus Dados
                                    </h2>

                                    <div>
                                        <label className="block text-sm font-medium text-[#4A3B32] mb-2">
                                            Nome completo *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={customerData.name}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-[#E8C4B0] focus:border-[#C75D3B] focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                                            placeholder="Seu nome"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#4A3B32] mb-2">
                                            WhatsApp *
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={customerData.phone}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-[#E8C4B0] focus:border-[#C75D3B] focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                                            placeholder="(11) 99999-9999"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#4A3B32] mb-2">
                                            Endereço de entrega *
                                        </label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={customerData.address}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-[#E8C4B0] focus:border-[#C75D3B] focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                                            placeholder="Rua, número, bairro, cidade"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#4A3B32] mb-2">
                                            Complemento
                                        </label>
                                        <input
                                            type="text"
                                            name="complement"
                                            value={customerData.complement}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl border border-[#E8C4B0] focus:border-[#C75D3B] focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                                            placeholder="Apartamento, bloco..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#4A3B32] mb-2">
                                            Observações
                                        </label>
                                        <textarea
                                            name="notes"
                                            value={customerData.notes}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-xl border border-[#E8C4B0] focus:border-[#C75D3B] focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all resize-none"
                                            placeholder="Preferência de horário, instruções de entrega..."
                                        />
                                    </div>
                                </form>
                            )}
                        </div>

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
                        <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24 border border-[#4A3B32]/5">
                            <h2 className="font-display text-xl font-semibold text-[#4A3B32] mb-6">
                                Resumo
                            </h2>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-[#4A3B32]/60">
                                    <span>Peças selecionadas</span>
                                    <span>{items.length}</span>
                                </div>
                                <div className="flex justify-between text-[#4A3B32]/60">
                                    <span>Valor total das peças</span>
                                    <span>{formatPrice(totalPrice)}</span>
                                </div>
                                <div className="flex justify-between text-[#4A3B32]/60">
                                    <span>Frete</span>
                                    <span className="text-green-600 font-medium">Grátis</span>
                                </div>
                            </div>

                            <div className="border-t border-[#E8C4B0] pt-4 mb-6">
                                <div className="flex justify-between font-semibold text-[#4A3B32]">
                                    <span>Valor estimado</span>
                                    <span className="text-[#C75D3B]">{formatPrice(totalPrice)}</span>
                                </div>
                                <p className="text-xs text-[#4A3B32]/40 mt-2">
                                    * Você só paga pelas peças que decidir ficar
                                </p>
                            </div>

                            {step === 1 ? (
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full px-8 py-3 bg-[#C75D3B] text-white rounded-full font-medium tracking-wide hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20 flex items-center justify-center gap-2"
                                >
                                    Continuar
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !customerData.name || !customerData.phone || !customerData.address}
                                        className={cn(
                                            'w-full px-8 py-3 bg-[#C75D3B] text-white rounded-full font-medium tracking-wide hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20 flex items-center justify-center gap-2',
                                            (isSubmitting || !customerData.name || !customerData.phone || !customerData.address) && 'opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        {isSubmitting ? (
                                            <span className="animate-pulse">Enviando...</span>
                                        ) : (
                                            <>
                                                <MessageCircle className="w-5 h-5" />
                                                Enviar pelo WhatsApp
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
