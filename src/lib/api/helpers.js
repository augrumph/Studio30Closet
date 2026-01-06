/**
 * Helper functions para conversão de case
 * Usadas em toda a camada de API para converter entre JavaScript (camelCase) e Supabase (snake_case)
 */

/**
 * Converter camelCase para snake_case
 * @param {Object|Array} obj - Objeto ou array a ser convertido
 * @returns {Object|Array} Objeto/array com chaves em snake_case
 */
export function toSnakeCase(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => toSnakeCase(item));
    }

    const snakeObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeObj[snakeKey] = typeof value === 'object' && !Array.isArray(value) && value !== null
            ? toSnakeCase(value)
            : value;
    }
    return snakeObj;
}

/**
 * Converter snake_case para camelCase - OTIMIZADO
 * Não processa arrays de primitivos (strings/números)
 * @param {Object|Array} obj - Objeto ou array a ser convertido
 * @returns {Object|Array} Objeto/array com chaves em camelCase
 */
export function toCamelCase(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        // Se é array de strings/primitivos, retorna direto (comum em images URLs)
        if (obj.length === 0 || typeof obj[0] !== 'object') {
            return obj;
        }
        // Caso contrário, processa cada objeto
        return obj.map(item => typeof item === 'object' ? toCamelCase(item) : item);
    }

    const camelObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

        if (value === null || value === undefined || typeof value !== 'object') {
            // Primitivos: copia direto
            camelObj[camelKey] = value;
        } else if (Array.isArray(value)) {
            // Arrays: só processa se contém objetos
            camelObj[camelKey] = typeof value[0] === 'object'
                ? value.map(item => typeof item === 'object' ? toCamelCase(item) : item)
                : value;
        } else {
            // Objetos: converte recursivamente
            camelObj[camelKey] = toCamelCase(value);
        }
    }
    return camelObj;
}
