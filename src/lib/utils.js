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

/**
 * Análise de Tamanhos por Grupo
 * Agrupa itens por categorias semânticas e identifica o tamanho mais frequente
 */
export function calculateCustomerSizeAnalysis(items) {
    const analysis = {
        tops: { label: 'Blusas & Tops', counts: {}, primary: null },
        bottoms: { label: 'Calças & Saias', counts: {}, primary: null },
        dresses: { label: 'Vestidos & Macacões', counts: {}, primary: null },
        outerwear: { label: 'Casacos & Tricot', counts: {}, primary: null }
    }

    items.forEach(item => {
        const cat = (item.category || '').toLowerCase()
        const size = item.selectedSize
        if (!size) return

        let group = null
        if (cat.includes('calça') || cat.includes('short') || cat.includes('saia') || cat.includes('jeans') || cat.includes('pantalona') || cat.includes('bermuda') || cat.includes('baixo')) {
            group = 'bottoms'
        } else if (cat.includes('blusa') || cat.includes('t-shirt') || cat.includes('top') || cat.includes('cropped') || cat.includes('regata') || cat.includes('camisa') || cat.includes('body') || cat.includes('cima')) {
            group = 'tops'
        } else if (cat.includes('vestido') || cat.includes('macacão') || cat.includes('inteiro')) {
            group = 'dresses'
        } else if (cat.includes('casaco') || cat.includes('jaqueta') || cat.includes('blazer') || cat.includes('cardigan') || cat.includes('tricot') || cat.includes('sobre')) {
            group = 'outerwear'
        }

        if (group) {
            analysis[group].counts[size] = (analysis[group].counts[size] || 0) + 1
        }
    })

    Object.keys(analysis).forEach(key => {
        const counts = analysis[key].counts
        const entries = Object.entries(counts)
        if (entries.length > 0) {
            analysis[key].primary = entries.sort((a, b) => b[1] - a[1])[0][0]
        }
    })

    return analysis
}