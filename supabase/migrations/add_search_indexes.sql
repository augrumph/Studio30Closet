-- =====================================================
-- OTIMIZAÇÃO DE BUSCA - ÍNDICES PARA PRODUTOS
-- =====================================================
-- Este script adiciona índices otimizados para acelerar
-- as buscas de produtos por nome, categoria e ID
-- =====================================================

-- Índice para busca case-insensitive por nome
-- Usa LOWER() para permitir busca rápida sem case sensitivity
CREATE INDEX IF NOT EXISTS idx_products_name_lower
ON products (LOWER(name));

-- Índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_products_category
ON products (category);

-- Índice composto para filtrar por active + nome
-- Acelera queries que filtram produtos ativos e buscam por nome
CREATE INDEX IF NOT EXISTS idx_products_active_name
ON products (active, name);

-- Índice para busca por ID (já existe primary key, mas fica explícito)
-- Útil para buscas do tipo "produto #123"
CREATE INDEX IF NOT EXISTS idx_products_id
ON products (id);

-- Índice para ordenação por created_at
CREATE INDEX IF NOT EXISTS idx_products_created_at
ON products (created_at DESC);

-- Índice GIN para busca full-text em nome (PostgreSQL)
-- Permite busca muito rápida por palavras dentro do nome
CREATE INDEX IF NOT EXISTS idx_products_name_gin
ON products USING gin(to_tsvector('portuguese', name));

-- Comentários para documentação
COMMENT ON INDEX idx_products_name_lower IS 'Índice para busca case-insensitive por nome de produto';
COMMENT ON INDEX idx_products_category IS 'Índice para filtrar produtos por categoria';
COMMENT ON INDEX idx_products_active_name IS 'Índice composto para filtrar produtos ativos e buscar por nome';
COMMENT ON INDEX idx_products_name_gin IS 'Índice GIN para busca full-text em português no nome do produto';

-- =====================================================
-- ESTATÍSTICAS E ANÁLISE
-- =====================================================
-- Atualiza as estatísticas da tabela para o query planner
ANALYZE products;

-- Para verificar se os índices foram criados:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'products';
