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
    console.log('🚀 Iniciando Teste de Flow de Crediário (Produção)...')
    let customerId = null
    let vendaId = null
    let installmentIds = []

    try {
        // 1. Criar Cliente
        console.log('\n👤 Passo 1: Criando Cliente Temporário...')
        const { data: customer, error: custError } = await supabase
            .from('customers')
            .insert([{ name: 'CLIENTE TESTE CREDIARIO', phone: '99999999999', email: 'test@crediario.com' }])
            .select()
            .single()

        if (custError) throw new Error('Erro cliente: ' + custError.message)
        customerId = customer.id
        console.log(`✅ Cliente ID: ${customerId}`)

        // 2. Criar Venda (Fiado Parcelado)
        console.log('\n🛍️ Passo 2: Criando Venda...')
        const { data: venda, error: vendaError } = await supabase
            .from('vendas')
            .insert([{
                customer_id: customerId,
                total_value: 300.00,
                payment_method: 'fiado_parcelado',
                num_installments: 3,
                entry_payment: 0,
                payment_status: 'pending' // or partial
            }])
            .select()
            .single()

        if (vendaError) throw new Error('Erro venda: ' + vendaError.message)
        vendaId = venda.id
        console.log(`✅ Venda ID: ${vendaId}`)

        // 3. Criar Parcelas (Simulando RPC create_installments ou insert manual)
        // Vamos usar RPC se existir, ou insert manual para garantir controle.
        // O app usa rpc('create_installments'). Vamos tentar usar ele também.
        console.log('\n💳 Passo 3: Criando Parcelas (RPC)...')
        const { error: rpcError } = await supabase.rpc('create_installments', {
            p_venda_id: vendaId,
            p_num_installments: 3,
            p_entry_payment: 0,
            p_installment_start_date: new Date().toISOString().split('T')[0]
        })

        if (rpcError) throw new Error('Erro RPC create_installments: ' + rpcError.message)
        console.log('✅ Parcelas criadas via RPC.')

        // Verificar parcelas criadas
        const { data: installments, error: fetchInstError } = await supabase
            .from('installments')
            .select('*')
            .eq('venda_id', vendaId)
            .order('installment_number', { ascending: true })

        if (fetchInstError) throw fetchInstError
        if (installments.length !== 3) throw new Error(`Esperado 3 parcelas, achou ${installments.length}`)
        installmentIds = installments.map(i => i.id)
        console.log(`✅ ${installments.length} parcelas verificadas. IDs: ${installmentIds.join(', ')}`)

        // 4. Registrar Pagamento da 1ª Parcela (Manual Insert para testar Trigger)
        console.log('\n💰 Passo 4: Registrando Pagamento (Manual Insert)...')
        const firstInstId = installments[0].id
        const paymentAmount = 50.00

        const { data: insertedPayment, error: payError } = await supabase
            .from('installment_payments')
            .insert([{
                installment_id: firstInstId,
                payment_amount: paymentAmount,
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'dinheiro',
                notes: 'Teste Manual Insert',
                created_by: 'script'
            }])
            .select()
            .single()

        if (payError) throw new Error('Erro Insert Payment: ' + payError.message)
        console.log('✅ Pagamento inserido manualmente.')

        // Verificar pagamentos registrados
        const { data: payRecords } = await supabase.from('installment_payments').select('*').eq('installment_id', firstInstId)
        console.log(`🔎 Pagamentos encontrados: ${payRecords.length}`)

        // Verificar atualização
        const { data: updatedInst } = await supabase.from('installments').select('*').eq('id', firstInstId).single()
        console.log(`🔎 Parcela: Paid ${updatedInst.paid_amount}, Remaining ${updatedInst.remaining_amount}`)

        // Se trigger existir, paid_amount deve ser 50.
        // Se não existir, deve ser 0 (pois só inserimos o pagamento, não rodamos RPC).
        if (updatedInst.paid_amount === 50.00) {
            console.log('✅ TRIGGER DETECTADO! O saldo foi atualizado automaticamente.')
        } else if (updatedInst.paid_amount === 0) {
            console.log('⚠️ TRIGGER NÃO DETECTADO. O saldo não mudou.')
            throw new Error('Trigger não existe, RPC é necessário (mas tem bug).')
        } else {
            console.log(`❓ Resultado inesperado: ${updatedInst.paid_amount}`)
        }

    } catch (err) {
        console.error('\n❌ ERRO:', err.message)
    } finally {
        console.log('\n🧹 Limpeza...')
        // Deletar pagamentos (cascade deve resolver se configurado, mas installments precisa deletar pagamentos antes?)
        // Tables: installment_payments -> installments -> vendas -> customers
        // Delete Venda cascades calls usually? Or manual.

        // 1. Delete payments
        if (installmentIds.length > 0) {
            // Find payments for these installments
            const { data: payments } = await supabase.from('installment_payments').select('id').in('installment_id', installmentIds)
            if (payments && payments.length > 0) {
                await supabase.from('installment_payments').delete().in('id', payments.map(p => p.id))
            }
            // Delete installments
            await supabase.from('installments').delete().eq('venda_id', vendaId)
        }

        if (vendaId) await supabase.from('vendas').delete().eq('id', vendaId)
        if (customerId) await supabase.from('customers').delete().eq('id', customerId)

        console.log('✅ Dados de teste removidos.')
    }
}

runTest()
