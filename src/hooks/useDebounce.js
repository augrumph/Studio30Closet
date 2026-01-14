import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * 
 * Útil para otimizar buscas e filtros, evitando requisições excessivas
 * enquanto o usuário está digitando.
 * 
 * @param {any} value - Valor a ser debounced
 * @param {number} delay - Delay em milissegundos (padrão: 500ms)
 * @returns {any} Valor debounced
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 300)
 * 
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     searchProducts(debouncedSearch)
 *   }
 * }, [debouncedSearch])
 */
export function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Criar timer para atualizar o valor após o delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Limpar timer se value mudar antes do delay
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;
