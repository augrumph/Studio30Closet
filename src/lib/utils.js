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

const SIZE_GROUPS = {
    tops: {
        label: 'Blusas & Tops',
        keywords: [
            'blusa', 'top', 't shirt', 't-shirt', 'camiseta', 'regata', 'cropped',
            'body', 'camisa', 'ponte', 'canelada', 'muscle', 'corset', 'kimono',
            'tricot', 'tricô', 'moletom', 'sueter', 'suéter', 'pullover', 'cardigan',
            'conjunto', 'blazer', 'colete'
        ]
    },
    bottoms: {
        label: 'Calças & Saias',
        keywords: [
            'calca', 'calça', 'short', 'saia', 'jeans', 'pantalona', 'bermuda',
            'legging', 'pantacourt', 'culotte', 'flare', 'wide leg', 'alfaiataria',
            'cargo', 'jogger', 'baixo'
        ]
    },
    dresses: {
        label: 'Vestidos & Macacões',
        keywords: [
            'vestido', 'macacao', 'macacão', 'macaquinho', 'jumpsuit', 'romper',
            'salopete', 'one piece', 'inteiro'
        ]
    },
    outerwear: {
        label: 'Casacos & Tricot',
        keywords: [
            'casaco', 'jaqueta', 'blazer', 'cardigan', 'tricot', 'tricô',
            'sobretudo', 'corta vento', 'corta-vento', 'parka', 'coat', 'coat'
        ]
    }
}

function normalizeAnalysisText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
}

function normalizeSizeLabel(value) {
    if (value === null || value === undefined) return null
    const raw = String(value).trim()
    if (!raw) return null

    const upper = raw.toUpperCase().replace(/\s+/g, '')
    if (['UNICO', 'UNICA', 'U', 'ÚNICO', 'ÚNICA'].includes(raw.toUpperCase())) {
        return 'U'
    }
    return upper
}

function findSizeGroup(item) {
    const haystack = normalizeAnalysisText([
        item.category,
        item.productCategory,
        item.product_category,
        item.name,
        item.productName,
        item.product_name,
        item.title,
        item.description
    ].filter(Boolean).join(' '))

    if (!haystack) return null

    const groupOrder = ['dresses', 'bottoms', 'outerwear', 'tops']

    for (const group of groupOrder) {
        const keywords = SIZE_GROUPS[group].keywords
        if (keywords.some(keyword => haystack.includes(keyword))) {
            return group
        }
    }

    return null
}

function scoreConfidence(primaryCount, totalCount, uniqueSizes) {
    if (!totalCount || !primaryCount) {
        return { score: 0, label: 'Sem dados' }
    }

    const dominance = primaryCount / totalCount
    const depthWeight = Math.min(totalCount / 4, 1)
    const spreadPenalty = uniqueSizes > 3 ? 0.82 : uniqueSizes === 3 ? 0.92 : 1
    const score = Math.round(dominance * 100 * depthWeight * spreadPenalty)

    if (score >= 75) return { score, label: 'Alta' }
    if (score >= 45) return { score, label: 'Média' }
    return { score, label: 'Baixa' }
}

/**
 * Análise de Tamanhos por Grupo
 * Agrupa itens por categorias semânticas e identifica o tamanho mais frequente
 */
export function calculateCustomerSizeAnalysis(items) {
    const analysis = {
        tops: { label: SIZE_GROUPS.tops.label, counts: {}, primary: null, secondary: null, total: 0, dominantShare: 0, confidence: { score: 0, label: 'Sem dados' }, historyLabel: 'Sem histórico suficiente para este grupo' },
        bottoms: { label: SIZE_GROUPS.bottoms.label, counts: {}, primary: null, secondary: null, total: 0, dominantShare: 0, confidence: { score: 0, label: 'Sem dados' }, historyLabel: 'Sem histórico suficiente para este grupo' },
        dresses: { label: SIZE_GROUPS.dresses.label, counts: {}, primary: null, secondary: null, total: 0, dominantShare: 0, confidence: { score: 0, label: 'Sem dados' }, historyLabel: 'Sem histórico suficiente para este grupo' },
        outerwear: { label: SIZE_GROUPS.outerwear.label, counts: {}, primary: null, secondary: null, total: 0, dominantShare: 0, confidence: { score: 0, label: 'Sem dados' }, historyLabel: 'Sem histórico suficiente para este grupo' }
    }

    items.forEach(item => {
        const size = normalizeSizeLabel(item.selectedSize || item.size || item.variantSize)
        if (!size) return
        const quantity = Number(item.quantity || item.qty || 1) || 1

        const group = findSizeGroup(item)

        if (group) {
            analysis[group].counts[size] = (analysis[group].counts[size] || 0) + quantity
            analysis[group].total += quantity
        }
    })

    Object.keys(analysis).forEach(key => {
        const counts = analysis[key].counts
        const entries = Object.entries(counts)
        if (entries.length > 0) {
            const sorted = entries.sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1]
                return a[0].localeCompare(b[0], 'pt-BR')
            })
            const [primary, primaryCount] = sorted[0]
            const [secondary, secondaryCount] = sorted[1] || [null, 0]
            const total = sorted.reduce((acc, [, count]) => acc + count, 0)
            const uniqueSizes = sorted.length
            analysis[key].primary = primary
            analysis[key].secondary = secondary
            analysis[key].total = total
            analysis[key].dominantShare = total > 0 ? primaryCount / total : 0
            analysis[key].confidence = scoreConfidence(primaryCount, total, uniqueSizes)
            analysis[key].historyLabel = total >= 4
                ? 'Histórico sólido para este grupo'
                : total >= 2
                    ? 'Histórico útil para leitura inicial'
                    : 'Sem histórico suficiente para este grupo'
        }
    })

    return analysis
}
