import { useEffect, useState } from 'react'
import { Save, CreditCard, Sparkles } from 'lucide-react'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { useOperationalCostsStore } from '@/store/operational-costs-store'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

export function OperationalCosts() {
    const {
        paymentFees,
        updatePaymentFees,
        initialize
    } = useOperationalCostsStore()

    const [fees, setFees] = useState({})
    const [savingFees, setSavingFees] = useState(false)
    const [activeBrand, setActiveBrand] = useState('visa')

    useEffect(() => {
        initialize()
    }, [initialize])

    // Carregar taxas existentes do banco
    useEffect(() => {
        const feesMap = {}

        // Bandeiras de cartão
        const brands = ['visa', 'mastercard', 'amex', 'elo']

        // Métodos de pagamento (sem PIX que é sempre 0)
        const methods = ['debit', 'credito_vista', 'credito_2x', 'credito_3x', 'credito_4x', 'credito_5x', 'credito_6x']

        // Inicializar todas as combinações com 0
        brands.forEach(brand => {
            methods.forEach(method => {
                feesMap[`${brand}_${method}`] = 0
            })
        })

        // Carregar valores do banco
        paymentFees.forEach(fee => {
            const brand = fee.cardBrand

            // Mapear payment_method para nossa estrutura interna
            let method = fee.paymentMethod

            // Converter para nossa chave interna
            if (fee.paymentMethod === 'debit' || fee.paymentMethod === 'debito') {
                method = 'debit'
            } else if (fee.paymentMethod === 'card_machine') {
                method = 'credito_vista'
            } else if (fee.paymentMethod === 'credito_parcelado') {
                // Detectar o número de parcelas pela description
                if (fee.description && fee.description.includes('2x')) method = 'credito_2x'
                else if (fee.description && fee.description.includes('3x')) method = 'credito_3x'
                else if (fee.description && fee.description.includes('4x')) method = 'credito_4x'
                else if (fee.description && fee.description.includes('5x')) method = 'credito_5x'
                else method = 'credito_6x'
            }

            if (brand) {
                const key = `${brand}_${method}`
                feesMap[key] = fee.feePercentage || 0
            }
        })

        setFees(feesMap)
    }, [paymentFees])

    const handleFeeChange = (brand, method, value) => {
        const key = `${brand}_${method}`
        setFees(prev => ({ ...prev, [key]: parseFloat(value) || 0 }))
    }

    const handleSaveFees = async () => {
        setSavingFees(true)

        const feesArray = []
        const brands = ['visa', 'mastercard', 'amex', 'elo']

        brands.forEach(brand => {
            // Débito
            feesArray.push({
                payment_method: 'debit',
                card_brand: brand,
                fee_percentage: fees[`${brand}_debit`] || 0,
                description: `Débito ${brand.charAt(0).toUpperCase() + brand.slice(1)}`
            })

            // Crédito à Vista
            feesArray.push({
                payment_method: 'card_machine',
                card_brand: brand,
                fee_percentage: fees[`${brand}_credito_vista`] || 0,
                description: `Crédito à Vista ${brand.charAt(0).toUpperCase() + brand.slice(1)}`
            })

            // Crédito Parcelado (cada uma das parcelas)
            const installmentMethods = [
                { key: 'credito_2x', label: '2x' },
                { key: 'credito_3x', label: '3x' },
                { key: 'credito_4x', label: '4x' },
                { key: 'credito_5x', label: '5x' },
                { key: 'credito_6x', label: '6x+' }
            ]

            installmentMethods.forEach(inst => {
                feesArray.push({
                    payment_method: 'credito_parcelado',
                    card_brand: brand,
                    fee_percentage: fees[`${brand}_${inst.key}`] || 0,
                    description: `Crédito Parcelado ${inst.label} ${brand.charAt(0).toUpperCase() + brand.slice(1)}`
                })
            })
        })

        const result = await updatePaymentFees(feesArray)
        setSavingFees(false)

        if (result.success) {
            toast.success('Taxas salvas com sucesso!')
        } else {
            toast.error(`Erro ao salvar: ${result.error}`)
        }
    }

    const brands = ['visa', 'mastercard', 'amex', 'elo']
    const installmentOptions = [
        { key: 'credito_2x', label: '2x' },
        { key: 'credito_3x', label: '3x' },
        { key: 'credito_4x', label: '4x' },
        { key: 'credito_5x', label: '5x' },
        { key: 'credito_6x', label: '6x+' }
    ]

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
            >
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-[#C75D3B] to-[#A64D31] rounded-2xl shadow-lg">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Taxas de Pagamento</h2>
                </div>
                <p className="text-[#4A3B32]/60 font-medium">Configure as taxas de máquina para cada bandeira e método de pagamento.</p>
            </motion.div>

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="border-none shadow-xl bg-gradient-to-br from-white via-white to-orange-50/30 overflow-hidden">
                    <CardHeader className="border-b border-gray-100">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <CardTitle className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                                        <CreditCard className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-2xl font-display">Taxas de Máquina</span>
                                </CardTitle>
                                <p className="text-sm text-gray-500">Cada bandeira tem sua própria taxa para cada tipo de pagamento</p>
                            </div>
                            <ShimmerButton
                                onClick={handleSaveFees}
                                disabled={savingFees}
                                className="px-8 py-4 rounded-2xl font-bold shadow-2xl disabled:opacity-50"
                                shimmerColor="#ffffff"
                                shimmerSize="0.15em"
                                borderRadius="16px"
                                shimmerDuration="2s"
                                background="linear-gradient(135deg, #4A3B32 0%, #342922 100%)"
                            >
                                <Save className="w-5 h-5 mr-2" />
                                {savingFees ? 'Salvando...' : 'Salvar Todas as Taxas'}
                            </ShimmerButton>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 md:p-8">
                        <Tabs value={activeBrand} onValueChange={setActiveBrand} className="w-full">
                            {/* Abas das Bandeiras */}
                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-gray-100 rounded-2xl mb-8">
                                {brands.map(brand => (
                                    <TabsTrigger
                                        key={brand}
                                        value={brand}
                                        className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#C75D3B] data-[state=active]:shadow-sm capitalize"
                                    >
                                        💳 {brand === 'mastercard' ? 'Mastercard' : brand.charAt(0).toUpperCase() + brand.slice(1)}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* Conteúdo por Bandeira */}
                            {brands.map(brand => (
                                <TabsContent key={brand} value={brand} className="space-y-6 mt-6">
                                    <h3 className="text-xl font-semibold text-[#4A3B32] capitalize">
                                        Taxas para {brand === 'mastercard' ? 'Mastercard' : brand.charAt(0).toUpperCase() + brand.slice(1)}
                                    </h3>

                                    {/* Débito */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#4A3B32] block">🏦 Débito</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={fees[`${brand}_debit`] || 0}
                                                onChange={(e) => handleFeeChange(brand, 'debit', e.target.value)}
                                                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-[#4A3B32]"
                                                placeholder="0.00"
                                            />
                                            <span className="text-sm font-bold text-[#4A3B32]/60 w-8">%</span>
                                        </div>
                                    </div>

                                    {/* Crédito à Vista */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#4A3B32] block">💳 Crédito à Vista (1x)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={fees[`${brand}_credito_vista`] || 0}
                                                onChange={(e) => handleFeeChange(brand, 'credito_vista', e.target.value)}
                                                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-[#4A3B32]"
                                                placeholder="0.00"
                                            />
                                            <span className="text-sm font-bold text-[#4A3B32]/60 w-8">%</span>
                                        </div>
                                    </div>

                                    {/* Crédito Parcelado */}
                                    <div className="space-y-4 pt-4 border-t border-gray-200">
                                        <label className="text-sm font-bold text-[#4A3B32] block">📅 Crédito Parcelado</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                            {installmentOptions.map(inst => (
                                                <div key={inst.key} className="space-y-1">
                                                    <label className="text-xs font-bold text-[#4A3B32]/60 uppercase tracking-widest block">
                                                        {inst.label}
                                                    </label>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            max="100"
                                                            value={fees[`${brand}_${inst.key}`] || 0}
                                                            onChange={(e) => handleFeeChange(brand, inst.key, e.target.value)}
                                                            className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-sm text-[#4A3B32]"
                                                            placeholder="0"
                                                        />
                                                        <span className="text-xs font-bold text-[#4A3B32]/60">%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>

                        {/* Info */}
                        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800 space-y-1">
                            <p><strong>💡 Nota:</strong> PIX não tem taxa (sempre 0%)</p>
                            <p><strong>📝 Exemplo:</strong> Se Visa débito é 1.5%, coloque 1.5 no campo</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
