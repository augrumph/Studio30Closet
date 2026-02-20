/**
 * API de Coleções
 * CRUD para gerenciar coleções de produtos (Inverno, Fitness, etc.)
 */

import { apiClient } from '../api-client'

/**
 * Buscar todas as coleções
 */
export async function getCollections() {
    return apiClient('/collections')
}

/**
 * Buscar apenas coleções ativas (para o Catálogo)
 */
export async function getActiveCollections() {
    return apiClient('/collections/active')
}

/**
 * Buscar coleção por ID
 */
export async function getCollectionById(id) {
    return apiClient(`/collections/${id}`)
}

/**
 * Criar nova coleção
 */
export async function createCollection(collectionData) {
    return apiClient('/collections', {
        method: 'POST',
        body: collectionData
    })
}

/**
 * Atualizar coleção
 */
export async function updateCollection(id, updates) {
    return apiClient(`/collections/${id}`, {
        method: 'PUT',
        body: updates
    })
}

/**
 * Deletar coleção
 */
export async function deleteCollection(id) {
    await apiClient(`/collections/${id}`, {
        method: 'DELETE'
    })
    return true
}
