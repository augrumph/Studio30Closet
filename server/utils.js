/**
 * Converte chaves de um objeto de snake_case para camelCase
 * Útil para formatar dados do banco (postgres/supabase) para o frontend
 */
export function toCamelCase(obj) {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v))
    } else if (obj instanceof Date) {
        // Preserve Date objects as ISO strings
        return obj.toISOString()
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

/**
 * Async Handler Wrapper
 * Catches errors in async route handlers and passes them to error middleware
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next)
    }
}
