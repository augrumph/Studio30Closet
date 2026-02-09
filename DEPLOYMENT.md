# 🚀 Guia de Deploy - Studio30

## Problema Identificado

Em produção (Railway), todas as páginas estavam retornando valores zerados e o erro:
```
Erro ao carregar produtos: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

### Causa Raiz

O backend Express não estava configurado para servir os arquivos estáticos do frontend em produção. Quando o frontend tentava acessar `/api/products`, estava recebendo o `index.html` (HTML) em vez da resposta JSON da API.

## Solução Implementada

### 1. **Server Express Configurado para Produção** (`server/index.js`)

Adicionado código para servir arquivos estáticos em produção:
```javascript
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '..', 'dist')

    // Servir arquivos estáticos
    app.use(express.static(distPath, {
        maxAge: '1y',
        etag: true,
        lastModified: true
    }))

    // SPA Fallback
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'))
    })
}
```

### 2. **Scripts de Produção** (`package.json`)

Adicionado scripts para deploy:
```json
{
  "scripts": {
    "start": "cd server && npm start",
    "postbuild": "cd server && npm install"
  }
}
```

### 3. **Configuração Railway** (`nixpacks.toml`)

Criado arquivo de configuração para Railway:
- Instala dependências da raiz e do servidor
- Builda o frontend com Vite
- Inicia o servidor Express com `NODE_ENV=production`

## Deploy na Railway

### Pré-requisitos
- Variáveis de ambiente configuradas:
  - `NODE_ENV=production`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Processo de Deploy
1. Railway detecta o `nixpacks.toml`
2. Instala dependências (`npm install` na raiz e em `server/`)
3. Builda o frontend (`npm run build` → cria pasta `dist/`)
4. Inicia o servidor (`npm start` → `cd server && npm start`)
5. O servidor Express:
   - Responde às rotas `/api/*` com JSON (backend)
   - Serve os arquivos estáticos de `dist/` (frontend)
   - Faz fallback para `index.html` para rotas SPA

## Testando Localmente a Build de Produção

```bash
# 1. Buildar o frontend
npm run build

# 2. Rodar o servidor em modo produção
NODE_ENV=production npm start

# 3. Acessar http://localhost:3001
```

## Estrutura do Projeto

```
studio30/
├── src/              # Frontend React
├── server/           # Backend Express
│   ├── routes/       # Rotas da API
│   └── index.js      # Servidor principal
├── dist/             # Frontend buildado (gerado por Vite)
├── package.json      # Scripts principais
└── nixpacks.toml     # Configuração Railway
```

## Ordem de Execução

### Desenvolvimento
```
npm run dev
  → concurrently "npm run server" "npm run client"
    → Backend: http://localhost:3001
    → Frontend: http://localhost:5173 (com proxy para :3001)
```

### Produção
```
npm run build (Railway)
  → Vite compila React → dist/

npm start (Railway)
  → Express em http://localhost:3001
    → Serve API em /api/*
    → Serve frontend em /*
```

## Checklist de Deploy

- [x] Server Express configurado para servir estáticos
- [x] Scripts de produção no package.json
- [x] nixpacks.toml criado
- [ ] Variáveis de ambiente configuradas na Railway
- [ ] Push para repositório Git
- [ ] Deploy automático na Railway

## Troubleshooting

### Problema: API retorna HTML em vez de JSON
**Solução**: Verificar se `NODE_ENV=production` está definido na Railway

### Problema: 404 nas rotas do React Router
**Solução**: O fallback `app.get('*')` no server/index.js resolve isso

### Problema: Assets não carregam
**Solução**: Verificar se a pasta `dist/` foi gerada corretamente pelo build

## Contato

Se houver problemas no deploy, verificar:
1. Logs da Railway
2. Variáveis de ambiente
3. Se o `dist/` foi gerado corretamente
