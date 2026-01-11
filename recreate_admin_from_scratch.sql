-- ===================================================
-- RECRIAR TUDO DO ZERO - ADMIN LOGIN
-- Execute este script se o diagnóstico falhar
-- ===================================================

-- 1. Limpar tudo
DROP FUNCTION IF EXISTS public.admin_login(text, text) CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;

-- 2. Habilitar pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Criar tabela admins
CREATE TABLE public.admins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Criar usuário admin
INSERT INTO public.admins (username, password_hash, name)
VALUES (
  'admin',
  crypt('admin123', gen_salt('bf')),
  'Administrador Principal'
);

-- 5. Verificar se foi criado
SELECT
  id,
  username,
  name,
  length(password_hash) as hash_length,
  created_at
FROM public.admins
WHERE username = 'admin';

-- 6. Criar função de login
CREATE OR REPLACE FUNCTION public.admin_login(
  p_username text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record record;
  password_matches boolean;
BEGIN
  -- Log para debug (remover em produção)
  RAISE NOTICE 'Tentando login para: %', p_username;

  -- Buscar admin
  SELECT
    id,
    username,
    name,
    password_hash
  INTO admin_record
  FROM admins
  WHERE username = p_username
  LIMIT 1;

  -- Verificar se encontrou
  IF NOT FOUND THEN
    RAISE NOTICE 'Usuário não encontrado: %', p_username;
    RAISE EXCEPTION 'Usuário ou senha inválidos';
  END IF;

  RAISE NOTICE 'Usuário encontrado, verificando senha...';

  -- Verificar senha
  IF admin_record.password_hash IS NULL OR admin_record.password_hash = '' THEN
    RAISE NOTICE 'Password hash vazio para usuário: %', p_username;
    RAISE EXCEPTION 'Admin sem senha configurada';
  END IF;

  -- Comparar senha
  password_matches := (crypt(p_password, admin_record.password_hash) = admin_record.password_hash);

  RAISE NOTICE 'Senha match: %', password_matches;

  IF NOT password_matches THEN
    RAISE EXCEPTION 'Usuário ou senha inválidos';
  END IF;

  RAISE NOTICE 'Login bem-sucedido para: %', p_username;

  -- Retornar dados
  RETURN json_build_object(
    'id', admin_record.id,
    'username', admin_record.username,
    'name', admin_record.name
  );
END;
$$;

-- 7. Dar permissões
GRANT EXECUTE ON FUNCTION public.admin_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_login(text, text) TO authenticated;

-- 8. RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin_login function" ON public.admins;
CREATE POLICY "Allow admin_login function" ON public.admins
  FOR SELECT
  USING (true);

-- 9. TESTE FINAL
SELECT 'TESTE - Chamando admin_login("admin", "admin123"):' as teste;
SELECT * FROM admin_login('admin', 'admin123');

SELECT '✓ SUCESSO! A função está funcionando!' as resultado;
