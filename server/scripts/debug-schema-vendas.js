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
        console.log('🔍 Checking vendas schema...')

        const res1 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'vendas'
            ORDER BY ordinal_position
        `)
        console.table(res1.rows)

        // Also check if there's any data and what the type of 'items' looks like
        const res2 = await pool.query('SELECT items FROM vendas LIMIT 1')
        if (res2.rows.length > 0) {
            const items = res2.rows[0].items
            console.log('\n--- Sample "items" data ---')
            console.log('Type of items:', typeof items)
            console.log('Is array?', Array.isArray(items))
            console.log('Value:', JSON.stringify(items).substring(0, 100))
        } else {
            console.log('\n⚠️ No rows found in vendas table')
        }

    } catch (err) {
        console.error('❌ Error:', err)
    } finally {
        pool.end()
    }
}

checkSchema()
