# 📧 Configuração de Email - Studio 30 Closet

## Status Atual
✅ Sistema de envio de email **instalado e funcionando**
⚠️ Falta apenas configurar a senha de aplicativo do Gmail

---

## O que foi implementado?

1. **Servidor de Email (Nodemailer)** - Instalado no backend
2. **Envio Automático** - Quando um cliente finaliza uma malinha, você recebe um email automaticamente em `studio30closet@gmail.com`
3. **Email Bonito** - O email vem formatado com HTML, cores e todas as informações da malinha
4. **Sistema Robusto** - Não bloqueia o checkout, mesmo se falhar

---

## 🔧 Como Configurar (3 minutos)

### Passo 1: Gerar Senha de Aplicativo do Gmail

1. Acesse: https://myaccount.google.com/security
2. Certifique-se que a **verificação em duas etapas** está ativada
3. Acesse: https://myaccount.google.com/apppasswords
4. Selecione:
   - **App:** Mail
   - **Dispositivo:** Outro (digite "Studio30 Server")
5. Clique em **Gerar**
6. **Copie a senha de 16 caracteres** (será algo como: `abcd efgh ijkl mnop`)

### Passo 2: Adicionar no Servidor

1. Abra o arquivo: `server/.env`
2. Substitua `your_app_password_here` pela senha que você copiou
3. **IMPORTANTE:** Cole sem espaços (exemplo: `abcdefghijklmnop`)

Exemplo:
```env
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

### Passo 3: Testar

Execute o comando:
```bash
node test-email-server.js
```

Se aparecer ✅ **SUCESSO! Email enviado com sucesso!**, está tudo funcionando!

---

## 🧪 Como Testar no Site

1. Inicie o servidor: `npm run dev`
2. Acesse o site: http://localhost:5173
3. Adicione produtos à malinha
4. Finalize o checkout preenchendo todos os dados
5. Você receberá um email em `studio30closet@gmail.com`

---

## 📧 Como funciona?

Quando um cliente finaliza uma malinha:

1. O sistema salva o pedido no banco de dados
2. **Automaticamente** envia um email para você com:
   - Nome do cliente
   - Email do cliente
   - Quantidade de peças
   - Link direto para ver a malinha no admin
3. O cliente é redirecionado para o WhatsApp (como antes)

---

## ⚠️ Problemas Comuns

### "Invalid login" ou "Username and Password not accepted"
- A senha de aplicativo não foi configurada corretamente
- Verifique se copiou a senha completa (16 caracteres)
- Verifique se não tem espaços na senha

### "Missing credentials"
- O arquivo `.env` não existe ou está vazio
- Certifique-se que o arquivo está em `server/.env`

### Email não chega
- Verifique a pasta de SPAM
- Aguarde até 2 minutos (pode demorar um pouco)
- Execute o teste: `node test-email-server.js`

---

## 🔐 Segurança

- A senha de aplicativo está segura no arquivo `.env`
- O arquivo `.env` não é enviado para o GitHub (está no `.gitignore`)
- Você pode revogar a senha a qualquer momento em: https://myaccount.google.com/apppasswords

---

## 💡 Dúvidas?

Se tiver algum problema, execute o teste e me envie o resultado:
```bash
node test-email-server.js
```
