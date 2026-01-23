/**
 * Analytics Service - Studio30
 * 
 * Sistema de tracking para monitorar comportamento de usuários:
 * - Page views
 * - Catalog views
 * - Product views (modal)
 * - Add/Remove to cart
 * - Checkout started/completed
 * - Abandoned carts
 */

import { supabase } from '@/lib/supabase'

// ============================================================================
// Retry Helper - para resiliência em erros de rede
// ============================================================================

/**
 * Executa uma função com retry automático
 * @param {Function} fn - Função assíncrona a executar
 * @param {number} maxRetries - Número máximo de tentativas
 * @param {number} delayMs - Delay entre tentativas (em ms)
 */
async function withRetry(fn, maxRetries = 3, delayMs = 500) {
    let lastError
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err
            if (attempt < maxRetries) {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
            }
        }
    }
    throw lastError
}

// ============================================================================
// Session Management
// ============================================================================

const SESSION_KEY = 'studio30_session_id'
const CART_SNAPSHOT_KEY = 'studio30_cart_snapshot'

/**
 * Gera ou recupera o ID de sessão único do usuário
 */
export function getSessionId() {
    let sessionId = localStorage.getItem(SESSION_KEY)

    if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem(SESSION_KEY, sessionId)
    }

    return sessionId
}

/**
 * Detecta o tipo de dispositivo
 */
export function getDeviceType() {
    const ua = navigator.userAgent

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet'
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile'
    }
    return 'desktop'
}

// ============================================================================
// Core Tracking Functions
// ============================================================================

/**
 * Envia um evento para o Supabase com retry automático
 */
export async function trackEvent(eventType, eventData = {}, pagePath = null) {
    try {
        // 🛡️ SECURITY: Ignorar eventos vindo do Admin
        if (window.location.pathname.startsWith('/admin')) {
            return
        }

        const sessionId = getSessionId()
        const deviceType = getDeviceType()

        const event = {
            session_id: sessionId,
            event_type: eventType,
            event_data: eventData,
            page_path: pagePath || window.location.pathname,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
            device_type: deviceType
        }

        // 🔄 Enviar evento com retry (3 tentativas) para resiliência
        await withRetry(async () => {
            const { error } = await supabase
                .from('analytics_events')
                .insert(event)
            if (error) throw error
        }, 3, 500)

        // Atualizar sessão (também com retry)
        await withRetry(async () => {
            await updateSession(sessionId, deviceType, eventType === 'checkout_completed')
        }, 2, 300)

    } catch (err) {
        // Falha silenciosa após todas as tentativas - analytics não deve quebrar a aplicação
    }
}

/**
 * Atualiza ou cria sessão do usuário
 */
async function updateSession(sessionId, deviceType, isConverted = false) {
    try {
        const { data: existing } = await supabase
            .from('analytics_sessions')
            .select('id, page_views')
            .eq('id', sessionId)
            .maybeSingle()

        if (existing) {
            // Atualiza sessão existente
            const updates = {
                last_seen_at: new Date().toISOString(),
                page_views: (existing.page_views || 0) + 1
            }
            if (isConverted) {
                updates.is_converted = true
            }

            await supabase
                .from('analytics_sessions')
                .update(updates)
                .eq('id', sessionId)
        } else {
            // Cria nova sessão
            await supabase
                .from('analytics_sessions')
                .insert({
                    id: sessionId,
                    device_type: deviceType,
                    user_agent: navigator.userAgent,
                    referrer: document.referrer || null,
                    page_views: 1
                })
        }
    } catch (err) {
        // Silencioso
    }
}

// ============================================================================
// Convenience Tracking Functions
// ============================================================================

/**
 * Rastreia visualização de página
 */
export async function trackPageView(pagePath) {
    await trackEvent('page_view', { page: pagePath }, pagePath)
}

/**
 * Rastreia visualização do catálogo
 */
export async function trackCatalogView(filters = {}) {
    await trackEvent('catalog_view', {
        filters,
        timestamp: new Date().toISOString()
    }, '/catalogo')
}

/**
 * Rastreia visualização de produto (modal aberto)
 */
export async function trackProductView(product) {
    await trackEvent('product_view', {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_category: product.category
    })
}

/**
 * Rastreia adição ao carrinho (malinha)
 */
