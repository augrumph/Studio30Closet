import { useEffect, useState } from 'react'
import { Save, CreditCard, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'

export function PaymentFeesConfig() {
    const [fees, setFees] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const cardBrands = [
        { id: 'visa', name: 'Visa', icon: '💳', color: 'from-blue-500 to-blue-600' },
        { id: 'mastercard', name: 'Mastercard', icon: '💳', color: 'from-red-500 to-orange-500' },
        { id: 'amex', name: 'American Express', icon: '💳', color: 'from-blue-700 to-blue-800' },
        { id: 'elo', name: 'Elo', icon: '💳', color: 'from-yellow-500 to-yellow-600' }
    ]

    const paymentMethods = [
        { id: 'card_machine', name: 'Máquina (Cartão Físico)', icon: '🏪' },
        { id: 'payment_link', name: 'Link de Pagamento Online', icon: '🔗' }
    ]

    const generalMethods = [
        { id: 'pix', name: 'PIX', icon: '📱', cardBrand: null },
        { id: 'cash', name: 'Dinheiro', icon: '💵', cardBrand: null },
        { id: 'fiado', name: 'Crediário', icon: '🤝', cardBrand: null }
    ]

    useEffect(() => {
        loadFees()
    }, [])

    const loadFees = async () => {
        try {
            const { data, error } = await supabase
                .from('payment_fees')
                .select('*')
                .order('payment_method', { ascending: true })

            if (error) throw error
            setFees(data || [])
        } catch (error) {
            console.error('Erro ao carregar taxas:', error)
            toast.error('Erro ao carregar taxas')
        } finally {
            setLoading(false)
        }
    }

    const getFeeValue = (paymentMethod, cardBrand = null) => {
        const fee = fees.find(f =>
            f.payment_method === paymentMethod &&
            (cardBrand === null ? f.card_brand === null : f.card_brand === cardBrand)
        )
        return fee?.fee_percentage || 0
    }

    const updateFeeValue = (paymentMethod, cardBrand, value) => {
        const numValue = parseFloat(value) || 0

        setFees(prev => {
            const existingIndex = prev.findIndex(f =>
                f.payment_method === paymentMethod &&
                (cardBrand === null ? f.card_brand === null : f.card_brand === cardBrand)
            )

            if (existingIndex >= 0) {
                const updated = [...prev]
                updated[existingIndex] = { ...updated[existingIndex], fee_percentage: numValue }
                return updated
            } else {
                return [...prev, {
                    payment_method: paymentMethod,
                    card_brand: cardBrand,
                    fee_percentage: numValue,
                    fee_fixed: 0,
                    is_active: true
                }]
            }
        })
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Deletar todas as taxas existentes
            await supabase.from('payment_fees').delete().neq('id', 0)

            // Inserir todas as taxas atualizadas
            const { error } = await supabase
                .from('payment_fees')
                .insert(fees.map(f => ({
                    payment_method: f.payment_method,
                    card_brand: f.card_brand,
                    fee_percentage: f.fee_percentage,
                    fee_fixed: f.fee_fixed || 0,
                    is_active: f.is_active !== false,
                    description: `${f.payment_method} - ${f.card_brand || 'Geral'}`
                })))

            if (error) throw error

            toast.success('Taxas salvas com sucesso!')
            await loadFees()
        } catch (error) {
            console.error('Erro ao salvar taxas:', error)
            toast.error('Erro ao salvar taxas')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C75D3B]"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-display font-semibold text-[#4A3B32] tracking-tight">
                        Configuração de Taxas
                    </h2>
                    <p className="text-[#4A3B32]/40 font-medium italic">
                        Configure as taxas para cada bandeira e método de pagamento
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-4 bg-[#C75D3B] text-white rounded-2xl font-bold hover:bg-[#A64D31] transition-all shadow-xl shadow-[#C75D3B]/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Salvando...' : 'Salvar Todas as Taxas'}
                </button>
            </div>

            {/* Taxas Gerais (PIX, Dinheiro, Crediário) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Taxas Gerais (Sem Bandeira)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                        {generalMethods.map(method => (
                            <div key={method.id} className="space-y-2">
                                <label className="text-sm font-bold text-[#4A3B32] flex items-center gap-2">
                                    <span className="text-2xl">{method.icon}</span>
                                    {method.name}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={getFeeValue(method.id, null)}
                                        onChange={(e) => updateFeeValue(method.id, null, e.target.value)}
                                        className="w-full px-4 py-3 pr-12 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-[#4A3B32]"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4A3B32]/40 font-bold">
                                        %
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Taxas por Bandeira */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[#C75D3B]" />
                        Taxas por Bandeira de Cartão
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="visa" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 mb-8">
                            {cardBrands.map(brand => (
                                <TabsTrigger
                                    key={brand.id}
                                    value={brand.id}
                                    className="flex items-center gap-2"
                                >
                                    <span className="text-xl">{brand.icon}</span>
                                    <span className="hidden sm:inline">{brand.name}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {cardBrands.map(brand => (
                            <TabsContent key={brand.id} value={brand.id} className="space-y-6">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "p-6 rounded-2xl bg-gradient-to-br text-white",
                                        brand.color
                                    )}
                                >
                                    <h3 className="text-2xl font-bold mb-2">{brand.name}</h3>
                                    <p className="text-white/80">Configure as taxas para esta bandeira</p>
                                </motion.div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {paymentMethods.map(method => (
                                        <div key={method.id} className="space-y-3 p-6 bg-gray-50 rounded-2xl">
                                            <label className="text-sm font-bold text-[#4A3B32] flex items-center gap-2">
                                                <span className="text-xl">{method.icon}</span>
                                                {method.name}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={getFeeValue(method.id, brand.id)}
                                                    onChange={(e) => updateFeeValue(method.id, brand.id, e.target.value)}
                                                    className="w-full px-4 py-4 pr-12 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 focus:border-[#C75D3B] outline-none font-bold text-[#4A3B32] text-lg"
                                                    placeholder="0.00"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4A3B32]/40 font-bold text-lg">
                                                    %
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#4A3B32]/60">
                                                Taxa percentual cobrada neste método
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
