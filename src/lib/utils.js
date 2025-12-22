import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

// Format price to BRL
export function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(price)
}

// Generate WhatsApp link
export function generateWhatsAppLink(phone, message) {
    const cleanPhone = phone.replace(/\D/g, '')
    const encodedMessage = encodeURIComponent(message)
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}

// Format malinha items for WhatsApp
export function formatMalinhaMessage(items, customerData) {
    const itemsList = items
        .map((item, index) => `${index + 1}. ${item.name} - Tam: ${item.selectedSize} - ${formatPrice(item.price)}`)
        .join('\n')

    const total = items.reduce((sum, item) => sum + item.price, 0)

    return `🦋 *STUDIO 30 CLOSET - Pedido de Malinha*

👤 *Cliente:* ${customerData.name}
📱 *Telefone:* ${customerData.phone}
📍 *Endereço:* ${customerData.address}
${customerData.complement ? `🏠 *Complemento:* ${customerData.complement}\n` : ''}
📦 *Peças Selecionadas (${items.length}/20):*
${itemsList}

💰 *Valor Total das Peças:* ${formatPrice(total)}

${customerData.notes ? `📝 *Observações:* ${customerData.notes}\n` : ''}
---
Aguardo confirmação do envio da malinha! 💕`
}
