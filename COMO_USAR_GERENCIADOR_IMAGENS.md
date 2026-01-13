# 🚀 GUIA RÁPIDO - Gerenciador de Imagens

## ✅ ESTÁ PRONTO E FUNCIONANDO!

Todo o sistema foi configurado automaticamente. Você só precisa seguir estes passos:

---

## 📱 PASSO A PASSO

### 1️⃣ Fazer Login no Admin
```
1. Acesse: /admin/login
2. Digite suas credenciais
3. Clique em "Entrar"
```

### 2️⃣ Abrir o Gerenciador
```
1. Você verá um botão "IMAGENS" no topo da página (ícone de foto)
2. Clique nele
```

### 3️⃣ Configuração Automática (Primeira Vez)

**Se for a primeira vez**, você verá uma tela amarela:

```
┌─────────────────────────────────────────┐
│  ⚠️  Primeira vez aqui?                 │
│  Configure o sistema automaticamente    │
│  com um clique!                          │
│                                          │
│  [ Configurar Sistema Automaticamente ] │
└─────────────────────────────────────────┘
```

**Clique no botão grande**. O sistema vai:
- ✅ Criar a tabela no Supabase
- ✅ Inserir imagens padrão
- ✅ Tentar criar o bucket de storage
- ✅ Verificar se tudo está OK

**IMPORTANTE:** Se aparecer erro sobre o bucket:
1. Vá em https://app.supabase.com
2. Clique no seu projeto
3. Vá em "Storage" no menu lateral
4. Clique em "Create bucket"
5. Nome: `site-images`
6. Marque "Public bucket"
7. Clique em "Create"

### 4️⃣ Trocar uma Imagem

Agora você verá 3 abas: **Home**, **Como Funciona**, **Sobre Nós**

**Para trocar uma imagem:**

1. **Escolha a aba** da página que quer editar

2. **Veja o preview atual** - Cada card mostra a imagem com badge "ATUAL"

3. **Selecione nova imagem:**
   - **Aba "Arquivo":** Clique na área tracejada e escolha um arquivo do seu PC
   - **Aba "URL":** Cole o link de uma imagem externa

4. **Compare Antes e Depois:**
   ```
   ┌─────────────┬─────────────┐
   │    ATUAL    │    NOVA     │
   │ (borda      │ (borda      │
   │  cinza)     │  verde)     │
   └─────────────┴─────────────┘
   ```

5. **Confirme ou Cancele:**
   - **"Confirmar Substituição"** (botão vermelho com lixeira) = TROCAR
   - **"X"** ou **"Cancelar"** = MANTER A ATUAL

6. **Pronto!** Você verá ✅ "Atualizado!" e a nova imagem já estará no site

---

## 📸 Imagens que Você Pode Trocar

### 🏠 Home (2 imagens)
- Logo Hero Principal
- Imagem da Seção "Como Funciona"

### 🚀 Como Funciona (4 imagens)
- Passo 1 - Monte sua Malinha
- Passo 2 - Receba com Carinho
- Passo 3 - Experimente em Casa
- Passo 4 - Devolva o Resto

### ℹ️ Sobre Nós (1 imagem)
- Foto Hero (Thais & Augusto)

---

## 💡 Dicas

✅ **Formatos aceitos:** PNG, JPG, WebP
✅ **Tamanho máximo:** 5MB por imagem
✅ **Mudanças instantâneas:** Aparecem imediatamente no site
✅ **Armazenamento:** Imagens ficam no Supabase CDN (rápido e seguro)
✅ **Responsivo:** Funciona perfeito em mobile e desktop

---

## ❓ Problemas Comuns

### "Nenhum dado encontrado"
**Solução:** Clique em "Configurar Sistema Automaticamente"

### Erro ao fazer upload
**Solução:**
1. Verifique se a imagem tem menos de 5MB
2. Verifique se é PNG, JPG ou WebP
3. Se o erro persistir, crie o bucket manualmente (veja Passo 3)

### Imagens não aparecem no site
**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Verifique se a URL da imagem está correta
3. Aguarde alguns segundos (pode demorar um pouquinho)

---

## 🎉 Pronto!

Agora você pode trocar as imagens do site quando quiser, sem precisar mexer em código!

**Qualquer dúvida?** Todos os detalhes técnicos estão em:
- `SETUP_SITE_IMAGES.md` (configuração avançada)
- `README_GERENCIADOR_IMAGENS.md` (visão geral do sistema)
