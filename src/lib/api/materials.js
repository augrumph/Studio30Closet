import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers'

/**
 * Get all materials stock
 * @returns {Promise<Array>} Array of materials
 */
export async function getMaterialsStock() {
    const { data, error } = await supabase.from('materials_stock').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

/**
 * Get material by ID
 * @param {string} id - Material ID
 * @returns {Promise<Object>} Material object
 */
export async function getMaterialById(id) {
    const { data, error } = await supabase.from('materials_stock').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

/**
 * Create a new material
 * @param {Object} materialData - Material data
 * @returns {Promise<Object>} Created material
 */
export async function createMaterial(materialData) {
    const snakeData = toSnakeCase(materialData);
    const { data, error } = await supabase.from('materials_stock').insert([snakeData]).select().single();
    if (error) throw error;
    return toCamelCase(data);
}

/**
 * Update a material
 * @param {string} id - Material ID
 * @param {Object} materialData - Material data to update
 * @returns {Promise<Object>} Updated material
 */
export async function updateMaterial(id, materialData) {
    console.log('API: Updating material with id:', id, 'and data:', materialData);
    const snakeData = toSnakeCase(materialData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const materialRecord = {
        name: snakeData.name,
        description: snakeData.description,
        quantity: snakeData.quantity,
        unit_cost: snakeData.unitCost || snakeData.unit_cost,
        category: snakeData.category,
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        min_stock_level: snakeData.minStockLevel || snakeData.min_stock_level
    };

    console.log('API: Prepared record for update:', materialRecord);

    const { data, error } = await supabase
        .from('materials_stock')
        .update(materialRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating material:', error);
        throw error;
    }
    console.log('API: Updated material:', data);
    return toCamelCase(data);
}

/**
 * Delete a material
 * @param {string} id - Material ID
 * @returns {Promise<boolean>} True if successful
 */
export async function deleteMaterial(id) {
    const { error } = await supabase.from('materials_stock').delete().eq('id', id);
    if (error) throw error;
    return true;
}
