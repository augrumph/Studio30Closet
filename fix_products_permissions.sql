-- ===================================================
-- CORRIGIR PERMISSÕES DE LEITURA DA TABELA PRODUCTS
-- Execute este script no SQL Editor do Supabase
-- ===================================================

-- 1. Verificar se RLS está habilitado (esperado: true)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'products';

-- 2. Remover políticas antigas que podem estar bloqueando
DROP POLICY IF EXISTS "Permitir leitura pública de produtos" ON public.products;
DROP POLICY IF EXISTS "Public can read products" ON public.products;
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;

-- 3. Criar política de leitura pública para produtos
CREATE POLICY "Permitir leitura pública de produtos ativos"
ON public.products
FOR SELECT
TO anon, authenticated
USING (active = true);

-- 4. Garantir permissões de SELECT na tabela
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;

-- 5. Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'products';

-- ===================================================
-- TESTE RÁPIDO
-- ===================================================
-- Simular uma query como o frontend faz (deve retornar produtos)
SELECT id, name, price, images, category, stock, active
FROM public.products
WHERE active = true
LIMIT 5;
