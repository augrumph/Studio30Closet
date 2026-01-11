import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers'

/**
 * Get all fixed expenses
 * @returns {Promise<Array>} Array of fixed expenses
 */
export async function getFixedExpenses() {
    const { data, error } = await supabase.from('fixed_expenses').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

/**
 * Get fixed expense by ID
 * @param {string} id - Fixed expense ID
 * @returns {Promise<Object>} Fixed expense object
 */
export async function getFixedExpenseById(id) {
    const { data, error } = await supabase.from('fixed_expenses').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

/**
 * Create a new fixed expense
 * @param {Object} expenseData - Fixed expense data
 * @returns {Promise<Object>} Created fixed expense
 */
export async function createFixedExpense(expenseData) {
    const snakeData = toSnakeCase(expenseData);
    const { data, error } = await supabase.from('fixed_expenses').insert([snakeData]).select().single();
    if (error) throw error;
    return toCamelCase(data);
}

/**
 * Update a fixed expense
 * @param {string} id - Fixed expense ID
 * @param {Object} expenseData - Fixed expense data to update
 * @returns {Promise<Object>} Updated fixed expense
 */
export async function updateFixedExpense(id, expenseData) {
    console.log('API: Updating fixed expense with id:', id, 'and data:', expenseData);
    const snakeData = toSnakeCase(expenseData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const expenseRecord = {
        name: snakeData.name,
        value: snakeData.value,
        category: snakeData.category,
        recurrence: snakeData.recurrence,
        due_day: snakeData.dueDay || snakeData.due_day,
        paid: snakeData.paid,
        notes: snakeData.notes
    };

    console.log('API: Prepared record for update:', expenseRecord);

    const { data, error } = await supabase
        .from('fixed_expenses')
        .update(expenseRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating fixed expense:', error);
        throw error;
    }
    console.log('API: Updated fixed expense:', data);
    return toCamelCase(data);
}

/**
 * Delete a fixed expense
 * @param {string} id - Fixed expense ID
 * @returns {Promise<boolean>} True if successful
 */
export async function deleteFixedExpense(id) {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (error) throw error;
    return true;
}
