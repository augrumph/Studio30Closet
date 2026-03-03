# 🔍 RELATÓRIO DE AUDITORIA - CÁLCULOS FINANCEIROS
**Data**: 2026-03-03
**Escopo**: Dashboard e Vendas - Backend e Frontend
**Status**: 🔴 **BUGS CRÍTICOS ENCONTRADOS**

---

## ❌ BUGS CRÍTICOS IDENTIFICADOS

### BUG #1: Inconsistência em `pendingCrediario`
**Arquivo**: `server/routes/dashboard.js:300`
**Severidade**: 🔴 ALTA
**Descrição**: O cálculo de `pendingCrediario` usa `totalValue` enquanto `receivedAmount` e `valorDevedores` usam `netAmount`.

```javascript
// LINHA 281: receivedAmount e valorDevedores usam netAmount
const net = Number(v.netAmount || (v.totalValue - v.feeAmount))

// LINHA 285: receivedAmount usa net
receivedAmount += net

// LINHA 297: valorDevedores usa net
valorDevedores += net

// LINHA 300: ❌ pendingCrediario usa totalValue (INCONSISTENTE!)
pendingCrediario += Number(v.totalValue || 0)
```

**Impacto**:
- `pendingCrediario` mostra valores MAIORES que o real (não deduz taxas)
- KPIs financeiros mostram números diferentes entre si
- Dashboard e Vendas podem mostrar valores conflitantes

**Solução**: Mudar linha 300 para usar `net` em vez de `totalValue`.

---

### BUG #2: Cálculo de `netAmount` com fallback incorreto
**Arquivo**: `server/routes/dashboard.js:281`
**Severidade**: 🟡 MÉDIA
**Descrição**: O fallback assume que `feeAmount` sempre está preenchido corretamente.

```javascript
const net = Number(v.netAmount || (v.totalValue - v.feeAmount))
```

**Problema**: Se `netAmount` for null/undefined E `feeAmount` for 0 (mesmo havendo taxa real), o cálculo fica errado.

**Cenários problemáticos**:
1. Vendas antigas que não têm `netAmount` preenchido
2. Vendas com cartão onde a taxa não foi calculada no momento da venda
3. Vendas editadas que perderam o campo `netAmount`

**Impacto**:
- `receivedAmount` pode estar inflado (mostrando mais dinheiro do que realmente entrou)
- Lucro líquido aparece maior do que o real

**Solução**: Melhorar a lógica de fallback ou garantir que `netAmount` seja sempre calculado.

---

### BUG #3: Taxa de Retenção de Malinha SEMPRE retorna 0
**Arquivo**: `server/routes/dashboard.js:367`
**Severidade**: 🔴 ALTA
**Descrição**: O retentionRate está hardcoded como 0.

```javascript
const retentionRate = 0 // Placeholder ou cálculo se ordersResult tiver items_count
```

**Impacto**:
- KPI "Taxa de Retenção" SEMPRE mostra 0%
- Métrica completamente inútil para tomada de decisão
- Frontend exibe informação incorreta

**Solução**: Implementar cálculo real:
```javascript
const retentionRate = totalItemsSentInMalinhas > 0
    ? (totalItemsSoldInMalinhas / totalItemsSentInMalinhas) * 100
    : 0
```

Mas precisa buscar dados da tabela `order_items` para calcular corretamente.

---

### BUG #4: Filtros de período podem não bater entre Frontend e Backend
**Arquivo**: `src/pages/admin/Dashboard.jsx:103-131`
**Severidade**: 🟡 MÉDIA
**Descrição**: Frontend faz filtragem LOCAL de vendas enquanto backend também filtra.

**Exemplo do problema**:
```javascript
// FRONTEND (Dashboard.jsx): Filtra vendas localmente
const filteredVendas = useMemo(() => {
    if (periodFilter === 'last7days') {
        const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return vendas.filter(v => new Date(v.createdAt) >= cutoff)
    }
}, [vendas, periodFilter])

// BACKEND (dashboard.js): Filtra com query SQL
if (period === 'last7days') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
}
```

**Problema**:
- Timezone differences podem causar discrepâncias
- Frontend usa `now.getTime()` no momento do cálculo
- Backend usa `new Date()` no momento da query
- Diferença de segundos/minutos pode excluir/incluir vendas diferentes

**Impacto**: KPIs podem não bater exatamente entre diferentes visualizações.

**Solução**: Backend deve ser a única fonte de verdade. Frontend não deve filtrar novamente.

---

### BUG #5: `itemsPerSale` não está sendo calculado
**Arquivo**: `server/routes/dashboard.js:414`
**Severidade**: 🟡 MÉDIA
**Descrição**: O backend retorna `itemsPerSale` mas não está calculando.

