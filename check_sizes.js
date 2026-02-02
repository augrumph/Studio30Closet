
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkSizes() {
    const { data: vendas } = await supabase.from('vendas').select('items').neq('payment_status', 'cancelled').limit(15)

    console.log('--- TAMANHOS NAS VENDAS RECENTES ---\n')

    const sizes = {}
    vendas.forEach((v, i) => {
        let items = v.items
        if (typeof items === 'string') try { items = JSON.parse(items) } catch { items = [] }
        if (!Array.isArray(items)) items = []
        items.forEach(item => {
            const size = item.selectedSize || item.size || 'NENHUM'
            console.log(`${item.name}: Tamanho = ${size}`)
            sizes[size] = (sizes[size] || 0) + 1
        })
    })

    console.log('\n--- RESUMO POR TAMANHO ---')
    Object.entries(sizes).sort((a, b) => b[1] - a[1]).forEach(([size, count]) => {
        console.log(`${size}: ${count} vendas`)
    })
}

checkSizes()
