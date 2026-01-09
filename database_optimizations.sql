-- ============================================================================
-- SCRIPT DE OTIMIZAÇÃO DE BANCO DE DADOS - STUDIO 30 CLOSET
-- ============================================================================
-- Este script adiciona índices, extensões e gatilhos para melhorar a performance
-- e a manutenção do banco de dados no Supabase.

-- 1. HABILITAR EXTENSÕES ÚTEIS
-- pg_trgm: Essencial para buscas de texto rápidas (LIKE/ILIKE) em nomes e descrições
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. ÍNDICES DE PERFORMANCE (VELOCIDADE DE CONSULTA)
-- Índices aceleram filtros (WHERE) e ordenações (ORDER BY).

-- --- Tabela PRODUCTS --- (A mais crítica)
-- Acelera o catálogo (ordenação por mais recentes)
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);
-- Acelera filtros por categoria
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
-- Acelera filtro de produtos ativos
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (active);
-- Acelera alertas de estoque (filtro stock <= X)
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products (stock);
-- Índice composto para a Home/Catálogo (busca muito comum)
CREATE INDEX IF NOT EXISTS idx_products_catalog_composite ON public.products (active, category, created_at DESC);
-- Busca textual rápida no nome do produto (requer pg_trgm habilitado acima)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING GIN (name gin_trgm_ops);

-- --- Tabela CUSTOMERS ---
-- Acelera busca por telefone na venda/checkout
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
-- Acelera busca por nome de cliente
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON public.customers USING GIN (name gin_trgm_ops);

-- --- Tabela ORDERS ---
-- Acelera listar pedidos de um cliente
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
-- Acelera filtrar pedidos por status (dashboard admin)
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
-- Acelera listagem admin (mais recentes primeiro)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- --- Tabela ORDER_ITEMS ---
-- Acelera joins (trazer itens de um pedido)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
-- Acelera verificar vendas de um produto específico
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

-- --- Tabela VENDAS ---
-- Acelera relatórios de vendas
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON public.vendas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_customer_id ON public.vendas (customer_id);

-- 3. AUTOMAÇÃO DE MANUTENÇÃO (UPDATED_AT)
-- Cria uma função que atualiza automaticamente o campo 'updated_at'
-- sempre que uma linha for modificada.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplica a função nas tabelas que possuem a coluna updated_at

-- Products
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Installments
DROP TRIGGER IF EXISTS update_installments_updated_at ON public.installments;
CREATE TRIGGER update_installments_updated_at
    BEFORE UPDATE ON public.installments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Suppliers
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fixed Expenses
DROP TRIGGER IF EXISTS update_fixed_expenses_updated_at ON public.fixed_expenses;
CREATE TRIGGER update_fixed_expenses_updated_at
    BEFORE UPDATE ON public.fixed_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. MANUTENÇÃO IMEDIATA
-- Atualiza as estatísticas do banco para o planejador de query funcionar melhor agora.
VACUUM ANALYZE;
