-- =========================================
-- ANALYTICS OPTIMIZATION FUNCTIONS
-- Run these in Supabase SQL Editor to improve analytics performance
-- =========================================

-- Function 1: Get Analytics Summary (optimized aggregation)
-- Replaces client-side processing of all events
CREATE OR REPLACE FUNCTION get_analytics_summary(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '1 day'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    WITH event_counts AS (
        SELECT
            COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
            COUNT(*) FILTER (WHERE event_type = 'catalog_view') as catalog_views,
            COUNT(*) FILTER (WHERE event_type = 'product_view') as product_views,
            COUNT(*) FILTER (WHERE event_type = 'add_to_cart') as add_to_cart,
            COUNT(*) FILTER (WHERE event_type = 'checkout_started') as checkouts_started,
            COUNT(*) FILTER (WHERE event_type = 'checkout_completed') as checkouts_completed,
            COUNT(*) FILTER (WHERE event_type = 'social_click_whatsapp') as whatsapp_clicks,
            COUNT(*) FILTER (WHERE event_type = 'social_click_instagram') as instagram_clicks,
            COUNT(DISTINCT session_id) as unique_sessions
        FROM analytics_events
        WHERE created_at >= start_date
    ),
    traffic AS (
        SELECT DISTINCT ON (session_id)
            session_id,
            LOWER(COALESCE(referrer, '')) as ref,
            LOWER(COALESCE(device_type, 'desktop')) as device
        FROM analytics_events
        WHERE created_at >= start_date
        ORDER BY session_id, created_at ASC
    ),
    traffic_sources AS (
        SELECT
            COUNT(*) FILTER (WHERE ref LIKE '%google%') as google,
            COUNT(*) FILTER (WHERE ref LIKE '%instagram%' OR ref LIKE '%facebook%' OR ref LIKE '%tiktok%') as social,
            COUNT(*) FILTER (WHERE ref = '') as direct,
            COUNT(*) FILTER (WHERE ref != '' AND ref NOT LIKE '%google%' AND ref NOT LIKE '%instagram%' AND ref NOT LIKE '%facebook%' AND ref NOT LIKE '%tiktok%') as other
        FROM traffic
    ),
    device_breakdown AS (
        SELECT
            COUNT(*) FILTER (WHERE device = 'mobile') as mobile,
            COUNT(*) FILTER (WHERE device = 'desktop') as desktop,
            COUNT(*) FILTER (WHERE device = 'tablet') as tablet
        FROM traffic
    ),
    session_with_cart_and_checkout AS (
        SELECT COUNT(DISTINCT session_id) as count
        FROM analytics_events
        WHERE created_at >= start_date
          AND session_id IN (
              SELECT session_id FROM analytics_events
              WHERE created_at >= start_date AND event_type = 'add_to_cart'
          )
          AND session_id IN (
              SELECT session_id FROM analytics_events
              WHERE created_at >= start_date AND event_type = 'checkout_started'
          )
    )
    SELECT json_build_object(
        'pageViews', ec.page_views,
        'catalogViews', ec.catalog_views,
        'productViews', ec.product_views,
        'addToCart', ec.add_to_cart,
        'checkoutsStarted', (SELECT count FROM session_with_cart_and_checkout),
        'checkoutsCompleted', ec.checkouts_completed,
        'uniqueSessions', ec.unique_sessions,
        'whatsappClicks', ec.whatsapp_clicks,
        'instagramClicks', ec.instagram_clicks,
        'conversionRate', CASE
            WHEN (SELECT count FROM session_with_cart_and_checkout) > 0
            THEN ROUND((ec.checkouts_completed::NUMERIC / (SELECT count FROM session_with_cart_and_checkout)) * 100, 1)
            ELSE 0
        END,
        'addToCartRate', CASE
            WHEN ec.product_views > 0
            THEN ROUND((ec.add_to_cart::NUMERIC / ec.product_views) * 100, 1)
            ELSE 0
        END,
        'trafficSources', (SELECT row_to_json(t) FROM traffic_sources t),
        'deviceBreakdown', (SELECT row_to_json(d) FROM device_breakdown d)
    ) INTO result
    FROM event_counts ec;

    RETURN result;
END;
$$;

-- Function 2: Get Top Viewed Products
CREATE OR REPLACE FUNCTION get_top_viewed_products(
    days_back INT DEFAULT 30,
    top_limit INT DEFAULT 10
)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    views BIGINT
)
LANGUAGE SQL
AS $$
    SELECT
        event_data->>'product_id' as id,
        COALESCE(event_data->>'product_name', 'Produto') as name,
        COUNT(*) as views
    FROM analytics_events
    WHERE event_type = 'product_view'
      AND created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND event_data->>'product_id' IS NOT NULL
    GROUP BY event_data->>'product_id', event_data->>'product_name'
    ORDER BY views DESC
    LIMIT top_limit;
