// Script para testar envio de email do servidor
import { sendNewMalinhaNotification } from './server/email-service.js'

console.log('🧪 Testando envio de email de notificação de malinha...\n')

const testData = {
    customerName: 'João Silva',
    customerEmail: 'joao.silva@example.com',
    itemsCount: 5,
    orderId: 123
}

console.log('📋 Dados do teste:')
console.log('   Cliente:', testData.customerName)
console.log('   Email:', testData.customerEmail)
console.log('   Peças:', testData.itemsCount)
console.log('   Order ID:', testData.orderId)
console.log('\n📧 Iniciando envio...\n')

sendNewMalinhaNotification(testData)
    .then(result => {
        if (result.success) {
            console.log('\n✅ SUCESSO! Email enviado com sucesso!')
            console.log('   Message ID:', result.messageId)
        } else {
            console.log('\n❌ FALHA! Erro ao enviar email:')
            console.log('   Erro:', result.error)
        }
        process.exit(result.success ? 0 : 1)
    })
    .catch(error => {
        console.error('\n❌ ERRO CRÍTICO:', error)
        process.exit(1)
    })
