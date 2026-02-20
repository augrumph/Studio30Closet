/**
 * API de Configurações
 * Gerenciamento de settings do sistema
 */

import { apiClient } from '../api-client'

/**
 * Buscar configurações
 * @returns {Promise<Object>} Objeto com configurações (chave: valor)
 */
export async function getSettings() {
    return apiClient('/settings')
}

/**
 * Buscar configuração específica por chave
 * @param {string} key - Chave da configuração
 * @returns {Promise<Object>} Objeto { key: value }
 */
export async function getSetting(key) {
    return apiClient(`/settings/${key}`)
}

/**
 * Atualizar configurações
 * @param {Object} settingsData - Objeto com configurações a atualizar
 * @returns {Promise<boolean>} true se atualizado com sucesso
 */
export async function updateSettings(settingsData) {
    await apiClient('/settings', {
        method: 'PUT',
        body: settingsData
    })
    return true
}

/**
 * Atualizar configuração específica
 * @param {string} key - Chave da configuração
 * @param {any} value - Valor da configuração
 * @returns {Promise<Object>} Objeto { key: value }
 */
export async function updateSetting(key, value) {
    return apiClient(`/settings/${key}`, {
        method: 'PUT',
        body: { value }
    })
}

/**
 * Deletar configuração específica
 * @param {string} key - Chave da configuração
 * @returns {Promise<boolean>} true se deletado com sucesso
 */
export async function deleteSetting(key) {
    await apiClient(`/settings/${key}`, {
        method: 'DELETE'
    })
    return true
}
