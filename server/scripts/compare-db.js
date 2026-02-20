import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Hardcoded for comparison if .env fails (derived from previous grep)
const SUPABASE_URL = 'https://wvghryqufnjmdfnjypbu.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Z2hyeXF1Zm5qbWRmbmp5cGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDc3NTgsImV4cCI6MjA4MTk4Mzc1OH0.hxxwNFxkc6oB0xR0r9LLP_tg-dY3FlW4hsUBcQ-ELSM'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const { Pool } = pg
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
})

async function compareDatabases() {
    try {
        console.log('📊 Comparing Databases...')

        // 1. Supabase Count
        const { data: sVendas, error: sError } = await supabase.from('vendas').select('id, payment_status, created_at')
        if (sError) console.error('❌ Supabase error:', sError)
        else console.log(`🟢 Supabase: ${sVendas.length} sales`)

        // 2. Railway Count
        const { rows: rVendas } = await pool.query('SELECT id, payment_status, created_at FROM vendas')
        console.log(`🔵 Railway: ${rVendas.length} sales`)

        // 3. Status Breakdown
        const sStatus = sVendas?.reduce((acc, v) => { acc[v.payment_status] = (acc[v.payment_status] || 0) + 1; return acc }, {})
        const rStatus = rVendas?.reduce((acc, v) => { acc[v.payment_status] = (acc[v.payment_status] || 0) + 1; return acc }, {})

        console.log('\n--- Status Breakdown ---')
        console.log('Supabase:', sStatus)
        console.log('Railway:', rStatus)

        // 4. Sample Dates
        if (sVendas?.length > 0) console.log('\nSupabase latest:', sVendas[sVendas.length - 1].created_at)
        if (rVendas?.length > 0) console.log('Railway latest:', rVendas[0].created_at)

    } catch (err) {
        console.error('❌ Error:', err)
    } finally {
        pool.end()
    }
}

compareDatabases()
