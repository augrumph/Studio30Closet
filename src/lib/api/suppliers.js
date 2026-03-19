/**
 * API de Fornecedores — via Express BFF (Railway PostgreSQL)
 */

import { apiClient } from '../api-client'

export async function getSuppliers() {
    const data = await apiClient('/suppliers')
    return data.items || []
}

export async function getSupplierById(id) {
    return apiClient(`/suppliers/${id}`)
}

export async function createSupplier(supplierData) {
    return apiClient('/suppliers', { method: 'POST', body: supplierData })
}

export async function updateSupplier(id, supplierData) {
    return apiClient(`/suppliers/${id}`, { method: 'PUT', body: supplierData })
}

export async function deleteSupplier(id) {
    await apiClient(`/suppliers/${id}`, { method: 'DELETE' })
    return true
}
