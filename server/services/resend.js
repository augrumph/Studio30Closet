export async function sendTransactionalEmail({ to, subject, html, idempotencyKey }) {
    if (!process.env.RESEND_API_KEY) {
        console.warn(`[RESEND] RESEND_API_KEY ausente. Email não enviado: ${subject}`)
        return { skipped: true }
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
        },
        body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'Studio30 Closet <pedidos@studio30closet.com.br>',
            to: [to],
            subject,
            html
        })
    })

    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error(`Erro ao enviar e-mail Resend: ${JSON.stringify(json)}`)
    }

    return json
}

export async function sendOrderCreatedEmail(order) {
    if (!order.customerEmail) return { skipped: true }
    return sendTransactionalEmail({
        to: order.customerEmail,
        subject: `Pedido ${order.orderNumber} recebido`,
        idempotencyKey: `order-created-${order.id}`,
        html: `
            <h1>Pedido recebido</h1>
            <p>Oi, ${order.customerName}.</p>
            <p>Recebemos seu pedido <strong>${order.orderNumber}</strong>.</p>
            <p>Agora falta concluir o pagamento para reservarmos suas peças.</p>
        `
    })
}

export async function sendPaymentApprovedEmail(order) {
    if (!order.customerEmail) return { skipped: true }
    return sendTransactionalEmail({
        to: order.customerEmail,
        subject: `Pagamento aprovado - Pedido ${order.orderNumber}`,
        idempotencyKey: `payment-approved-${order.id}`,
        html: `
            <h1>Pagamento aprovado</h1>
            <p>Oi, ${order.customerName}.</p>
            <p>Recebemos o pagamento do pedido <strong>${order.orderNumber}</strong>.</p>
            <p>Agora vamos separar suas peças para envio.</p>
        `
    })
}

export async function sendShippingTrackingEmail(order) {
    if (!order.customerEmail || !order.melhorEnvioTrackingCode) return { skipped: true }
    return sendTransactionalEmail({
        to: order.customerEmail,
        subject: `Seu pedido ${order.orderNumber} foi enviado`,
        idempotencyKey: `shipping-tracking-${order.id}-${order.melhorEnvioTrackingCode}`,
        html: `
            <h1>Seu pedido foi enviado</h1>
            <p>Pedido: <strong>${order.orderNumber}</strong></p>
            <p>Código de rastreio: <strong>${order.melhorEnvioTrackingCode}</strong></p>
        `
    })
}
