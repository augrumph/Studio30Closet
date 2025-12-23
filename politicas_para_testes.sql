-- Correção de políticas de segurança para permitir testes com anon key
-- Este script deve ser executado com service role ou admin user

-- Para testes, vamos adicionar permissões para authenticated users nas tabelas que precisam de CRUD
-- Para as tabelas que devem manter as restrições originais, mantemos como estão

-- Atualizar as políticas para permitir testes (você pode reverter depois dos testes)
-- Policies para products - manter como está (já permite leitura pública)
-- CREATE POLICY "Admin can do all on products" ON products FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para customers - manter como está (admin only)
-- CREATE POLICY "Admin can do all on customers" ON customers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para orders - manter como está (admin only)
-- CREATE POLICY "Admin can do all on orders" ON orders FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para order_items - manter como está (admin only)
-- CREATE POLICY "Admin can do all on order_items" ON order_items FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para vendas - manter como está (admin only)
-- CREATE POLICY "Admin can do all on vendas" ON vendas FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para coupons - manter como está (admin only)
-- CREATE POLICY "Admin can do all on coupons" ON coupons FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para settings - manter como está (leitura pública, escrita admin)
-- CREATE POLICY "Public can read settings" ON settings FOR SELECT USING (true);
-- CREATE POLICY "Admin can do all on settings" ON settings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para suppliers - manter como está (admin only)
-- CREATE POLICY "Admin can do all on suppliers" ON suppliers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para purchases - manter como está (admin only)
-- CREATE POLICY "Admin can do all on purchases" ON purchases FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para fixed_expenses - manter como está (admin only)
-- CREATE POLICY "Admin can do all on fixed_expenses" ON fixed_expenses FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para materials_stock - manter como está (admin only)
-- CREATE POLICY "Admin can do all on materials_stock" ON materials_stock FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para payment_fees - manter como está (leitura pública, escrita admin)
-- CREATE POLICY "Public can read payment fees" ON payment_fees FOR SELECT USING (true);
-- CREATE POLICY "Admin can do all on payment_fees" ON payment_fees FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Para testes de integração, se necessário, você pode temporariamente dar permissões para testes:
-- GRANT ALL PRIVILEGES ON TABLE products TO authenticated;
-- GRANT ALL PRIVILEGES ON TABLE customers TO authenticated;
-- GRANT ALL PRIVILEGES ON TABLE orders TO authenticated;
-- GRANT ALL PRIVILEGES ON TABLE vendas TO authenticated;
-- GRANT ALL PRIVILEGES ON TABLE coupons TO authenticated;
-- GRANT ALL PRIVILEGES ON TABLE settings TO authenticated;
-- GRANT ALL PRIVILEGES ON TABLE suppliers TO authenticated;
-- GRANT ALL PRIVILEGES ON TABLE purchases TO authenticated;
-- GRANT ALL PRIVILEGES ON TABLE fixed_expenses TO authenticated;
-- GRANT ALL PRIVILEGES ON TABLE materials_stock TO authenticated;
-- GRANT ALL PRIVILEGES ON TABLE payment_fees TO authenticated;

-- OU criar políticas temporárias para testes (com base em condições específicas):
-- Exemplo: permitir testes apenas para registros com um campo especial:

-- Importante: As políticas atuais estão corretas para segurança em produção
-- Os testes falharam porque usam anon key, que não tem permissão para operações de escrita na maioria das tabelas
-- Isto é um comportamento esperado e seguro para um sistema de produção

-- Para testes mais completos, você precisaria:
-- 1. Autenticar um usuário no Supabase
-- 2. Usar a session key do usuário autenticado
-- 3. Ou usar service role key (mais arriscado, apenas para testes)