import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

async function compare() {
    console.log('🔗 Connecting to Supabase...')
    const { data: vendas, error } = await supabase
        .from('vendas')
        .select('*')

    if (error) {
        console.error('❌ Supabase error:', error)
        return
    }

    console.log(`✅ Supabase: Found ${vendas.length} sales`)
    // Sample first sale
    if (vendas.length > 0) {
        console.log('Sample Supabase Sale Status:', vendas[0].payment_status)
    }
}

compare()
