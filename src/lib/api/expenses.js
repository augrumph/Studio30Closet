/**
 * API de Despesas Fixas — via Express BFF (Railway PostgreSQL)
 */

import { apiClient } from '../api-client'

export async function getFixedExpenses() {
    const data = await apiClient('/expenses')
    return data.items || []
}

export async function getFixedExpenseById(id) {
    return apiClient(`/expenses/${id}`)
}

export async function createFixedExpense(expenseData) {
    return apiClient('/expenses', { method: 'POST', body: expenseData })
}

export async function updateFixedExpense(id, expenseData) {
    return apiClient(`/expenses/${id}`, { method: 'PUT', body: expenseData })
}

export async function deleteFixedExpense(id) {
    await apiClient(`/expenses/${id}`, { method: 'DELETE' })
    return true
}
