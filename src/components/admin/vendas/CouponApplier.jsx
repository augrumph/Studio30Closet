import { useState } from 'react'
import { Ticket, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Componente para aplicação de cupons de desconto
 */
export function CouponApplier({
    appliedCoupon,
    discountAmount,
    onApply,
    onRemove,
    coupons,
    totalValue,
    items
}) {
    const [couponInput, setCouponInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleApply = async () => {
        if (!couponInput.trim()) return

        setIsLoading(true)
        setError('')

        try {
            const code = couponInput.toUpperCase().trim()
            const coupon = coupons.find(c => c.code === code && c.isActive)

            if (!coupon) {
                setError('Cupom inválido ou inativo.')
                setIsLoading(false)
                return
            }

            // Validar expiração
            if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
                setError('Este cupom já expirou.')
                setIsLoading(false)
                return
            }

            // Validar valor mínimo
            if (coupon.minPurchase && totalValue < coupon.minPurchase) {
                setError(`Valor mínimo: R$ ${(coupon.minPurchase || 0).toLocaleString('pt-BR')}`)
                setIsLoading(false)
                return
            }

            let discount = 0

            if (coupon.type === 'percent') {
                discount = (totalValue * coupon.value) / 100
            } else if (coupon.type === 'cost_price') {
                discount = items.reduce((total, item) => {
                    const itemDiscount = (item.price - (item.costPrice || 0)) * item.quantity
                    return total + itemDiscount
                }, 0)
            } else {
                discount = coupon.value
            }

            onApply({
                couponId: coupon.id,
                couponCode: coupon.code,
                discountAmount: discount,
                couponType: coupon.type
            })

            setCouponInput('')

        } catch (err) {
            setError('Erro ao validar cupom.')
        } finally {
            setIsLoading(false)
        }
    }

    if (appliedCoupon) {
        return (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-emerald-800">{appliedCoupon}</p>
                            <p className="text-xs text-emerald-600">
                                Desconto: R$ {(discountAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remover cupom"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-[0.1em] block">
                Cupom de Desconto
            </label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase())
                        setError('')
                    }}
                    placeholder="Código do cupom..."
                    className={cn(
                        "flex-1 px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium text-[#4A3B32] transition-all uppercase",
                        error ? "border-red-300" : "border-gray-200"
                    )}
                />
                <button
                    type="button"
                    onClick={handleApply}
                    disabled={isLoading || !couponInput.trim()}
                    className={cn(
                        "px-4 py-3 rounded-xl font-bold text-sm transition-all",
                        isLoading || !couponInput.trim()
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-[#C75D3B] text-white hover:bg-[#A64D31]"
                    )}
                >
                    {isLoading ? '...' : 'Aplicar'}
                </button>
            </div>
            {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
            )}
        </div>
    )
}
