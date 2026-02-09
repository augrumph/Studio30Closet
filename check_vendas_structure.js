import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

async function checkVendasStructure() {
    console.log('🔍 Verificando estrutura das vendas...\n')

    // Buscar algumas vendas recentes
    const { data: vendas, error } = await supabase
        .from('vendas')
        .select('id, items, customer_id, total_value, created_at, payment_method')
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error('❌ Erro ao buscar vendas:', error)
        return
    }

    console.log(`📊 Total de vendas encontradas: ${vendas.length}\n`)

    vendas.forEach((venda, index) => {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`VENDA #${venda.id} (${index + 1}/${vendas.length})`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`Data: ${venda.created_at}`)
        console.log(`Total: R$ ${venda.total_value}`)
        console.log(`Método de Pagamento: ${venda.payment_method || 'N/A'}`)
        console.log(`\n📦 ITEMS:`)

        let items = venda.items

        // Verificar tipo
        console.log(`Tipo do campo items: ${typeof items}`)

        if (typeof items === 'string') {
            try {
                items = JSON.parse(items)
                console.log('✅ Items parseado de string para objeto')
            } catch (e) {
                console.log('❌ Falha ao parsear items JSON:', e.message)
                return
            }
        }

        if (!Array.isArray(items)) {
            console.log('⚠️ Items NÃO é um array!')
            console.log('Conteúdo:', items)
            return
        }

        console.log(`Total de items: ${items.length}\n`)

        items.forEach((item, i) => {
            console.log(`  Item ${i + 1}:`)
            console.log(`    - Keys disponíveis: ${Object.keys(item).join(', ')}`)
            console.log(`    - productId: ${item.productId || item.id || 'N/A'}`)
            console.log(`    - product_id: ${item.product_id || 'N/A'}`)
            console.log(`    - name: ${item.name || 'N/A'}`)
            console.log(`    - quantity: ${item.quantity || 'N/A'}`)
            console.log(`    - price: ${item.price || 'N/A'}`)
            console.log(`    - selectedSize: ${item.selectedSize || 'N/A'}`)
            console.log(`    - selectedColor: ${item.selectedColor || 'N/A'}`)
            console.log(`    - Estrutura completa:`, JSON.stringify(item, null, 6))
        })
    })

    // Estatísticas gerais
    const { data: allVendas, error: allError } = await supabase
        .from('vendas')
        .select('id, items, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

    if (!allError) {
        console.log(`\n\n📊 ESTATÍSTICAS (últimas 100 vendas):`)
        console.log(`Total: ${allVendas.length}`)

        let vendasWithItems = 0
        let vendasWithoutItems = 0
        let totalItems = 0

        allVendas.forEach(v => {
            let items = v.items
            if (typeof items === 'string') {
                try { items = JSON.parse(items) } catch { items = [] }
            }
            if (Array.isArray(items) && items.length > 0) {
                vendasWithItems++
                totalItems += items.length
            } else {
                vendasWithoutItems++
            }
        })

        console.log(`Com items: ${vendasWithItems}`)
        console.log(`Sem items: ${vendasWithoutItems}`)
        console.log(`Total de items: ${totalItems}`)
        console.log(`Média de items por venda: ${(totalItems / vendasWithItems).toFixed(2)}`)
    }
}

checkVendasStructure().catch(console.error)
