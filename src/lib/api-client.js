/**
 * Cliente API unificado para substituir chamadas diretas ao Supabase
 * Usa fetch nativo e trata erros padronizados
 */

const API_Base = import.meta.env.VITE_API_URL || '/api'

export async function apiClient(endpoint, { body, ...customConfig } = {}) {
    const headers = {
        'Content-Type': 'application/json',
    }

    const config = {
        method: body ? 'POST' : 'GET',
        ...customConfig,
        headers: {
            ...headers,
            ...customConfig.headers,
        },
    }

    // Injetar Token de Autenticação se existir
    const token = localStorage.getItem('auth_token')
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
    }

    // Se body for FormData, remover Content-Type para o browser definir boundary
    if (body instanceof FormData) {
        delete config.headers['Content-Type']
        config.body = body
    } else if (body) {
        config.body = JSON.stringify(body)
    }

    // Garantir que endpoint comece com / se não tiver http
    let url = endpoint
    if (!endpoint.startsWith('http') && !endpoint.startsWith('/')) {
        url = `/${endpoint}`
    }
    if (!endpoint.startsWith('http')) {
        url = `${API_Base}${url}`
    }

    try {
        const response = await fetch(url, config)

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || errorData.message || `Erro na requisição: ${response.status}`)
        }

        // Retorna null para 204 No Content
        if (response.status === 204) return null

        return await response.json()
    } catch (error) {
        console.error(`❌ API Error [${endpoint}]:`, error)
        throw error
    }
}
