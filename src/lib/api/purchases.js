import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers'

/**
 * Get all purchases
 * @returns {Promise<Array>} Array of purchases
 */
export async function getPurchases() {
    const { data, error } = await supabase.from('purchases').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

/**
 * Get purchase by ID
 * @param {string} id - Purchase ID
 * @returns {Promise<Object>} Purchase object
 */
export async function getPurchaseById(id) {
    const { data, error } = await supabase.from('purchases').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

/**
 * Create a new purchase
 * @param {Object} purchaseData - Purchase data
 * @returns {Promise<Object>} Created purchase
 */
export async function createPurchase(purchaseData) {
    console.log('API: Creating purchase with data:', purchaseData);
    const snakeData = toSnakeCase(purchaseData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const purchaseRecord = {
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        payment_method: snakeData.paymentMethod || snakeData.payment_method,
        value: snakeData.value,
        date: snakeData.date,
        pieces: snakeData.pieces || null,
        parcelas: snakeData.parcelas || null,
        notes: snakeData.notes || null,
        spent_by: snakeData.spentBy || snakeData.spent_by || 'loja'
    };

    console.log('API: Prepared record for insert:', purchaseRecord);

    const { data, error } = await supabase
        .from('purchases')
        .insert([purchaseRecord])
        .select()
        .single();

    if (error) {
        console.error('API Error creating purchase:', error);
        throw error;
    }
    console.log('API: Created purchase:', data);
    return toCamelCase(data);
}

/**
 * Update a purchase
 * @param {string} id - Purchase ID
 * @param {Object} purchaseData - Purchase data to update
 * @returns {Promise<Object>} Updated purchase
 */
export async function updatePurchase(id, purchaseData) {
    console.log('API: Updating purchase with id:', id, 'and data:', purchaseData);
    const snakeData = toSnakeCase(purchaseData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const purchaseRecord = {
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        payment_method: snakeData.paymentMethod || snakeData.payment_method,
        value: snakeData.value,
        date: snakeData.date,
        pieces: snakeData.pieces || null,
        parcelas: snakeData.parcelas || null,
        notes: snakeData.notes || null,
        spent_by: snakeData.spentBy || snakeData.spent_by || 'loja'
    };

    console.log('API: Prepared record for update:', purchaseRecord);

    const { data, error } = await supabase
        .from('purchases')
        .update(purchaseRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating purchase:', error);
        throw error;
    }
    console.log('API: Updated purchase:', data);
    return toCamelCase(data);
}

/**
 * Delete a purchase
 * @param {string} id - Purchase ID
 * @returns {Promise<boolean>} True if successful
 */
export async function deletePurchase(id) {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) throw error;
    return true;
}
