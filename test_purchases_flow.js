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
    console.log('🚀 Iniciando Teste de CRUD de Compras (Produção)...')
    let tempSupplierId = null
    let tempPurchaseId = null

    try {
        // 1. Criar Fornecedor para teste
        console.log('\n🏭 Passo 1: Criando Fornecedor...')
        const tempSupplier = {
            name: 'FORNECEDOR PARA COMPRA AUTO',
            cnpj: '00.000.000/0002-88'
        }

        const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .insert([tempSupplier])
            .select()
            .single()

        if (supplierError) throw new Error('Erro ao criar fornecedor: ' + supplierError.message)
        tempSupplierId = supplier.id
        console.log(`✅ Fornecedor criado: ${tempSupplierId}`)

        // 2. Criar Compra
        console.log('\n📦 Passo 2: Criando Compra...')
        const purchasePayload = {
            supplier_id: tempSupplierId,
            payment_method: 'pix',
            value: 150.00,
            date: new Date().toISOString().split('T')[0],
            pieces: 10,
            spent_by: 'loja',
            notes: 'Compra de teste automatizado'
        }

        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .insert([purchasePayload])
            .select()
            .single()

        if (purchaseError) throw new Error('Erro ao criar compra: ' + purchaseError.message)
        tempPurchaseId = purchase.id
        console.log(`✅ Compra criada: ID ${tempPurchaseId}`)

        // 3. Verificar
        console.log('\n🔍 Passo 3: Buscando Compra...')
        const { data: fetched } = await supabase.from('purchases').select('*').eq('id', tempPurchaseId).single()
        if (fetched.value !== 150.00) throw new Error('Valor mismatch')
        console.log('✅ Verificado.')

        // 4. Atualizar
        console.log('\n✏️ Passo 4: Atualizando...')
        const { error: updateError } = await supabase
            .from('purchases')
            .update({ value: 200.00, notes: 'Atualizado pelo teste' })
            .eq('id', tempPurchaseId)

        if (updateError) throw new Error('Erro update: ' + updateError.message)
        console.log('✅ Atualizado.')

    } catch (err) {
        console.error('\n❌ ERRO:', err.message)
    } finally {
        console.log('\n🧹 Limpeza...')
        if (tempPurchaseId) await supabase.from('purchases').delete().eq('id', tempPurchaseId)
        if (tempSupplierId) await supabase.from('suppliers').delete().eq('id', tempSupplierId)
        console.log('✅ Limpeza concluída.')
    }
}

runTest()
