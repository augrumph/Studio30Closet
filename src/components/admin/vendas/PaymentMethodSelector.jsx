import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Constantes de métodos de pagamento
export const PAYMENT_METHODS = [
    { value: 'pix', label: 'PIX' },
    { value: 'debit', label: 'Débito' },
    { value: 'card_machine', label: 'Crédito à Vista' },
    { value: 'credito_parcelado', label: 'Crédito Parcelado (Máquina)' },
    { value: 'fiado_parcelado', label: 'Crediário Parcelado' },
    { value: 'fiado', label: 'Crediário (À Vista)' },
    { value: 'cash', label: 'Dinheiro Espécie' }
]

export const CARD_BRANDS = ['visa', 'mastercard', 'elo']

/**
 * Componente para seleção de método de pagamento
 */
export function PaymentMethodSelector({
    value,
    onChange,
    cardBrand,
    onCardBrandChange,
    onInstallmentChange
}) {
    const handleMethodChange = (e) => {
        const newMethod = e.target.value

        // Pré-selecionar bandeira para métodos de cartão
        let newBrand = ''
        if (newMethod === 'debit' || newMethod === 'card_machine' || newMethod === 'credito_parcelado') {
            newBrand = cardBrand || 'visa'
        }

        // Callback para parent
        onChange(newMethod, newBrand)

        // Configurar parcelamento
        if (newMethod === 'credito_parcelado' || newMethod === 'fiado_parcelado') {
            onInstallmentChange?.(true, 2)
        } else {
            onInstallmentChange?.(false, 1)
        }
    }

    return (
        <div>
            <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-3 block">
                Método de Pagamento
            </label>
            <select
                value={value || ''}
                onChange={handleMethodChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-[#4A3B32] transition-all"
            >
                <option value="">Selecione...</option>
                {PAYMENT_METHODS.map(method => (
                    <option key={method.value} value={method.value}>
                        {method.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

/**
 * Componente para seleção de bandeira de cartão
 */
export function CardBrandSelector({ value, onChange, showFeeInfo, paymentFee, totalValue, discountAmount }) {
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
        >
            <div>
                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] mb-3 block">
                    Bandeira *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CARD_BRANDS.map((brand) => (
                        <button
                            key={brand}
                            type="button"
                            onClick={() => onChange(brand)}
                            className={cn(
                                "py-2.5 px-3 rounded-lg font-medium text-sm transition-all",
                                value === brand
                                    ? "bg-[#C75D3B] text-white shadow-md"
                                    : "bg-gray-100 text-[#4A3B32] hover:bg-gray-200"
                            )}
                        >
                            {brand === 'mastercard' ? 'MC' : brand.charAt(0).toUpperCase() + brand.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Taxa automática */}
            {showFeeInfo && paymentFee && (
                <div className="bg-white/50 p-3 rounded-lg border border-[#C75D3B]/20">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-[#4A3B32]">
                            Taxa {value?.toUpperCase()}:
                        </span>
                        <span className="text-lg font-bold text-[#C75D3B]">
                            {paymentFee.feePercentage}%
                        </span>
                    </div>
                    <p className="mt-2 text-[10px] text-[#4A3B32]/50">
                        Valor cobrado: <span className="font-bold text-[#C75D3B]">
                            R$ {((totalValue - discountAmount) * (paymentFee.feePercentage || 0) / 100).toFixed(2)}
                        </span>
                    </p>
                </div>
            )}
        </motion.div>
    )
}

/**
 * Componente para configuração de parcelamento
 */
export function InstallmentConfig({
    parcelas,
    onParcelasChange,
    entryPayment,
    onEntryPaymentChange,
    installmentStartDate,
    onInstallmentStartDateChange,
    totalValue,
    discountAmount,
    feePercentage,
    DatePickerComponent
}) {
    const valorAParcelar = totalValue - discountAmount - entryPayment
    const valorParcela = valorAParcelar / parcelas

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 p-6 bg-gradient-to-br from-[#FDF0ED] to-[#FEF5F2] rounded-3xl border-2 border-[#C75D3B]/20 shadow-sm"
        >
            {/* Título */}
            <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#4A3B32]">⚙️ Configuração de Parcelamento</h3>
                <p className="text-xs text-[#4A3B32]/50">Defina como as parcelas serão distribuídas</p>
            </div>

            {/* Número de Parcelas */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-[#4A3B32]">Número de Parcelas</label>
                    <span className="text-2xl font-bold text-[#C75D3B]">{parcelas}x</span>
                </div>
                <select
                    value={parcelas}
                    onChange={(e) => onParcelasChange(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border-2 border-[#C75D3B]/20 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/30 outline-none font-medium text-[#4A3B32] transition-all hover:border-[#C75D3B]/40"
                >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <option key={n} value={n}>
                            {n}x {n <= 3 ? '(Taxa: cobrida)' : `(Taxa: ${feePercentage}%)`}
                        </option>
                    ))}
                </select>
                <div className="bg-white/50 p-3 rounded-lg border border-[#C75D3B]/10">
                    <p className="text-sm text-[#4A3B32]/70">
                        Cada parcela: <span className="font-bold text-[#C75D3B] text-base">
                            R$ {valorParcela.toFixed(2)}
                        </span>
                    </p>
                </div>
            </div>

            {/* Valor de Entrada */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-[#4A3B32]">Valor de Entrada (Opcional)</label>
                <input
                    type="number"
                    value={entryPayment}
                    onChange={(e) => onEntryPaymentChange(parseFloat(e.target.value) || 0)}
                    placeholder="R$ 0,00"
                    className="w-full px-4 py-3 bg-white border-2 border-[#C75D3B]/20 rounded-xl focus:ring-2 focus:ring-[#C75D3B]/30 outline-none font-medium text-[#4A3B32] transition-all hover:border-[#C75D3B]/40"
                    step="0.01"
                    min="0"
                />
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/50">
                        <p className="text-xs text-emerald-600/70">Entrada</p>
                        <p className="font-bold text-emerald-700 text-lg">R$ {entryPayment.toFixed(2)}</p>
                    </div>
                    <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200/50">
                        <p className="text-xs text-amber-600/70">A Parcelar</p>
                        <p className="font-bold text-amber-700 text-lg">R$ {valorAParcelar.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Data da 1ª Parcela */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-[#4A3B32]">
                    Data da 1ª Parcela <span className="text-red-500">*</span>
                </label>
                {DatePickerComponent}
            </div>
        </motion.div>
    )
}
