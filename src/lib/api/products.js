/**
 * API de Produtos
 * CRUD e operações relacionadas a produtos
 * Refatorado para usar Backend BFF (Node.js + Postgres)
 */

import { apiClient } from '../api-client'
import { toCamelCase, toSnakeCase } from './helpers'

/**
 * Carregar produtos paginados
 */
export async function getProducts(page = 1, pageSize = 20, filters = {}) {
    const queryParams = {
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...toSnakeCase(filters)
    }

    // Remover chaves undefined/null para não virar string "undefined" na URL
    const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v != null && v !== '')
    )

    const params = new URLSearchParams(cleanParams)

    return apiClient(`/products?${params.toString()}`)
}

/**
 * Carregar produtos em destaque (Hero)
 */
export async function getFeaturedProducts() {
    const data = await apiClient('/products?featured=true&limit=4')
    return data.items || [] // Backend returns { items: [], ... }
}

/**
 * Carregar todos os produtos (para catálogo)
 */
export async function getAllProducts() {
    const data = await apiClient('/products?limit=1000')
    return data.items || []
}

/**
 * Buscar produto por ID
 */
export async function getProductById(id) {
    return apiClient(`/products/${id}`)
}

/**
 * Criar novo produto
 */
export async function createProduct(productData) {
    return apiClient('/products', {
        method: 'POST',
        body: toSnakeCase(productData)
    })
}

/**
 * Atualizar produto existente
 */
export async function updateProduct(id, productData) {
    return apiClient(`/products/${id}`, {
        method: 'PUT',
        body: toSnakeCase(productData)
    })
}

/**
 * Deletar produto
 */
export async function deleteProduct(id) {
    await apiClient(`/products/${id}`, {
        method: 'DELETE'
    })
    return true
}

/**
 * Deletar múltiplos produtos
 */
export async function deleteMultipleProducts(productIds) {
    // Implementando com Promise.all para compatibilidade
    await Promise.all(productIds.map(id => deleteProduct(id)))
    return true
}

/**
 * Carregar produtos PAGINADOS com FILTROS (Infinite Scroll)
 * Usado no Catálogo
 * Wrapper para getProducts
 */
export async function getProductsPaginated(offset = 0, limit = 6, filters = {}) {
    // Converter offset para page
    const page = Math.floor(offset / limit) + 1

    // Mapear filtros especiais se necessário
    const apiFilters = { ...filters, active: true }
    if (filters.collection) apiFilters.collection = filters.collection
    if (filters.sizes && Array.isArray(filters.sizes)) apiFilters.sizes = filters.sizes.join(',') // Backend espera string ou array? Vamos mandar string csv no query param

    const data = await getProducts(page, limit, apiFilters)

    return {
        products: data.items,
        total: data.total
    }
}

/**
 * Admin: Carregar Inventário Completo (inclui Preço de Custo)
 */
export async function getAllProductsAdmin() {
    const data = await apiClient('/products?limit=5000&includeCost=true')
    return data.items || []
}
