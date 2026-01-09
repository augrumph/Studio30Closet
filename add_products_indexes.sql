-- Add indexes to improve products query performance and fix timeouts

-- Index for default ordering (Critical for getting latest products)
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);

-- Index for filtering by active status (almost always used)
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (active);

-- Index for filtering by stock (used for low stock alert)
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products (stock);

-- Composite index for common catalog queries (active + category + created_at)
CREATE INDEX IF NOT EXISTS idx_products_catalog_composite ON public.products (active, category, created_at DESC);
