import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const { Pool } = pg

// Test Supabase
console.log('🔵 Testando Supabase...')
const supabase = createClient(
  'https://wvghryqufnjmdfnjypbu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Z2hyeXF1Zm5qbWRmbmp5cGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDc3NTgsImV4cCI6MjA4MTk4Mzc1OH0.hxxwNFxkc6oB0xR0r9LLP_tg-dY3FlW4hsUBcQ-ELSM'
)
const { data: sbData, error: sbError } = await supabase.from('customers').select('id').limit(1)
if (sbError) console.error('❌ Supabase ERROR:', sbError.message)
else console.log('✅ Supabase OK - Customers count test:', sbData)

// Test Railway
console.log('\n🟢 Testando Railway PostgreSQL...')
const pool = new Pool({
  connectionString: 'postgresql://postgres:lkFzFRvxtPZHhwtxIKxPlqtLsFLaxtAk@maglev.proxy.rlwy.net:18204/railway',
  ssl: { rejectUnauthorized: false }
})

try {
  const res = await pool.query('SELECT version()')
  console.log('✅ Railway PostgreSQL OK:', res.rows[0].version.split(' ').slice(0,2).join(' '))
} catch (e) {
  console.error('❌ Railway ERROR:', e.message)
} finally {
  await pool.end()
}
