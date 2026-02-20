import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Adjust path to verify if it finds .env
const envPath = path.resolve(__dirname, '../../.env')
console.log('Loading .env from:', envPath)
dotenv.config({ path: envPath })

const { Pool } = pg

const connectionString = process.env.DATABASE_URL
console.log('DATABASE_URL:', connectionString ? 'Found (Hashed for security)' : 'NOT FOUND')

if (!connectionString) {
    console.error('❌ DATABASE_URL missing from .env')
    process.exit(1)
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
})

async function testConnection() {
    try {
        console.log('⏳ Connecting to database...')
        const client = await pool.connect()
        console.log('✅ Connected!')

        const res = await client.query('SELECT NOW() as now, current_database() as db')
        console.log('✅ Query success:', res.rows[0])

        client.release()
        await pool.end()
        process.exit(0)
    } catch (err) {
        console.error('❌ Connection failed:', err)
        process.exit(1)
    }
}

testConnection()
