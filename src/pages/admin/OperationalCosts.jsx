import { useEffect, useState } from 'react'
import { Save, CreditCard, Sparkles, AlertCircle } from 'lucide-react'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { useOperationalCostsStore } from '@/store/operational-costs-store'
import { cn } from '@/lib/utils'
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
    const [activeTab, setActiveTab] = useState('debit')

    useEffect(() => {
        initialize()
    }, [initialize])

    // Carregar taxas existentes do banco
    useEffect(() => {
        const feesMap = {}

        // Bandeiras de cartão
        const brands = ['visa', 'mastercard', 'amex', 'elo']

        // Métodos de pagamento (sem PIX)
        const methods = [
            { key: 'debit', label: 'Débito', type: 'debit' },
            { key: 'card_machine', label: 'Crédito à Vista', type: 'credit_debit' },
            { key: 'credito_parcelado', label: 'Crédito Parcelado', type: 'credit_parcelado' }
        ]

        // Inicializar todas as combinações
        methods.forEach(method => {
            if (method.type === 'debit') {
                // Débito: uma taxa por bandeira
                brands.forEach(brand => {
                    feesMap[`${method.key}_${brand}`] = 0
                })
            } else {
                // Crédito (vista ou parcelado): uma taxa por bandeira
                brands.forEach(brand => {
                    feesMap[`${method.key}_${brand}`] = 0
                })
            }
        })

        // Carregar valores do banco
        paymentFees.forEach(fee => {
            if (fee.paymentMethod === 'debit' || fee.paymentMethod === 'debito') {
                const key = `debit_${fee.cardBrand}`
                feesMap[key] = fee.feePercentage || 0
            } else if (fee.paymentMethod === 'card_machine') {
                const key = `card_machine_${fee.cardBrand}`
                feesMap[key] = fee.feePercentage || 0
            } else if (fee.paymentMethod === 'credito_parcelado') {
                const key = `credito_parcelado_${fee.cardBrand}`
                feesMap[key] = fee.feePercentage || 0
            }
        })

        setFees(feesMap)
    }, [paymentFees])

    const handleFeeChange = (method, brand, value) => {
        const key = `${method}_${brand}`
        setFees(prev => ({ ...prev, [key]: parseFloat(value) || 0 }))
    }

    const handleSaveFees = async () => {
        setSavingFees(true)

        // Converter de volta para array
        const feesArray = []
        const brands = ['visa', 'mastercard', 'amex', 'elo']

        // Débito
        brands.forEach(brand => {
            const value = fees[`debit_${brand}`]
            if (value > 0 || value === 0) {
                feesArray.push({
                    payment_method: 'debit',
                    card_brand: brand,
                    fee_percentage: value,
                    description: `Débito ${brand.charAt(0).toUpperCase() + brand.slice(1)}`
                })
            }
        })

        // Crédito à Vista
        brands.forEach(brand => {
            const value = fees[`card_machine_${brand}`]
            if (value > 0 || value === 0) {
                feesArray.push({
                    payment_method: 'card_machine',
                    card_brand: brand,
                    fee_percentage: value,
                    description: `Crédito à Vista ${brand.charAt(0).toUpperCase() + brand.slice(1)}`
                })
            }
        })

        // Crédito Parcelado
        brands.forEach(brand => {
            const value = fees[`credito_parcelado_${brand}`]
            if (value > 0 || value === 0) {
                feesArray.push({
                    payment_method: 'credito_parcelado',
                    card_brand: brand,
                    fee_percentage: value,
                    description: `Crédito Parcelado ${brand.charAt(0).toUpperCase() + brand.slice(1)}`
                })
            }
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

    const renderBrandInputs = (method, methodLabel) => (
        <div className="space-y-4">
            <h4 className="font-semibold text-[#4A3B32] text-lg">{methodLabel}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {brands.map(brand => (
                    <div key={`${method}_${brand}`} className="space-y-1">
                        <label className="text-xs text-[#4A3B32]/60 uppercase font-bold tracking-widest block">
                            {brand.charAt(0).toUpperCase() + brand.slice(1)}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={fees[`${method}_${brand}`] || 0}
                                onChange={(e) => handleFeeChange(method, brand, e.target.value)}
                                className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-sm text-[#4A3B32]"
                                placeholder="0.00"
                            />
                            <span className="text-sm font-medium text-[#4A3B32]/60">%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

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

            {/* Info Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3"
            >
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-blue-900 font-semibold">PIX não tem taxa</p>
                    <p className="text-xs text-blue-800 mt-1">PIX é sempre isento de taxas. Configure apenas as bandeiras de cartão que sua máquina aceita.</p>
                </div>
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
                                <p className="text-sm text-gray-500">Coloque a taxa em % para cada bandeira de cartão (débito, crédito à vista e parcelado)</p>
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
                                {savingFees ? 'Salvando...' : 'Salvar Taxas'}
                            </ShimmerButton>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 md:p-8">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 gap-2 p-1 bg-gray-100 rounded-2xl mb-8">
                                <TabsTrigger
                                    value="debit"
                                    className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#C75D3B] data-[state=active]:shadow-sm"
                                >
                                    🏦 Débito
                                </TabsTrigger>
                                <TabsTrigger
                                    value="credit"
                                    className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#C75D3B] data-[state=active]:shadow-sm"
                                >
                                    💳 Crédito Visa
                                </TabsTrigger>
                                <TabsTrigger
                                    value="installments"
                                    className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#C75D3B] data-[state=active]:shadow-sm"
                                >
                                    📅 Parcelado
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="debit" className="space-y-6 mt-6">
                                {renderBrandInputs('debit', 'Débito em Cartão')}
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                                    <strong>Nota:</strong> A taxa de débito é geralmente mais baixa que crédito.
                                </div>
                            </TabsContent>

                            <TabsContent value="credit" className="space-y-6 mt-6">
                                {renderBrandInputs('card_machine', 'Crédito à Vista em Cartão')}
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                                    <strong>Nota:</strong> Configure a taxa para compras à vista (1x sem parcelamento).
                                </div>
                            </TabsContent>

                            <TabsContent value="installments" className="space-y-6 mt-6">
                                {renderBrandInputs('credito_parcelado', 'Crédito Parcelado em Cartão')}
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                                    <strong>Nota:</strong> A mesma taxa se aplica a qualquer número de parcelas (2x, 3x, etc).
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
