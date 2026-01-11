-- ===================================================
-- DIAGNÓSTICO DE PERMISSÕES - TABELA PRODUCTS
-- Execute este script para identificar o problema
-- ===================================================

-- 1. Verificar se a tabela products existe
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products')
    THEN '✓ Tabela products existe'
    ELSE '✗ Tabela products NÃO existe'
  END as status_tabela;

-- 2. Verificar RLS (Row Level Security)
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✓ RLS HABILITADO (políticas necessárias)'
    ELSE '✗ RLS DESABILITADO (acesso livre - não recomendado)'
  END as status_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'products';

-- 3. Listar políticas existentes
SELECT
  '=== POLÍTICAS EXISTENTES ===' as info;

SELECT
  policyname,
  permissive,
  roles,
  cmd as comando,
  CASE
    WHEN qual IS NOT NULL THEN 'Tem filtro USING'
    ELSE 'Sem filtro'
  END as filtro
FROM pg_policies
WHERE tablename = 'products';

-- 4. Verificar permissões de SELECT
SELECT
  '=== PERMISSÕES DE SELECT ===' as info;

SELECT
  grantee as role,
  privilege_type as permissao
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND privilege_type = 'SELECT';

-- 5. Contar produtos na tabela
SELECT
  '=== PRODUTOS NO BANCO ===' as info;

SELECT
  COUNT(*) as total_produtos,
  COUNT(*) FILTER (WHERE active = true) as produtos_ativos,
  COUNT(*) FILTER (WHERE active = false) as produtos_inativos
FROM public.products;

-- 6. Listar alguns produtos (teste de acesso)
SELECT
  '=== TESTE DE ACESSO (primeiros 3 produtos ativos) ===' as info;

SELECT
  id,
  name,
  price,
  category,
  stock,
  active,
  created_at
FROM public.products
WHERE active = true
ORDER BY created_at DESC
LIMIT 3;

-- 7. Verificar se há produtos SEM imagens (pode causar problemas no frontend)
SELECT
  '=== PRODUTOS SEM IMAGENS ===' as info;

SELECT
  COUNT(*) as produtos_sem_imagens
FROM public.products
WHERE active = true
  AND (images IS NULL OR images = '[]' OR images = '');

-- ===================================================
-- DIAGNÓSTICO FINAL
-- ===================================================

SELECT
  '📊 DIAGNÓSTICO COMPLETO' as titulo,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products')
    THEN 'Políticas RLS existem - verificar configuração acima'
    ELSE 'PROBLEMA: Nenhuma política RLS encontrada - produtos bloqueados!'
  END as resultado;
