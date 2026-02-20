/**
 * API de Vendas
 * CRUD e operações relacionadas a vendas
 * Refatorado para usar Backend BFF
 */

import { apiClient } from '../api-client'
import { toSnakeCase } from './helpers'

/**
 * Listar vendas paginadas
 */
export async function getVendas(page = 1, limit = 30) {
    console.log(`🔍 API: Getting vendas (page ${page}, limit ${limit})...`)
    // Backend API filters: page, pageSize, status, startDate, endDate
    const data = await apiClient(`/vendas?page=${page}&pageSize=${limit}`)
    // Backend returns structure matching frontend expectations?
    // Backend returns: { vendas, total, page, pageSize, totalPages }
    // Frontend expects: { vendas: [...], total, page, limit }
    // Need mapping inside here? 
    // Backend vendas already include customer info.

    // O retorno ja deve estar em toCamelCase via backend utility
    return {
        vendas: (data.vendas || []).map(v => ({
            ...v,
            customerName: v.customerName || 'Cliente desconhecido',
            items: v.items || [] // Ensure items array
        })),
        total: data.total,
        page: data.page,
        limit: data.pageSize
    }
}

/**
 * Buscar venda por ID
 */
export async function getVendaById(id) {
    const data = await apiClient(`/vendas/${id}`)
    // Adaptação para frontend
    return {
        ...data,
        customerName: data.customerName || 'Cliente desconhecido',
        items: data.items || []
    }
}

/**
 * Criar nova venda
 * Lógica de estoque movida para o backend!
 */
export async function createVenda(vendaData) {
    console.log('API: Creating venda with data:', vendaData)
    // O backend espera snake_case no body? O apiClient nao converte automagicamente chaves profundas se nao o fizermos.
    // O backend createVenda espera: customerId, orderId... (camelCase!!)
    // Verificando server/routes/vendas.js: 
    // const { customerId, orderId ... } = req.body
    // ELE ESPERA CAMELCASE!
    // Entao NAO devo usar toSnakeCase aqui se o backend espera Camel.

    // Verifiquei server/routes/vendas.js lines 99-117. Ele destrutura CamelCase.
    // Entao vou mandar CamelCase.

    // MAS products.js e customers.js mandei snake?
    // Verificando customers.js backend: req.body destrutura name, phone, email... (neutro).
    // Mas products.js backend: req.body destrutura snake_case? ou camel?
    // Eu refatorei products.js mandando toSnakeCase.
    // Preciso verificar se o backend products.js espera snake.
    // Se o backend espera camel, fiz errado no products.js.

    // Vamos assumir que VENDAS backend foi escrito recentemente e usa CamelCase no destructuring.
    // A rota vendas.js destrutura `customerId`, `orderId`... CAMELCASE.

    return apiClient('/vendas', {
        method: 'POST',
        body: vendaData // Send CamelCase directly!
    })
}

/**
 * Atualizar venda existente
 */
export async function updateVenda(id, vendaData) {
    // Backend router.put('/:id') expects: paymentStatus, paymentMethod, totalValue, netAmount (CamelCase)
    return apiClient(`/vendas/${id}`, {
        method: 'PUT',
        body: vendaData
    })
}

/**
 * Deletar venda
 */
export async function deleteVenda(id) {
    await apiClient(`/vendas/${id}`, {
        method: 'DELETE'
    })
    return true
}


