/**
 * Converte chaves de um objeto de snake_case para camelCase
 * Útil para formatar dados do banco (postgres/supabase) para o frontend
 */
export function toCamelCase(obj) {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v))
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce(
            (result, key) => {
                const camelKey = key.replace(/([-_][a-z])/g, (group) =>
                    group.toUpperCase()
                        .replace('-', '')
                        .replace('_', '')
                )
                result[camelKey] = toCamelCase(obj[key])
                return result
            },
            {}
        )
    }
    return obj
}

/**
 * Formata valores monetários para BRL
 */
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value)
}
