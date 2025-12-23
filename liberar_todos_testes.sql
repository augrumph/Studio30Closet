-- Script definitivo para permitir todos os testes CRUD no Supabase
-- Executar no SQL Editor do painel do Supabase

-- Desabilitar temporariamente o Row Level Security para testes
ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE vendas FORCE ROW LEVEL SECURITY;
ALTER TABLE coupons FORCE ROW LEVEL SECURITY;
ALTER TABLE settings FORCE ROW LEVEL SECURITY;
ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE purchases FORCE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE materials_stock FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_fees FORCE ROW LEVEL SECURITY;

-- OU remover todas as políticas e permitir acesso total para testes
DROP POLICY IF EXISTS "Admin can do all on products" ON products;
DROP POLICY IF EXISTS "Public can read products" ON products;
DROP POLICY IF EXISTS "Admin can do all on customers" ON customers;
DROP POLICY IF EXISTS "Admin can do all on orders" ON orders;
DROP POLICY IF EXISTS "Admin can do all on order_items" ON order_items;
DROP POLICY IF EXISTS "Admin can do all on vendas" ON vendas;
DROP POLICY IF EXISTS "Admin can do all on coupons" ON coupons;
DROP POLICY IF EXISTS "Public can read settings" ON settings;
DROP POLICY IF EXISTS "Admin can do all on settings" ON settings;
DROP POLICY IF EXISTS "Admin can do all on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin can do all on purchases" ON purchases;
DROP POLICY IF EXISTS "Admin can do all on fixed_expenses" ON fixed_expenses;
DROP POLICY IF EXISTS "Admin can do all on materials_stock" ON materials_stock;
DROP POLICY IF EXISTS "Public can read payment_fees" ON payment_fees;
DROP POLICY IF EXISTS "Admin can do all on payment_fees" ON payment_fees;

-- Criar novas políticas que permitem tudo para testes
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vendas" ON vendas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on coupons" ON coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on fixed_expenses" ON fixed_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on materials_stock" ON materials_stock FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on payment_fees" ON payment_fees FOR ALL USING (true) WITH CHECK (true);

-- Conceder permissões diretas para o service_role e authenticated também
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;