export async function trackAddToCart(product, size, color) {
    await trackEvent('add_to_cart', {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        size,
        color
    })
}

/**
 * Rastreia remoção do carrinho
 */
export async function trackRemoveFromCart(productId) {
    await trackEvent('remove_from_cart', {
        product_id: productId
    })
}

/**
 * Rastreia início do checkout
 */
export async function trackCheckoutStarted(itemCount, totalValue) {
    await trackEvent('checkout_started', {
        item_count: itemCount,
        total_value: totalValue
    }, '/malinha')
}

/**
 * Rastreia checkout completado
 */
export async function trackCheckoutCompleted(orderId, items, totalValue) {
    await trackEvent('checkout_completed', {
        order_id: orderId,
        item_count: items.length,
        total_value: totalValue,
        items: items.map(i => ({
            product_id: i.productId,
            size: i.selectedSize
        }))
    }, '/malinha')
}

// ============================================================================
// Social Media Click Tracking
// ============================================================================

/**
 * Rastreia clique no botão do WhatsApp
 */
export async function trackWhatsAppClick(location = 'navbar') {
    await trackEvent('social_click_whatsapp', {
        location,
        timestamp: new Date().toISOString()
    })
}

/**
 * Rastreia clique no botão do Instagram
 */
export async function trackInstagramClick(location = 'navbar') {
    await trackEvent('social_click_instagram', {
        location,
        timestamp: new Date().toISOString()
    })
}

// ============================================================================
// Abandoned Cart Tracking
// ============================================================================

/**
 * Salva snapshot do carrinho para detectar abandono
 */
export async function saveCartSnapshot(items) {
    try {
        if (!items || items.length === 0) {
            // Limpa snapshot se carrinho vazio
            localStorage.removeItem(CART_SNAPSHOT_KEY)
            return
        }

        const sessionId = getSessionId()

        // Salvar localmente para referência
        localStorage.setItem(CART_SNAPSHOT_KEY, JSON.stringify({
            items,
            savedAt: new Date().toISOString()
        }))

        // Upsert no Supabase
        const { data: existing } = await supabase
            .from('abandoned_carts')
            .select('id')
            .eq('session_id', sessionId)
            .eq('checkout_completed', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (existing) {
            // Atualiza carrinho existente
            await supabase
                .from('abandoned_carts')
                .update({
                    items,
                    total_items: items.length,
                    last_activity_at: new Date().toISOString()
                })
                .eq('id', existing.id)
        } else {
            // Cria novo registro de carrinho
            await supabase
                .from('abandoned_carts')
                .insert({
                    session_id: sessionId,
                    items,
                    total_items: items.length
                })
        }
    } catch (err) {
        console.warn('[Analytics] Erro ao salvar snapshot do carrinho:', err.message)
    }
}

/**
 * Marca carrinho como checkout iniciado
 */
export async function markCartCheckoutStarted() {
    try {
        const sessionId = getSessionId()

        await supabase
            .from('abandoned_carts')
            .update({ checkout_started: true })
            .eq('session_id', sessionId)
            .eq('checkout_completed', false)
    } catch (err) {
        // Silencioso
    }
}

/**
 * Marca carrinho como convertido (checkout completo)
 */
export async function markCartConverted() {
    try {
        const sessionId = getSessionId()

        await supabase
            .from('abandoned_carts')
            .update({
                checkout_completed: true,
                last_activity_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .eq('checkout_completed', false)

        // Limpa snapshot local
        localStorage.removeItem(CART_SNAPSHOT_KEY)
    } catch (err) {
        // Silencioso
    }
}

/**
 * Salva dados do cliente no carrinho abandonado (para contato posterior)
 */
export async function saveCustomerDataToCart(customerData) {
    try {
        if (!customerData || (!customerData.name && !customerData.phone && !customerData.email)) {
            return
        }

        const sessionId = getSessionId()

        await supabase
            .from('abandoned_carts')
            .update({
                customer_data: {
                    name: customerData.name || null,
                    phone: customerData.phone || null,
                    email: customerData.email || null
                },
                last_activity_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .eq('checkout_completed', false)
    } catch (err) {
        console.warn('[Analytics] Erro ao salvar dados do cliente:', err.message)
    }
}
