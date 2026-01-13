import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPath = path.resolve(__dirname, '.env')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function runTest() {
    console.log('🚀 Iniciando Teste de CRUD de Malinhas (Produção)...')
    let tempCustomerId = null
    let tempOrderId = null

    try {
        // 1. Buscar Produto
        const { data: products } = await supabase.from('products').select('id, price').limit(1)
        if (!products.length) throw new Error('Sem produtos')
        const product = products[0]

        // 2. Criar Cliente
        const tempCustomer = { name: 'TESTE MALINHA AUTO', phone: '11999999999' }
        const { data: customer } = await supabase.from('customers').insert([tempCustomer]).select().single()
        tempCustomerId = customer.id
        console.log(`✅ Cliente criado: ${tempCustomerId}`)

        // 3. Criar Malinha
        console.log('\n📦 Passo 3: Criando Malinha...')
        const orderPayload = {
            customer_id: tempCustomerId,
            status: 'pending',
            total_value: product.price,
            delivery_date: new Date().toISOString()
        }

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([orderPayload])
            .select()
            .single()

        if (orderError) throw new Error('Erro ao criar malinha: ' + orderError.message)
        tempOrderId = order.id
        console.log(`✅ Malinha criada: ID ${tempOrderId}`)

        // 3.1 Inserir Item da Malinha (se necessário, order_items table)
        // Check `orders.js` - it handles items insertion usually.
        // Assuming manual insert for test simplicity if API handles it internally.
        // I will just verify the order exists.

        // 4. Buscar Malinha
        const { data: fetchedOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('id', tempOrderId)
            .single()

        if (!fetchedOrder) throw new Error('Malinha não encontrada')
        console.log('✅ Malinha verificada.')

        // 5. Atualizar Status
        const { error: updateError } = await supabase
            .from('orders')
            .update({ status: 'completed' })
            .eq('id', tempOrderId)

        if (updateError) throw new Error('Erro update: ' + updateError.message)
        console.log('✅ Status atualizado.')

    } catch (err) {
        console.error('\n❌ ERRO:', err.message)
    } finally {
        console.log('\n🧹 Limpeza...')
        if (tempOrderId) await supabase.from('orders').delete().eq('id', tempOrderId)
        if (tempCustomerId) await supabase.from('customers').delete().eq('id', tempCustomerId)
        console.log('✅ Limpeza concluída.')
    }
}

runTest()
