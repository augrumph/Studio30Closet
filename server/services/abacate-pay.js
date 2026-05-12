const ABACATE_BASE_URL = 'https://api.abacatepay.com/v2'

function requireToken() {
    if (!process.env.ABACATE_PAY_TOKEN) {
        throw new Error('ABACATE_PAY_TOKEN não configurado')
    }
    return process.env.ABACATE_PAY_TOKEN
}

export async function createAbacateCheckout({ order, items, successUrl, cancelUrl }) {
    const token = requireToken()
    const productId = process.env.ABACATE_PAY_PRODUCT_ID

    if (!productId) {
        throw new Error('ABACATE_PAY_PRODUCT_ID não configurado. Crie um produto checkout na Abacate Pay e informe o ID.')
    }

    // Criar uma descrição detalhada com os itens para o extrato do cliente/admin
    const itemsDescription = items
        .map(item => `${item.quantity}x ${item.name || 'Produto'} (${item.selectedSize || 'U'}/${item.selectedColor || 'N/A'})`)
        .join(', ')
        .substring(0, 250) // Limite de segurança para descrição

    const response = await fetch(`${ABACATE_BASE_URL}/checkouts/create`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify({
            items: [
                {
                    id: productId,
                    quantity: 1,
                    externalId: order.orderNumber,
                    name: `Pedido ${order.orderNumber}`,
                    price: Math.round(Number(order.totalValue || 0) * 100)
                }
            ],
            methods: ['PIX', 'CARD'],
            returnUrl: cancelUrl,
            completionUrl: successUrl,
            externalId: String(order.id),
            metadata: {
                orderId: String(order.id),
                orderNumber: order.orderNumber,
                itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
                description: itemsDescription
            }
        })
    })

    const json = await response.json().catch(() => ({}))

    if (!response.ok || json.success === false) {
        throw new Error(`Erro ao criar checkout Abacate Pay: ${JSON.stringify(json)}`)
    }

    const data = json.data || json
    return {
        id: data.id || data.checkoutId || data.uuid,
        url: data.url || data.paymentUrl || data.checkoutUrl,
        raw: data
    }
}
