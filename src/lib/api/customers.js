/**
 * API de Clientes
 * CRUD e operações relacionadas a clientes
 */

import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers'

/**
 * Listar clientes paginados
 */
export async function getCustomers(page = 1, limit = 50) {
    console.log(`🔍 API: Getting customers (page ${page}, limit ${limit})...`)
    const offset = (page - 1) * limit
    const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (error) {
        console.error('❌ API Error getting customers:', error)
        throw error
    }
    console.log(`✅ API: Got ${data?.length || 0} customers (total: ${count})`)
    return {
        customers: data.map(toCamelCase),
        total: count,
        page,
        limit
    }
}

/**
 * Buscar cliente por ID
 */
export async function getCustomerById(id) {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
    if (error) throw error
    return toCamelCase(data)
}

/**
 * Criar novo cliente
 */
export async function createCustomer(customerData) {
    console.log('API: Creating customer with data:', customerData)
    const snakeData = toSnakeCase(customerData)
    const { data, error } = await supabase.from('customers').insert([snakeData]).select().single()
    if (error) {
        console.error('API Error creating customer:', error)
        throw error
    }
    console.log('API: Created customer:', data)
    return toCamelCase(data)
}

/**
 * Atualizar cliente
 */
export async function updateCustomer(id, customerData) {
    console.log('API: Updating customer with id:', id)
    const snakeData = toSnakeCase(customerData)

    const customerRecord = {
        name: snakeData.name,
        phone: snakeData.phone,
        email: snakeData.email || null,
        cpf: snakeData.cpf || null,
        address: snakeData.address || null,
        complement: snakeData.complement || null,
        instagram: snakeData.instagram || null,
        addresses: snakeData.addresses || []
    }

    const { data, error } = await supabase
        .from('customers')
        .update(customerRecord)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('API Error updating customer:', error)
        throw error
    }
    return toCamelCase(data)
}

/**
 * Deletar cliente
 */
export async function deleteCustomer(id) {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error
    return true
}

/**
 * Buscar preferências do cliente
 */
export async function getCustomerPreferences(customerId) {
    const { data, error } = await supabase
        .from('customer_preferences')
        .select('*')
        .eq('customer_id', customerId)
        .single()

    if (error && error.code !== 'PGRST116') {
        throw error
    }

    return data ? toCamelCase(data) : null
}

/**
 * Atualizar preferências do cliente
 */
export async function updateCustomerPreferences(customerId, preferencesData) {
    const snakeData = toSnakeCase(preferencesData)
    const { data, error } = await supabase
        .from('customer_preferences')
        .upsert({ customer_id: customerId, ...snakeData })
        .select()
        .single()

    if (error) throw error
    return toCamelCase(data)
}
