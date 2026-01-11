-- ===================================================
-- SETUP COMPLETO DO LOGIN ADMIN
-- Execute este script no SQL Editor do Supabase
-- ===================================================

-- 1. Habilitar extensão pgcrypto (necessária para crypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Criar tabela admins (se não existir)
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Remover função antiga (se existir)
DROP FUNCTION IF EXISTS public.admin_login(text, text);

-- 4. Criar função de login
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
  admin_record admins;
BEGIN
  -- Buscar admin
  SELECT *
  INTO admin_record
  FROM admins
  WHERE username = p_username
  LIMIT 1;

  IF admin_record.id IS NULL THEN
    RAISE EXCEPTION 'Usuário ou senha inválidos';
  END IF;

  -- Verificar senha
  IF admin_record.password_hash IS NULL THEN
    RAISE EXCEPTION 'Admin sem senha configurada';
  END IF;

  IF NOT crypt(p_password, admin_record.password_hash) = admin_record.password_hash THEN
    RAISE EXCEPTION 'Usuário ou senha inválidos';
  END IF;

  -- Retorno seguro
  RETURN json_build_object(
    'id', admin_record.id,
    'username', admin_record.username,
    'name', admin_record.name
  );
END;
$$;

-- 5. Dar permissões
GRANT EXECUTE ON FUNCTION public.admin_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_login(text, text) TO authenticated;

-- 6. Habilitar RLS na tabela admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de segurança (apenas leitura para verificar login)
DROP POLICY IF EXISTS "Admins podem ler próprio registro" ON public.admins;
CREATE POLICY "Admins podem ler próprio registro" ON public.admins
  FOR SELECT
  USING (true); -- A função SECURITY DEFINER já controla o acesso

-- 8. Criar usuário admin padrão (se não existir)
-- Senha: admin123 (ALTERE APÓS O PRIMEIRO LOGIN!)
INSERT INTO public.admins (username, password_hash, name)
VALUES (
  'admin',
  crypt('admin123', gen_salt('bf')),
  'Administrador'
)
ON CONFLICT (username) DO NOTHING;

-- ===================================================
-- VERIFICAÇÃO
-- ===================================================
-- Teste a função com:
-- SELECT * FROM admin_login('admin', 'admin123');
