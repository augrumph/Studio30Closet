// ==========================================
// 📧 SERVIÇO DE EMAIL - BACKEND (VIA EMAILJS)
// ==========================================
// Este serviço usa a REST API do EmailJS.
// Vantagem: Roda 100% no Servidor (não é bloqueado por adblockers, CSP ou perda de conexão do cliente)
// Vantagem 2: Usa a conta já criada do usuário no EmailJS (sem precisar de Senhas de App do Gmail)

const SERVICE_ID = 'service_3h2tyup'
const TEMPLATE_ID = 'template_wghvxdb'
const PUBLIC_KEY = 'DkaN2O0h-27lkoW94'

/**
 * Envia email de notificação usando a API REST do EmailJS
 * @param {Object} params - Parâmetros do email
 */
export const sendNewMalinhaNotification = async ({ customerName, customerEmail, itemsCount, orderId }) => {
    try {
        console.log('📧 Preparando envio de email (Backend -> EmailJS)...')

        const templateParams = {
            subject: `Nova malinha para ${customerName} [${itemsCount} peças]`,
            customer_name: customerName,
            customer_email: customerEmail || 'Não informado',
            items_count: itemsCount,
            order_link: `https://studio30closet.com.br/admin/malinhas`,
            order_id: orderId,
            to_email: 'studio30closet@gmail.com'
        }

        const payload = {
            service_id: SERVICE_ID,
            template_id: TEMPLATE_ID,
            user_id: PUBLIC_KEY,
            template_params: templateParams
        }

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': 'https://studio30closet.com.br',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ Falha na API do EmailJS:', response.status, errorText)
            throw new Error(`EmailJS API error: ${response.status} - ${errorText}`)
        }

        console.log('✅ Email enviado com sucesso via EmailJS pelo Servidor!')
        return { success: true }

    } catch (error) {
        console.error('❌ ERRO CRÍTICO no envio de email:', error.message)
        return { success: false, error: error.message }
    }
}
