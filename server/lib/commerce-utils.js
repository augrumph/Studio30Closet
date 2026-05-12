import crypto from 'crypto'
import { updateProductStock } from '../stock-utils.js'

export function moneyToCents(value) {
    return Math.round(Number(value || 0) * 100)
}

export function centsToMoney(value) {
    return Number((Number(value || 0) / 100).toFixed(2))
}

export function normalizeZipCode(zipCode) {
    return String(zipCode || '').replace(/\D/g, '')
}

export function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '')
}

export function makeOrderNumber(orderId) {
    return `S30-${String(orderId).padStart(6, '0')}`
}

export function makeVariantKey(item) {
    return [
        item.productId,
        item.selectedColor || item.color || 'Padrão',
        item.selectedSize || item.size || 'Único'
    ].join('|')
}

export function verifyHmacSignature({ rawBody, signature, secret, algorithm = 'sha256' }) {
    if (!rawBody || !signature || !secret) return false

    const digest = crypto
        .createHmac(algorithm, secret)
        .update(rawBody)
        .digest('hex')

    const cleanSignature = String(signature).replace(/^sha256=/, '')
    const expected = Buffer.from(digest, 'hex')
    const received = Buffer.from(cleanSignature, 'hex')

    if (expected.length !== received.length) return false
    return crypto.timingSafeEqual(expected, received)
}

export async function reserveOrderStock(client, { orderId, items, expiresAt }) {
    for (const item of items) {
        await updateProductStock(
            client,
            item.productId,
            Number(item.quantity || 1),
            item.selectedColor || 'Padrão',
            item.selectedSize || 'Único',
            'reserve'
        )

        await client.query(`
            INSERT INTO stock_reservations (
                order_id, product_id, quantity, selected_size, selected_color, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            orderId,
            item.productId,
            Number(item.quantity || 1),
            item.selectedSize || null,
            item.selectedColor || null,
            expiresAt
        ])
    }
}

export async function releaseOrderStock(client, { orderId, reason = 'released' }) {
    const { rows: reservations } = await client.query(`
        SELECT *
        FROM stock_reservations
        WHERE order_id = $1
          AND status = 'reserved'
        FOR UPDATE
    `, [orderId])

    for (const reservation of reservations) {
        await updateProductStock(
            client,
            reservation.product_id,
            Number(reservation.quantity || 1),
            reservation.selected_color || 'Padrão',
            reservation.selected_size || 'Único',
            'restore'
        )

        await client.query(`
            UPDATE stock_reservations
            SET status = 'released',
                released_at = NOW(),
                release_reason = $2
            WHERE id = $1
        `, [reservation.id, reason])
    }
}

export async function confirmOrderStock(client, { orderId }) {
    await client.query(`
        UPDATE stock_reservations
        SET status = 'confirmed',
            confirmed_at = COALESCE(confirmed_at, NOW())
        WHERE order_id = $1
          AND status = 'reserved'
    `, [orderId])
}
