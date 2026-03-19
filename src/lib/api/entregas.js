/**
 * API de Entregas — via Express BFF (Railway PostgreSQL)
 */

import { apiClient } from '../api-client'

export async function getEntregas(options = {}) {
    const { status, search, limit = 100, page = 1 } = options
    const params = new URLSearchParams({ page, pageSize: limit })
    if (status && status !== 'all') params.set('status', status)
    if (search) params.set('search', search)

    const data = await apiClient(`/entregas?${params.toString()}`)
    return data.items || []
}

export async function getEntregaById(id) {
    return apiClient(`/entregas/${id}`)
}

export async function createEntrega(entrega) {
    return apiClient('/entregas', { method: 'POST', body: entrega })
}

export async function updateEntrega(id, updates) {
    return apiClient(`/entregas/${id}`, { method: 'PUT', body: updates })
}

export async function deleteEntrega(id) {
    await apiClient(`/entregas/${id}`, { method: 'DELETE' })
    return true
}

export async function getEntregasMetrics() {
    return apiClient('/entregas/metrics')
}

export const entregas = {
    getAll: getEntregas,
    getById: getEntregaById,
    create: createEntrega,
    update: updateEntrega,
    delete: deleteEntrega,
    getMetrics: getEntregasMetrics
}
