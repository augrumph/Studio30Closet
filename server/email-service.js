import { Resend } from 'resend'

/**
 * Inicializa o Resend de forma preguiçosa (lazy) para evitar crash no boot
 * e permitir que as configurações do banco de dados sejam carregadas.
 */
let resendInstance = null;

function getResend() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
        console.warn('⚠️  RESEND_API_KEY não encontrada. Envios de e-mail desativados.');
        return null;
    }

    if (!resendInstance) {
        try {
            resendInstance = new Resend(apiKey);
        } catch (error) {
            console.error('❌ Erro ao inicializar Resend:', error.message);
            return null;
        }
    }
    return resendInstance;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Studio 30 Closet <pedidos@studio30closet.com.br>'
const REPLY_TO = process.env.ADMIN_EMAIL || 'studio30closet@gmail.com'

/**
 * Gera as linhas da tabela em HTML para os itens comprados
 */
function generateItemsHtml(items) {
    if (!items || !items.length) {
        return `
            <tr>
                <td colspan="4" style="padding: 20px; text-align: center; color: #777; border-bottom: 1px solid #Eaeaea;">
                    Nenhum item listado.
                </td>
            </tr>
        `
    }

    return items.map(item => `
        <tr>
            <td style="padding: 15px; border-bottom: 1px solid #Eaeaea; width: 80px;">
                <img src="${item.image || item.product?.images?.[0] || 'https://via.placeholder.com/80x100?text=Produto'}" 
                     alt="${item.name || item.productName || 'Produto'}"
                     style="width: 80px; height: 100px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);" />
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #Eaeaea; vertical-align: middle;">
                <h4 style="margin: 0 0 5px 0; color: #333; font-size: 16px;">${item.name || item.productName || 'Produto sem nome'}</h4>
                <p style="margin: 0; color: #777; font-size: 14px;">
                    ${item.selectedSize ? `Tam: <strong>${item.selectedSize}</strong>` : ''} 
                    ${item.selectedColor ? ` | Cor: <strong>${item.selectedColor}</strong>` : ''}
                </p>
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #Eaeaea; vertical-align: middle; text-align: center;">
                <span style="background-color: #F8F4F1; color: #A88168; padding: 5px 10px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                    x${item.quantity || 1}
                </span>
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #Eaeaea; vertical-align: middle; text-align: right;">
                <strong style="color: #333; font-size: 16px;">
                    R$ ${Number(item.price || item.unit_price || item.priceAtTime || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
            </td>
        </tr>
    `).join('')
}

/**
 * Template Base de Email Studio 30
 */
const getBaseTemplate = (content) => `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #F8F4F1;">
    <div style="background-color: #F8F4F1; padding: 40px 20px; text-align: center; border-bottom: 3px solid #E8C4B0;">
        <img src="https://studio30closet.com.br/logo.png" alt="Studio 30 Closet" style="max-width: 180px; height: auto;" onerror="this.src='https://via.placeholder.com/180x80?text=Studio+30+Closet'" />
    </div>
    <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        ${content}
    </div>
    <div style="text-align: center; padding: 30px 20px; color: #999; font-size: 13px;">
        <p style="margin: 0 0 10px 0;">Studio 30 Closet - Curitiba, PR</p>
        <p style="margin: 0;">Este é um e-mail automático. Não é necessário responder.</p>
    </div>
</div>
`

/**
 * 🛍️ NOTIFICAÇÃO DE NOVA MALINHA (PARA O ADMIN)
 */
