/**
 * API de Despesas Fixas — via Express BFF (Railway PostgreSQL)
 */

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(err.error || `Erro ${response.status}`)
    }
    return response.json()
}

export async function getFixedExpenses() {
    const data = await apiFetch('/api/expenses')
    return data.items || []
}

export async function getFixedExpenseById(id) {
    return apiFetch(`/api/expenses/${id}`)
}

export async function createFixedExpense(expenseData) {
    return apiFetch('/api/expenses', { method: 'POST', body: expenseData })
}

export async function updateFixedExpense(id, expenseData) {
    return apiFetch(`/api/expenses/${id}`, { method: 'PUT', body: expenseData })
}

export async function deleteFixedExpense(id) {
    await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' })
    return true
}
