-- ⚠️ SCRIPT PARA ZERAR MÉTRICAS (FRESH START)

-- 1. Limpar itens de pedidos e pedidos (Vendas)
TRUNCATE TABLE order_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE orders RESTART IDENTITY CASCADE;

-- 2. Limpar histórico de estoque (se quiser manter o estoque atual dos produtos, mas apagar o log de quem comprou)
TRUNCATE TABLE stock_movements RESTART IDENTITY CASCADE;

-- 3. Limpar Clientes (Opcional - Zerar base de contatos)
-- TRUNCATE TABLE customers RESTART IDENTITY CASCADE;

-- 4. Limpar Despesas (Financeiro)
-- TRUNCATE TABLE expenses RESTART IDENTITY CASCADE;

-- NOTA: Isso NÃO apaga os produtos (`products`). O catálogo permanece intacto.
