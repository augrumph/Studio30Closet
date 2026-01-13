-- ============================================================================
-- MIDI INSIGHTS SYSTEM
-- Sistema de insights proativos - IA analisa dados em background
-- ============================================================================

-- 1. Create insights table
CREATE TABLE IF NOT EXISTS midi_insights (
    id BIGSERIAL PRIMARY KEY,

    -- Insight metadata
    type TEXT NOT NULL CHECK (type IN ('alert', 'opportunity', 'trend', 'recommendation')),
    category TEXT NOT NULL CHECK (category IN ('sales', 'inventory', 'customers', 'financial', 'operational')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- Content
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_text TEXT, -- "Ver Detalhes", "Criar Promoção", etc.
    action_link TEXT, -- "/admin/products/123"

    -- Data context (JSON with relevant data)
    context JSONB DEFAULT '{}'::jsonb,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'resolved', 'expired')),
    is_read BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Auto-expire insights after X days
    dismissed_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_by TEXT DEFAULT 'system',
    dismissed_by TEXT
);

-- Indexes
CREATE INDEX idx_midi_insights_status ON midi_insights(status) WHERE status = 'active';
CREATE INDEX idx_midi_insights_created_at ON midi_insights(created_at DESC);
CREATE INDEX idx_midi_insights_category ON midi_insights(category);
CREATE INDEX idx_midi_insights_type ON midi_insights(type);
CREATE INDEX idx_midi_insights_severity ON midi_insights(severity);

-- ============================================================================
-- 2. RPC: Get active insights
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_insights(
    limit_count INTEGER DEFAULT 10,
    category_filter TEXT DEFAULT NULL
)
RETURNS SETOF midi_insights
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM midi_insights
    WHERE
        status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (category_filter IS NULL OR category = category_filter)
    ORDER BY
        CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END ASC,
        created_at DESC
    LIMIT limit_count;
END;
$$;

-- ============================================================================
-- 3. RPC: Dismiss insight
-- ============================================================================

