/**
 * API de Estoque Inteligente
 * Gestão de estoque com BI e rastreabilidade -> Backend Driven
 */

import { apiClient } from '../api-client'
import { toCamelCase } from './helpers'

/**
 * Buscar KPIs Básicos (Header)
 */
export async function getStockHeadlineKPIs() {
    return apiClient('/stock/kpis')
}

/**
 * BUSCAR MÉTRICAS AVANÇADAS (GMROI, ABC, ETC)
 * Calculadas no Backend agora
 */
export async function getAdvancedStockMetrics() {
    const data = await apiClient('/stock/advanced')

    if (data.inventory) {
        data.inventory = data.inventory.map(toCamelCase)
    }
    if (data.actions) {
        data.actions.reorder = data.actions.reorder?.map(toCamelCase)
        data.actions.liquidate = data.actions.liquidate?.map(toCamelCase)
        data.actions.top = data.actions.top?.map(toCamelCase)
    }

    return data
}

/**
 * Buscar alertas de estoque baixo
 */
export async function getLowStockAlerts(limit = 10) {
    const data = await apiClient(`/stock/low?limit=${limit}`)
    return data.map(toCamelCase)
}

/**
 * Buscar Dead Stock
 */
export async function getDeadStockSummary() {
    const data = await apiClient('/stock/dead')
    if (data.products) {
        data.products = data.products.map(toCamelCase)
    }
    return data
}

/**
 * Buscar relatório completo (Tabela Principal)
 */
export async function getStockReport() {
    const data = await getAdvancedStockMetrics()
    return data.inventory
}

/**
 * Atualizar status do estoque (ajuste manual)
 */
export async function updateStockStatus(productId, newStatus, notes = '') {
    return apiClient(`/products/${productId}`, {
        method: 'PUT',
        body: { stock_status: newStatus }
    })
}

/**
 * Decrementar estoque (DEPRECATED - Backend Handles it)
 */
export async function decrementProductStock(items) {
    console.warn('⚠️ decrementProductStock no frontend está obsoleto. O backend lida com isso nas vendas.')
    return true
}

/**
 * Buscar ranking de vendas (categoria, cor, tamanho, produto)
 */
export async function getSalesRankingByCategory(startDate, endDate, period = 'all') {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (period) params.append('period', period)

    const data = await apiClient(`/stock/ranking?${params.toString()}`)

    return {
        byCategory: data.byCategory || [],
        byColor: data.byColor || [],
        bySize: data.bySize || [],
        byProduct: data.byProduct || [],
        byProfit: data.byProfit || []
    }
}

// Outras funções auxiliares que podem buscar do backend se existirem rotas
export async function getAllBrands() {
    return []
}

export async function getAllCategories() {
    return []
}
