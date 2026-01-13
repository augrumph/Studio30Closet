# 📸 Setup - Gerenciador de Imagens do Site

Este sistema permite que você gerencie todas as imagens das páginas principais (Home, Como Funciona, Sobre Nós) diretamente pelo painel admin.

## 🚀 Como Configurar (Execute apenas UMA vez)

### Passo 1: Criar a Tabela no Supabase

Acesse o [Supabase Dashboard](https://app.supabase.com) e execute o seguinte SQL:

```sql
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
  updated_by TEXT
);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_site_images_updated_at ON site_images(updated_at DESC);

-- Inserir registro inicial
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

-- Função para atualizar timestamp automaticamente
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
```

### Passo 2: Criar o Bucket de Storage

1. No Supabase Dashboard, vá em **Storage**
2. Clique em **New bucket**
3. Configure:
   - **Name:** `site-images`
   - **Public:** ✅ Marque como público
   - **File size limit:** 5 MB (recomendado)
   - **Allowed MIME types:** `image/*`
4. Clique em **Create bucket**

### Passo 3: Configurar Políticas de Acesso (RLS)

Execute no SQL Editor do Supabase:

```sql
-- Permitir leitura pública das imagens
CREATE POLICY "Public can view site images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'site-images');

-- Permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload site images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-images');

-- Permitir update apenas para usuários autenticados
CREATE POLICY "Authenticated users can update site images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'site-images');

-- Permitir delete apenas para usuários autenticados
CREATE POLICY "Authenticated users can delete site images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site-images');
```

### Passo 4: Configurar Permissões da Tabela

```sql
-- Permitir leitura pública
ALTER TABLE site_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view site images"
ON site_images FOR SELECT
TO public
USING (true);

-- Permitir edição apenas para usuários autenticados
CREATE POLICY "Authenticated users can update site images"
ON site_images FOR UPDATE
TO authenticated
USING (true);
```

## ✅ Pronto! Agora você pode usar

### Como Acessar

1. Faça login no admin: `/admin/login`
2. Clique no botão **"Imagens"** no topo da página (ícone de foto)
3. Escolha a aba da página que deseja atualizar (Home, Como Funciona, Sobre Nós)

### Como Trocar uma Imagem

#### Passo 1: Ver Preview Atual
Cada card mostra a imagem atual com um badge "ATUAL" no canto superior esquerdo

#### Passo 2: Selecionar Nova Imagem
Escolha o método de upload:
- **Upload Arquivo:** Clique na área de upload e selecione um arquivo (PNG, JPG, WebP - máx 5MB)
- **URL Externa:** Cole a URL de uma imagem hospedada externamente

#### Passo 3: Visualizar Comparação
Após selecionar, você verá uma comparação lado a lado:
- **Esquerda:** Imagem ATUAL (com borda cinza)
- **Direita:** Imagem NOVA (com borda verde e badge "NOVA")

#### Passo 4: Confirmar Substituição
- Clique em **"Confirmar Substituição"** (botão vermelho com ícone de lixeira) para trocar
- OU clique no **X** para cancelar e manter a imagem atual

#### Passo 5: Sucesso!
Após confirmar, a imagem será atualizada e você verá um feedback de sucesso ✅

### Imagens Gerenciáveis

#### Home
- Logo Hero
- Seção Como Funciona

#### Como Funciona
- Passo 1 - Monte sua Malinha
- Passo 2 - Receba com Carinho
- Passo 3 - Experimente em Casa
- Passo 4 - Devolva o Resto

#### Sobre Nós
- Hero Sobre Nós (foto dos sócios)

## 🔧 Arquivos Criados

- `src/hooks/useSiteImages.js` - Hook para gerenciar imagens
- `src/contexts/SiteImagesContext.jsx` - Contexto global
- `src/components/admin/SiteImagesManager.jsx` - Modal de gerenciamento
- `src/lib/supabase-site-images-setup.js` - Setup automático
- `supabase_site_images_schema.sql` - Schema SQL

## 📝 Notas

- As alterações são instantâneas no site
- Imagens ficam armazenadas no Supabase Storage
- Limite de 5MB por imagem (recomendado)
- Formatos aceitos: PNG, JPG, WebP
- Se algo der errado, as páginas usarão imagens de fallback automaticamente

## 🐛 Resolução de Problemas

**Erro ao fazer upload?**
- Verifique se o bucket `site-images` existe e é público
- Confirme que as políticas de acesso estão configuradas
- Verifique se o arquivo tem menos de 5MB

**Tabela não existe?**
- Execute o SQL do Passo 1 novamente

**Imagens não aparecem?**
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique se a URL está correta no banco de dados
