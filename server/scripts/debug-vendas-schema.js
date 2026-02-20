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

async function checkVendasSchema() {
    try {
        console.log('🔍 Checking schemas...')

        console.log('\n--- vendas columns ---')
        const res1 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'vendas'
        `)
        console.table(res1.rows)

    } catch (err) {
        console.error('❌ Error:', err)
    } finally {
        pool.end()
    }
}

checkVendasSchema()
