/**
 * API de Insights da Midi
 * Sistema de insights proativos
 */

import { supabase } from '../supabase'
import { toCamelCase } from './helpers'

/**
 * Get active insights
 */
export async function getActiveInsights(limit = 10, category = null) {
    console.log(`🔍 API: Getting active insights (limit: ${limit}, category: ${category})...`)

    const { data, error } = await supabase.rpc('get_active_insights', {
        limit_count: limit,
        category_filter: category
    })

    if (error) {
        console.error('❌ API Error getting insights:', error)
        throw error
    }

    console.log(`✅ API: Got ${data?.length || 0} insights`)
    return data.map(toCamelCase)
}

/**
 * Dismiss an insight
 */
export async function dismissInsight(insightId, dismissedBy = 'user') {
    console.log(`🗑️ API: Dismissing insight ${insightId}...`)

    const { error } = await supabase.rpc('dismiss_insight', {
        insight_id: insightId,
        dismissed_by_user: dismissedBy
    })

    if (error) {
        console.error('❌ API Error dismissing insight:', error)
        throw error
    }

    console.log(`✅ API: Insight ${insightId} dismissed`)
    return true
}

/**
 * Mark insight as read
 */
export async function markInsightRead(insightId) {
    const { error } = await supabase.rpc('mark_insight_read', {
        insight_id: insightId
    })

    if (error) {
        console.error('❌ API Error marking insight as read:', error)
        throw error
    }

    return true
}

/**
 * Generate new insights (admin only)
 */
export async function generateInsights() {
    console.log(`🤖 API: Generating new insights...`)

    const { data, error } = await supabase.rpc('generate_insights')

    if (error) {
        console.error('❌ API Error generating insights:', error)
        throw error
    }

    console.log(`✅ API: Generated ${data?.length || 0} insight types`)
    return data.map(toCamelCase)
}
