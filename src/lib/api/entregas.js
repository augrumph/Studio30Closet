/**
 * ============================================================================
 * Entregas API - TikTok Shop Integration
 * ============================================================================
 */

import { supabase } from '../supabase'
import { logger } from '@/utils/logger'

/**
 * Get all entregas with optional filters
 */
export async function getEntregas(options = {}) {
    const { status, platform, search, limit = 100 } = options

    try {
        let query = supabase
            .from('entregas')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        if (platform) {
            query = query.eq('platform', platform)
        }

        if (search) {
            query = query.or(`customer_name.ilike.%${search}%,order_id.ilike.%${search}%,tracking_code.ilike.%${search}%`)
        }

        const { data, error } = await query

        if (error) {
            logger.apiError('getEntregas', error)
            throw error
        }

        // Transform snake_case to camelCase for frontend
        return (data || []).map(transformEntrega)
    } catch (error) {
        logger.apiError('getEntregas', error)
        throw error
    }
}

/**
 * Get single entrega by ID
 */
export async function getEntregaById(id) {
    try {
        const { data, error } = await supabase
            .from('entregas')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            logger.apiError('getEntregaById', error)
            throw error
        }

        return transformEntrega(data)
    } catch (error) {
        logger.apiError('getEntregaById', error)
        throw error
    }
}

/**
 * Create new entrega
 */
export async function createEntrega(entrega) {
    try {
        const dbData = {
            order_id: entrega.orderId,
            platform: entrega.platform || 'manual',
            tiktok_order_id: entrega.tiktokOrderId,
            customer_id: entrega.customerId,
            customer_name: entrega.customer?.name || entrega.customerName,
            customer_phone: entrega.customer?.phone || entrega.customerPhone,
            customer_address: entrega.customer?.address || entrega.customerAddress,
            customer_cep: entrega.customer?.cep || entrega.customerCep,
            customer_city: entrega.customer?.city || entrega.customerCity,
            customer_state: entrega.customer?.state || entrega.customerState,
            items: entrega.items || [],
            subtotal: entrega.subtotal || 0,
            shipping_cost: entrega.shippingCost || 0,
            discount: entrega.discount || 0,
            total: entrega.total || 0,
            status: entrega.status || 'pending',
            tracking_code: entrega.trackingCode,
            tracking_url: entrega.trackingUrl,
            carrier: entrega.carrier,
            venda_id: entrega.vendaId,
            notes: entrega.notes,
            tiktok_metadata: entrega.tiktokMetadata || {}
        }

        const { data, error } = await supabase
            .from('entregas')
            .insert([dbData])
            .select()
            .single()

        if (error) {
            logger.apiError('createEntrega', error)
            throw error
        }

        logger.api('createEntrega', 'Entrega criada', { id: data.id })
        return transformEntrega(data)
    } catch (error) {
        logger.apiError('createEntrega', error)
        throw error
    }
}

/**
 * Update entrega
 */
export async function updateEntrega(id, updates) {
    try {
        const dbData = {}

        // Map camelCase to snake_case
        if (updates.status !== undefined) dbData.status = updates.status
        if (updates.trackingCode !== undefined) dbData.tracking_code = updates.trackingCode
        if (updates.trackingUrl !== undefined) dbData.tracking_url = updates.trackingUrl
        if (updates.carrier !== undefined) dbData.carrier = updates.carrier
        if (updates.notes !== undefined) dbData.notes = updates.notes
        if (updates.vendaId !== undefined) dbData.venda_id = updates.vendaId

        // Set shipped_at when status changes to shipped
        if (updates.status === 'shipped' && !updates.shippedAt) {
            dbData.shipped_at = new Date().toISOString()
        }

        // Set delivered_at when status changes to delivered
        if (updates.status === 'delivered' && !updates.deliveredAt) {
            dbData.delivered_at = new Date().toISOString()
        }

        const { data, error } = await supabase
            .from('entregas')
            .update(dbData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            logger.apiError('updateEntrega', error)
            throw error
        }

        logger.api('updateEntrega', 'Entrega atualizada', { id, updates: Object.keys(dbData) })
        return transformEntrega(data)
    } catch (error) {
        logger.apiError('updateEntrega', error)
        throw error
    }
}

/**
 * Delete entrega
 */
export async function deleteEntrega(id) {
    try {
        const { error } = await supabase
            .from('entregas')
            .delete()
            .eq('id', id)

        if (error) {
            logger.apiError('deleteEntrega', error)
            throw error
        }

        logger.api('deleteEntrega', 'Entrega removida', { id })
        return true
    } catch (error) {
        logger.apiError('deleteEntrega', error)
        throw error
    }
}

/**
 * Get entregas metrics/stats
 */
export async function getEntregasMetrics() {
    try {
        const { data, error } = await supabase
            .from('entregas')
            .select('status, total')

        if (error) {
            logger.apiError('getEntregasMetrics', error)
            throw error
        }

        const metrics = {
            total: data.length,
            pending: data.filter(d => d.status === 'pending').length,
            processing: data.filter(d => d.status === 'processing').length,
            shipped: data.filter(d => d.status === 'shipped').length,
            delivered: data.filter(d => d.status === 'delivered').length,
            cancelled: data.filter(d => d.status === 'cancelled').length,
            totalValue: data.reduce((sum, d) => sum + (parseFloat(d.total) || 0), 0)
        }

        return metrics
    } catch (error) {
        logger.apiError('getEntregasMetrics', error)
        throw error
    }
}

/**
 * Transform database row to frontend format (snake_case -> camelCase)
 */
function transformEntrega(row) {
    if (!row) return null

    return {
        id: row.id,
        orderId: row.order_id,
        platform: row.platform,
        tiktokOrderId: row.tiktok_order_id,
        customerId: row.customer_id,
        customer: {
            name: row.customer_name,
            phone: row.customer_phone,
            address: row.customer_address,
            cep: row.customer_cep,
            city: row.customer_city,
            state: row.customer_state
        },
        items: row.items || [],
        subtotal: parseFloat(row.subtotal) || 0,
        shippingCost: parseFloat(row.shipping_cost) || 0,
        discount: parseFloat(row.discount) || 0,
        total: parseFloat(row.total) || 0,
        status: row.status,
        trackingCode: row.tracking_code,
        trackingUrl: row.tracking_url,
        carrier: row.carrier,
        vendaId: row.venda_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        shippedAt: row.shipped_at,
        deliveredAt: row.delivered_at,
        notes: row.notes,
        tiktokMetadata: row.tiktok_metadata || {}
    }
}

export const entregas = {
    getAll: getEntregas,
    getById: getEntregaById,
    create: createEntrega,
    update: updateEntrega,
    delete: deleteEntrega,
    getMetrics: getEntregasMetrics
}
