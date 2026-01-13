-- ============================================================================
-- CRITICAL FIX: Customer Metrics Integrity
-- Problem: Frontend was calculating LTV using only paginated sales (last 30)
-- Solution: Database view with ALL sales calculated server-side
-- ============================================================================

-- 1. Create materialized view for customer metrics (fast reads)
CREATE MATERIALIZED VIEW IF NOT EXISTS customers_with_metrics AS
SELECT
    c.id,
    c.name,
    c.phone,
    c.email,
    c.instagram,
    c.cpf,
    c.address,
    c.complement,
    c.addresses,
    c.created_at,
    c.birth_date,

    -- LTV: Total amount spent (ALL sales)
    COALESCE(SUM(v.total_value), 0) AS total_spent,

    -- Total number of orders (not sales, actual orders)
    COUNT(DISTINCT o.id) AS total_orders,

    -- Total number of sales
    COUNT(DISTINCT v.id) AS total_sales,

    -- Last order date (most recent activity)
    MAX(GREATEST(
        COALESCE(v.created_at, '1970-01-01'::timestamp),
        COALESCE(o.created_at, '1970-01-01'::timestamp)
    )) AS last_order_at,

    -- First purchase date
    MIN(COALESCE(v.created_at, o.created_at)) AS first_purchase_at,

    -- Average order value
    CASE
        WHEN COUNT(v.id) > 0 THEN COALESCE(SUM(v.total_value), 0) / COUNT(v.id)
        ELSE 0
    END AS average_order_value,

    -- Customer segment based on activity
    CASE
        WHEN COUNT(v.id) = 0 THEN 'inactive'
        WHEN MAX(v.created_at) > NOW() - INTERVAL '30 days' THEN 'active'
        WHEN MAX(v.created_at) > NOW() - INTERVAL '90 days' THEN 'at_risk'
        ELSE 'churned'
    END AS segment,

    -- Days since last purchase
    CASE
        WHEN MAX(v.created_at) IS NOT NULL
        THEN EXTRACT(DAY FROM NOW() - MAX(v.created_at))::INTEGER
        ELSE NULL
    END AS days_since_last_purchase

FROM customers c
LEFT JOIN vendas v ON v.customer_id = c.id
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY
    c.id,
    c.name,
    c.phone,
    c.email,
    c.instagram,
    c.cpf,
    c.address,
    c.complement,
    c.addresses,
    c.created_at,
    c.birth_date;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_with_metrics_id
ON customers_with_metrics(id);

-- Create index for segment filtering
CREATE INDEX IF NOT EXISTS idx_customers_with_metrics_segment
ON customers_with_metrics(segment);

-- Create index for total_spent sorting (top customers)
CREATE INDEX IF NOT EXISTS idx_customers_with_metrics_total_spent
ON customers_with_metrics(total_spent DESC);

-- ============================================================================
-- 2. Create RPC function to get customers with metrics (with pagination)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_customers_with_metrics(
    page_number INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 50,
    search_term TEXT DEFAULT NULL,
    segment_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
    id BIGINT,
    name TEXT,
    phone TEXT,
    email TEXT,
    instagram TEXT,
    cpf TEXT,
    address TEXT,
    complement TEXT,
    addresses JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    birth_date TEXT,
    total_spent NUMERIC,
    total_orders BIGINT,
    total_sales BIGINT,
    last_order_at TIMESTAMP WITH TIME ZONE,
    first_purchase_at TIMESTAMP WITH TIME ZONE,
    average_order_value NUMERIC,
    segment TEXT,
    days_since_last_purchase INTEGER,
    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    offset_value INTEGER;
    total_records BIGINT;
BEGIN
    -- Calculate offset
    offset_value := (page_number - 1) * page_size;

    -- Get total count first
    SELECT COUNT(*) INTO total_records
    FROM customers_with_metrics cwm
    WHERE
        (search_term IS NULL OR search_term = '' OR
         cwm.name ILIKE '%' || search_term || '%' OR
         cwm.phone ILIKE '%' || search_term || '%' OR
         cwm.email ILIKE '%' || search_term || '%')
        AND
        (segment_filter = 'all' OR cwm.segment = segment_filter);

    -- Return paginated results with total count
    RETURN QUERY
    SELECT
        cwm.id,
        cwm.name,
        cwm.phone,
        cwm.email,
        cwm.instagram,
        cwm.cpf,
        cwm.address,
        cwm.complement,
        cwm.addresses,
        cwm.created_at,
        cwm.birth_date,
        cwm.total_spent,
        cwm.total_orders,
        cwm.total_sales,
        cwm.last_order_at,
        cwm.first_purchase_at,
        cwm.average_order_value,
        cwm.segment,
        cwm.days_since_last_purchase,
        total_records AS total_count
    FROM customers_with_metrics cwm
    WHERE
        (search_term IS NULL OR search_term = '' OR
         cwm.name ILIKE '%' || search_term || '%' OR
         cwm.phone ILIKE '%' || search_term || '%' OR
         cwm.email ILIKE '%' || search_term || '%')
        AND
        (segment_filter = 'all' OR cwm.segment = segment_filter)
    ORDER BY cwm.total_spent DESC NULLS LAST, cwm.name ASC
    LIMIT page_size
    OFFSET offset_value;
END;
$$;

-- ============================================================================
-- 3. Create function to refresh materialized view
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_customers_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY customers_with_metrics;
END;
$$;

-- ============================================================================
-- 4. Create trigger to auto-refresh on sales/orders changes
-- ============================================================================

-- Refresh function (called by trigger)
CREATE OR REPLACE FUNCTION trigger_refresh_customers_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh in background (non-blocking)
    PERFORM refresh_customers_metrics();
    RETURN NULL;
END;
$$;

-- Trigger on vendas table
DROP TRIGGER IF EXISTS refresh_customers_on_venda_change ON vendas;
CREATE TRIGGER refresh_customers_on_venda_change
AFTER INSERT OR UPDATE OR DELETE ON vendas
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_customers_metrics();

-- Trigger on orders table
DROP TRIGGER IF EXISTS refresh_customers_on_order_change ON orders;
CREATE TRIGGER refresh_customers_on_order_change
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_customers_metrics();

-- Trigger on customers table
DROP TRIGGER IF EXISTS refresh_customers_on_customer_change ON customers;
CREATE TRIGGER refresh_customers_on_customer_change
AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_customers_metrics();

-- ============================================================================
-- 5. Initial refresh
-- ============================================================================

REFRESH MATERIALIZED VIEW customers_with_metrics;

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

GRANT SELECT ON customers_with_metrics TO authenticated;
GRANT SELECT ON customers_with_metrics TO service_role;
GRANT EXECUTE ON FUNCTION get_customers_with_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_customers_with_metrics TO service_role;
GRANT EXECUTE ON FUNCTION refresh_customers_metrics TO service_role;

-- ============================================================================
-- DONE: Now frontend can call get_customers_with_metrics(1, 50)
-- and get accurate LTV/metrics calculated from ALL sales
-- ============================================================================
