/**
 * API de Entregas — via Express BFF (Railway PostgreSQL)
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

export async function getEntregas(options = {}) {
    const { status, search, limit = 100, page = 1 } = options
    const params = new URLSearchParams({ page, pageSize: limit })
    if (status && status !== 'all') params.set('status', status)
    if (search) params.set('search', search)

    const data = await apiFetch(`/api/entregas?${params.toString()}`)
    return data.items || []
}

export async function getEntregaById(id) {
    return apiFetch(`/api/entregas/${id}`)
}

export async function createEntrega(entrega) {
    return apiFetch('/api/entregas', { method: 'POST', body: entrega })
}

export async function updateEntrega(id, updates) {
    return apiFetch(`/api/entregas/${id}`, { method: 'PUT', body: updates })
}

export async function deleteEntrega(id) {
    await apiFetch(`/api/entregas/${id}`, { method: 'DELETE' })
    return true
}

export async function getEntregasMetrics() {
    return apiFetch('/api/entregas/metrics')
}

export const entregas = {
    getAll: getEntregas,
    getById: getEntregaById,
    create: createEntrega,
    update: updateEntrega,
    delete: deleteEntrega,
    getMetrics: getEntregasMetrics
}
