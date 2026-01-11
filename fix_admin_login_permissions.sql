-- 1. Habilitar extensão pgcrypto (necessária para crypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Remover função antiga (se existir)
DROP FUNCTION IF EXISTS public.admin_login(text, text);

-- 3. Criar função correta
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

  -- ⚠️ Comparação SEGURA
  IF admin_record.password_hash IS NULL THEN
    RAISE EXCEPTION 'Admin sem senha configurada';
  END IF;

  IF NOT crypt(p_password, admin_record.password_hash) = admin_record.password_hash THEN
    RAISE EXCEPTION 'Usuário ou senha inválidos';
  END IF;

  -- Retorno mínimo seguro
  RETURN json_build_object(
    'id', admin_record.id,
    'username', admin_record.username,
    'name', admin_record.name
  );
END;
$$;

-- 4. Permitir execução para anon (login público)
GRANT EXECUTE ON FUNCTION public.admin_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_login(text, text) TO authenticated;