```javascript
operational: {
    totalSalesCount: salesToProcess.length,
    totalItemsSold,
    averageTicket: salesToProcess.length > 0 ? netRevenue / salesToProcess.length : 0,
    itemsPerSale: salesToProcess.length > 0 ? totalItemsSold / salesToProcess.length : 0, // ✅ ESTÁ CALCULANDO!
    totalDevedores,
    costWarnings,
    // ...
}
```

**CORREÇÃO**: Após revisão, este cálculo ESTÁ correto! Não é um bug.

---

## ⚠️ PROBLEMAS DE ARQUITETURA

### PROBLEMA #1: Múltiplas Fontes de Verdade
**Severidade**: 🟡 MÉDIA
**Descrição**: Frontend busca dados de múltiplas fontes:
1. `/api/vendas` - Lista paginada de vendas
2. `/api/dashboard/stats` - Métricas pré-calculadas
3. Cálculos locais no frontend (useDashboardAnalytics)

**Impacto**:
- Usuário vê números diferentes em lugares diferentes
- Difícil debugar qual está certo
- Cache pode causar mais inconsistências

**Solução Recomendada**:
- Backend deve ser ÚNICA fonte de verdade
- Frontend apenas exibe dados do backend
- Remover cálculos locais do frontend

---

### PROBLEMA #2: Vendas do Cliente "Amor" são excluídas, mas parcialmente
**Arquivo**: `server/routes/dashboard.js:136-145,278`
**Severidade**: 🟢 BAIXA (Working as intended, mas pode confundir)
**Descrição**: Vendas do cliente "Amor" são excluídas de DRE mas incluídas em algumas contagens.

```javascript
// Linha 136-145: Exclui do DRE
const salesToProcess = normalizedVendas.filter(v => {
    const customerName = (v.customer_name || '').toLowerCase().trim()
    const isNotPromotional = customerName !== 'amor'
    return isValidStatus && isNotPromotional
})

// Linha 278: Exclui do fluxo de caixa
if (customerName === 'amor') return
```

**Comportamento Atual**:
- ✅ Não conta no faturamento/lucro
- ✅ Não conta no fluxo de caixa
- ❓ Mas está na tabela de vendas no VendasList

**Recomendação**: Documentar claramente este comportamento.

---

## ✅ CÁLCULOS CORRETOS (Confirmados)

1. ✅ `grossRevenue`: Soma correta de originalTotal
2. ✅ `netRevenue`: Deduz descontos corretamente
3. ✅ `totalCPV`: Soma custos dos itens corretamente
4. ✅ `grossProfit`: netRevenue - totalCPV está correto
5. ✅ `operatingProfit`: Deduz despesas operacionais corretamente
6. ✅ `netProfit`: Deduz juros de empréstimos
7. ✅ `averageTicket`: netRevenue / totalSalesCount está correto
8. ✅ `itemsPerSale`: totalItemsSold / totalSalesCount está correto
9. ✅ `fidelityRate`: Cálculo de recorrência está correto

---

## 🔧 PLANO DE CORREÇÃO

### PRIORIDADE 1 (Crítico - Fazer AGORA):
1. ✅ Consertar `pendingCrediario` para usar `net` em vez de `totalValue`
2. ✅ Implementar cálculo real de `retentionRate`

### PRIORIDADE 2 (Importante - Fazer esta semana):
3. Melhorar fallback de `netAmount` com validação mais robusta
4. Remover filtros duplicados do frontend

### PRIORIDADE 3 (Bom ter - Backlog):
5. Adicionar validações no POST /api/vendas para garantir que netAmount é sempre calculado
6. Documentar comportamento de exclusão do cliente "Amor"

---

## 📊 COMPARAÇÃO: Dashboard vs Vendas

| KPI | Dashboard | VendasList | Fonte | Status |
|-----|-----------|------------|-------|--------|
| Faturamento | `/api/dashboard/stats` | `/api/dashboard/stats` | Backend | ✅ Consistente |
| A Receber | `/api/dashboard/stats` | `/api/dashboard/stats` | Backend | 🟡 Inconsistente (pendingCrediario usa totalValue) |
| Ticket Médio | `/api/dashboard/stats` | `/api/dashboard/stats` | Backend | ✅ Consistente |
| Retenção | `/api/dashboard/stats` | N/A | Backend | ❌ Sempre 0 |

---

## 🎯 RECOMENDAÇÕES GERAIS

1. **Criar endpoint `/api/vendas/kpis`** similar ao `/api/malinhas/kpis`
   - Retorna KPIs precisos sem paginação
   - Garante consistência entre Dashboard e VendasList

2. **Adicionar testes automatizados** para cálculos financeiros
   - Criar vendas de teste
   - Validar que KPIs batem com valores esperados

3. **Adicionar logs de auditoria**
   - Registrar cálculos importantes
   - Facilitar debug de inconsistências

4. **Documentar fórmulas** em código
   - Comentários claros sobre cada cálculo
   - Explicar casos especiais (cliente "Amor", parcelas, etc.)

---

**FIM DO RELATÓRIO**
