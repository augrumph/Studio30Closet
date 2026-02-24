import express from 'express'
import { pool } from '../db.js'
import { cacheMiddleware } from '../cache.js'

const router = express.Router()

// GET /api/analytics/summary - Analytics summary
router.get('/summary', cacheMiddleware(300), async (req, res) => {
    try {
        const { dateRange } = req.query;
        let timeFilter = "NOW() - INTERVAL '7 days'";
        if (dateRange === 'today') timeFilter = "CURRENT_DATE";
        if (dateRange === '30days') timeFilter = "NOW() - INTERVAL '30 days'";
        if (dateRange === 'all') timeFilter = "'2000-01-01'";

        const { rows } = await pool.query(`
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT session_id) as unique_sessions,
                SUM(CASE WHEN event_type = 'catalog_view' THEN 1 ELSE 0 END) as catalog_views,
                SUM(CASE WHEN event_type = 'product_view' THEN 1 ELSE 0 END) as product_views,
                SUM(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) as add_to_cart,
                SUM(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) as checkouts_started,
                SUM(CASE WHEN event_type = 'checkout_completed' THEN 1 ELSE 0 END) as checkouts_completed,
                SUM(CASE WHEN event_type = 'social_click_whatsapp' THEN 1 ELSE 0 END) as whatsapp_clicks,
                SUM(CASE WHEN event_type = 'social_click_instagram' THEN 1 ELSE 0 END) as instagram_clicks
            FROM analytics_events
            WHERE created_at >= ${timeFilter}
        `)

        const devicesRes = await pool.query(`
            SELECT device_type, COUNT(DISTINCT session_id) as count
            FROM analytics_events
            WHERE created_at >= ${timeFilter} AND device_type IS NOT NULL
            GROUP BY device_type
        `)

        const trafficRes = await pool.query(`
            SELECT 
                SUM(CASE WHEN referrer ILIKE '%google%' THEN 1 ELSE 0 END) as google_traf,
                SUM(CASE WHEN referrer ILIKE '%instagram%' OR referrer ILIKE '%facebook%' OR referrer ILIKE '%t.co%' OR referrer ILIKE '%tiktok%' THEN 1 ELSE 0 END) as social_traf,
                SUM(CASE WHEN referrer IS NULL OR referrer = '' OR referrer ILIKE '%wa.me%' OR referrer ILIKE '%whatsapp%' THEN 1 ELSE 0 END) as direct_traf,
                SUM(CASE WHEN referrer IS NOT NULL AND referrer != '' AND referrer NOT ILIKE '%google%' AND referrer NOT ILIKE '%instagram%' AND referrer NOT ILIKE '%facebook%' AND referrer NOT ILIKE '%tiktok%' AND referrer NOT ILIKE '%wa.me%' AND referrer NOT ILIKE '%whatsapp%' THEN 1 ELSE 0 END) as other_traf
            FROM (
                SELECT DISTINCT ON (session_id) referrer
                FROM analytics_events
                WHERE created_at >= ${timeFilter}
                ORDER BY session_id, created_at ASC
            ) as first_events
        `)

        const stats = rows[0] || {};
        const tf = trafficRes.rows[0] || {};

        let cvRate = 0;
        if (stats.checkouts_started > 0) {
            cvRate = Math.round((stats.checkouts_completed / stats.checkouts_started) * 100);
        }

        let atcRate = 0;
        if (stats.product_views > 0) {
            atcRate = Math.round((stats.add_to_cart / stats.product_views) * 100);
        }

        const deviceBreakdown = {
            mobile: 0,
            desktop: 0,
            tablet: 0
        };

        devicesRes.rows.forEach(r => {
            if (r.device_type === 'mobile') deviceBreakdown.mobile = Number(r.count);
            else if (r.device_type === 'desktop') deviceBreakdown.desktop = Number(r.count);
            else if (r.device_type === 'tablet') deviceBreakdown.tablet = Number(r.count);
        });

        res.json({
            pageViews: Number(stats.total_events || 0),
            uniqueSessions: Number(stats.unique_sessions || 0),
            catalogViews: Number(stats.catalog_views || 0),
            productViews: Number(stats.product_views || 0),
            addToCart: Number(stats.add_to_cart || 0),
            checkoutsStarted: Number(stats.checkouts_started || 0),
            checkoutsCompleted: Number(stats.checkouts_completed || 0),
            whatsappClicks: Number(stats.whatsapp_clicks || 0),
            instagramClicks: Number(stats.instagram_clicks || 0),
            conversionRate: cvRate,
            addToCartRate: atcRate,
            deviceBreakdown,
            trafficSources: {
                google: Number(tf.google_traf || 0),
                social: Number(tf.social_traf || 0),
                direct: Number(tf.direct_traf || 0),
                other: Number(tf.other_traf || 0)
            }
        })
    } catch (error) {
        console.error("❌ Erro em Analytics:", error)
        res.status(500).json({ message: 'Erro ao gerar resumo' })
    }
})

