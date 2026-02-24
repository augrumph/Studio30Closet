/**
 * API de Parcelamentos/Crediário — via Express BFF (Railway PostgreSQL)
 * Substitui totalmente as chamadas Supabase anteriores.
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

/**
 * Criar parcelas para uma venda
 */
export async function createInstallments(
    vendaId,
    numInstallments,
    entryPayment = 0,
    installmentStartDate = null
) {
    if (!vendaId || !numInstallments) {
        return { success: false, error: 'Parâmetros obrigatórios inválidos' }
    }

    try {
        const result = await apiFetch('/api/installments/create', {
            method: 'POST',
            body: { vendaId, numInstallments, entryPayment, installmentStartDate }
        })
        return result
    } catch (err) {
        return { success: false, error: err.message }
    }
}

/**
 * Buscar detalhes de parcelas de uma venda (com pagamentos)
 */
export async function getInstallmentsByVendaId(vendaId) {
    return apiFetch(`/api/installments/${vendaId}/details`)
}

/**
 * Registrar pagamento de parcela
 */
export async function registerInstallmentPayment(
    installmentId,
    paymentAmount,
    paymentDate,
    paymentMethod = 'dinheiro',
    notes = null,
    createdBy = 'admin'
) {
    return apiFetch(`/api/installments/${installmentId}/payment`, {
        method: 'POST',
        body: { amount: paymentAmount, date: paymentDate, method: paymentMethod, notes }
    })
}

/**
 * Editar um pagamento existente
 */
export async function updateInstallmentPayment(paymentId, newAmount, newDate, newMethod, newNotes) {
    return apiFetch(`/api/installments/payments/${paymentId}`, {
        method: 'PUT',
        body: { amount: newAmount, date: newDate, method: newMethod, notes: newNotes }
    })
}

/**
 * Deletar um pagamento
 */
export async function deleteInstallmentPayment(paymentId) {
    await apiFetch(`/api/installments/payments/${paymentId}`, { method: 'DELETE' })
    return true
}

/**
 * Obter resumo de venda com crediário (compatibilidade com código existente)
 */
export async function getInstallmentSummary(vendaId) {
    try {
        const data = await apiFetch(`/api/installments/${vendaId}/details`)
        return {
            totalValue: data.totalValue || 0,
            entryPayment: 0,
            remainingValue: data.remainingAmount || 0,
            numInstallments: data.installments?.length || 0,
            paidInstallments: data.installments?.filter(i => i.status === 'paid').length || 0,
            pendingInstallments: data.installments?.filter(i => i.status !== 'paid').length || 0,
            overdueAmount: data.installments?.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.remainingAmount || 0), 0) || 0,
            lastPaymentDate: null,
            paidPercentage: data.paidPercentage || 0
        }
    } catch (err) {
        throw err
    }
}

/**
 * Listar vendas com crediário em aberto
 */
export async function getOpenInstallmentSales(page = 1, limit = 30) {
    const data = await apiFetch(`/api/installments?page=${page}&pageSize=${limit}&status=pendentes`)
    return {
        vendas: data.items || [],
        total: data.total || 0,
        page,
        limit
    }
}

/**
 * Buscar vencimentos próximos (hoje + semana)
 */
export async function getUpcomingInstallments() {
    try {
        return await apiFetch('/api/installments/upcoming')
    } catch (err) {
        return { today: [], thisWeek: [], overdueCount: 0, totalDueToday: 0, totalDueThisWeek: 0 }
    }
}

/**
 * Quitar venda totalmente
 */
export async function payFullVendaWithInstallments(vendaId) {
    try {
        await apiFetch(`/api/installments/${vendaId}/pay-full`, { method: 'PUT' })
        return { success: true }
    } catch (err) {
        return { success: false, error: err.message }
    }
}
