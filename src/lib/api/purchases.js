/**
 * API de Compras — via Express BFF (Railway PostgreSQL)
 */

import { apiClient } from '../api-client'

export async function getPurchases() {
    const data = await apiClient('/purchases')
    return data.items || []
}

export async function getPurchaseById(id) {
    return apiClient(`/purchases/${id}`)
}

export async function createPurchase(purchaseData) {
    return apiClient('/purchases', { method: 'POST', body: purchaseData })
}

export async function updatePurchase(id, purchaseData) {
    return apiClient(`/purchases/${id}`, { method: 'PUT', body: purchaseData })
}

export async function deletePurchase(id) {
    await apiClient(`/purchases/${id}`, { method: 'DELETE' })
    return true
}
