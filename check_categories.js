
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkCategories() {
    const { data: products } = await supabase
        .from('products')
        .select('category')

    // Contar categorias únicas
    const counts = {}
    products.forEach(p => {
        const cat = p.category || 'NULL'
        counts[cat] = (counts[cat] || 0) + 1
    })

    console.log('--- CATEGORIAS NO BANCO ---')
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
        console.log(`'${cat}': ${count} produtos`)
    })
}

checkCategories()
