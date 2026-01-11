/**
 * API de Cupons
 * Gerenciamento de cupons de desconto
 */

import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers'

/**
 * Buscar todos os cupons
 * @returns {Promise<Array>} Array de cupons
 */
export async function getCoupons() {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    // Mapear campos do banco para o formato esperado pelo frontend
    return data.map(coupon => {
        const camelCased = toCamelCase(coupon);
        return {
            ...camelCased,
            type: camelCased.discountType, // discount_type -> type
            value: camelCased.discountValue, // discount_value -> value
            expiryDate: camelCased.expiresAt // expires_at -> expiryDate
        };
    });
}

/**
 * Criar novo cupom
 * @param {Object} couponData - Dados do cupom
 * @returns {Promise<Object>} Cupom criado
 */
export async function createCoupon(couponData) {
    console.log('API: Creating coupon with data:', couponData);
    const snakeData = toSnakeCase(couponData);

    const fullRecord = {
        code: snakeData.code,
        discount_type: snakeData.type,
        discount_value: snakeData.value,
        min_purchase: snakeData.min_purchase || null,
        expires_at: snakeData.expiry_date || null,
        is_active: snakeData.is_active !== undefined ? snakeData.is_active : true,
        is_special: snakeData.is_special || false,
        description: snakeData.description || null
    };

    console.log('API: Attempting full insert:', fullRecord);

    const { data, error } = await supabase
        .from('coupons')
        .insert([fullRecord])
        .select()
        .single();

    if (error) {
        // Se o erro for 42703 (coluna inexistente) ou similar (Bad Request 400 no console)
        if (error.code === '42703' || error.message.includes('column') || error.message.includes('does not exist')) {
            console.warn('⚠️ Colunas adicionais não encontradas. Tentando inserção simplificada...');
            const baseRecord = {
                code: fullRecord.code,
                discount_type: fullRecord.discount_type,
                discount_value: fullRecord.discount_value,
                is_active: fullRecord.is_active,
                expires_at: fullRecord.expires_at
            };
            const retry = await supabase
                .from('coupons')
                .insert([baseRecord])
                .select()
                .single();

            if (retry.error) throw retry.error;
            return finalizeCouponResponse(retry.data);
        }
        console.error('API Error creating coupon:', JSON.stringify(error, null, 2));
        if (error.details) console.error('Error Details:', error.details);
        if (error.hint) console.error('Error Hint:', error.hint);
        if (error.message) console.error('Error Message:', error.message);
        throw error;
    }

    return finalizeCouponResponse(data);
}

/**
 * Atualizar cupom existente
 * @param {number} id - ID do cupom
 * @param {Object} couponData - Dados do cupom
 * @returns {Promise<Object>} Cupom atualizado
 */
export async function updateCoupon(id, couponData) {
    console.log('API: Updating coupon with id:', id, 'and data:', couponData);
    const snakeData = toSnakeCase(couponData);

    const fullRecord = {
        code: snakeData.code,
        discount_type: snakeData.type,
        discount_value: snakeData.value,
        min_purchase: snakeData.min_purchase !== undefined ? snakeData.min_purchase : undefined,
        expires_at: snakeData.expiry_date || undefined,
        is_active: snakeData.is_active !== undefined ? snakeData.is_active : undefined,
        is_special: snakeData.is_special !== undefined ? snakeData.is_special : undefined,
        description: snakeData.description || undefined
    };

    // Limpar campos undefined para evitar sobrescrever com null se não enviado
    Object.keys(fullRecord).forEach(key => fullRecord[key] === undefined && delete fullRecord[key]);

    console.log('API: Attempting full update:', fullRecord);

    const { data, error } = await supabase
        .from('coupons')
        .update(fullRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        if (error.code === '42703' || error.message.includes('column') || error.message.includes('does not exist')) {
            console.warn('⚠️ Colunas adicionais não encontradas no update. Fazendo fallback...');
            const baseRecord = {};
            const allowed = ['code', 'discount_type', 'discount_value', 'is_active', 'expires_at'];
            allowed.forEach(key => {
                if (fullRecord[key] !== undefined) baseRecord[key] = fullRecord[key];
            });

            const retry = await supabase
                .from('coupons')
                .update(baseRecord)
                .eq('id', id)
                .select()
                .single();

            if (retry.error) throw retry.error;
            return finalizeCouponResponse(retry.data);
        }
        console.error('API Error updating coupon:', error);
        throw error;
    }

    return finalizeCouponResponse(data);
}

/**
 * Deletar cupom
 * @param {number} id - ID do cupom
 * @returns {Promise<boolean>} true se deletado com sucesso
 */
export async function deleteCoupon(id) {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// Helper para finalizar a resposta do cupom uniformemente (função interna, não exportada)
function finalizeCouponResponse(data) {
    const camelCased = toCamelCase(data);
    return {
        ...camelCased,
        type: camelCased.discountType,
        value: camelCased.discountValue,
        expiryDate: camelCased.expiresAt
    };
}
