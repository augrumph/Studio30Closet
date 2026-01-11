import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers'

/**
 * Get all payment fees
 * @returns {Promise<Array>} Array of payment fees
 */
export async function getPaymentFees() {
    const { data, error } = await supabase.from('payment_fees').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

/**
 * Get payment fee by ID
 * @param {string} id - Payment fee ID
 * @returns {Promise<Object>} Payment fee object
 */
export async function getPaymentFeeById(id) {
    const { data, error } = await supabase.from('payment_fees').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

/**
 * Create a new payment fee
 * @param {Object} feeData - Payment fee data
 * @returns {Promise<Object>} Created payment fee
 */
export async function createPaymentFee(feeData) {
    const snakeData = toSnakeCase(feeData);

    // Usar UPSERT: INSERT ou UPDATE se já existir (pela constraint unique)
    const { data, error } = await supabase.from('payment_fees')
        .upsert([snakeData], {
            onConflict: 'payment_method,card_brand'
        })
        .select()
        .single();

    if (error) throw error;
    return toCamelCase(data);
}

/**
 * Update a payment fee
 * @param {string} id - Payment fee ID
 * @param {Object} feeData - Payment fee data to update
 * @returns {Promise<Object>} Updated payment fee
 */
export async function updatePaymentFee(id, feeData) {
    console.log('API: Updating payment fee with id:', id, 'and data:', feeData);
    const snakeData = toSnakeCase(feeData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const feeRecord = {
        payment_method: snakeData.paymentMethod || snakeData.payment_method,
        card_brand: snakeData.cardBrand || snakeData.card_brand,
        fee_percentage: snakeData.feePercentage || snakeData.fee_percentage,
        fee_fixed: snakeData.feeFixed || snakeData.fee_fixed,
        description: snakeData.description,
        is_active: snakeData.isActive || snakeData.is_active
    };

    console.log('API: Prepared record for update:', feeRecord);

    const { data, error } = await supabase
        .from('payment_fees')
        .update(feeRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating payment fee:', error);
        throw error;
    }
    console.log('API: Updated payment fee:', data);
    return toCamelCase(data);
}

/**
 * Delete a payment fee
 * @param {string} id - Payment fee ID
 * @returns {Promise<boolean>} True if successful
 */
export async function deletePaymentFee(id) {
    const { error } = await supabase.from('payment_fees').delete().eq('id', id);
    if (error) throw error;
    return true;
}

/**
 * Delete all payment fees
 * @returns {Promise<boolean>} True if successful
 */
export async function deleteAllPaymentFees() {
    const { error } = await supabase.from('payment_fees').delete().neq('id', 0);
    if (error) throw error;
    return true;
}

/**
 * Buscar taxa de pagamento do banco de dados
 * @param {string} paymentMethod - 'pix', 'debito', 'credito'
 * @param {string} cardBrand - 'visa', 'mastercard', 'elo' (opcional)
 * @param {number} installments - número de parcelas 1-6 (opcional)
 * @returns {Promise<{feePercentage: number} | null>}
 */
export async function getPaymentFee(paymentMethod, cardBrand = null, installments = null) {
    try {
        // Construir query dinamicamente
        let query = supabase
            .from('payment_fees')
            .select('*')
            .eq('payment_method', paymentMethod)
            .eq('is_active', true);

        // Filtrar por bandeira
        if (cardBrand) {
            query = query.eq('card_brand', cardBrand);
        } else {
            query = query.is('card_brand', null);
        }

        // Filtrar por parcelas
        if (installments !== null && installments !== undefined) {
            query = query.eq('installments', installments);
        } else {
            query = query.is('installments', null);
        }

        const { data, error } = await query.single();

        if (error) {
            // Log silencioso para PIX (que nunca terá erro, pois sempre tem 0%)
            if (paymentMethod !== 'pix') {
                console.warn(`⚠️ Taxa não encontrada: ${paymentMethod}${cardBrand ? ` (${cardBrand})` : ''}${installments ? ` (${installments}x)` : ''}`);
            }
            return null;
        }

        return toCamelCase(data);
    } catch (err) {
        console.error(`❌ Erro ao buscar taxa de pagamento:`, err.message);
        return null;
    }
}
