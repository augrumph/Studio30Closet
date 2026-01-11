-- ============================================================
-- DASHBOARD FINAL MIGRATION (CORRECTED & OPTIMIZED)
-- ============================================================

-- 0. HELPER VIEW: PRODUCT STOCK (Dependency for other views)
-- Ensures 'real_stock' is available even if logic changes later.
-- Currently pointing to products.stock as per new architecture (single truth).
CREATE OR REPLACE VIEW public.product_stock_view AS
SELECT
    id AS product_id,
    stock AS real_stock
FROM public.products;


-- ============================================================
-- 1. KPI PRINCIPAL (Aggregated Financials)
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS dashboard_kpis_period;

CREATE MATERIALIZED VIEW dashboard_kpis_period AS
WITH
entries AS (
  SELECT
    created_at::date AS day,
    net_amount        AS amount
  FROM public.vendas
  WHERE payment_status = 'paid'

  UNION ALL

  SELECT
    payment_date::date AS day,
    payment_amount     AS amount
  FROM public.installment_payments
),
exits AS (
  SELECT
    created_at::date AS day,
    value             AS amount
  FROM public.purchases

  UNION ALL

  SELECT
    created_at::date AS day,
    value             AS amount
  FROM public.fixed_expenses
  WHERE is_paid = true
),
sales AS (
  SELECT
    created_at::date AS day,
    COUNT(id)         AS total_sales,
    SUM(total_value)  AS gross_revenue,
    SUM(net_amount)   AS net_revenue
  FROM public.vendas
  WHERE payment_status = 'paid'
  GROUP BY created_at::date
)

SELECT
  COALESCE(s.day, e.day, x.day) AS day,
  COALESCE(s.total_sales, 0) AS total_sales,
  COALESCE(s.gross_revenue, 0) AS gross_revenue,
  COALESCE(s.net_revenue, 0) AS net_revenue,
  CASE WHEN COALESCE(s.total_sales, 0) > 0
       THEN COALESCE(s.net_revenue, 0) / s.total_sales
       ELSE 0 END      AS average_ticket,
  COALESCE(SUM(e.amount),0) AS cash_in,
  COALESCE(SUM(x.amount),0) AS cash_out,
  (COALESCE(SUM(e.amount),0) - COALESCE(SUM(x.amount),0)) AS cash_balance
FROM sales s
FULL OUTER JOIN entries e ON e.day = s.day
FULL OUTER JOIN exits   x ON x.day = COALESCE(s.day, e.day)
GROUP BY 1, 2, 3, 4, 5;

CREATE INDEX IF NOT EXISTS idx_dashboard_kpis_period_day
ON dashboard_kpis_period (day);


-- ============================================================
-- 2. TENDÊNCIA DE VENDAS (GRÁFICO)
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS dashboard_sales_timeseries_daily;

CREATE MATERIALIZED VIEW dashboard_sales_timeseries_daily AS
SELECT
  created_at::date AS day,
  COUNT(*)         AS total_sales,
  SUM(total_value) AS gross_revenue,
  SUM(net_amount)  AS net_revenue
FROM public.vendas
WHERE payment_status = 'paid'
GROUP BY created_at::date
ORDER BY day;

CREATE INDEX IF NOT EXISTS idx_dashboard_sales_timeseries_day
ON dashboard_sales_timeseries_daily (day);


-- ============================================================
-- 3. AÇÕES DE ESTOQUE (INVENTORY ACTIONS)
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS dashboard_inventory_actions;

CREATE MATERIALIZED VIEW dashboard_inventory_actions AS
WITH sales_30d AS (
  SELECT
    product_id,
    SUM(quantity) AS sold_last_30d
  FROM public.stock_movements
  WHERE movement_type = 'venda'
    AND created_at >= now() - interval '30 days'
  GROUP BY product_id
)
SELECT
  p.id AS product_id,
  p.name,
  COALESCE(ps.real_stock, p.stock, 0) AS real_stock,
  COALESCE(s.sold_last_30d, 0) AS sold_last_30d,
  p.price,         -- REQUIRED BY FRONTEND
  p.cost_price,    -- REQUIRED BY FRONTEND 
  CASE
    WHEN COALESCE(s.sold_last_30d,0) >= 3 AND COALESCE(ps.real_stock, p.stock, 0) <= 2
      THEN 'repor_agora'
    WHEN COALESCE(s.sold_last_30d,0) = 0
         AND COALESCE(ps.real_stock, p.stock, 0) > 3
         AND p.created_at < now() - interval '45 days'
      THEN 'queimar_agora'
    WHEN COALESCE(s.sold_last_30d,0) >= 3 AND COALESCE(ps.real_stock, p.stock, 0) > 2
      THEN 'proteger_margem'
    ELSE 'ok'
  END AS action
FROM public.products p
LEFT JOIN product_stock_view ps ON ps.product_id = p.id
LEFT JOIN sales_30d s ON s.product_id = p.id
WHERE p.active = true;

CREATE INDEX IF NOT EXISTS idx_dashboard_inventory_actions_action
ON dashboard_inventory_actions (action);


-- ============================================================
-- 4. TOP CUSTOMERS RPC
-- ============================================================

DROP FUNCTION IF EXISTS public.get_top_customers;

CREATE OR REPLACE FUNCTION public.get_top_customers(
  start_date TIMESTAMPTZ,
  end_date   TIMESTAMPTZ
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  total_purchases BIGINT,
  total_spent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    COUNT(v.id)       AS total_purchases,
    SUM(v.net_amount) AS total_spent
  FROM public.vendas v
  JOIN public.customers c ON c.id = v.customer_id
  WHERE v.payment_status = 'paid'
    AND v.created_at BETWEEN start_date AND end_date
  GROUP BY c.id, c.name
  ORDER BY total_spent DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;
