
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debugMargin() {
    // 1. Buscar info do produto
    const { data: product } = await supabase
        .from('products')
        .select('id, name, price, cost_price')
        .ilike('name', '%Luara%')
        .single()

    console.log('--- PRODUTO CADASTRADO ---')
    console.log('Nome:', product?.name)
    console.log('Preço Venda:', product?.price)
    console.log('Custo:', product?.cost_price)
    console.log('Margem Unitária:', (product?.price - product?.cost_price).toFixed(2))

    // 2. Buscar vendas desse produto
    const { data: vendas } = await supabase
        .from('vendas')
        .select('items, created_at')
        .neq('payment_status', 'cancelled')

    console.log('\n--- VENDAS DE CONJUNTO LUARA ---')

    let totalQty = 0
    let totalRevenue = 0
    let totalMargin = 0

    vendas.forEach(v => {
        let items = v.items
        if (typeof items === 'string') try { items = JSON.parse(items) } catch { items = [] }
        if (!Array.isArray(items)) items = []

        items.forEach(item => {
            if (item.name && item.name.toLowerCase().includes('luara')) {
                const qty = item.quantity || 1
                const price = item.price || 0
                const cost = item.costPrice || product?.cost_price || 0
                const margin = price - cost

                totalQty += qty
                totalRevenue += price * qty
                totalMargin += margin * qty

                console.log(`- ${item.name}: ${qty}x @ R$${price} (custo: R$${cost}) = Margem R$${(margin * qty).toFixed(2)}`)
            }
        })
    })

    console.log('\n--- TOTAIS ---')
    console.log('Quantidade vendida:', totalQty)
    console.log('Receita total:', totalRevenue.toFixed(2))
    console.log('Margem total (SOMA):', totalMargin.toFixed(2))
    console.log('\nEsta é a margem que aparece no dashboard (R$ 319)')
}

debugMargin()
