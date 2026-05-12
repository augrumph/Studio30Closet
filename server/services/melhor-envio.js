import { centsToMoney, normalizeZipCode } from '../lib/commerce-utils.js'

function baseUrl() {
    return process.env.MELHOR_ENVIO_ENV === 'production'
        ? 'https://www.melhorenvio.com.br/api/v2'
        : 'https://sandbox.melhorenvio.com.br/api/v2'
}

function requireToken() {
    if (!process.env.MELHOR_ENVIO_TOKEN) {
        throw new Error('MELHOR_ENVIO_TOKEN não configurado')
    }
    return process.env.MELHOR_ENVIO_TOKEN
}

function headers() {
    return {
        Authorization: `Bearer ${requireToken()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': process.env.MELHOR_ENVIO_USER_AGENT || 'Studio30 Closet (suporte@studio30closet.com.br)'
    }
}

/**
 * Faz a cotação de frete no Melhor Envio
 */
export async function quoteMelhorEnvio({ destinationZipCode, items }) {
    if (!process.env.STORE_ORIGIN_ZIP_CODE) {
        throw new Error('STORE_ORIGIN_ZIP_CODE não configurado')
    }

    const response = await fetch(`${baseUrl()}/me/shipment/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
            from: { postal_code: normalizeZipCode(process.env.STORE_ORIGIN_ZIP_CODE) },
            to: { postal_code: normalizeZipCode(destinationZipCode) },
            products: items.map((item) => ({
                name: item.name,
                quantity: Number(item.quantity || 1),
                unitary_value: centsToMoney(item.unitPriceCents || item.unit_price * 100 || 0),
                insurance_value: centsToMoney(item.unitPriceCents || item.unit_price * 100 || 0),
                weight: Number(item.weightKg || 0.3),
                height: Number(item.heightCm || 2),
                width: Number(item.widthCm || 25),
                length: Number(item.lengthCm || 35)
            })),
            options: {
                receipt: false,
                own_hand: false,
                collect: false
            }
        })
    })

    const json = await response.json().catch(() => [])
    if (!response.ok) {
        console.error('❌ Erro Melhor Envio (Calculate):', json)
        throw new Error(`Erro ao cotar frete Melhor Envio: ${JSON.stringify(json)}`)
    }

    return (Array.isArray(json) ? json : []).filter(option => !option.error).map(option => ({
        id: String(option.id),
        carrier: option.company?.name || option.company?.picture || 'Transportadora',
        service: option.name,
        priceCents: Math.round(Number(option.price || option.custom_price || 0) * 100),
        deliveryTimeDays: Number(option.delivery_time || 0),
        raw: option
    }))
}

/**
 * Adiciona o pedido ao carrinho do Melhor Envio
 */
export async function createMelhorEnvioLabelDraft({ order }) {
    if (!process.env.STORE_ORIGIN_ZIP_CODE || !process.env.STORE_NAME) {
        throw new Error('Configurações de remetente da loja incompletas no .env')
    }

    const shippingAddress = order.shipping_address || {}
    
    // Preparar payload para o carrinho (me/cart)
    const payload = {
        service: order.melhor_envio_service_id,
        agency: order.melhor_envio_agency_id || null, // Algumas transportadoras exigem ID da agência
        from: {
            name: process.env.STORE_NAME,
            phone: process.env.STORE_PHONE,
            email: process.env.STORE_EMAIL,
            document: process.env.STORE_DOCUMENT,
            address: process.env.STORE_ADDRESS,
            number: process.env.STORE_ADDRESS_NUMBER,
            district: process.env.STORE_DISTRICT,
            city: process.env.STORE_CITY,
            state_abbr: process.env.STORE_STATE,
            postal_code: normalizeZipCode(process.env.STORE_ORIGIN_ZIP_CODE)
        },
        to: {
            name: order.customer_name || shippingAddress.name,
            phone: order.customer_phone || shippingAddress.phone,
            email: order.customer_email || shippingAddress.email,
            document: order.customer_document || shippingAddress.document,
            address: shippingAddress.street,
            number: shippingAddress.number,
            complement: shippingAddress.complement,
            district: shippingAddress.neighborhood,
            city: shippingAddress.city,
            state_abbr: shippingAddress.state,
            postal_code: normalizeZipCode(shippingAddress.zip_code)
        },
        products: (order.items || []).map(item => ({
            name: item.name || 'Produto Studio 30',
            quantity: Number(item.quantity || 1),
            unitary_value: centsToMoney(item.unit_price * 100),
            weight: Number(item.weight_kg || 0.3)
        })),
        volumes: [
            {
                height: 2,
                width: 25,
                length: 35,
                weight: (order.items || []).reduce((acc, item) => acc + (Number(item.weight_kg || 0.3) * Number(item.quantity || 1)), 0)
            }
        ],
        options: {
            insurance_value: centsToMoney(order.subtotal_value * 100),
            receipt: false,
            own_hand: false,
            collect: false,
            non_commercial: true // Por enquanto como não comercial (NF-e anexa manual ou declaração)
        }
    }

    const response = await fetch(`${baseUrl()}/me/cart`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload)
    })

    const json = await response.json()
    if (!response.ok) {
        console.error('❌ Erro Melhor Envio (Cart):', json)
        throw new Error(`Erro ao adicionar ao carrinho Melhor Envio: ${JSON.stringify(json)}`)
    }

    return {
        melhorEnvioOrderId: json.id,
        status: 'pending_payment',
        raw: json
    }
}

/**
 * Paga as etiquetas que estão no carrinho (Checkout)
 */
export async function checkoutMelhorEnvio(itemIds) {
    const response = await fetch(`${baseUrl()}/me/shipment/checkout`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ orders: Array.isArray(itemIds) ? itemIds : [itemIds] })
    })

    const json = await response.json()
    if (!response.ok) {
        throw new Error(`Erro no checkout Melhor Envio: ${JSON.stringify(json)}`)
    }

    return json
}

/**
 * Solicita a geração da etiqueta após o pagamento
 */
export async function generateMelhorEnvioLabel(itemIds) {
    const response = await fetch(`${baseUrl()}/me/shipment/generate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ orders: Array.isArray(itemIds) ? itemIds : [itemIds] })
    })

    return await response.json()
}

/**
 * Obtém a URL do PDF da etiqueta para impressão
 */
export async function getMelhorEnvioLabelPrintUrl(itemIds) {
    const response = await fetch(`${baseUrl()}/me/shipment/print`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ mode: 'pdf', orders: Array.isArray(itemIds) ? itemIds : [itemIds] })
    })

    const json = await response.json()
    if (!response.ok) {
        throw new Error(`Erro ao obter link de impressão: ${JSON.stringify(json)}`)
    }

    return json.url
}
