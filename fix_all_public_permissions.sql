-- ===================================================
-- CORRIGIR TODAS AS PERMISSÕES PÚBLICAS DO SISTEMA
-- Execute este script no SQL Editor do Supabase
-- ===================================================

BEGIN;

-- ==================== PRODUCTS ====================
-- Permitir leitura pública de produtos ativos

DROP POLICY IF EXISTS "Permitir leitura pública de produtos" ON public.products;
DROP POLICY IF EXISTS "Public can read products" ON public.products;
DROP POLICY IF EXISTS "Permitir leitura pública de produtos ativos" ON public.products;

CREATE POLICY "Public read active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (active = true);

GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;

-- ==================== ORDERS ====================
-- Usuários anônimos NÃO devem ler pedidos (segurança)
-- Apenas authenticated users podem ler seus próprios pedidos

DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;

-- Criar política: usuários autenticados leem apenas seus pedidos
-- (Se você usar Supabase Auth no futuro, descomentar abaixo)
-- CREATE POLICY "Users can read own orders"
-- ON public.orders
-- FOR SELECT
-- TO authenticated
-- USING (auth.uid() = user_id);

-- Por enquanto, sem acesso público a orders
REVOKE SELECT ON public.orders FROM anon;

-- ==================== CUSTOMERS ====================
-- Clientes NÃO devem ser públicos (dados sensíveis)

REVOKE SELECT ON public.customers FROM anon;

-- ==================== COUPONS ====================
-- Permitir leitura pública de cupons ativos

DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;

CREATE POLICY "Public read active coupons"
ON public.coupons
FOR SELECT
TO anon, authenticated
USING (
  active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (usage_limit IS NULL OR usage_count < usage_limit)
);

GRANT SELECT ON public.coupons TO anon;
GRANT SELECT ON public.coupons TO authenticated;

-- ==================== ADMINS ====================
-- Já configurado anteriormente
-- Manter SELECT para validação de sessão

GRANT SELECT ON public.admins TO anon;
GRANT SELECT ON public.admins TO authenticated;

COMMIT;

-- ===================================================
-- VERIFICAÇÃO FINAL
-- ===================================================

SELECT
  '✓ Políticas configuradas com sucesso!' as status;

-- Listar todas as políticas ativas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products', 'orders', 'customers', 'coupons', 'admins')
ORDER BY tablename, policyname;