CREATE OR REPLACE FUNCTION dismiss_insight(
    insight_id BIGINT,
    dismissed_by_user TEXT DEFAULT 'user'
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE midi_insights
    SET
        status = 'dismissed',
        dismissed_at = NOW(),
        dismissed_by = dismissed_by_user
    WHERE id = insight_id;
END;
$$;

-- ============================================================================
-- 4. RPC: Mark insight as read
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_insight_read(insight_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE midi_insights
    SET is_read = TRUE
    WHERE id = insight_id;
END;
$$;

-- ============================================================================
-- 5. RPC: Generate insights (called by edge function)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_insights()
RETURNS TABLE (
    insight_type TEXT,
    insight_title TEXT,
    insight_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    low_stock_count INTEGER;
    no_sales_products_count INTEGER;
    high_value_customers_count INTEGER;
    churned_customers_count INTEGER;
BEGIN
    -- Clean up old insights (older than 7 days)
    DELETE FROM midi_insights
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND status IN ('dismissed', 'resolved');

    -- Auto-expire old active insights (older than 3 days)
    UPDATE midi_insights
    SET status = 'expired'
    WHERE created_at < NOW() - INTERVAL '3 days'
    AND status = 'active';

    -- ========================================================================
    -- INSIGHT 1: Low Stock Alert
    -- ========================================================================
    SELECT COUNT(*) INTO low_stock_count
    FROM products
    WHERE stock <= 2 AND stock > 0 AND active = TRUE;

    IF low_stock_count > 0 THEN
        -- Delete duplicate insights first
        DELETE FROM midi_insights
        WHERE type = 'alert'
        AND category = 'inventory'
        AND title LIKE '%estoque baixo%'
        AND status = 'active';

        INSERT INTO midi_insights (type, category, severity, title, description, action_text, action_link, context)
        VALUES (
            'alert',
            'inventory',
            'high',
            'Produtos com estoque baixo',
            low_stock_count || ' produto(s) com estoque crítico (≤2 unidades). Considere fazer um novo pedido.',
            'Ver Produtos',
            '/admin/products',
            jsonb_build_object('count', low_stock_count)
        );
    END IF;

    -- ========================================================================
    -- INSIGHT 2: Products not selling (no sales in 30 days)
    -- ========================================================================
    SELECT COUNT(DISTINCT p.id) INTO no_sales_products_count
    FROM products p
    WHERE p.active = TRUE
    AND p.stock > 0
    AND NOT EXISTS (
        SELECT 1
        FROM vendas v,
             jsonb_array_elements(v.items) AS item
        WHERE (item->>'productId')::BIGINT = p.id
        AND v.created_at > NOW() - INTERVAL '30 days'
    );

    IF no_sales_products_count > 5 THEN
        DELETE FROM midi_insights
        WHERE type = 'opportunity'
        AND category = 'sales'
        AND title LIKE '%sem vendas%'
        AND status = 'active';

        INSERT INTO midi_insights (type, category, severity, title, description, action_text, action_link, context)
        VALUES (
            'opportunity',
            'sales',
            'medium',
            'Produtos parados há mais de 30 dias',
            no_sales_products_count || ' produtos não venderam nos últimos 30 dias. Considere criar promoções.',
            'Ver Produtos',
            '/admin/products',
            jsonb_build_object('count', no_sales_products_count)
        );
    END IF;

    -- ========================================================================
    -- INSIGHT 3: High-value customers (top 10% LTV)
    -- ========================================================================
    SELECT COUNT(*) INTO high_value_customers_count
    FROM customers_with_metrics
    WHERE total_spent > (
        SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_spent)
        FROM customers_with_metrics
        WHERE total_spent > 0
    );

    IF high_value_customers_count > 0 THEN
        DELETE FROM midi_insights
        WHERE type = 'recommendation'
        AND category = 'customers'
        AND title LIKE '%VIPs%'
        AND status = 'active';

        INSERT INTO midi_insights (type, category, severity, title, description, action_text, action_link, context)
        VALUES (
            'recommendation',
            'customers',
            'low',
            'Você tem ' || high_value_customers_count || ' clientes VIP',
            'Esses clientes representam seu maior faturamento. Considere enviar ofertas exclusivas.',
            'Ver Clientes VIP',
            '/admin/customers',
            jsonb_build_object('count', high_value_customers_count)
        );
    END IF;

    -- ========================================================================
    -- INSIGHT 4: Churned customers (at risk of leaving)
    -- ========================================================================
    SELECT COUNT(*) INTO churned_customers_count
    FROM customers_with_metrics
    WHERE segment = 'at_risk';

    IF churned_customers_count > 0 THEN
        DELETE FROM midi_insights
        WHERE type = 'alert'
        AND category = 'customers'
        AND title LIKE '%risco de churn%'
        AND status = 'active';

        INSERT INTO midi_insights (type, category, severity, title, description, action_text, action_link, context)
        VALUES (
            'alert',
            'customers',
            'medium',
            'Clientes em risco de churn',
            churned_customers_count || ' cliente(s) não compram há 30-90 dias. Considere campanhas de reengajamento.',
            'Ver Clientes',
            '/admin/customers?segment=at_risk',
            jsonb_build_object('count', churned_customers_count)
        );
    END IF;

    -- Return summary
    RETURN QUERY
    SELECT 'low_stock', 'Estoque Baixo', low_stock_count
    UNION ALL
    SELECT 'no_sales', 'Produtos Parados', no_sales_products_count
    UNION ALL
    SELECT 'vip_customers', 'Clientes VIP', high_value_customers_count
    UNION ALL
    SELECT 'at_risk', 'Clientes em Risco', churned_customers_count;
END;
$$;

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

GRANT ALL ON midi_insights TO authenticated;
GRANT ALL ON midi_insights TO service_role;
GRANT USAGE, SELECT ON SEQUENCE midi_insights_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE midi_insights_id_seq TO service_role;

GRANT EXECUTE ON FUNCTION get_active_insights TO authenticated;
GRANT EXECUTE ON FUNCTION dismiss_insight TO authenticated;
GRANT EXECUTE ON FUNCTION mark_insight_read TO authenticated;
GRANT EXECUTE ON FUNCTION generate_insights TO service_role;

-- ============================================================================
-- 7. Initial insights generation
-- ============================================================================

SELECT generate_insights();

-- ============================================================================
-- DONE: Sistema de insights implementado
-- Next: Create edge function to call generate_insights() periodically
-- ============================================================================
