/**
 * API de Taxas de Pagamento
 * CRUD para gerenciar taxas de diferentes métodos de pagamento
 */

import { apiClient } from '../api-client'

/**
 * Get all payment fees
 * @returns {Promise<Array>} Array of payment fees
 */
export async function getPaymentFees() {
    return apiClient('/payment-fees')
}

/**
 * Get payment fee by ID
 * @param {string} id - Payment fee ID
 * @returns {Promise<Object>} Payment fee object
 */
export async function getPaymentFeeById(id) {
    return apiClient(`/payment-fees/${id}`)
}

/**
 * Create a new payment fee
 * @param {Object} feeData - Payment fee data
 * @returns {Promise<Object>} Created payment fee
 */
export async function createPaymentFee(feeData) {
    return apiClient('/payment-fees', {
        method: 'POST',
        body: feeData
    })
}

/**
 * Update a payment fee
 * @param {string} id - Payment fee ID
 * @param {Object} feeData - Payment fee data to update
 * @returns {Promise<Object>} Updated payment fee
 */
export async function updatePaymentFee(id, feeData) {
    return apiClient(`/payment-fees/${id}`, {
        method: 'PUT',
        body: feeData
    })
}

/**
 * Delete a payment fee
 * @param {string} id - Payment fee ID
 * @returns {Promise<boolean>} True if successful
 */
export async function deletePaymentFee(id) {
    await apiClient(`/payment-fees/${id}`, {
        method: 'DELETE'
    })
    return true
}

/**
 * Delete all payment fees
 * @returns {Promise<boolean>} True if successful
 */
export async function deleteAllPaymentFees() {
    await apiClient('/payment-fees', {
        method: 'DELETE'
    })
    return true
}

/**
 * Buscar taxa de pagamento do banco de dados
 * @param {string} paymentMethod - 'pix', 'debito', 'credito'
 * @param {string} cardBrand - 'visa', 'mastercard', 'elo' (opcional)
 * @param {number} installments - número de parcelas 1-6 (opcional)
 * @returns {Promise<{feePercentage: number} | null>}
 */
export async function getPaymentFee(paymentMethod, cardBrand = null, installments = null) {
    try {
        const params = new URLSearchParams({ paymentMethod })

        if (cardBrand) {
            params.append('cardBrand', cardBrand)
        }

        if (installments !== null && installments !== undefined) {
            params.append('installments', installments.toString())
        }

        const data = await apiClient(`/payment-fees/calculate?${params.toString()}`)
        return data

    } catch (err) {
        // Log silencioso para PIX (que nunca terá erro, pois sempre tem 0%)
        if (paymentMethod !== 'pix') {
            console.warn(`⚠️ Taxa não encontrada: ${paymentMethod}${cardBrand ? ` (${cardBrand})` : ''}${installments ? ` (${installments}x)` : ''}`)
        }
        return null
    }
}
