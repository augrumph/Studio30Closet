/**
 * Utilitário para otimização de imagens usando o serviço wsrv.nl (vies para imagens externas e supabase)
 * @param {string} url - URL original da imagem
 * @param {number} width - Largura desejada
 * @param {number} height - Altura desejada (opcional)
 * @param {number} quality - Qualidade da imagem (1-100, default 80)
 * @returns {string} URL da imagem otimizada
 */
export function getOptimizedImageUrl(url, width, height = null, quality = 80) {
    if (!url) return ''

    // Ignorar urls que já são base64 ou blob
    if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url
    }

    // Ignorar caminhos locais absolutos do frontend (ex: /marcacompleta.webp)
    if (url.startsWith('/')) {
        return url
    }

    // Se for localhost e não for uma URL completa http, retornar original
    // (Mas imagens do supabase geralmente são https)

    // 🔒 PROXY PARA BUCKET PRIVADO S3
    // Se a URL for do nosso bucket S3 (que é privado), usar o proxy do backend
    // Ex: https://t3.storageapi.dev/arranged-trunk-2k2olfwm3k/products/...
    // Virar: /api/images/proxy/products/...
    const BUCKET_DOMAIN = 'storageapi.dev' // Domínio genérico do provider
    if (url.includes(BUCKET_DOMAIN)) {
        try {
            // Tentar extrair a chave após o nome do bucket ou domínio
            // A URL geralmente tem o bucket: .../bucket-name/KEY
            // Ou subdomain: bucket.domain/KEY

            // Estratégia genérica: pegar tudo depois da última barra do domínio base
            // Mas o bucket pode fazer parte do path.
            // Vamos assumir que depois do hostname vem o bucket e depois a KEY.

            const urlObj = new URL(url)
            const pathParts = urlObj.pathname.split('/')
            // pathParts[0] é vazio, [1] é bucket, [2+] é key

            if (pathParts.length >= 3) {
                // Remove vazio e bucket
                const key = pathParts.slice(2).join('/')
                return `/api/images/proxy/${key}`
            }
        } catch (e) {
            console.warn('Falha ao fazer parse da URL S3 para proxy:', e)
        }
    }

    try {
        const params = new URLSearchParams({
            url: url,
            w: width.toString(),
            q: quality.toString(),
            output: 'webp', // Forçar formato moderno
            il: '' // Interlaced/Progressive
        })

        if (height) {
            params.append('h', height.toString())
        }

        // n = -1 é para evitar cache se a imagem original mudar? Não, wsrv faz cache por URL.
        // Se a URL original mudar, o wsrv pega a nova.

        return `https://wsrv.nl/?${params.toString()}`

    } catch (e) {
        console.error('Erro ao gerar URL otimizada:', e)
        return url
    }
}

/**
 * Gera string de srcset para imagens responsivas
 * @param {string} url - URL original da imagem
 * @param {number[]} widths - Array de larguras desejadas (ex: [300, 600, 900])
 * @returns {string} string para usar no atributo srcSet
 */
export function generateSrcSet(url, widths = [300, 600, 900]) {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return ''

    return widths
        .map(w => `${getOptimizedImageUrl(url, w)} ${w}w`)
        .join(', ')
}

/**
 * Gera URL de placeholder borrado para loading progressivo
 * @param {string} url - URL original da imagem
 * @returns {string} URL de imagem tiny borrada (10x10px, muito blur)
 */
export function getBlurPlaceholder(url) {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
        // Placeholder cinza neutro em base64 (1x1px)
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/hfwYAB/sDvAYE3tEAAAAASUVORK5CYII='
    }

    try {
        const params = new URLSearchParams({
            url: url,
            w: '10',       // Tiny 10x10px
            h: '10',
            q: '10',       // Low quality
            output: 'webp',
            blur: '5'      // Heavy blur
        })

        return `https://wsrv.nl/?${params.toString()}`
    } catch (e) {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/hfwYAB/sDvAYE3tEAAAAASUVORK5CYII='
    }
}