// GET /api/analytics/products/viewed
router.get('/products/viewed', cacheMiddleware(300), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const { rows } = await pool.query(`
            SELECT 
                (event_data->>'product_id')::int as id,
                MAX(event_data->>'product_name') as name,
                COUNT(*) as views
            FROM analytics_events
            WHERE event_type = 'product_view' AND event_data->>'product_id' IS NOT NULL
            GROUP BY (event_data->>'product_id')::int
            ORDER BY views DESC
            LIMIT $1
        `, [limit]);
        res.json(rows);
    } catch (error) {
        console.error("❌ Erro ao buscar produtos visualizados:", error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// GET /api/analytics/products/added-to-cart
router.get('/products/added-to-cart', cacheMiddleware(300), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const { rows } = await pool.query(`
            SELECT 
                (event_data->>'product_id')::int as id,
                MAX(event_data->>'product_name') as name,
                MAX((event_data->>'product_price')::numeric) as price,
                COUNT(*) as count
            FROM analytics_events
            WHERE event_type = 'add_to_cart' AND event_data->>'product_id' IS NOT NULL
            GROUP BY (event_data->>'product_id')::int
            ORDER BY count DESC
            LIMIT $1
        `, [limit]);
        res.json(rows);
    } catch (error) {
        console.error("❌ Erro ao buscar produtos adicionados:", error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// GET /api/analytics/events/recent
router.get('/events/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const { rows } = await pool.query(`
            SELECT id, session_id, event_type, event_data, created_at, device_type
            FROM analytics_events
            ORDER BY created_at DESC
            LIMIT $1
        `, [limit]);
        res.json(rows);
    } catch (error) {
        console.error("❌ Erro ao buscar eventos recentes:", error);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});

// POST /api/analytics/events - Track a new event
router.post('/events', async (req, res) => {
    try {
        const { session_id, event_type, event_data, page_path, referrer, user_agent, device_type } = req.body

        // Fast fail for bad tracking attempts without throwing heavy 500s directly
        if (!session_id || !event_type) {
            return res.status(200).json({ success: false, message: 'Skipped invalid event' })
        }

        await pool.query(`
            INSERT INTO analytics_events (
                session_id, event_type, event_data, page_path, referrer, user_agent, device_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [session_id, event_type, event_data, page_path, referrer, user_agent, device_type])

        res.status(201).json({ success: true })
    } catch (error) {
        // We log it but return 200 to prevent frontend tracking retry loops or console spam
        console.warn("⚠️ Tracking Event Skipped:", error.message)
        res.status(200).json({ success: false, message: 'Event tracked with degraded state' })
    }
})

// POST /api/analytics/sessions - Update or create session
router.post('/sessions', async (req, res) => {
    try {
        const { id, device_type, user_agent, referrer, is_converted } = req.body

        if (!id) return res.status(400).json({ error: 'Session ID is required' })

        // Check if exists
        const { rows } = await pool.query('SELECT id, page_views FROM analytics_sessions WHERE id = $1', [id])

        if (rows.length > 0) {
            // Update
            await pool.query(`
                UPDATE analytics_sessions 
                SET last_seen_at = NOW(),
                    page_views = page_views + 1,
                    is_converted = COALESCE($2, is_converted)
                WHERE id = $1
            `, [id, is_converted])
        } else {
            // Insert
            await pool.query(`
                INSERT INTO analytics_sessions (id, device_type, user_agent, referrer, page_views, is_converted)
                VALUES ($1, $2, $3, $4, 1, $5)
            `, [id, device_type, user_agent, referrer, is_converted || false])
        }

        res.json({ success: true })
    } catch (error) {
        console.error("❌ Erro ao atualizar sessão:", error)
        res.status(500).json({ error: 'Erro ao atualizar sessão' })
    }
})

// POST /api/analytics/abandoned-carts - Save cart snapshot
router.post('/abandoned-carts', async (req, res) => {
    try {
        const { session_id, items, total_items, customer_data, checkout_started, checkout_completed } = req.body

        if (!session_id) return res.status(400).json({ error: 'session_id is required' })

        // Find active abandoned cart for this session
        const { rows } = await pool.query(`
            SELECT id FROM abandoned_carts 
            WHERE session_id = $1 AND checkout_completed = false
            ORDER BY created_at DESC LIMIT 1
        `, [session_id])

        if (rows.length > 0) {
            // Update
            const updateParts = []
            const values = []
            let i = 1

            if (items !== undefined) {
                updateParts.push(`items = $${i++}`)
                values.push(JSON.stringify(items))
            }
            if (total_items !== undefined) {
                updateParts.push(`total_items = $${i++}`)
                values.push(total_items)
            }
            if (customer_data !== undefined) {
                updateParts.push(`customer_data = $${i++}`)
                values.push(JSON.stringify(customer_data))
            }
            if (checkout_started !== undefined) {
                updateParts.push(`checkout_started = $${i++}`)
                values.push(checkout_started)
            }
            if (checkout_completed !== undefined) {
                updateParts.push(`checkout_completed = $${i++}`)
                values.push(checkout_completed)
            }

            if (updateParts.length > 0) {
                updateParts.push(`last_activity_at = NOW()`)
                values.push(rows[0].id)
                await pool.query(`
                    UPDATE abandoned_carts SET ${updateParts.join(', ')}
                    WHERE id = $${i}
                `, values)
            }
        } else {
            // Insert
            await pool.query(`
                INSERT INTO abandoned_carts (
                    session_id, items, total_items, customer_data, checkout_started, checkout_completed
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                session_id,
                JSON.stringify(items || []),
                total_items || (items ? items.length : 0),
                JSON.stringify(customer_data || {}),
                checkout_started || false,
                checkout_completed || false
            ])
        }

        res.json({ success: true })
    } catch (error) {
        console.error("❌ Erro ao salvar carrinho abandonado:", error)
        res.status(500).json({ error: 'Erro ao salvar carrinho abandonado' })
    }
})

// DELETE /api/analytics/reset - Clear all analytics data
router.delete('/reset', async (req, res) => {
    try {
        console.log('🧹 Reseting analytics data...')

        // Use TRUNCATE for performance if possible, or DELETE
        await pool.query('TRUNCATE TABLE analytics_events, analytics_sessions, abandoned_carts CASCADE')

        res.json({ success: true, message: 'Analytics data cleared successfully' })
    } catch (error) {
        console.error("❌ Erro ao resetar analytics:", error)
        res.status(500).json({ error: 'Erro ao resetar dados de analytics' })
    }
})

export default router
