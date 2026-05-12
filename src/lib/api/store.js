import { apiClient } from '../api-client'

export function quoteStoreShipping(payload) {
    return apiClient('/store/shipping/quote', {
        method: 'POST',
        auth: false,
        logoutOnUnauthorized: false,
        body: payload
    })
}

export function createStoreCheckout(payload) {
    return apiClient('/store/checkout', {
        method: 'POST',
        auth: false,
        logoutOnUnauthorized: false,
        body: payload
    })
}

export function getPublicStoreOrder(orderId) {
    return apiClient(`/store/orders/${orderId}`, {
        auth: false,
        logoutOnUnauthorized: false
    })
}
