/**
 * API de Pedidos (Malinhas)
 * CRUD e operações relacionadas a pedidos
 * Refatorado para usar Backend BFF e remover lógica de estoque do frontend
 */

import { apiClient } from '../api-client'

/**
 * Listar pedidos paginados
 * @param {number|Object} page - Número da página ou objeto de parâmetros
 * @param {number} limit - Itens por página
 */
export async function getOrders(paramsOrPage = 1, limitArg = 30) {
    let page, limit, status, searchTerm;

    if (typeof paramsOrPage === 'object' && paramsOrPage !== null) {
        page = paramsOrPage.page || 1;
        limit = paramsOrPage.limit || 30;
        status = paramsOrPage.status;
        searchTerm = paramsOrPage.searchTerm;
    } else {
        page = paramsOrPage || 1;
        limit = limitArg || 30;
    }

    const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: limit.toString()
    });

    if (status) queryParams.append('status', status);
    if (searchTerm) queryParams.append('search', searchTerm);

    return apiClient(`/orders?${queryParams.toString()}`);
}

/**
 * Buscar pedido por ID
 */
export async function getOrderById(id) {
    return apiClient(`/orders/${id}`)
}

/**
 * Criar novo pedido
 * Lógica de reserva de estoque movida para o backend
 */
export async function createOrder(orderData) {
    return apiClient('/orders', {
        method: 'POST',
        body: orderData
    })
}

/**
 * Atualizar pedido (genérico)
 */
export async function updateOrder(id, orderData) {
    return apiClient(`/orders/${id}`, {
        method: 'PUT',
        body: orderData
    })
}

/**
 * Atualizar status do pedido
 */
export async function updateOrderStatus(id, status) {
    return apiClient(`/orders/${id}`, {
        method: 'PUT',
        body: { status }
    })
}

/**
 * Atualizar agendamento
 */
export async function updateOrderSchedule(id, scheduleData) {
    return apiClient(`/orders/${id}`, {
        method: 'PUT',
        body: scheduleData
    })
}

/**
 * Deletar pedido
 */
export async function deleteOrder(id) {
    await apiClient(`/orders/${id}`, {
        method: 'DELETE'
    })
    return true
}

// ==============================================================================
// DEPRECATED FUNCTIONS
// Mantidas como no-ops para evitar quebras em imports legados não refatorados
// ==============================================================================

export async function reserveStockForMalinha(items) {
    console.warn('⚠️ reserveStockForMalinha is deprecated. Backend handles stock automatically.')
    return { success: true }
}

export async function releaseStockForMalinha(items) {
    console.warn('⚠️ releaseStockForMalinha is deprecated. Backend handles stock automatically.')
    return { success: true }
}

export async function decrementProductStock(items) {
    console.warn('⚠️ decrementProductStock is deprecated. Backend handles stock automatically.')
    return { success: true }
}
