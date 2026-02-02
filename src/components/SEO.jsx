
import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

/**
 * Componente SEO Masterful
 * Gerencia meta tags, títulos e compartilhamento social (Open Graph/Twitter)
 * 
 * @param {string} title - Título da página (será sufixado com "| Studio 30")
 * @param {string} description - Descrição para SEO (padrão do site se não informado)
 * @param {string} image - URL absoluta ou relativa da imagem de compartilhamento
 * @param {boolean} noIndex - Se true, adiciona tag noindex (útil para admin/checkout)
 */
export function SEO({
    title,
    description,
    image,
    noIndex = false,
    type = 'website' // 'website' ou 'article' (para produtos)
}) {
    const location = useLocation()

    // Configurações Padrão
    const siteName = "Studio 30 Closet"
    const defaultDescription = "O provador mais exclusivo é a sua casa. Receba nossa curadoria personalizada (malinha), experimente sem pressa e pague apenas pelo que amar."
    const siteUrl = "https://studio30closet.com.br" // URL de produção (ajustar se mudar)
    const defaultImage = `${siteUrl}/hero-social.jpg` // Imagem padrão de compartilhamento

    // Processamento de Dados
    const pageTitle = title ? `${title} | ${siteName}` : `${siteName} - Sua Boutique em Casa`
    const pageDescription = description || defaultDescription
    const currentUrl = `${siteUrl}${location.pathname}`

    // Resolver URL da imagem (se for relativa, transformar em absoluta)
    let shareImage = image || defaultImage
    if (shareImage && !shareImage.startsWith('http')) {
        shareImage = `${siteUrl}${shareImage.startsWith('/') ? '' : '/'}${shareImage}`
    }

    return (
        <Helmet prioritizeSeoTags>
            {/* Standard Metadata */}
            <title>{pageTitle}</title>
            <meta name="description" content={pageDescription} />
            <link rel="canonical" href={currentUrl} />
            {noIndex && <meta name="robots" content="noindex, nofollow" />}

            {/* Open Graph / Facebook / WhatsApp */}
            <meta property="og:site_name" content={siteName} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:image" content={shareImage} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:type" content={type} />
            <meta property="og:locale" content="pt_BR" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDescription} />
            <meta name="twitter:image" content={shareImage} />

            {/* Mobile Theme Color (syncs with manifest) */}
            <meta name="theme-color" content="#FDFBF7" />
        </Helmet>
    )
}
