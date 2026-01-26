-- Add boolean flags for specific section management
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_catalog_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE;

-- Ensure existing flags exist (just in case)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT TRUE;

-- Update comments for clarity
COMMENT ON COLUMN products.is_featured IS 'Exibe na Home (Destaque Home - 4 itens)';
COMMENT ON COLUMN products.is_catalog_featured IS 'Exibe no topo do Catálogo (6 itens)';
COMMENT ON COLUMN products.is_best_seller IS 'Recebe badge MAIS VENDIDO (4 itens)';
COMMENT ON COLUMN products.is_new IS 'Recebe badge Novidade';

-- Optional: Create index for faster filtering if catalog grows large
CREATE INDEX IF NOT EXISTS idx_products_catalog_featured ON products(is_catalog_featured) WHERE is_catalog_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_best_seller ON products(is_best_seller) WHERE is_best_seller = TRUE;
