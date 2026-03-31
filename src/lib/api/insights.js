/**
 * API de Insights — via Express BFF (Railway PostgreSQL)
 * As funções de insights eram via RPC Supabase; agora delegam ao Express.
 */

import { apiClient } from '../api-client'
import { toCamelCase } from './helpers'

export async function getActiveInsights(limit = 10, category = null) {
    try {
        const params = new URLSearchParams({ limit })
        if (category) params.set('category', category)
        const data = await apiClient(`/insights?${params.toString()}`)
        return Array.isArray(data) ? data.map(toCamelCase) : []
    } catch (err) {
        console.error('❌ Erro ao buscar insights:', err)
        return []
    }
}

export async function dismissInsight(insightId, dismissedBy = 'user') {
    try {
        await apiClient(`/insights/${insightId}/dismiss`, { method: 'POST', body: { dismissedBy } })
        return true
    } catch (err) {
        console.error('❌ Erro ao dispensar insight:', err)
        return false
    }
}

export async function markInsightRead(insightId) {
    try {
        await apiClient(`/insights/${insightId}/read`, { method: 'POST' })
        return true
    } catch (err) {
        console.error('❌ Erro ao marcar insight como lido:', err)
        return false
    }
}

export async function generateInsights() {
    try {
        const data = await apiClient('/insights/generate', { method: 'POST' })
        return Array.isArray(data) ? data.map(toCamelCase) : []
    } catch (err) {
        console.error('❌ Erro ao gerar insights:', err)
        return []
    }
}
