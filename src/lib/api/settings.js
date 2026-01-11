/**
 * API de Configurações
 * Gerenciamento de settings do sistema
 */

import { supabase } from '../supabase'

/**
 * Buscar configurações
 * @returns {Promise<Object>} Objeto com configurações (chave: valor)
 */
export async function getSettings() {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    // convert array of objects to a single object
    return data.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.value;
        return acc;
    }, {});
}

/**
 * Atualizar configurações
 * @param {Object} settingsData - Objeto com configurações a atualizar
 * @returns {Promise<boolean>} true se atualizado com sucesso
 */
export async function updateSettings(settingsData) {
    const updates = Object.keys(settingsData).map(key =>
        supabase.from('settings').update({ value: settingsData[key] }).eq('setting_key', key)
    );
    const results = await Promise.all(updates);
    results.forEach(result => {
        if (result.error) throw result.error;
    });
    return true;
}
