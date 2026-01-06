/**
 * API Index - Barrel Export
 * 
 * Este arquivo re-exporta todas as funções do api.js original para manter retrocompatibilidade.
 * Para novos desenvolvimentos, considere importar diretamente dos módulos específicos.
 * 
 * Módulos disponíveis:
 * - lib/api/helpers.js     - Funções de conversão (toSnakeCase, toCamelCase)
 * - lib/api/products.js    - CRUD de produtos
 * - lib/api/customers.js   - CRUD de clientes  
 * - lib/api/vendas.js      - Vendas
 */

// Re-exportar tudo do api.js original para manter retrocompatibilidade
export * from '../api.js'

// Exportar módulos específicos (podem ser importados diretamente para melhor tree-shaking)
export * from './helpers.js'
export * from './products.js'
export * from './customers.js'
export * from './vendas.js'