$$;

-- Function 3: Get Top Products Added to Cart
CREATE OR REPLACE FUNCTION get_top_added_to_cart(
    days_back INT DEFAULT 30,
    top_limit INT DEFAULT 10
)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    price NUMERIC,
    count BIGINT
)
LANGUAGE SQL
AS $$
    SELECT
        event_data->>'product_id' as id,
        COALESCE(event_data->>'product_name', 'Produto') as name,
        COALESCE((event_data->>'product_price')::NUMERIC, 0) as price,
        COUNT(*) as count
    FROM analytics_events
    WHERE event_type = 'add_to_cart'
      AND created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND event_data->>'product_id' IS NOT NULL
    GROUP BY
        event_data->>'product_id',
        event_data->>'product_name',
        event_data->>'product_price'
    ORDER BY count DESC
    LIMIT top_limit;
$$;

-- Function 4: Get Stock Ranking (optimized)
-- Replaces in-memory aggregation of all products and sales
CREATE OR REPLACE FUNCTION get_stock_ranking(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    WITH sales_data AS (
        SELECT
            si.product_id,
            p.name as product_name,
            p.category,
            p.color,
            si.size,
            SUM(si.quantity) as total_qty,
            SUM(si.price * si.quantity) as total_revenue,
            SUM((si.price - COALESCE(si.cost_price, si.price * 0.6)) * si.quantity) as total_margin
        FROM sale_items si
        JOIN vendas v ON si.venda_id = v.id
        JOIN products p ON si.product_id = p.id
        WHERE v.created_at >= start_date
          AND v.created_at <= end_date
          AND v.payment_status NOT IN ('cancelled', 'refuted', 'returned')
        GROUP BY si.product_id, p.name, p.category, p.color, si.size
    ),
    by_category AS (
        SELECT
            category as name,
            SUM(total_qty) as qty,
            SUM(total_revenue) as revenue,
            SUM(total_margin) as margin
        FROM sales_data
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY qty DESC
        LIMIT 10
    ),
    by_color AS (
        SELECT
            color as name,
            SUM(total_qty) as qty,
            SUM(total_revenue) as revenue,
            SUM(total_margin) as margin
        FROM sales_data
        WHERE color IS NOT NULL
        GROUP BY color
        ORDER BY qty DESC
        LIMIT 10
    ),
    by_size AS (
        SELECT
            size as name,
            SUM(total_qty) as qty,
            SUM(total_revenue) as revenue,
            SUM(total_margin) as margin
        FROM sales_data
        WHERE size IS NOT NULL AND size != ''
        GROUP BY size
        ORDER BY qty DESC
        LIMIT 10
    ),
    by_product AS (
        SELECT
            product_id as id,
            product_name as name,
            SUM(total_qty) as qty,
            SUM(total_revenue) as revenue,
            SUM(total_margin) as margin
        FROM sales_data
        GROUP BY product_id, product_name
        ORDER BY qty DESC
        LIMIT 10
    )
    SELECT json_build_object(
        'byCategory', (SELECT json_agg(row_to_json(c)) FROM by_category c),
        'byColor', (SELECT json_agg(row_to_json(co)) FROM by_color co),
        'bySize', (SELECT json_agg(row_to_json(s)) FROM by_size s),
        'byProduct', (SELECT json_agg(row_to_json(p)) FROM by_product p)
    ) INTO result;

    RETURN result;
END;
$$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_created ON analytics_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_venda_product ON sale_items(venda_id, product_id);
CREATE INDEX IF NOT EXISTS idx_vendas_created_status ON vendas(created_at, payment_status);

COMMENT ON FUNCTION get_analytics_summary IS 'Optimized analytics summary aggregation - replaces client-side processing';
COMMENT ON FUNCTION get_top_viewed_products IS 'Get top viewed products with database aggregation';
COMMENT ON FUNCTION get_top_added_to_cart IS 'Get top added to cart products with database aggregation';
COMMENT ON FUNCTION get_stock_ranking IS 'Get stock ranking by category, color, size, and product with database aggregation';
