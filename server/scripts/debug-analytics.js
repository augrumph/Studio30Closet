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

async function testAnalytics() {
    try {
        console.log('🔍 Testing Analytics Table...')

        try {
            const res = await pool.query('SELECT COUNT(*) FROM analytics_events')
            console.log('✅ Success: analytics_events table exists. Count:', res.rows[0].count)
        } catch (e) {
            console.error('❌ Failed: analytics_events table error:', e.message)
        }

    } catch (err) {
        console.error('❌ Fatal error:', err)
    } finally {
        pool.end()
    }
}

testAnalytics()
