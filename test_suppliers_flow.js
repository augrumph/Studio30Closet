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
    console.log('🚀 Iniciando Teste de CRUD de Fornecedores (Produção)...')
    let tempId = null

    try {
        // 1. Criar
        console.log('\n🏭 Passo 1: Criando Fornecedor...')
        const tempSupplier = {
            name: 'FORNECEDOR TESTE AUTO',
            cnpj: '00.000.000/0001-99',
            city: 'Santos',
            state: 'SP'
        }

        const { data: supplier, error: createError } = await supabase
            .from('suppliers')
            .insert([tempSupplier])
            .select()
            .single()

        if (createError) throw new Error('Erro ao criar: ' + createError.message)
        tempId = supplier.id
        console.log(`✅ Criado: ID ${tempId}`)

        // 2. Ler
        console.log('\n🔍 Passo 2: Buscando...')
        const { data: fetched } = await supabase.from('suppliers').select('*').eq('id', tempId).single()
        if (fetched.name !== tempSupplier.name) throw new Error('Nome mismatch')
        console.log('✅ Verificado.')

        // 3. Atualizar
        console.log('\n✏️ Passo 3: Atualizando...')
        const { error: updateError } = await supabase
            .from('suppliers')
            .update({ city: 'São Paulo' })
            .eq('id', tempId)

        if (updateError) throw new Error('Erro update: ' + updateError.message)
        console.log('✅ Atualizado.')

        // 4. Deletar (Cleanup implicito no finally, mas testando explicitamente aqui)
        // Deixarei para o finally para garantir

    } catch (err) {
        console.error('\n❌ ERRO:', err.message)
    } finally {
        console.log('\n🧹 Limpeza...')
        if (tempId) {
            const { error } = await supabase.from('suppliers').delete().eq('id', tempId)
            if (error) console.error('Erro ao deletar:', error.message)
            else console.log('✅ Removido.')
        }
    }
}

runTest()
