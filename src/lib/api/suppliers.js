/**
 * API de Fornecedores — via Express BFF (Railway PostgreSQL)
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

export async function getSuppliers() {
    const data = await apiFetch('/api/suppliers')
    return data.items || []
}

export async function getSupplierById(id) {
    return apiFetch(`/api/suppliers/${id}`)
}

export async function createSupplier(supplierData) {
    return apiFetch('/api/suppliers', { method: 'POST', body: supplierData })
}

export async function updateSupplier(id, supplierData) {
    return apiFetch(`/api/suppliers/${id}`, { method: 'PUT', body: supplierData })
}

export async function deleteSupplier(id) {
    await apiFetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    return true
}
