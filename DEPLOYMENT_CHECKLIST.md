# 🚀 Deployment Checklist - Studio 30 Refactoring

## ✅ Tudo Já Foi Executado!

### Backend (Supabase) - ✅ COMPLETO
- [x] Migration `customers_with_metrics` aplicada
- [x] RPC `get_customers_with_metrics` criado
- [x] Triggers auto-refresh configurados
- [x] Permissions granted
- [x] Testado via curl - **FUNCIONANDO**

### Frontend (React) - ✅ COMPLETO  
- [x] React Query instalado e configurado
- [x] API `getCustomersWithMetrics()` criada
- [x] Hook `useCustomersWithMetrics` criado
- [x] CustomersList refatorado e ativado
- [x] Backup da versão antiga mantido

---

## 🧪 Testar Agora

```bash
npm run dev
```

Acesse: http://localhost:5173/admin/customers

### ✅ O que esperar:
1. Lista de clientes carregando
2. LTV mostrando valores reais (calculados de TODAS as vendas)
3. Segmentos: Ativo, Em Risco, Inativo, Sem Compras
4. Busca funcionando
5. Paginação suave
6. "✅ Calculado com TODAS as vendas" aparecendo no card LTV Médio

---

## 🔍 Como Validar os Dados

### Teste 1: Verificar LTV de um cliente
1. Abra /admin/customers
2. Veja o LTV do primeiro cliente (ex: Emilly: R$ 474,70)
3. Abra /admin/vendas
4. Filtre vendas por "Emilly"
5. Some manualmente os valores das vendas
6. **O total deve bater com o LTV!**

### Teste 2: Verificar Segmentos
- **Ativo**: Cliente com compra nos últimos 30 dias (badge verde)
- **Em Risco**: Compra entre 30-90 dias (badge amarelo)  
- **Inativo**: Compra há mais de 90 dias (badge vermelho)
- **Sem Compras**: Nunca comprou (badge cinza)

### Teste 3: Verificar Performance
1. Abra DevTools > Network
2. Acesse /admin/customers
3. Veja a chamada para `get_customers_with_metrics`
4. Deve retornar em < 500ms
5. Navegue entre páginas - deve usar cache

---

## 🐛 Se Algo Der Errado

### Erro: "customers_with_metrics não existe"
```bash
supabase db push
```

### Erro: "Cannot find module @tanstack/react-query"
```bash
npm install @tanstack/react-query
```

### Erro: "LTV ainda mostrando R$ 0,00"
1. Abra console do navegador
2. Verifique se há erro na chamada RPC
3. Refresh forçado (Ctrl+Shift+R)
4. Clear cache do React Query

### Rollback (se necessário)
```bash
mv src/pages/admin/CustomersList.jsx src/pages/admin/CustomersListNEW.jsx
mv src/pages/admin/CustomersListOLD.jsx src/pages/admin/CustomersList.jsx
```

---

## 📊 Métricas de Sucesso

Após testar, confirme:
- [ ] LTV está correto (bate com soma manual de vendas)
- [ ] Segmentação está funcionando
- [ ] Busca está funcionando
- [ ] Paginação está suave
- [ ] Não há erros no console

---

## 🎯 Próxima Sprint

Se tudo estiver funcionando:
1. Criar insights ativos da Midi
2. Migrar outras telas para React Query
3. Remover código legado

---

**Status:** ✅ PRONTO PARA TESTE
**Responsável:** Augusto
**Data:** 12/01/2026
