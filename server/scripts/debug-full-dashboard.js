import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const { Pool } = pg
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
})

async function testDashboardLogic() {
    try {
        console.log('🚀 Starting Full Dashboard Logic Test...')

        // 1. Simulate Parameters
        const now = new Date()
        const period = 'all'
        let startDate = null
        let endDate = null

        // 2. BUSCA OTIMIZADA (Paralela)
        console.log('⏳ Running Promise.all queries...')
        const [
            vendasResult,
            expensesResult,
            installmentsResult,
            purchasesResult,
            ordersResult,
            productsResult
        ] = await Promise.all([
            // Vendas do período
            pool.query(`
                SELECT v.*, c.name as customer_name
                FROM vendas v
                LEFT JOIN customers c ON c.id = v.customer_id
                ORDER BY v.created_at DESC
            `),

            // Despesas fixas
            pool.query('SELECT * FROM fixed_expenses'),

            // Parcelas com payments (nested)
            pool.query(`
                SELECT
                    i.*,
                    json_agg(
                        json_build_object(
                            'id', ip.id,
                            'installment_id', ip.installment_id,
                            'payment_date', ip.payment_date,
                            'amount_paid', ip.payment_amount, -- Fixed column here too
                            'payment_method', ip.payment_method,
                            'created_at', ip.created_at
                        )
                    ) FILTER (WHERE ip.id IS NOT NULL) as installment_payments
                FROM installments i
                LEFT JOIN installment_payments ip ON ip.installment_id = i.id
                GROUP BY i.id
            `),

            // Compras com supplier name via JOIN
            pool.query(`
                SELECT p.*, s.name as supplier_name
                FROM purchases p
                LEFT JOIN suppliers s ON s.id = p.supplier_id
            `),

            // Pedidos (só precisa de count)
            pool.query('SELECT id FROM orders'),

            // Produtos para inventário
            pool.query('SELECT id, price, cost_price, stock, active FROM products')
        ])

        console.log('✅ Queries successful!')

        const vendas = vendasResult.rows
        const expenses = expensesResult.rows
        const installments = installmentsResult.rows
        const purchases = purchasesResult.rows
        const orders = ordersResult.rows
        const products = productsResult.rows

        console.log(`📊 Data loaded: Vendas=${vendas.length}, Installments=${installments.length}`)

        // 3. PROCESSAMENTO FINANCEIRO
        console.log('⏳ Processing financial data...')

        // Mapeamento snake_case para camelCase
        const normalizedVendas = vendas.map(v => {
            // Simulate mapping logic from dashboard.js
            return {
                ...v,
                totalValue: v.total_value,
                items: (v.items || []).map(item => ({
                    ...item,
                    costPrice: item.costPrice || item.cost_price || 0,
                    price: item.price || 0,
                    quantity: item.quantity || 1
                }))
            }
        })

        console.log('✅ Normalization complete')

        // Loop simulation
        let totalItemsSold = 0
        normalizedVendas.forEach(v => {
            v.items.forEach(item => {
                totalItemsSold += (item.quantity || 0)
            })
        })

        console.log('✅ Processing loop complete. Total Items Sold:', totalItemsSold)
        console.log('🎉 Full Logic Test PASSED!')

    } catch (err) {
        console.error('❌ CRASH DETECTED:', err)
        console.error('Stack:', err.stack)
    } finally {
        pool.end()
    }
}

testDashboardLogic()
