/**
 * API de Fornecedores
 * Gerenciamento de fornecedores
 */

import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers'

/**
 * Buscar todos os fornecedores
 * @returns {Promise<Array>} Array de fornecedores
 */
export async function getSuppliers() {
    console.log('API: Getting suppliers...');
    const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('API Error getting suppliers:', error);
        throw error;
    }
    console.log('API: Got suppliers:', data);
    return data.map(toCamelCase);
}

/**
 * Buscar fornecedor por ID
 * @param {number} id - ID do fornecedor
 * @returns {Promise<Object>} Fornecedor
 */
export async function getSupplierById(id) {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

/**
 * Criar novo fornecedor
 * @param {Object} supplierData - Dados do fornecedor
 * @returns {Promise<Object>} Fornecedor criado
 */
export async function createSupplier(supplierData) {
    console.log('API: Creating supplier with data:', supplierData);
    const snakeData = toSnakeCase(supplierData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const supplierRecord = {
        name: snakeData.name,
        cnpj: snakeData.cnpj || null,
        phone: snakeData.phone || null,
        email: snakeData.email || null,
        address: snakeData.address || null,
        city: snakeData.city || null,
        state: snakeData.state || null,
        zip_code: snakeData.zip_code || null,
        contact_person: snakeData.contact_person || null,
        notes: snakeData.notes || null
    };

    console.log('API: Prepared record for insert:', supplierRecord);

    const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierRecord])
        .select()
        .single();

    if (error) {
        console.error('API Error creating supplier:', error);
        throw error;
    }
    console.log('API: Created supplier:', data);
    return toCamelCase(data);
}

/**
 * Atualizar fornecedor existente
 * @param {number} id - ID do fornecedor
 * @param {Object} supplierData - Dados do fornecedor
 * @returns {Promise<Object>} Fornecedor atualizado
 */
export async function updateSupplier(id, supplierData) {
    console.log('API: Updating supplier with id:', id, 'and data:', supplierData);
    const snakeData = toSnakeCase(supplierData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const supplierRecord = {
        name: snakeData.name,
        cnpj: snakeData.cnpj || null,
        phone: snakeData.phone || null,
        email: snakeData.email || null,
        address: snakeData.address || null,
        city: snakeData.city || null,
        state: snakeData.state || null,
        zip_code: snakeData.zip_code || null,
        contact_person: snakeData.contact_person || null,
        notes: snakeData.notes || null
    };

    console.log('API: Prepared record for update:', supplierRecord);

    const { data, error } = await supabase
        .from('suppliers')
        .update(supplierRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating supplier:', error);
        throw error;
    }
    console.log('API: Updated supplier:', data);
    return toCamelCase(data);
}

/**
 * Deletar fornecedor
 * @param {number} id - ID do fornecedor
 * @returns {Promise<boolean>} true se deletado com sucesso
 */
export async function deleteSupplier(id) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    return true;
}
