/**
 * API de Compras — via Express BFF (Railway PostgreSQL)
 */

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(err.error || `Erro ${response.status}`)
    }
    return response.json()
}

export async function getPurchases() {
    const data = await apiFetch('/api/purchases')
    return data.items || []
}

export async function getPurchaseById(id) {
    return apiFetch(`/api/purchases/${id}`)
}

export async function createPurchase(purchaseData) {
    return apiFetch('/api/purchases', { method: 'POST', body: purchaseData })
}

export async function updatePurchase(id, purchaseData) {
    return apiFetch(`/api/purchases/${id}`, { method: 'PUT', body: purchaseData })
}

export async function deletePurchase(id) {
    await apiFetch(`/api/purchases/${id}`, { method: 'DELETE' })
    return true
}
