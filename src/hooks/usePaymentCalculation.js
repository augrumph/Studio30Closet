import { useState, useEffect, useCallback } from 'react'
import { getPaymentFee } from '@/lib/api'

/**
 * Hook para cálculo automático de taxas de pagamento
 * 
 * @param {Object} params
 * @param {string} params.paymentMethod - Método de pagamento selecionado
 * @param {string} params.cardBrand - Bandeira do cartão (visa, mastercard, elo)
 * @param {number} params.totalValue - Valor total da venda
 * @param {number} params.discountAmount - Valor de desconto aplicado
 * @param {string} params.paymentStatus - Status do pagamento (paid, pending)
 * @param {number} params.parcelas - Número de parcelas
 * @returns {Object} { feeInfo, paymentFee, isCalculating }
 */
export function usePaymentCalculation({
    paymentMethod,
    cardBrand,
    totalValue,
    discountAmount,
    paymentStatus,
    parcelas
}) {
    const [feeInfo, setFeeInfo] = useState({
        feePercentage: 0,
        feeFixed: 0,
        feeValue: 0,
        netValue: 0
    })
    const [paymentFee, setPaymentFee] = useState(null)
    const [isCalculating, setIsCalculating] = useState(false)

    useEffect(() => {
        const calculatePaymentFee = async () => {
            // Para crédito parcelado, calcular mesmo com status pending. Para outros, só se liquidado
            const shouldCalculate = paymentMethod && totalValue > 0 &&
                (paymentMethod === 'credito_parcelado' || paymentStatus !== 'pending')

            const valorFinal = totalValue - discountAmount

            if (shouldCalculate) {
                setIsCalculating(true)
                try {
                    // Mapear método de pagamento para a tabela payment_fees
                    let dbPaymentMethod = null
                    let numInstallments = null

                    // Mapear valores do formulário para valores do banco
                    if (paymentMethod === 'pix') {
                        dbPaymentMethod = 'pix'
                        numInstallments = null
                    } else if (paymentMethod === 'debit') {
                        dbPaymentMethod = 'debito'
                        numInstallments = null
                    } else if (paymentMethod === 'card_machine') {
                        // Crédito à vista = crédito com 1 parcela
                        dbPaymentMethod = 'credito'
                        numInstallments = 1
                    } else if (paymentMethod === 'credito_parcelado') {
                        // Crédito parcelado
                        dbPaymentMethod = 'credito'
                        numInstallments = parcelas || 2
                    } else if (paymentMethod === 'fiado_parcelado' || paymentMethod === 'fiado') {
                        // Crediário: sem taxa
                        setFeeInfo({
                            feePercentage: 0,
                            feeFixed: 0,
                            feeValue: 0,
                            netValue: valorFinal
                        })
                        setPaymentFee(null)
                        setIsCalculating(false)
                        return
                    } else if (paymentMethod === 'cash') {
                        // Dinheiro em espécie: sem taxa
                        setFeeInfo({
                            feePercentage: 0,
                            feeFixed: 0,
                            feeValue: 0,
                            netValue: valorFinal
                        })
                        setPaymentFee(null)
                        setIsCalculating(false)
                        return
                    }

                    // Buscar taxa do banco de dados com bandeira e parcelas
                    const feeData = await getPaymentFee(dbPaymentMethod, cardBrand || null, numInstallments)

                    if (feeData) {
                        const feePercentage = feeData.feePercentage || 0
                        const feeValue = (valorFinal * feePercentage / 100)
                        const netValue = valorFinal - feeValue

                        setFeeInfo({
                            feePercentage,
                            feeFixed: 0,
                            feeValue,
                            netValue
                        })
                        setPaymentFee(feeData)
                    } else {
                        // Sem taxa configurada
                        console.warn('Nenhuma taxa configurada para:', paymentMethod, cardBrand)
                        setFeeInfo({ feePercentage: 0, feeFixed: 0, feeValue: 0, netValue: valorFinal })
                        setPaymentFee(null)
                    }
                } catch (error) {
                    console.error('Erro ao calcular taxa de pagamento:', error)
                    setFeeInfo({ feePercentage: 0, feeFixed: 0, feeValue: 0, netValue: valorFinal })
                    setPaymentFee(null)
                } finally {
                    setIsCalculating(false)
                }
            } else {
                setFeeInfo({ feePercentage: 0, feeFixed: 0, feeValue: 0, netValue: valorFinal })
                setPaymentFee(null)
            }
        }

        calculatePaymentFee()
    }, [paymentMethod, cardBrand, totalValue, discountAmount, paymentStatus, parcelas])

    return { feeInfo, paymentFee, isCalculating }
}

/**
 * Hook para aplicação e remoção de cupons
 * 
 * @param {Object} params
 * @param {Array} params.coupons - Lista de cupons disponíveis
 * @param {number} params.totalValue - Valor total da venda
 * @param {Array} params.items - Itens da venda
 * @param {Function} params.onApply - Callback ao aplicar cupom
 * @param {Function} params.onRemove - Callback ao remover cupom
 * @returns {Object} { applyCoupon, removeCoupon, isLoading, couponInput, setCouponInput }
 */
export function useCouponHandler({
    coupons,
    totalValue,
    items,
    onApply,
    onRemove
}) {
    const [couponInput, setCouponInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const applyCoupon = useCallback(async () => {
        if (!couponInput.toUpperCase().trim()) return { success: false, error: 'Código vazio' }

        setIsLoading(true)
        try {
            const code = couponInput.toUpperCase().trim()
            const coupon = coupons.find(c => c.code === code && c.isActive)

            if (!coupon) {
                setIsLoading(false)
                return { success: false, error: 'Cupom inválido ou inativo.' }
            }

            // Validar expiração
            if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
                setIsLoading(false)
                return { success: false, error: 'Este cupom já expirou.' }
            }

            // Validar valor mínimo
            if (coupon.minPurchase && totalValue < coupon.minPurchase) {
                setIsLoading(false)
                return {
                    success: false,
                    error: `Valor mínimo para este cupom: R$ ${(coupon.minPurchase || 0).toLocaleString('pt-BR')}`
                }
            }

            let discount = 0
            let discountType = ''

            if (coupon.type === 'percent') {
                discount = (totalValue * coupon.value) / 100
                discountType = 'percent'
            } else if (coupon.type === 'cost_price') {
                // Cupom especial: define todos os produtos pelo preço de custo
                discount = items.reduce((total, item) => {
                    const itemDiscount = (item.price - (item.costPrice || 0)) * item.quantity
                    return total + itemDiscount
                }, 0)
                discountType = 'cost_price'
            } else {
                // Desconto fixo
                discount = coupon.value
                discountType = 'fixed'
            }

            const result = {
                success: true,
                couponId: coupon.id,
                couponCode: coupon.code,
                discountAmount: discount,
                discountType
            }

            if (onApply) onApply(result)
            setCouponInput('')
            setIsLoading(false)
            return result

        } catch (error) {
            setIsLoading(false)
            return { success: false, error: 'Erro ao validar cupom.' }
        }
    }, [couponInput, coupons, totalValue, items, onApply])

    const removeCoupon = useCallback(() => {
        if (onRemove) onRemove()
    }, [onRemove])

    return {
        applyCoupon,
        removeCoupon,
        isLoading,
        couponInput,
        setCouponInput
    }
}
