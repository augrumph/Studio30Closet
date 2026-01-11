BEGIN;

-- ============================================================
-- DASHBOARD KPIs - REGIME DE CAIXA (CORRETO)
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS dashboard_kpis_period;

CREATE MATERIALIZED VIEW dashboard_kpis_period AS
WITH days AS (
  SELECT day
  FROM generate_series(
    COALESCE(
      (SELECT MIN(created_at)::date FROM vendas),
      CURRENT_DATE
    ),
    CURRENT_DATE,
    '1 day'
  ) AS day
),

-- -----------------------
-- ENTRADAS DE CAIXA
-- -----------------------
cash_in AS (
  -- vendas pagas
  SELECT
    created_at::date AS day,
    SUM(net_amount) AS amount
  FROM vendas
  WHERE payment_status = 'paid'
  GROUP BY 1

  UNION ALL

  -- parcelas recebidas
  SELECT
    payment_date::date AS day,
    SUM(payment_amount) AS amount
  FROM installment_payments
  GROUP BY 1
),

-- -----------------------
-- SAÍDAS DE CAIXA
-- -----------------------
cash_out AS (
  -- compras (estoque)
  SELECT
    date::date AS day,
    SUM(value) AS amount
  FROM purchases
  GROUP BY 1

  UNION ALL

  -- despesas fixas pagas
  SELECT
    make_date(
      EXTRACT(YEAR FROM created_at)::int,
      EXTRACT(MONTH FROM created_at)::int,
      due_day
    ) AS day,
    SUM(value) AS amount
  FROM fixed_expenses
  WHERE paid = true
  GROUP BY 1
),

-- -----------------------
-- CONSOLIDAÇÃO DIÁRIA
-- -----------------------
daily_cash AS (
  SELECT
    d.day,
    COALESCE(SUM(ci.amount), 0) AS cash_in,
    COALESCE(SUM(co.amount), 0) AS cash_out
  FROM days d
  LEFT JOIN cash_in ci ON ci.day = d.day
  LEFT JOIN cash_out co ON co.day = d.day
  GROUP BY d.day
),

-- -----------------------
-- VENDAS (KPIs)
-- -----------------------
sales AS (
  SELECT
    created_at::date AS day,
    COUNT(id) AS total_sales,
    SUM(total_value) AS gross_revenue,
    SUM(net_amount) AS net_revenue
  FROM vendas
  WHERE payment_status = 'paid'
  GROUP BY 1
)

-- -----------------------
-- RESULTADO FINAL
-- -----------------------
SELECT
  dc.day,
  COALESCE(s.total_sales, 0) AS total_sales,
  COALESCE(s.gross_revenue, 0) AS gross_revenue,
  COALESCE(s.net_revenue, 0) AS net_revenue,
  COALESCE(dc.cash_in, 0) AS cash_in,
  COALESCE(dc.cash_out, 0) AS cash_out,
  SUM(dc.cash_in - dc.cash_out) OVER (ORDER BY dc.day) AS cash_balance
FROM daily_cash dc
LEFT JOIN sales s ON s.day = dc.day
ORDER BY dc.day;

CREATE INDEX IF NOT EXISTS idx_dashboard_kpis_period_day
  ON dashboard_kpis_period(day);

REFRESH MATERIALIZED VIEW dashboard_kpis_period;

COMMIT;
