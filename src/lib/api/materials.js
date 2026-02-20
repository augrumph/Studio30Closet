/**
 * API de Materiais
 * CRUD para gerenciar estoque de materiais
 */

import { apiClient } from '../api-client'

/**
 * Get all materials stock
 * @returns {Promise<Array>} Array of materials
 */
export async function getMaterialsStock() {
    return apiClient('/materials')
}

/**
 * Get material by ID
 * @param {string} id - Material ID
 * @returns {Promise<Object>} Material object
 */
export async function getMaterialById(id) {
    return apiClient(`/materials/${id}`)
}

/**
 * Create a new material
 * @param {Object} materialData - Material data
 * @returns {Promise<Object>} Created material
 */
export async function createMaterial(materialData) {
    return apiClient('/materials', {
        method: 'POST',
        body: materialData
    })
}

/**
 * Update a material
 * @param {string} id - Material ID
 * @param {Object} materialData - Material data to update
 * @returns {Promise<Object>} Updated material
 */
export async function updateMaterial(id, materialData) {
    return apiClient(`/materials/${id}`, {
        method: 'PUT',
        body: materialData
    })
}

/**
 * Delete a material
 * @param {string} id - Material ID
 * @returns {Promise<boolean>} True if successful
 */
export async function deleteMaterial(id) {
    await apiClient(`/materials/${id}`, {
        method: 'DELETE'
    })
    return true
}
