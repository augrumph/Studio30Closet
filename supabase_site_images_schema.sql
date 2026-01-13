-- Tabela para armazenar URLs das imagens do site
CREATE TABLE IF NOT EXISTS site_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Home Page Images
  hero_logo TEXT,
  how_it_works_section_image TEXT,

  -- HowItWorks Page Images
  step_1_image TEXT,
  step_2_image TEXT,
  step_3_image TEXT,
  step_4_image TEXT,

  -- About Page Images
  about_hero_image TEXT,

  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,

  CONSTRAINT single_row CHECK (id = gen_random_uuid())
);

-- Criar bucket de storage para as imagens (se não existir)
-- Execute isso no painel do Supabase Storage ou via CLI
-- Bucket name: 'site-images'
-- Public: true

-- Índice para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_site_images_updated_at ON site_images(updated_at DESC);

-- Inserir linha inicial (se não existir)
INSERT INTO site_images (
  hero_logo,
  how_it_works_section_image,
  step_1_image,
  step_2_image,
  step_3_image,
  step_4_image,
  about_hero_image
)
SELECT
  '/marcacompleta.webp',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
  '/src/images/amor.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM site_images LIMIT 1);

-- Função para atualizar o timestamp automaticamente
CREATE OR REPLACE FUNCTION update_site_images_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp
DROP TRIGGER IF EXISTS site_images_update_timestamp ON site_images;
CREATE TRIGGER site_images_update_timestamp
  BEFORE UPDATE ON site_images
  FOR EACH ROW
  EXECUTE FUNCTION update_site_images_timestamp();

-- Comentários para documentação
COMMENT ON TABLE site_images IS 'Armazena URLs das imagens principais do site (Home, HowItWorks, About)';
COMMENT ON COLUMN site_images.hero_logo IS 'Logo principal na seção hero da homepage';
COMMENT ON COLUMN site_images.how_it_works_section_image IS 'Imagem da seção "Como Funciona" na homepage';
COMMENT ON COLUMN site_images.step_1_image IS 'Imagem do passo 1 (Monte sua Malinha)';
COMMENT ON COLUMN site_images.step_2_image IS 'Imagem do passo 2 (Receba com Carinho)';
COMMENT ON COLUMN site_images.step_3_image IS 'Imagem do passo 3 (Experimente em Casa)';
COMMENT ON COLUMN site_images.step_4_image IS 'Imagem do passo 4 (Devolva o Resto)';
COMMENT ON COLUMN site_images.about_hero_image IS 'Imagem hero da página Sobre Nós (foto dos sócios)';
