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
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Credenciais do Supabase não encontradas!')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runTest() {
    console.log('🚀 Iniciando Teste de CRUD de Clientes (Produção)...')
    let tempCustomerId = null

    try {
        // 1. Criar Cliente
        console.log('\n👤 Passo 1: Criando Cliente de Teste...')
        const tempCustomer = {
            name: 'TESTE CLIENTE AUTOMATIZADO',
            phone: '11999999999',
            email: 'teste.cliente@exemplo.com'
        }

        const { data: customer, error: custError } = await supabase
            .from('customers')
            .insert([tempCustomer])
            .select()
            .single()

        if (custError) throw new Error('Erro ao criar cliente teste: ' + custError.message)
        tempCustomerId = customer.id
        console.log(`✅ Cliente criado: ID ${tempCustomerId}`)

        // 2. Buscar Cliente (Verificação)
        console.log('\n🔍 Passo 2: Buscando Cliente por ID...')
        const { data: fetchedCustomer, error: fetchError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', tempCustomerId)
            .single()

        if (fetchError) throw new Error('Erro ao buscar cliente: ' + fetchError.message)
        if (fetchedCustomer.name !== tempCustomer.name) throw new Error('Nome do cliente não bate')
        console.log('✅ Cliente verificado.')

        // 3. Atualizar Cliente
        console.log('\n✏️ Passo 3: Editando Cliente...')
        const { error: updateError } = await supabase
            .from('customers')
            .update({ name: 'TESTE CLIENTE ATUALIZADO', phone: '11888888888' }) // Atualizando campos válidos
            .eq('id', tempCustomerId)

        if (updateError) throw new Error('Erro ao atualizar cliente: ' + updateError.message)
        console.log('✅ Cliente atualizado.')

        // 4. Verificar Atualização
        const { data: updatedCustomer } = await supabase.from('customers').select('name').eq('id', tempCustomerId).single()
        if (updatedCustomer.name !== 'TESTE CLIENTE ATUALIZADO') throw new Error('Nome não atualizou')
        console.log('✅ Atualização confirmada.')

    } catch (err) {
        console.error('\n❌ ERRO NO TESTE:', err.message)
    } finally {
        // CLEANUP
        console.log('\n🧹 Limpeza...')
        if (tempCustomerId) {
            const { error } = await supabase.from('customers').delete().eq('id', tempCustomerId)
            if (error) console.error('   ❌ Falha ao deletar cliente de teste:', error.message)
            else console.log('   ✅ Cliente de teste removido.')
        }
    }
}

runTest()
