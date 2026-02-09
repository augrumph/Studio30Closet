# 🚀 Guia de Deploy - Studio30 Closet

## ⚠️ ERRO: "Expected a JavaScript module script but server responded with MIME type text/html"

Este erro acontece quando o servidor está retornando HTML para arquivos JavaScript. Siga os passos abaixo para resolver:

---

## 📋 Solução Rápida

### 1. **Rebuild do Projeto**

```bash
# Limpar build anterior
rm -rf dist

# Rebuild com configurações atualizadas
npm run build
```

### 2. **Configurar Servidor em Produção**

Escolha a configuração correta para seu servidor:

---

## 🔧 Configurações por Servidor

### **Se estiver usando Vercel:**

1. O arquivo `vercel.json` já está configurado ✅
2. Faça commit e push:
   ```bash
   git add vercel.json vite.config.js
   git commit -m "fix: configure vercel for SPA routing"
   git push
   ```
3. Vercel vai fazer redeploy automaticamente

---

### **Se estiver usando Netlify:**

1. O arquivo `netlify.toml` já está configurado ✅
2. Faça commit e push:
   ```bash
   git add netlify.toml vite.config.js
   git commit -m "fix: configure netlify for SPA routing"
   git push
   ```
3. Netlify vai fazer redeploy automaticamente

---

### **Se estiver usando Apache (cPanel, hosting tradicional):**

1. **Copie o arquivo `.htaccess` para o servidor:**
   ```bash
   # O arquivo está em public/.htaccess
   # Ele deve estar na pasta RAIZ do site (onde está o index.html)
   ```

2. **Upload via FTP/cPanel:**
   - Faça upload da pasta `dist/` para o servidor
   - Copie `public/.htaccess` para a raiz do site
   - A estrutura final deve ser:
     ```
     /public_html/
       ├── .htaccess  ← IMPORTANTE!
       ├── index.html
       ├── assets/
       │   ├── *.js
       │   ├── *.css
       │   └── ...
     ```

3. **Verificar módulos Apache:**
   - `mod_rewrite` precisa estar ativo
   - `mod_mime` precisa estar ativo
   - (Geralmente já estão ativos no cPanel)

---

### **Se estiver usando Nginx:**

1. **Copie a configuração do nginx.conf:**
   ```bash
   sudo nano /etc/nginx/sites-available/studio30closet.com.br
   ```

2. **Cole o conteúdo do arquivo `nginx.conf`** (já está pronto)

3. **Ative o site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/studio30closet.com.br /etc/nginx/sites-enabled/
   ```

4. **Teste e reinicie:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 🔍 Verificar se Funcionou

### 1. **Limpar Cache do Navegador**
   - Chrome: `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+Shift+Del` → Limpar cache
   - Safari: `Cmd+Option+E`

### 2. **Testar MIME Types**

Abra o console do navegador (F12) e execute:

```javascript
// Verificar se arquivos JS carregam corretamente
fetch('https://studio30closet.com.br/assets/index-DNusfbWD.js')
  .then(r => console.log('Content-Type:', r.headers.get('content-type')))

// Deve retornar: "application/javascript" ✅
// Se retornar "text/html" ❌ → Servidor ainda não configurado
```

### 3. **Verificar Rewrite Rules**

```bash
# Ver se .htaccess está funcionando (Apache)
curl -I https://studio30closet.com.br/qualquer-rota-invalida

# Deve retornar 200 e servir o index.html
```

---

## 🐛 Troubleshooting

### Problema: "Ainda dá erro depois do deploy"

**Causa:** Cache do CDN ou Cloudflare

**Solução:**
1. Se usar Cloudflare:
   - Vá em **Caching** → **Purge Everything**
   - Ou use URL específicas: `https://studio30closet.com.br/assets/*`

2. Se usar outro CDN:
   - Limpe o cache no painel do CDN
   - Ou adicione `?v=2` nos imports temporariamente

### Problema: ".htaccess não funciona"

**Causa:** `mod_rewrite` desativado

**Solução (cPanel):**
1. cPanel → **Select PHP Version** → **Switch to PHP Options**
2. Procure por "AllowOverride" → Deve estar "All"
3. Ou contate o suporte do hosting

### Problema: "Funciona em localhost mas não em produção"

**Causa:** Caminhos relativos/absolutos

**Solução:**
1. Verificar `vite.config.js`:
   ```javascript
   base: '/'  // ✅ Correto para domínio raiz
   ```

2. Se site está em subpasta (ex: `site.com/app`):
   ```javascript
   base: '/app/'
   ```

---

## ✅ Checklist de Deploy

- [ ] `npm run build` executado
- [ ] Arquivo de configuração criado (`.htaccess`, `vercel.json`, etc.)
- [ ] Upload da pasta `dist/` para servidor
- [ ] Configuração do servidor aplicada
- [ ] Cache do navegador limpo
- [ ] Cache do CDN limpo (se aplicável)
- [ ] Teste: abrir site e navegar entre páginas
- [ ] Teste: atualizar página em rota diferente de `/`
- [ ] Console do navegador SEM erros de MIME type

---

## 🚀 Deploy Automatizado (Recomendado)

### Opção 1: GitHub Actions

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - name: Deploy to Server
        uses: SamKirkland/FTP-Deploy-Action@4.3.0
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./dist/
```

### Opção 2: Vercel/Netlify (Mais Fácil)

1. Conecte seu repositório GitHub
2. Vercel/Netlify detecta Vite automaticamente
3. Deploy automático a cada push

---

## 📞 Suporte

Se o problema persistir:

1. Verifique logs do servidor: `tail -f /var/log/nginx/error.log`
2. Teste MIME types: `curl -I https://seu-site.com/assets/index-XXX.js`
3. Verifique módulos: `apache2ctl -M | grep rewrite`

---

## 🎯 Resumo do Problema

**O que estava acontecendo:**
- Servidor retornava `index.html` para requisições de arquivos `.js`
- Navegador esperava JavaScript mas recebia HTML
- Erro: "Expected JavaScript module but got text/html"

**Solução:**
- Configurar servidor para servir arquivos estáticos corretamente
- Implementar SPA fallback APENAS para rotas (não para assets)
- Forçar MIME types corretos para arquivos `.js` e `.css`

**Resultado:**
- ✅ Arquivos JavaScript carregam corretamente
- ✅ Rotas funcionam com browser back/forward
- ✅ Refresh em qualquer rota funciona
- ✅ SEO preservado com fallback para index.html
