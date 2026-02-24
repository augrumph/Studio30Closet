import emailjs from '@emailjs/browser'

// ⚠️ CONFIGURAÇÃO DO EMAILJS
// Você precisa criar uma conta em https://www.emailjs.com/
// 1. Crie um Service (Gmail) -> Copie o Service ID
// 2. Crie um Template -> Copie o Template ID
// 3. Pegue sua Public Key em Account > API Keys

const SERVICE_ID = 'service_3h2tyup'
const TEMPLATE_ID = 'template_wghvxdb'
const PUBLIC_KEY = 'DkaN2O0h-27lkoW94'

export const sendNewMalinhaEmail = async ({ customerName, customerEmail, itemsCount, orderId }) => {
    try {
        const templateParams = {
            subject: `Nova malinha para ${customerName} [${itemsCount} peças]`,
            customer_name: customerName,
            customer_email: customerEmail,
            items_count: itemsCount,
            order_link: `https://studio30closet.com.br/admin/malinhas`,
            order_id: orderId,
            to_email: 'studio30closet@gmail.com'
        }

        // Se as chaves não estiverem configuradas, logar e retornar (evita erro em dev)
        if (PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
            console.warn('⚠️ EmailJS não configurado: Adicione suas chaves em src/lib/email-service.js')
            return { success: false, error: 'EmailJS keys missing' }
        }

        const response = await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID,
            templateParams,
            PUBLIC_KEY
        )

        return { success: true, response }
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error)
        return { success: false, error }
    }
}
