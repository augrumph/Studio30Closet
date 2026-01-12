/**
 * API Index - Barrel Export
 *
 * Este arquivo re-exporta todas as funções do api.js original para manter retrocompatibilidade.
 * Para novos desenvolvimentos, considere importar diretamente dos módulos específicos.
 *
 * Módulos disponíveis:
 * - lib/api/helpers.js       - Funções de conversão (toSnakeCase, toCamelCase)
 * - lib/api/products.js      - CRUD de produtos
 * - lib/api/customers.js     - CRUD de clientes
 * - lib/api/vendas.js        - Vendas
 * - lib/api/settings.js      - Configurações do sistema
 * - lib/api/coupons.js       - CRUD de cupons
 * - lib/api/suppliers.js     - CRUD de fornecedores
 * - lib/api/payment-fees.js  - CRUD de taxas de pagamento
 * - lib/api/expenses.js      - CRUD de despesas fixas
 * - lib/api/materials.js     - CRUD de estoque de materiais
 * - lib/api/purchases.js     - CRUD de compras
 * - lib/api/orders.js        - CRUD de orders (malinhas)
 * - lib/api/installments.js  - Parcelamentos e crediário
 */

// Re-exportar tudo do api.js original para manter retrocompatibilidade
export * from '../api.js'

// Exportar módulos específicos (podem ser importados diretamente para melhor tree-shaking)
export * from './helpers.js'
export * from './products.js'
export * from './customers.js'
export * from './vendas.js'
export * from './settings.js'
export * from './coupons.js'
export * from './suppliers.js'
export * from './payment-fees.js'
export * from './expenses.js'
export * from './materials.js'
export * from './purchases.js'
export * from './orders.js'
export * from './installments.js'

