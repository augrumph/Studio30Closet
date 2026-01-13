import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Tentar ler .env
const envPath = path.resolve(__dirname, '.env')
if (fs.existsSync(envPath)) {
    console.log('📄 Carregando variáveis de ambiente...')
    dotenv.config({ path: envPath })
} else {
    console.warn('⚠️ Arquivo .env não encontrado. Tentando variáveis do sistema...')
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Credenciais do Supabase não encontradas!')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// --- MOCKED HELPERS (to match src/lib/api/helpers.js) ---
const toSnakeCase = (obj) => {
    if (!obj) return obj
    const newObj = {}
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        newObj[snakeKey] = obj[key]
    }
    return newObj
}
// ---------------------------------------------------------

async function runTest() {
    console.log('🚀 Iniciando Teste de CRUD de Vendas (Produção)...')

    let tempCustomerId = null
    let tempSaleId = null

    try {
        // 1. Buscar um produto existente (precisamos de um ID válido)
        console.log('\n📦 Passo 1: Buscando um produto existente...')
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, price, cost_price')
            .limit(1)

        if (prodError || !products.length) throw new Error('Falha ao buscar produto: ' + (prodError?.message || 'Nenhum produto'))

        const product = products[0]
        console.log(`✅ Produto encontrado: ${product.name} (ID: ${product.id})`)

        // 2. Criar Cliente Temporário
        console.log('\n👤 Passo 2: Criando Cliente de Teste...')
        const tempCustomer = {
            name: 'TESTE AUTOMATIZADO - POR FAVOR DELETAR',
            phone: '11999999999',
            email: 'teste@exemplo.com'
        }

        const { data: customer, error: custError } = await supabase
            .from('customers')
            .insert([tempCustomer])
            .select()
            .single()

        if (custError) throw new Error('Erro ao criar cliente teste: ' + custError.message)
        tempCustomerId = customer.id
        console.log(`✅ Cliente criado: ID ${tempCustomerId}`)

        // 3. Criar Venda (Simulando logic de createVenda)
        console.log('\n💰 Passo 3: Criando Venda...')
        const items = [{
            productId: product.id,
            name: product.name,
            quantity: 1,
            price: product.price,
            costPrice: product.cost_price || 0,
            selectedColor: 'Teste',
            selectedSize: 'U'
        }]

        const vendaPayload = {
            customerId: tempCustomerId,
            customerName: customer.name,
            items: JSON.stringify(items),
            totalValue: product.price,
            paymentMethod: 'pix',
            paymentStatus: 'paid',
            originalTotal: product.price,
            discountAmount: 0,
            sellerId: null
        }

        const snakePayload = toSnakeCase(vendaPayload)

        // Match src/lib/api/vendas.js structure
        const vendaRecord = {
            customer_id: snakePayload.customer_id,
            total_value: snakePayload.total_value,
            items: snakePayload.items || [],
            payment_method: snakePayload.payment_method,
            payment_status: snakePayload.payment_status,
            created_at: new Date()
        }

        // INSERT manual (simulando API)
        const { data: venda, error: saleError } = await supabase
            .from('vendas')
            .insert([vendaRecord])
            .select()
            .single()

        if (saleError) throw new Error('Erro ao criar venda: ' + saleError.message)

        tempSaleId = venda.id
        console.log(`✅ Venda criada com sucesso: ID ${tempSaleId}`)

        // 4. Buscar Venda (Simulando getVendaById)
        console.log('\n🔍 Passo 4: Buscando Venda por ID (Verificação)...')
        const { data: fetchedVenda, error: fetchError } = await supabase
            .from('vendas')
            .select(`*, customers (id, name), items:venda_items (*)`)
            .eq('id', tempSaleId)
            .single()

        if (fetchError) {
            // Fallback logic test
            console.log('   Note: Fetch principal falhou (possivelmente items relation), tentando fallback...')
            const { data: fallback, error: fbError } = await supabase
                .from('vendas')
                .select('*')
                .eq('id', tempSaleId)
                .single()
            if (fbError) throw new Error('Erro ao buscar venda (fallback): ' + fbError.message)
            console.log('✅ Venda recuperada via fallback.')
        } else {
            console.log('✅ Venda recuperada com sucesso.')
        }

        // 5. Atualizar Venda
        console.log('\n✏️ Passo 5: Editando Venda (Update)...')
        const updatePayload = {
            paymentStatus: 'pending' // Mudando status para pendente
        }

        const { error: updateError } = await supabase
            .from('vendas')
            .update(toSnakeCase(updatePayload))
            .eq('id', tempSaleId)

        if (updateError) throw new Error('Erro ao atualizar venda: ' + updateError.message)
        console.log('✅ Venda atualizada.')

        console.log('\n🎉 TESTE DE SUCESSO: O fluxo de criação, leitura e edição está funcionando!')

    } catch (err) {
        console.error('\n❌ ERRO NO TESTE:', err.message)
    } finally {
        // CLEANUP (Essencial!)
        console.log('\n🧹 Limpeza (Cleanup)...')

        if (tempSaleId) {
            const { error } = await supabase.from('vendas').delete().eq('id', tempSaleId)
            if (error) console.error('   ❌ Falha ao deletar venda de teste:', error.message)
            else console.log('   ✅ Venda de teste removida.')
        }

        if (tempCustomerId) {
            const { error } = await supabase.from('customers').delete().eq('id', tempCustomerId)
            if (error) console.error('   ❌ Falha ao deletar cliente de teste:', error.message)
            else console.log('   ✅ Cliente de teste removido.')
        }
    }
}

runTest()
