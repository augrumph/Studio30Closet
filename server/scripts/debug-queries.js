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

async function testQueries() {
    try {
        console.log('🔍 Testing individual queries...')

        // 1. Fixed Expenses
        console.log('\n--- 1. Testing Fixed Expenses ---')
        try {
            const res = await pool.query('SELECT * FROM fixed_expenses LIMIT 1')
            console.log('✅ Success:', res.rowCount, 'rows')
        } catch (e) {
            console.error('❌ Failed:', e.message)
        }

        // 2. Orders
        console.log('\n--- 2. Testing Orders ---')
        try {
            const res = await pool.query('SELECT id FROM orders LIMIT 1')
            console.log('✅ Success:', res.rowCount, 'rows')
        } catch (e) {
            console.error('❌ Failed:', e.message)
        }

        // 3. Products
        console.log('\n--- 3. Testing Products ---')
        try {
            const res = await pool.query('SELECT id, price, cost_price, stock, active FROM products LIMIT 1')
            console.log('✅ Success:', res.rowCount, 'rows')
        } catch (e) {
            console.error('❌ Failed:', e.message)
        }

        // 4. Vendas
        console.log('\n--- 4. Testing Vendas ---')
        try {
            const res = await pool.query(`
                SELECT v.*, c.name as customer_name
                FROM vendas v
                LEFT JOIN customers c ON c.id = v.customer_id
                ORDER BY v.created_at DESC LIMIT 1
            `)
            console.log('✅ Success:', res.rowCount, 'rows')
        } catch (e) {
            console.error('❌ Failed:', e.message)
        }

        // 5. Installments (Complex)
        console.log('\n--- 5. Testing Installments (Complex) ---')
        try {
            const res = await pool.query(`
                SELECT
                    i.*,
                    json_agg(
                        json_build_object(
                            'id', ip.id,
                            'installment_id', ip.installment_id,
                            'payment_date', ip.payment_date,
                            'installment_id', ip.installment_id,
                            'payment_date', ip.payment_date,
                            'amount_paid', ip.payment_amount, -- ✅ Corrigido de amount_paid
                            'payment_method', ip.payment_method,
                            'created_at', ip.created_at
                        )
                    ) FILTER (WHERE ip.id IS NOT NULL) as installment_payments
                FROM installments i
                LEFT JOIN installment_payments ip ON ip.installment_id = i.id
                GROUP BY i.id
                LIMIT 1
            `)
            console.log('✅ Success:', res.rowCount, 'rows')
        } catch (e) {
            console.error('❌ Failed:', e.message)
        }

    } catch (err) {
        console.error('❌ Fatal error:', err)
    } finally {
        pool.end()
    }
}

testQueries()
