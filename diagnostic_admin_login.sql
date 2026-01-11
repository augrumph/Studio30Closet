-- ===================================================
-- DIAGNÓSTICO DO LOGIN ADMIN
-- Execute este script no SQL Editor do Supabase
-- ===================================================

-- 1. Verificar se a extensão pgcrypto está habilitada
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')
    THEN '✓ pgcrypto habilitada'
    ELSE '✗ pgcrypto NÃO habilitada - EXECUTE: CREATE EXTENSION pgcrypto;'
  END as status_pgcrypto;

-- 2. Verificar se a tabela admins existe
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins')
    THEN '✓ Tabela admins existe'
    ELSE '✗ Tabela admins NÃO existe'
  END as status_tabela;

-- 3. Listar todos os admins (SEM mostrar senha)
SELECT
  id,
  username,
  name,
  CASE
    WHEN password_hash IS NOT NULL AND password_hash != '' THEN '✓ Hash configurado'
    ELSE '✗ SEM hash'
  END as status_hash,
  created_at
FROM public.admins;

-- 4. Verificar se a função admin_login existe
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'admin_login'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    )
    THEN '✓ Função admin_login existe'
    ELSE '✗ Função admin_login NÃO existe'
  END as status_funcao;

-- 5. TESTE DIRETO - Tente criar um novo usuário de teste
DELETE FROM public.admins WHERE username = 'teste';

INSERT INTO public.admins (username, password_hash, name)
VALUES (
  'teste',
  crypt('senha123', gen_salt('bf')),
  'Usuário Teste'
);

-- 6. TESTE da função com usuário de teste
SELECT 'Testando login com usuário teste/senha123:' as teste;
SELECT * FROM admin_login('teste', 'senha123');
