/**
 * API de Clientes
 * CRUD e operações relacionadas a clientes
 * Refatorado para usar Backend BFF
 */

import { apiClient } from '../api-client'
import { toSnakeCase } from './helpers'

/**
 * 🔥 NEW: Get customers with pre-calculated metrics (LTV, orders, etc.)
 */
export async function getCustomersWithMetrics(page = 1, limit = 50, searchTerm = null, segmentFilter = 'all') {
    const params = new URLSearchParams()
    params.append('page', page)
    params.append('pageSize', limit)
    if (searchTerm) params.append('search', searchTerm)
    if (segmentFilter && segmentFilter !== 'all') params.append('segment', segmentFilter)

    return apiClient(`/customers?${params.toString()}`)
}

/**
 * Listar clientes paginados (Compatibilidade)
 */
export async function getCustomersLegacy(page = 1, limit = 50) {
    return getCustomersWithMetrics(page, limit)
}

/**
 * Buscar cliente por ID
 */
export async function getCustomerById(id) {
    return apiClient(`/customers/${id}`)
}

/**
 * Criar novo cliente
 */
export async function createCustomer(customerData) {
    return apiClient('/customers', {
        method: 'POST',
        body: toSnakeCase(customerData)
    })
}

/**
 * Atualizar cliente
 */
export async function updateCustomer(id, customerData) {
    return apiClient(`/customers/${id}`, {
        method: 'PUT',
        body: toSnakeCase(customerData)
    })
}

/**
 * Deletar cliente
 */
export async function deleteCustomer(id) {
    await apiClient(`/customers/${id}`, {
        method: 'DELETE'
    })
    return true
}

/**
 * Buscar preferências do cliente
 */
export async function getCustomerPreferences(customerId) {
    return apiClient(`/customers/${customerId}/preferences`)
}

/**
 * Atualizar preferências do cliente
 */
export async function updateCustomerPreferences(customerId, preferencesData) {
    return apiClient(`/customers/${customerId}/preferences`, {
        method: 'PUT',
        body: toSnakeCase(preferencesData)
    })
}


