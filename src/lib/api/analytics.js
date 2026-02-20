/**
 * Analytics Service - Studio30
 * 
 * Sistema de tracking para monitorar comportamento de usuários via BFF
 */

import { apiClient } from '../api-client'

// ============================================================================
// Retry Helper - para resiliência em erros de rede
// ============================================================================

async function withRetry(fn, maxRetries = 3, delayMs = 500) {
    let lastError
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err
            if (attempt < maxRetries) {
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

export function getSessionId() {
    let sessionId = localStorage.getItem(SESSION_KEY)
    if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem(SESSION_KEY, sessionId)
    }
    return sessionId
}

export function getDeviceType() {
    const ua = navigator.userAgent
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet'
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile'
    return 'desktop'
}

// ============================================================================
// Core Tracking Functions
// ============================================================================

/**
 * Envia um evento para o BFF
 */
export async function trackEvent(eventType, eventData = {}, pagePath = null) {
    try {
        if (window.location.pathname.startsWith('/admin')) return

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

        await withRetry(async () => {
            await apiClient('/analytics/events', { body: event })
        }, 3, 500)

        await withRetry(async () => {
            await updateSession(sessionId, deviceType, eventType === 'checkout_completed')
        }, 2, 300)

    } catch (err) {
        // Silencioso em produção
    }
}

async function updateSession(sessionId, deviceType, isConverted = false) {
    try {
        await apiClient('/analytics/sessions', {
            body: {
                id: sessionId,
                device_type: deviceType,
                user_agent: navigator.userAgent,
                referrer: document.referrer || null,
                is_converted: isConverted
            }
        })
    } catch (err) {
        // Silencioso
    }
}

// ============================================================================
// Convenience Tracking Functions
// ============================================================================

export async function trackPageView(pagePath) {
    await trackEvent('page_view', { page: pagePath }, pagePath)
}

export async function trackCatalogView(filters = {}) {
    await trackEvent('catalog_view', {
        filters,
        timestamp: new Date().toISOString()
    }, '/catalogo')
}

export async function trackProductView(product) {
    await trackEvent('product_view', {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_category: product.category
    })
}

export async function trackAddToCart(product, size, color) {
    await trackEvent('add_to_cart', {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        size,
        color
    })
}

export async function trackRemoveFromCart(productId) {
    await trackEvent('remove_from_cart', {
        product_id: productId
    })
}

export async function trackCheckoutStarted(itemCount, totalValue) {
    await trackEvent('checkout_started', {
        item_count: itemCount,
        total_value: totalValue
    }, '/malinha')
}

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

export async function trackWhatsAppClick(location = 'navbar') {
    await trackEvent('social_click_whatsapp', {
        location,
        timestamp: new Date().toISOString()
    })
}

export async function trackInstagramClick(location = 'navbar') {
    await trackEvent('social_click_instagram', {
        location,
        timestamp: new Date().toISOString()
    })
}

// ============================================================================
// Abandoned Cart Tracking
// ============================================================================

export async function saveCartSnapshot(items) {
    try {
        if (!items || items.length === 0) {
            localStorage.removeItem(CART_SNAPSHOT_KEY)
            return
        }

        const sessionId = getSessionId()

        localStorage.setItem(CART_SNAPSHOT_KEY, JSON.stringify({
            items,
            savedAt: new Date().toISOString()
        }))

        await apiClient('/analytics/abandoned-carts', {
            body: {
                session_id: sessionId,
                items,
                total_items: items.length
            }
        })
    } catch (err) {
        console.warn('[Analytics] Erro ao salvar snapshot do carrinho:', err.message)
    }
}

export async function markCartCheckoutStarted() {
    try {
        const sessionId = getSessionId()
        await apiClient('/analytics/abandoned-carts', {
            body: {
                session_id: sessionId,
                checkout_started: true
            }
        })
    } catch (err) {
        // Silencioso
    }
}

export async function markCartConverted() {
    try {
        const sessionId = getSessionId()
        await apiClient('/analytics/abandoned-carts', {
            body: {
                session_id: sessionId,
                checkout_completed: true
            }
        })
        localStorage.removeItem(CART_SNAPSHOT_KEY)
    } catch (err) {
        // Silencioso
    }
}

export async function saveCustomerDataToCart(customerData) {
    try {
        if (!customerData || (!customerData.name && !customerData.phone && !customerData.email)) {
            return
        }

        const sessionId = getSessionId()
        await apiClient('/analytics/abandoned-carts', {
            body: {
                session_id: sessionId,
                customer_data: {
                    name: customerData.name || null,
                    phone: customerData.phone || null,
                    email: customerData.email || null
                }
            }
        })
    } catch (err) {
        console.warn('[Analytics] Erro ao salvar dados do cliente:', err.message)
    }
}
