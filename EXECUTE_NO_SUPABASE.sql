-- =====================================================
-- COPIE E COLE ESTE SQL NO SUPABASE SQL EDITOR
-- =====================================================
-- 1. Vá em: https://app.supabase.com
-- 2. Clique no seu projeto
-- 3. No menu lateral, clique em "SQL Editor"
-- 4. Clique em "New query"
-- 5. Cole TODO este código
-- 6. Clique em "Run" ou pressione Ctrl+Enter
-- =====================================================

-- Passo 1: Criar a tabela
CREATE TABLE IF NOT EXISTS site_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_logo TEXT,
  how_it_works_section_image TEXT,
  step_1_image TEXT,
  step_2_image TEXT,
  step_3_image TEXT,
  step_4_image TEXT,
  about_hero_image TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Passo 2: Inserir dados iniciais
INSERT INTO site_images (
  hero_logo,
  how_it_works_section_image,
  step_1_image,
  step_2_image,
  step_3_image,
  step_4_image,
  about_hero_image
)
VALUES (
  '/marcacompleta.webp',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
  '/src/images/amor.jpeg'
)
ON CONFLICT DO NOTHING;

-- Passo 3: Criar função de atualização automática
CREATE OR REPLACE FUNCTION update_site_images_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Passo 4: Criar trigger
DROP TRIGGER IF EXISTS site_images_update_timestamp ON site_images;
CREATE TRIGGER site_images_update_timestamp
  BEFORE UPDATE ON site_images
  FOR EACH ROW
  EXECUTE FUNCTION update_site_images_timestamp();

-- Passo 5: Habilitar RLS (Row Level Security)
ALTER TABLE site_images ENABLE ROW LEVEL SECURITY;

-- Passo 6: Permitir leitura pública
DROP POLICY IF EXISTS "Public can view site images" ON site_images;
CREATE POLICY "Public can view site images"
ON site_images FOR SELECT
TO public
USING (true);

-- Passo 7: Permitir edição apenas para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can update site images" ON site_images;
CREATE POLICY "Authenticated users can update site images"
ON site_images FOR UPDATE
TO authenticated
USING (true);

-- Passo 8: Verificar se funcionou
SELECT * FROM site_images;

-- =====================================================
-- SE TUDO DEU CERTO, VOCÊ VERÁ UMA LINHA COM TODAS AS IMAGENS
-- =====================================================

-- =====================================================
-- DEPOIS DISSO, CRIE O BUCKET DE STORAGE:
-- =====================================================
-- 1. No menu lateral do Supabase, clique em "Storage"
-- 2. Clique em "Create a new bucket"
-- 3. Name: site-images
-- 4. Marque a opção "Public bucket"
-- 5. Clique em "Create bucket"
-- =====================================================
