import { useEffect, useState } from 'react'
import { Save, CreditCard, DollarSign, Sparkles } from 'lucide-react'
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

    const [fees, setFees] = useState([])
    const [feesLoading, setFeesLoading] = useState(true)
    const [savingFees, setSavingFees] = useState(false)
    const [activeBrand, setActiveBrand] = useState('visa')

    useEffect(() => {
        initialize()
    }, [initialize])

    useEffect(() => {
        // Convert the array of fee objects to a map for easier handling in the UI
        // Initialize with default values for all brands and payment methods
        const feesMap = {}

        // All brands that need to have fees configured
        const allBrands = ['visa', 'mastercard', 'amex', 'elo', 'pix', 'debito'];
        // All payment methods
        const paymentMethods = ['pix', 'debito', 'credito_vista', 'credito_2x', 'credito_3x', 'credito_4x', 'credito_5x', 'credito_6x'];

        // Initialize all combinations to 0
        allBrands.forEach(brand => {
            paymentMethods.forEach(method => {
                feesMap[`${brand}_${method}`] = 0;
            });
        });

        // Override with actual values from the database
        paymentFees.forEach(fee => {
            // Determine the brand (card brand or null for general methods)
            let brand = fee.card_brand || fee.payment_method;

            // Determine the payment method
            let method = fee.payment_method;

            // Handle specific installment methods
            if (fee.payment_method === 'credito_parcelado') {
                if (fee.description && fee.description.includes('2x')) {
                    method = 'credito_2x';
                } else if (fee.description && fee.description.includes('3x')) {
                    method = 'credito_3x';
                } else if (fee.description && fee.description.includes('4x')) {
                    method = 'credito_4x';
                } else if (fee.description && fee.description.includes('5x')) {
                    method = 'credito_5x';
                } else {
                    method = 'credito_6x'; // 6x+
                }
            }

            // Set the fee value
            feesMap[`${brand}_${method}`] = fee.fee_percentage;
        })

        setFees(feesMap)
    }, [paymentFees])

    const handleBrandFeeChange = (brand, method, value) => {
        const feeKey = `${brand}_${method}`;
        setFees(prev => ({ ...prev, [feeKey]: value }));
    }

    const handleSaveFees = async () => {
        // Convert the fees object back to an array of fee objects for the API
        let feesArray = []

        // All brands that need to have fees configured
        const allBrands = ['visa', 'mastercard', 'amex', 'elo', 'pix', 'debito'];
        // All payment methods
        const paymentMethods = ['pix', 'debito', 'credito_vista', 'credito_2x', 'credito_3x', 'credito_4x', 'credito_5x', 'credito_6x'];

        allBrands.forEach(brand => {
            paymentMethods.forEach(method => {
                const feeKey = `${brand}_${method}`;
                const feeValue = fees[feeKey];

                if (feeValue !== undefined && feeValue !== null) {
                    // Determine if this is a card brand (visa, mastercard, amex, elo) or general method
                    const isCardBrand = ['visa', 'mastercard', 'amex', 'elo'].includes(brand);

                    let paymentMethod = method;
                    let cardBrand = null;

                    // Map the internal method names to the actual payment methods
                    if (method === 'credito_2x') {
                        paymentMethod = 'credito_parcelado';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'credito_3x') {
                        paymentMethod = 'credito_parcelado';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'credito_4x') {
                        paymentMethod = 'credito_parcelado';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'credito_5x') {
                        paymentMethod = 'credito_parcelado';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'credito_6x') {
                        paymentMethod = 'credito_parcelado';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'credito_vista') {
                        paymentMethod = 'credito_vista';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'debito') {
                        paymentMethod = 'debito';
                        cardBrand = isCardBrand ? brand : null;
                    } else if (method === 'pix') {
                        paymentMethod = 'pix';
                        cardBrand = isCardBrand ? brand : null;
                    } else {
                        // Default case for other methods
                        paymentMethod = method;
                        cardBrand = isCardBrand ? brand : null;
                    }

                    feesArray.push({
                        payment_method: paymentMethod,
                        card_brand: cardBrand,
                        fee_percentage: feeValue,
                        description: `Taxa para ${method} ${cardBrand ? `na bandeira ${cardBrand}` : 'geral'}`
                    });
                }
            });
        });

        const result = await updatePaymentFees(feesArray)
        if (result.success) {
            toast.success('Taxas atualizadas com sucesso!')
        } else {
            toast.error(`Erro ao atualizar taxas: ${result.error}`)
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header Premium */}
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
                <p className="text-[#4A3B32]/60 font-medium">Configuração de taxas da Infinity Pay para todos os métodos de pagamento.</p>
            </motion.div>

            {/* Seção 1: Taxas da Maquininha */}
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
                                <span className="text-2xl font-display">Taxas Infinity Pay</span>
                            </CardTitle>
                            <p className="text-sm text-gray-500">Configure as taxas para cada bandeira e método de pagamento</p>
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
                <CardContent className="p-5 md:p-6">
                    <div className="space-y-6">
                        <Tabs value={activeBrand} onValueChange={setActiveBrand} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
                                <TabsTrigger value="visa" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#C75D3B] data-[state=active]:shadow-sm">
                                    💳 Visa
                                </TabsTrigger>
                                <TabsTrigger value="mastercard" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#C75D3B] data-[state=active]:shadow-sm">
                                    💳 Master
                                </TabsTrigger>
                                <TabsTrigger value="amex" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#C75D3B] data-[state=active]:shadow-sm">
                                    💳 Amex
                                </TabsTrigger>
                                <TabsTrigger value="elo" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#C75D3B] data-[state=active]:shadow-sm">
                                    💳 Elo
                                </TabsTrigger>
                                <TabsTrigger value="pix" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#C75D3B] data-[state=active]:shadow-sm">
                                    📱 PIX
                                </TabsTrigger>
                                <TabsTrigger value="debito" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#C75D3B] data-[state=active]:shadow-sm">
                                    🏦 Débito
                                </TabsTrigger>
                            </TabsList>

                            {['visa', 'mastercard', 'amex', 'elo', 'pix', 'debito'].map((brand) => (
                                <TabsContent key={brand} value={brand}>
                                    <div className="space-y-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                        <h4 className="font-bold text-lg text-[#4A3B32] capitalize">
                                            {brand === 'debito' ? 'Débito' : brand === 'pix' ? 'PIX' : brand}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-600 font-medium block uppercase tracking-widest">PIX (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                    placeholder="0.00"
                                                    value={fees[`${brand}_pix`] || 0}
                                                    onChange={(e) => handleBrandFeeChange(brand, 'pix', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-600 font-medium block uppercase tracking-widest">Débito (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                    placeholder="0.00"
                                                    value={fees[`${brand}_debito`] || 0}
                                                    onChange={(e) => handleBrandFeeChange(brand, 'debito', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-600 font-medium block uppercase tracking-widest">Crédito à Vista (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                    placeholder="0.00"
                                                    value={fees[`${brand}_credito_vista`] || 0}
                                                    onChange={(e) => handleBrandFeeChange(brand, 'credito_vista', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-600 font-medium block uppercase tracking-widest">Crédito 2x (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                    placeholder="0.00"
                                                    value={fees[`${brand}_credito_2x`] || 0}
                                                    onChange={(e) => handleBrandFeeChange(brand, 'credito_2x', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-600 font-medium block uppercase tracking-widest">Crédito 3x (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                    placeholder="0.00"
                                                    value={fees[`${brand}_credito_3x`] || 0}
                                                    onChange={(e) => handleBrandFeeChange(brand, 'credito_3x', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-600 font-medium block uppercase tracking-widest">Crédito 4x (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                    placeholder="0.00"
                                                    value={fees[`${brand}_credito_4x`] || 0}
                                                    onChange={(e) => handleBrandFeeChange(brand, 'credito_4x', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-600 font-medium block uppercase tracking-widest">Crédito 5x (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                    placeholder="0.00"
                                                    value={fees[`${brand}_credito_5x`] || 0}
                                                    onChange={(e) => handleBrandFeeChange(brand, 'credito_5x', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-600 font-medium block uppercase tracking-widest">Crédito 6x+ (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-bold text-[#4A3B32]"
                                                    placeholder="0.00"
                                                    value={fees[`${brand}_credito_6x`] || 0}
                                                    onChange={(e) => handleBrandFeeChange(brand, 'credito_6x', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>

                        <div className="p-4 bg-blue-50 rounded-xl">
                            <p className="text-sm text-blue-800 font-medium">
                                💡 <strong>Dica:</strong> Use as abas acima para alternar entre bandeiras. Configure as taxas específicas para cada método de pagamento.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            </motion.div>
        </div>
    )
}