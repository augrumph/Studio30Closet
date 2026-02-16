# 📊 Sell-Through Rate (STR) - Capacidade de Venda

## O que é o Sell-Through Rate?

O **Sell-Through Rate (STR)** é a métrica mais importante para entender se seu estoque está **virando dinheiro** ou **parado na prateleira**.

Esta é a **"Fórmula Perfeita"** usada pelos grandes varejistas de moda do mundo.

## 🎯 A Fórmula Perfeita

```
STR (%) = (Vendas Totais no Período) / (Estoque Inicial + Entradas no Período) × 100
```

### Por que esta fórmula é "perfeita"?

Muitas fórmulas simples ignoram as **Entradas** (novas compras). Isso cria uma **falsa ilusão** de desempenho.

**Exemplo:**
- Você tinha R$ 50.000 em estoque
- Comprou mais R$ 10.000 no meio do mês
- Vendeu R$ 20.000

❌ **Fórmula ERRADA** (ignora entradas):
```
20.000 / 50.000 = 40%  ← Parece ótimo, mas é mentira!
```

✅ **Fórmula PERFEITA**:
```
20.000 / (50.000 + 10.000) = 33,3%  ← Realidade!
```

Como você comprou mais mercadoria, seu **desafio** aumentou. A fórmula perfeita ajusta isso.

## 📈 Interpretação dos Resultados

| STR | Status | Significado | Ação |
|-----|--------|-------------|------|
| **30% - 40%** | 🎯 Excelente | Meta atingida! Estoque saudável. | Continue assim! |
| **20% - 30%** | ⚠️ Atenção | Abaixo da meta. | Revisar preços, promoções. |
| **< 20%** | 🔴 Crítico | Estoque parado! | Urgente: liquidação, marketing. |
| **> 60%** | ⚠️ Atenção | Risco de ruptura (falta produto). | Reabastecer estoque. |

## 🧮 Como é Calculado no Sistema

### 1. **Vendas Totais** (Faturamento Bruto)
Soma de todas as vendas do mês (paid + pending).

### 2. **Estoque Inicial**
Valor de venda do estoque no início do mês.
```
Estoque Inicial = Estoque Atual - Entradas + Vendas
```

### 3. **Entradas** (Compras do Mês)
Valor das compras convertido para **preço de venda**.

⚠️ **Nota**: O sistema usa um markup médio de 2x sobre o custo de compra. Em versões futuras, isso pode ser ajustado para usar o markup real de cada produto.

### 4. **Cálculo Final**
```javascript
STR = (Vendas Totais / (Estoque Inicial + Entradas)) × 100
```

## 💡 Exemplo Prático (Fevereiro 2026)

Dados reais do seu sistema:

```
Vendas do Mês:      R$ 1.263,82
Estoque Inicial:    R$ 10.169,06
Entradas (Compras): R$ 2.614,76
────────────────────────────────
Base Total:         R$ 12.783,82

STR = 1.263,82 / 12.783,82 × 100 = 9,9%
```

**Veredito**: 🔴 **Crítico! Estoque parado.**

### O que isso significa?

Você está vendendo apenas **9,9%** do estoque disponível.

Para atingir a meta de 30%, precisaria vender:
```
30% de R$ 12.783,82 = R$ 3.835,15 (falta R$ 2.571,33)
```

## 🎨 Como Aparece no Sistema

Na página de **Produtos** (/admin/products), você verá um card:

```
┌─────────────────────────────┐
│ 📊 SELL-THROUGH             │
│                             │
│   9.9% ⚠️                   │
│   Crítico! Estoque parado.  │
└─────────────────────────────┘
```

Cores dinâmicas:
- 🟢 Verde: 30-40% (Excelente)
- 🟡 Amarelo: 20-30% ou >60% (Atenção)
- 🔴 Vermelho: <20% (Crítico)

## 🔧 Melhorando seu STR

### Se está BAIXO (<30%):
1. **Promoções**: Descontos estratégicos
2. **Marketing**: Redes sociais, WhatsApp
3. **Vitrines**: Destaque produtos parados
4. **Preços**: Revisar margem (pode estar caro)
5. **Mix**: Comprar produtos que vendem mais

### Se está ALTO (>60%):
1. **Reabastecer**: Comprar mais dos itens que vendem
2. **Diversificar**: Aumentar variedade
3. **Estoque mínimo**: Não deixar faltar

## 📊 API Endpoint

```bash
GET /api/products/metrics/sell-through
```

**Resposta:**
```json
{
  "sellThroughRate": 9.9,
  "vendasTotais": 1263.82,
  "estoqueInicial": 10169.06,
  "entradasMes": 2614.76,
  "base": 12783.82,
  "status": "critical",
  "message": "Crítico! Estoque parado.",
  "periodo": {
    "inicio": "2026-02-01T03:00:00.000Z",
    "fim": "2026-03-01T02:59:59.000Z"
  },
  "metaIdeal": {
    "min": 30,
    "max": 40
  }
}
```

## 🎓 Referências

Esta implementação segue as melhores práticas de grandes redes de varejo como:
- Zara
- H&M
- Renner
- C&A

A fórmula considera **todo o estoque disponível para venda**, não apenas o que você tinha no início ou apenas as entradas isoladas.

---

**Atualizado em**: 2026-02-16
**Status**: ✅ Implementado e funcionando
**Período de cálculo**: Mês corrente (atualizado em tempo real)
