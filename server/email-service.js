import nodemailer from 'nodemailer'

// ⚙️ CONFIGURAÇÃO DO TRANSPORTER DE EMAIL
// Usando Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'studio30closet@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'YOUR_APP_PASSWORD_HERE'
    }
})

/**
 * Envia email de notificação quando uma nova malinha é criada
 * @param {Object} params - Parâmetros do email
 * @param {string} params.customerName - Nome do cliente
 * @param {string} params.customerEmail - Email do cliente
 * @param {number} params.itemsCount - Quantidade de peças
 * @param {number} params.orderId - ID do pedido
 */
export const sendNewMalinhaNotification = async ({ customerName, customerEmail, itemsCount, orderId }) => {
    try {
        console.log('📧 Preparando envio de email de notificação...')
        console.log('   Para: studio30closet@gmail.com')
        console.log('   Cliente:', customerName)
        console.log('   Email:', customerEmail)
        console.log('   Peças:', itemsCount)
        console.log('   Order ID:', orderId)

        const mailOptions = {
            from: '"Studio 30 Closet Sistema" <studio30closet@gmail.com>',
            to: 'studio30closet@gmail.com',
            subject: `🛍️ Nova Malinha Finalizada - ${customerName} [${itemsCount} peças]`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Nova Malinha!</h1>
                    </div>

                    <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                            Uma nova malinha foi finalizada no sistema!
                        </p>

                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <h2 style="color: #667eea; margin-top: 0; font-size: 20px;">📋 Detalhes do Pedido</h2>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #ddd;"><strong>Cliente:</strong></td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #ddd;">${customerName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #ddd;">${customerEmail}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #ddd;"><strong>Quantidade de Peças:</strong></td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #ddd;">${itemsCount} peças</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0;"><strong>ID do Pedido:</strong></td>
                                    <td style="padding: 10px 0;">#${orderId}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://studio30closet.com.br/admin/malinhas"
                               style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                Ver Malinha no Sistema
                            </a>
                        </div>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
                            <p>Este é um email automático do sistema Studio 30 Closet</p>
                        </div>
                    </div>
                </div>
            `
        }

        const info = await transporter.sendMail(mailOptions)

        console.log('✅ Email enviado com sucesso!')
        console.log('   Message ID:', info.messageId)

        return {
            success: true,
            messageId: info.messageId
        }
    } catch (error) {
        console.error('❌ ERRO ao enviar email:', error)
        console.error('   Nome:', error.name)
        console.error('   Mensagem:', error.message)

        return {
            success: false,
            error: error.message
        }
    }
}

// Verificar configuração do transporter
export const verifyEmailConfig = async () => {
    try {
        await transporter.verify()
        console.log('✅ Servidor de email configurado corretamente')
        return { success: true }
    } catch (error) {
        console.error('❌ Erro na configuração do servidor de email:', error)
        return { success: false, error: error.message }
    }
}
