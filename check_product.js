import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

async function checkProduct() {
    console.log('🔍 Consultando produto #45...\n')

    // Consultar produto específico
    const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', 45)
        .single()

    if (productError) {
        console.error('❌ Erro ao buscar produto:', productError)
        return
    }

    console.log('📦 PRODUTO #45 - DADOS DO BANCO:\n')
    console.log('ID:', product.id)
    console.log('Nome:', product.name)
    console.log('Preço (price):', product.price)
    console.log('Custo (cost_price):', product.cost_price)
    console.log('Estoque (stock):', product.stock)
    console.log('Categoria:', product.category)
    console.log('Ativo:', product.active)
    console.log('\n📊 CAMPOS COMPLETOS:\n', JSON.stringify(product, null, 2))

    // Verificar produtos sem custo
    console.log('\n\n🔍 Verificando TODOS os produtos sem preço de custo...\n')

    const { data: productsNoCost, error: noCostError } = await supabase
        .from('products')
        .select('id, name, price, cost_price, stock')
        .or('cost_price.is.null,cost_price.eq.0')
        .order('id')

    if (noCostError) {
        console.error('❌ Erro:', noCostError)
        return
    }

    console.log(`Total de produtos sem custo: ${productsNoCost.length}\n`)
    productsNoCost.forEach(p => {
        console.log(`#${p.id} - ${p.name}`)
        console.log(`  Preço: R$ ${p.price || 0}`)
        console.log(`  Custo: R$ ${p.cost_price || 0} ${!p.cost_price ? '⚠️ FALTANDO' : ''}`)
        console.log(`  Estoque: ${p.stock || 0}\n`)
    })

    // Estatísticas gerais
    const { data: allProducts, error: allError } = await supabase
        .from('products')
        .select('id, cost_price')

    if (!allError) {
        const total = allProducts.length
        const withCost = allProducts.filter(p => p.cost_price > 0).length
        const withoutCost = total - withCost

        console.log('\n📊 ESTATÍSTICAS GERAIS:')
        console.log(`Total de produtos: ${total}`)
        console.log(`Com preço de custo: ${withCost} (${((withCost/total)*100).toFixed(1)}%)`)
        console.log(`Sem preço de custo: ${withoutCost} (${((withoutCost/total)*100).toFixed(1)}%)`)
    }
}

checkProduct().catch(console.error)
