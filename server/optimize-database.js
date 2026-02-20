/**
 * Database Performance Optimization
 * Creates indexes for frequently queried columns
 * Run once: node optimize-database.js
 */

import { pool } from './db.js'

const indexes = [
    // Products table
    { table: 'products', column: 'category', name: 'idx_products_category' },
    { table: 'products', column: 'active', name: 'idx_products_active' },
    { table: 'products', column: 'supplier_id', name: 'idx_products_supplier' },
    { table: 'products', column: 'created_at', name: 'idx_products_created' },

    // Orders table
    { table: 'orders', column: 'customer_id', name: 'idx_orders_customer' },
    { table: 'orders', column: 'status', name: 'idx_orders_status' },
    { table: 'orders', column: 'created_at', name: 'idx_orders_created' },

    // Vendas table
    { table: 'vendas', column: 'customer_id', name: 'idx_vendas_customer' },
    { table: 'vendas', column: 'payment_status', name: 'idx_vendas_payment_status' },
    { table: 'vendas', column: 'payment_method', name: 'idx_vendas_payment_method' },
    { table: 'vendas', column: 'created_at', name: 'idx_vendas_created' },

    // Customers table
    { table: 'customers', column: 'cpf', name: 'idx_customers_cpf' },
    { table: 'customers', column: 'phone', name: 'idx_customers_phone' },
    { table: 'customers', column: 'created_at', name: 'idx_customers_created' },

    // Installments table
    { table: 'installments', column: 'venda_id', name: 'idx_installments_venda' },
    { table: 'installments', column: 'status', name: 'idx_installments_status' },
    { table: 'installments', column: 'due_date', name: 'idx_installments_due_date' },

    // Collections table
    { table: 'collections', column: 'active', name: 'idx_collections_active' },
    { table: 'collections', column: 'slug', name: 'idx_collections_slug', unique: true },

    // Payment Fees table
    { table: 'payment_fees', column: 'payment_method', name: 'idx_payment_fees_method' },
    { table: 'payment_fees', column: 'is_active', name: 'idx_payment_fees_active' },

    // Settings table
    { table: 'settings', column: 'setting_key', name: 'idx_settings_key', unique: true }
]

async function createIndexes() {
    console.log('🚀 Starting database optimization...\n')

    let created = 0
    let skipped = 0
    let errors = 0

    for (const index of indexes) {
        try {
            const uniqueClause = index.unique ? 'UNIQUE' : ''
            const sql = `CREATE ${uniqueClause} INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column})`

            await pool.query(sql)
            console.log(`✅ ${index.name} on ${index.table}(${index.column})`)
            created++
        } catch (error) {
            if (error.code === '42P07') {
                // Index already exists
                console.log(`⏭️  ${index.name} already exists`)
                skipped++
            } else {
                console.error(`❌ Error creating ${index.name}:`, error.message)
                errors++
            }
        }
    }

    // Create composite indexes for common query patterns
    console.log('\n📊 Creating composite indexes...\n')

    const compositeIndexes = [
        {
            name: 'idx_vendas_customer_created',
            sql: 'CREATE INDEX IF NOT EXISTS idx_vendas_customer_created ON vendas(customer_id, created_at DESC)'
        },
        {
            name: 'idx_products_category_active',
            sql: 'CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, active) WHERE active = true'
        },
        {
            name: 'idx_orders_customer_status',
            sql: 'CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status)'
        },
        {
            name: 'idx_installments_venda_status',
            sql: 'CREATE INDEX IF NOT EXISTS idx_installments_venda_status ON installments(venda_id, status)'
        }
    ]

    for (const index of compositeIndexes) {
        try {
            await pool.query(index.sql)
            console.log(`✅ ${index.name}`)
            created++
        } catch (error) {
            if (error.code === '42P07') {
                console.log(`⏭️  ${index.name} already exists`)
                skipped++
            } else {
                console.error(`❌ Error creating ${index.name}:`, error.message)
                errors++
            }
        }
    }

    console.log(`\n✨ Optimization complete!`)
    console.log(`   Created: ${created}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Errors: ${errors}`)

    await pool.end()
}

createIndexes().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
})