export const sendNewMalinhaNotification = async ({ customerName, customerEmail, itemsCount, orderId, items, totalValue }) => {
    try {
        const itemsHtml = generateItemsHtml(items)
        const formattedTotal = Number(totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

        const html = getBaseTemplate(`
            <h1 style="color: #4A3B32; font-size: 24px; margin-top: 0; margin-bottom: 10px; text-align: center;">
                🛍️ Nova Malinha Recebida!
            </h1>
            <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
                Uma nova malinha foi finalizada com sucesso no site.
            </p>

            <div style="background-color: #FBF9F8; border: 1px solid #EAEAEA; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                <h3 style="color: #A88168; margin-top: 0; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Dados do Cliente</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 5px 0; color: #666;"><strong>Nome:</strong></td><td style="text-align: right;">${customerName}</td></tr>
                    <tr><td style="padding: 5px 0; color: #666;"><strong>Email:</strong></td><td style="text-align: right;">${customerEmail || 'Não informado'}</td></tr>
                    <tr><td style="padding: 5px 0; color: #666;"><strong>Pedido:</strong></td><td style="text-align: right;">#${orderId}</td></tr>
                </table>
            </div>

            <h3 style="color: #A88168; margin-bottom: 15px; font-size: 14px; text-transform: uppercase;">Itens Selecionados</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="padding: 20px 15px; text-align: right;"><strong>Total:</strong></td>
                        <td style="padding: 20px 15px; text-align: right; color: #C75D3B;"><strong>${formattedTotal}</strong></td>
                    </tr>
                </tfoot>
            </table>

            <div style="text-align: center; margin-top: 40px;">
                <a href="https://studio30closet.com.br/admin/malinhas" 
                   style="background-color: #A88168; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 30px; font-weight: bold; display: inline-block;">
                    Ver Malinha no Painel
                </a>
            </div>
        `)

        const resend = getResend()
        if (!resend) return { success: false, error: 'Resend não configurado' }

        await resend.emails.send({
            from: FROM_EMAIL,
            to: process.env.ADMIN_EMAIL || 'studio30closet@gmail.com',
            reply_to: REPLY_TO,
            subject: `🛍️ Nova Malinha - ${customerName}`,
            html: html
        })

        return { success: true }
    } catch (error) {
        console.error('❌ Erro Resend (Malinha):', error)
        return { success: false, error: error.message }
    }
}

/**
 * 📦 PEDIDO RECEBIDO (PARA O CLIENTE) - E-COMMERCE
 */
export const sendOrderReceivedEmail = async (order, items) => {
    try {
        const itemsHtml = generateItemsHtml(items)
        const html = getBaseTemplate(`
            <h1 style="color: #4A3B32; font-size: 24px; text-align: center;">Obrigada pelo seu pedido!</h1>
            <p style="text-align: center; color: #666;">Estamos processando sua compra. Assim que o pagamento for aprovado, você receberá uma nova notificação.</p>
            
            <div style="border: 1px solid #EAEAEA; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Pedido:</strong> #${order.order_number || order.id}</p>
                <p><strong>Status:</strong> Aguardando Pagamento</p>
            </div>

            <h3 style="color: #A88168;">Resumo do Pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tbody>${itemsHtml}</tbody>
            </table>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${order.abacate_payment_url}" style="background-color: #4A3B32; color: #fff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Pagar Agora</a>
            </div>
        `)

        const resend = getResend()
        if (!resend) return

        await resend.emails.send({
            from: FROM_EMAIL,
            to: order.customer_email || order.shipping_address?.email,
            reply_to: REPLY_TO,
            subject: `Pedido Recebido! #${order.order_number || order.id}`,
            html: html
        })
    } catch (error) {
        console.error('❌ Erro Resend (Pedido):', error)
    }
}

/**
 * ✅ PAGAMENTO APROVADO
 */
export const sendPaymentApprovedEmail = async (order) => {
    try {
        const html = getBaseTemplate(`
            <h1 style="color: #4A3B32; font-size: 24px; text-align: center;">Pagamento Aprovado!</h1>
            <p style="text-align: center; color: #666;">Seu pagamento foi confirmado. Já estamos preparando seu look com todo carinho para envio.</p>
            
            <div style="background-color: #F8F4F1; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="margin: 0;"><strong>Pedido #${order.order_number || order.id}</strong></p>
                <p style="margin: 5px 0 0 0; color: #A88168;">Preparando para envio</p>
            </div>
        `)

        const resend = getResend()
        if (!resend) return

        await resend.emails.send({
            from: FROM_EMAIL,
            to: order.customer_email || order.shipping_address?.email,
            reply_to: REPLY_TO,
            subject: `Pagamento Aprovado! Pedido #${order.order_number || order.id}`,
            html: html
        })
    } catch (error) {
        console.error('❌ Erro Resend (Pagamento):', error)
    }
}

/**
 * 🚚 CÓDIGO DE RASTREIO
 */
export const sendShippingTrackingEmail = async (order, trackingCode, trackingUrl) => {
    try {
        const html = getBaseTemplate(`
            <h1 style="color: #4A3B32; font-size: 24px; text-align: center;">Seu look está a caminho!</h1>
            <p style="text-align: center; color: #666;">O seu pedido já foi postado e está em trânsito.</p>
            
            <div style="border: 2px dashed #A88168; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #666;">Código de Rastreio:</p>
                <h2 style="margin: 5px 0; color: #A88168; letter-spacing: 2px;">${trackingCode}</h2>
                <a href="${trackingUrl}" style="color: #A88168; font-weight: bold;">Acompanhar Entrega</a>
            </div>
        `)

        const resend = getResend()
        if (!resend) return

        await resend.emails.send({
            from: FROM_EMAIL,
            to: order.customer_email || order.shipping_address?.email,
            reply_to: REPLY_TO,
            subject: `Seu pedido está a caminho! #${order.order_number || order.id}`,
            html: html
        })
    } catch (error) {
        console.error('❌ Erro Resend (Rastreio):', error)
    }
}
