// Generate WhatsApp link
export function generateWhatsAppLink(phone, message) {
    const cleanPhone = phone.replace(/\D/g, '')
    return `https://wa.me/${cleanPhone}?text=${message}`
}

// Format malinha items for WhatsApp
export function formatMalinhaMessage(items, customerData) {
    const message = `Olá, você acabou de criar sua malinha delivery com a Studio 30 Closet, aguarde nosso contato para agendarmos a entrega, obrigada pela preferência 🧡✨`
    return encodeURIComponent(message)
}

// Format price
export function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(price)
}

// Format currency
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(value)
}

// Format percentage
export function formatPercentage(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100)
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Class name utility
export function cn(...classes) {
    return classes.filter(Boolean).join(' ')
}