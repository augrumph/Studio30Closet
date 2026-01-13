-- Fix type mismatch in get_customers_with_metrics function
-- Problem: Some columns are VARCHAR but function returns TEXT

DROP FUNCTION IF EXISTS get_customers_with_metrics(INTEGER, INTEGER, TEXT, TEXT);

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
    email CHARACTER VARYING,
    instagram TEXT,
    cpf CHARACTER VARYING,
    address TEXT,
    complement TEXT,
    addresses JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    birth_date CHARACTER VARYING,
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
         COALESCE(cwm.email, '') ILIKE '%' || search_term || '%')
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
        cwm.birth_date::CHARACTER VARYING,
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
         COALESCE(cwm.email, '') ILIKE '%' || search_term || '%')
        AND
        (segment_filter = 'all' OR cwm.segment = segment_filter)
    ORDER BY cwm.total_spent DESC NULLS LAST, cwm.name ASC
    LIMIT page_size
    OFFSET offset_value;
END;
$$;

GRANT EXECUTE ON FUNCTION get_customers_with_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_customers_with_metrics TO service_role;
