# 📸 Gerenciador de Imagens - Studio 30 Closet

## 🎯 O que é?

Sistema completo para gerenciar todas as imagens das páginas principais do site (Home, Como Funciona, Sobre Nós) diretamente pelo painel admin, sem precisar editar código.

## ✨ Recursos

- ✅ **Preview em Tempo Real** - Veja a imagem atual antes de trocar
- ✅ **Comparação Lado a Lado** - Compare a imagem atual com a nova antes de confirmar
- ✅ **Confirmação Segura** - Botão de lixeira para confirmar substituição
- ✅ **Duas Formas de Upload** - Arquivo local OU URL externa
- ✅ **Feedback Visual** - Animações e confirmações de sucesso
- ✅ **100% Responsivo** - Funciona em desktop e mobile
- ✅ **Armazenamento em Nuvem** - Imagens ficam no Supabase Storage

## 🚀 Setup Rápido

1. **Configure o Supabase** (só 1 vez)
   - Abra `SETUP_SITE_IMAGES.md`
   - Execute os 4 SQLs no Supabase Dashboard
   - Crie o bucket `site-images` no Storage
   - Pronto!

2. **Use o Sistema**
   - Faça login no admin
   - Clique no botão "IMAGENS" (topo da página)
   - Escolha a aba e troque a imagem

## 📸 Imagens Gerenciáveis

### Home
- Logo Hero Principal
- Imagem da Seção "Como Funciona"

### Como Funciona
- Passo 1 - Monte sua Malinha
- Passo 2 - Receba com Carinho
- Passo 3 - Experimente em Casa
- Passo 4 - Devolva o Resto

### Sobre Nós
- Foto Hero (Thais & Augusto)

## 🎨 Como Funciona?

### 1️⃣ Ver Preview Atual
Cada imagem mostra um preview com badge "ATUAL"

### 2️⃣ Selecionar Nova Imagem
- **Upload:** Clique e selecione arquivo (PNG/JPG/WebP, máx 5MB)
- **URL:** Cole link de imagem externa

### 3️⃣ Comparar Antes e Depois
Veja lado a lado:
- **ATUAL** (esquerda, borda cinza)
- **NOVA** (direita, borda verde)

### 4️⃣ Confirmar ou Cancelar
- ✅ **Confirmar Substituição** (botão vermelho com lixeira)
- ❌ **Cancelar** (botão X)

### 5️⃣ Sucesso!
Imagem atualizada com feedback visual ✨

## 🛠️ Arquivos Criados

```
src/
├── hooks/
│   └── useSiteImages.js                    # Hook de gerenciamento
├── contexts/
│   └── SiteImagesContext.jsx               # Contexto global
├── components/
│   └── admin/
│       └── SiteImagesManager.jsx           # Modal premium
├── lib/
│   └── supabase-site-images-setup.js       # Setup automático
└── pages/
    ├── Home.jsx                            # Atualizada
    ├── HowItWorks.jsx                      # Atualizada
    └── About.jsx                           # Atualizada

Documentação:
├── SETUP_SITE_IMAGES.md                    # Guia completo
└── README_GERENCIADOR_IMAGENS.md           # Este arquivo
```

## 💡 Dicas

- Imagens são salvas no Supabase CDN (rápido e seguro)
- Mudanças aparecem instantaneamente no site
- Máximo 5MB por imagem (recomendado)
- Use WebP para melhor performance
- Se algo der errado, o site usa imagens de fallback automaticamente

## 🐛 Problemas?

**Erro ao fazer upload?**
- Verifique se o bucket `site-images` existe e é público
- Confirme as políticas de acesso no Supabase

**Tabela não existe?**
- Execute o SQL do `SETUP_SITE_IMAGES.md` novamente

**Imagens não aparecem?**
- Limpe cache do navegador (Ctrl+Shift+R)
- Verifique as URLs no banco de dados

---

**Desenvolvido com:**
- React + Vite
- Supabase (Database + Storage)
- shadcn/ui + Magic UI
- Framer Motion (animações)
