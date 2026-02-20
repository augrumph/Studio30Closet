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

async function checkSchema() {
    try {
        console.log('🔍 Checking schemas...')

        console.log('\n--- installment_payments columns ---')
        const res1 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'installment_payments'
        `)
        console.table(res1.rows)

        console.log('\n--- products columns ---')
        const res2 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'products'
        `)
        console.table(res2.rows)

    } catch (err) {
        console.error('❌ Error:', err)
    } finally {
        pool.end()
    }
}

checkSchema()
