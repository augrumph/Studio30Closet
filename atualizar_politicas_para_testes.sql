-- Script para atualizar temporariamente as políticas de segurança para testes
-- Execute este script no painel SQL do Supabase para permitir testes completos

-- Primeiro, vamos DROP as políticas existentes
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
DROP POLICY IF EXISTS "Public can read payment fees" ON payment_fees;
DROP POLICY IF EXISTS "Admin can do all on payment_fees" ON payment_fees;

-- Agora, criar novas políticas que permitem operações com anon key para testes
-- Products - leitura pública, escrita com anon key
CREATE POLICY "Public can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Anonymous can manage products" ON products FOR ALL USING (true) WITH CHECK (true);

-- Customers - todas as operações com anon key para testes
CREATE POLICY "Anonymous can manage customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- Orders - todas as operações com anon key para testes
CREATE POLICY "Anonymous can manage orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Order items - todas as operações com anon key para testes
CREATE POLICY "Anonymous can manage order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- Vendas - todas as operações com anon key para testes
CREATE POLICY "Anonymous can manage vendas" ON vendas FOR ALL USING (true) WITH CHECK (true);

-- Coupons - todas as operações com anon key para testes
CREATE POLICY "Anonymous can manage coupons" ON coupons FOR ALL USING (true) WITH CHECK (true);

-- Settings - leitura pública, escrita com anon key
CREATE POLICY "Public can read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Anonymous can manage settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Suppliers - todas as operações com anon key para testes
CREATE POLICY "Anonymous can manage suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- Purchases - todas as operações com anon key para testes
CREATE POLICY "Anonymous can manage purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);

-- Fixed expenses - todas as operações com anon key para testes
CREATE POLICY "Anonymous can manage fixed_expenses" ON fixed_expenses FOR ALL USING (true) WITH CHECK (true);

-- Materials stock - todas as operações com anon key para testes
CREATE POLICY "Anonymous can manage materials_stock" ON materials_stock FOR ALL USING (true) WITH CHECK (true);

-- Payment fees - leitura pública, escrita com anon key
CREATE POLICY "Public can read payment_fees" ON payment_fees FOR SELECT USING (true);
CREATE POLICY "Anonymous can manage payment_fees" ON payment_fees FOR ALL USING (true) WITH CHECK (true);

-- Após os testes, lembre-se de reverter para políticas seguras de produção!