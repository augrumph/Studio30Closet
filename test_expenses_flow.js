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
    console.log('🚀 Iniciando Teste de CRUD de Despesas (Produção)...')
    let tempId = null

    try {
        // 1. Criar
        console.log('\n💸 Passo 1: Criando Despesa...')
        const tempExpense = {
            name: 'DESPESA TESTE AUTO',
            category: 'Outro',
            value: 99.90,
            recurrence: 'monthly',
            due_day: 10,
            notes: 'Criado via script de teste'
        }

        const { data: expense, error: createError } = await supabase
            .from('fixed_expenses')
            .insert([tempExpense])
            .select()
            .single()

        if (createError) throw new Error('Erro ao criar: ' + createError.message)
        tempId = expense.id
        console.log(`✅ Criada: ID ${tempId}`)

        // 2. Ler
        console.log('\n🔍 Passo 2: Buscando...')
        const { data: fetched } = await supabase.from('fixed_expenses').select('*').eq('id', tempId).single()
        if (fetched.value !== 99.90) throw new Error('Valor mismatch')
        console.log('✅ Verificado.')

        // 3. Atualizar
        console.log('\n✏️ Passo 3: Atualizando...')
        const { error: updateError } = await supabase
            .from('fixed_expenses')
            .update({ value: 150.00 })
            .eq('id', tempId)

        if (updateError) throw new Error('Erro update: ' + updateError.message)
        console.log('✅ Atualizado.')


    } catch (err) {
        console.error('\n❌ ERRO:', err.message)
    } finally {
        console.log('\n🧹 Limpeza...')
        if (tempId) {
            const { error } = await supabase.from('fixed_expenses').delete().eq('id', tempId)
            if (error) console.error('Erro ao deletar:', error.message)
            else console.log('✅ Removido.')
        }
    }
}

runTest()
