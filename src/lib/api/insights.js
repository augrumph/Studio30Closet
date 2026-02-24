/**
 * API de Insights — via Express BFF (Railway PostgreSQL)
 * As funções de insights eram via RPC Supabase; agora delegam ao Express.
 */

import { toCamelCase } from './helpers'

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

export async function getActiveInsights(limit = 10, category = null) {
    try {
        const params = new URLSearchParams({ limit })
        if (category) params.set('category', category)
        const data = await apiFetch(`/api/insights?${params.toString()}`)
        return Array.isArray(data) ? data.map(toCamelCase) : []
    } catch (err) {
        console.error('❌ Erro ao buscar insights:', err)
        return []
    }
}

export async function dismissInsight(insightId, dismissedBy = 'user') {
    try {
        await apiFetch(`/api/insights/${insightId}/dismiss`, { method: 'POST', body: { dismissedBy } })
        return true
    } catch (err) {
        console.error('❌ Erro ao dispensar insight:', err)
        return false
    }
}

export async function markInsightRead(insightId) {
    try {
        await apiFetch(`/api/insights/${insightId}/read`, { method: 'POST' })
        return true
    } catch (err) {
        console.error('❌ Erro ao marcar insight como lido:', err)
        return false
    }
}

export async function generateInsights() {
    try {
        const data = await apiFetch('/api/insights/generate', { method: 'POST' })
        return Array.isArray(data) ? data.map(toCamelCase) : []
    } catch (err) {
        console.error('❌ Erro ao gerar insights:', err)
        return []
    }
}
