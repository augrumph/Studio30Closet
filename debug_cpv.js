import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

// Load env
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '.env')

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCPV() {
    console.log('🔍 Checking latest 5 sales for cost_price in items...')

    const { data: vendas, error } = await supabase
        .from('vendas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error('❌ Error fetching vendas:', error)
        return
    }

    if (!vendas || vendas.length === 0) {
        console.log('⚠️ No sales found.')
        return
    }

    vendas.forEach(v => {
        console.log(`\n🧾 SALE #${v.id} - ${v.created_at}`)
        console.log(`   Total: ${v.total_value}`)

        const items = v.items || []
        if (items.length === 0) {
            console.log('   ⚠️ No items in this sale (JSON empty)')
        } else {
            items.forEach((item, idx) => {
                console.log(`   📦 Item ${idx + 1}: ${item.name || 'Unknown'}`)
                console.log(`      Price: ${item.price}`)
                console.log(`      Quantity: ${item.quantity || item.qty}`)
                console.log(`      Cost In JSON: ${item.cost_price} (Type: ${typeof item.cost_price})`)
                console.log(`      Cost At Time: ${item.cost_price_at_time} (Type: ${typeof item.cost_price_at_time})`)
            })
        }
    })
}

checkCPV()
