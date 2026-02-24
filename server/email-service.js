// ==========================================
// 📧 SERVIÇO DE EMAIL - BACKEND (VIA EMAILJS)
// ==========================================

const SERVICE_ID = 'service_3h2tyup'
const TEMPLATE_ID = 'template_wghvxdb'
const PUBLIC_KEY = 'DkaN2O0h-27lkoW94'

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
                <img src="${item.image || 'https://via.placeholder.com/80x100?text=Produto'}" 
                     alt="${item.productName || 'Produto'}"
                     style="width: 80px; height: 100px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);" />
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #Eaeaea; vertical-align: middle;">
                <h4 style="margin: 0 0 5px 0; color: #333; font-size: 16px;">${item.productName || 'Produto sem nome'}</h4>
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
                    R$ ${Number(item.price || item.priceAtTime || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
            </td>
        </tr>
    `).join('')
}

/**
 * Envia email de notificação usando a API REST do EmailJS
 */
export const sendNewMalinhaNotification = async ({ customerName, customerEmail, itemsCount, orderId, items, totalValue }) => {
    try {
        console.log('📧 Preparando envio de email (Backend -> EmailJS)...')

        // Formata o valor total
        const formattedTotal = Number(totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

        // Gera o HTML da tabela de produtos
        const itemsListHtml = generateItemsHtml(items)

        // =====================================
        // 💅 DESIGN DO EMAIL (HTML INLINE)
        // =====================================
        const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #F8F4F1;">
            
            <!-- Header (Logo / Banner) -->
            <div style="background-color: #F8F4F1; padding: 40px 20px; text-align: center; border-bottom: 3px solid #E8C4B0;">
                <img src="https://studio30closet.com.br/logo.png" alt="Studio 30 Closet" style="max-width: 180px; height: auto;" onerror="this.src='https://via.placeholder.com/180x80?text=Studio+30+Closet'" />
            </div>

            <!-- Body Principal -->
            <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                
                <h1 style="color: #4A3B32; font-size: 24px; margin-top: 0; margin-bottom: 10px; text-align: center;">
                    🛍️ Nova Malinha Recebida!
                </h1>
                <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
                    Uma nova malinha foi finalizada com sucesso no site.<br>
                    Confira os detalhes abaixo:
                </p>

                <!-- Box de Identificação -->
                <div style="background-color: #FBF9F8; border: 1px solid #EAEAEA; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                    <h3 style="color: #A88168; margin-top: 0; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Dados do Cliente</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 5px 0; color: #666; font-size: 15px;"><strong>Nome:</strong></td>
                            <td style="padding: 5px 0; color: #333; font-size: 15px; text-align: right;">${customerName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #666; font-size: 15px;"><strong>Email:</strong></td>
                            <td style="padding: 5px 0; color: #333; font-size: 15px; text-align: right;">${customerEmail || 'Não informado'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #666; font-size: 15px;"><strong>Pedido:</strong></td>
                            <td style="padding: 5px 0; color: #333; font-size: 15px; text-align: right;">#${orderId}</td>
                        </tr>
                    </table>
                </div>

                <!-- Tabela de Produtos -->
                <h3 style="color: #A88168; margin-top: 0; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Itens Selecionados (${itemsCount})</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tbody>
                        ${itemsListHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="padding: 20px 15px; text-align: right; font-size: 16px; color: #666;"><strong>Total em Produtos:</strong></td>
                            <td style="padding: 20px 15px; text-align: right; font-size: 18px; color: #C75D3B;"><strong>${formattedTotal}</strong></td>
                        </tr>
                    </tfoot>
                </table>

                <!-- CTA -->
                <div style="text-align: center; margin-top: 40px;">
                    <a href="https://studio30closet.com.br/admin/malinhas" 
                       style="background-color: #A88168; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 30px; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(168, 129, 104, 0.3);">
                        Ver Malinha no Painel
                    </a>
                </div>

            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 30px 20px; color: #999; font-size: 13px;">
                <p style="margin: 0 0 10px 0;">Este é um email automático gerado pelo sistema Studio 30 Closet.</p>
                <p style="margin: 0;">Você está recebendo pois é um administrador.</p>
            </div>

        </div>
        `

        const templateParams = {
            subject: `🛍️ Nova Malinha - ${customerName} [${itemsCount} peças]`,
            customer_name: customerName,
            customer_email: customerEmail || 'Não informado',
            items_count: itemsCount,
            order_link: `https://studio30closet.com.br/admin/malinhas`,
            order_id: orderId,
            to_email: 'studio30closet@gmail.com',
            // Aqui injetamos o HTML inteiro construído acima:
            html_content: htmlContent
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

        console.log('✅ Email rico enviado com sucesso via EmailJS pelo Servidor!')
        return { success: true }

    } catch (error) {
        console.error('❌ ERRO CRÍTICO no envio de email:', error.message)
        return { success: false, error: error.message }
    }
}
