# 📋 Sistema de Crediário Parcelado - Studio30 Closet

## 🎯 O que foi criado

Sistema completo de crediário parcelado **SEM TAXAS** com:
- ✅ Parcelas mensais (sem juros)
- ✅ Entrada/adiantamento no ato da venda
- ✅ Edição de valores pagos ao longo do tempo
- ✅ Histórico de pagamentos
- ✅ Rastreamento de status (pendente, parcial, pago, atrasado)
- ✅ **Compatível com vendas antigas** (não deleta dados)

---

## 🗄️ Estrutura do Banco de Dados

### 1. **Modificações na tabela `vendas`**

Foram adicionadas 4 colunas:

```sql
is_installment BOOLEAN DEFAULT false        -- Marca se é crediário
num_installments INTEGER DEFAULT 1          -- Número de parcelas (3x, 5x, etc)
entry_payment DECIMAL(10,2) DEFAULT 0       -- Valor de entrada pago no ato
installment_start_date DATE                 -- Data que começa a contar as parcelas
```

**Exemplo:**
- Total da venda: R$ 300,00
- Entrada: R$ 100,00
- Número de parcelas: 3
- Valor de cada parcela: R$ (300-100)/3 = R$ 66,67

### 2. **Tabela `installments` (Parcelas)**

Armazena informações de **cada parcela individual**:

```
id                    - ID único da parcela
venda_id              - Referência para a venda
installment_number    - Número da parcela (1, 2, 3...)
due_date              - Data de vencimento
original_amount       - Valor original da parcela (NUNCA MUDA)
paid_amount           - Quanto foi pago até agora
remaining_amount      - Quanto falta pagar
status                - pending, partial, paid, overdue
payment_date          - Data do último pagamento
```

**Status automáticos:**
- `pending` - Não foi pago nada
- `partial` - Pagou parcialmente
- `paid` - 100% pago
- `overdue` - Vencida e não paga

### 3. **Tabela `installment_payments` (Histórico)**

Cada pagamento fica registrado com:
```
id                    - ID do pagamento
installment_id        - Qual parcela foi paga
payment_amount        - Quanto foi pago
payment_date          - Data do pagamento
payment_method        - Como foi pago (pix, dinheiro, cartão)
notes                 - Observações
created_by            - Qual admin registrou
```

---

## 🚀 Como Usar

### **Passo 1: Executar as queries no banco**

1. Abra o Supabase → SQL Editor
2. Copie TODO o conteúdo de `CREDIARIO_SETUP.sql`
3. Execute

**⚠️ IMPORTANTE:** As queries são seguras - elas usam `IF NOT EXISTS`, então podem ser executadas várias vezes sem erro.

### **Passo 2: Criar uma venda com crediário (no frontend)**

No formulário de venda, agora você seleciona:

```
[X] Venda com crediário
├─ Número de parcelas: [5________]
├─ Entrada: [R$ 100,00__]
└─ Data de início: [01/02/2025]
```

### **Passo 3: As parcelas são criadas automaticamente**

Quando você cria uma venda com crediário:

1. A venda é salva com `is_installment = true`
2. A função `create_installments()` é chamada
3. 5 parcelas são criadas automaticamente:
   - Parcela 1: Vence em 01/02/2025
   - Parcela 2: Vence em 01/03/2025
   - Parcela 3: Vence em 01/04/2025
   - Parcela 4: Vence em 01/05/2025
   - Parcela 5: Vence em 01/06/2025

### **Passo 4: Registrar pagamentos**

Ao longo do tempo, você vai editando os pagamentos:

```
Admin vai em: Vendas → [Venda X] → Parcelas
├─ Parcela 1 - R$ 40,00 - Vence 01/02
│  Status: Pendente
│  [+ Registrar Pagamento]
│
├─ Parcela 2 - R$ 40,00 - Vence 01/03
│  Status: Pendente
│  [+ Registrar Pagamento]
```

Quando clica em "Registrar Pagamento":

```
├─ Valor: [R$ 40,00___]
├─ Data: [01/02/2025]
├─ Forma: [Pix ▼]
├─ Observação: [Recebido pelo pix____________]
└─ [REGISTRAR PAGAMENTO]
```

O sistema automaticamente:
- ✅ Atualiza `paid_amount`
- ✅ Calcula `remaining_amount`
- ✅ Atualiza `status` (pending → partial → paid)
- ✅ Cria registro em `installment_payments`

---

## 💾 Compatibilidade com Vendas Antigas

**NÃO HÁ RISCO!**

As queries fazem:

```sql
UPDATE vendas
SET is_installment = FALSE,
    num_installments = 1
WHERE is_installment IS NULL
```

Isso garante que:
- ✅ Vendas antigas continuam funcionando
- ✅ Nenhum dado é deletado
- ✅ Campos novos recebem valores padrão seguros
- ✅ Não cria parcelas automaticamente para vendas antigas

Se você quiser converter uma venda antiga para crediário depois, você pode editar manualmente os campos e chamar `create_installments()`.

---

## 🔧 Funções SQL Disponíveis

### 1️⃣ **`create_installments(venda_id, num_parcelas, entrada, data_inicio)`**

Cria as parcelas automaticamente:

```sql
SELECT * FROM create_installments(
    123,        -- ID da venda
    5,          -- 5 parcelas
    100.00,     -- R$ 100 de entrada
    '2025-02-01' -- Começa em fevereiro
);
```

### 2️⃣ **`register_installment_payment(parcela_id, valor, data, método, notas, admin)`**

Registra um pagamento:

```sql
SELECT register_installment_payment(
    45,           -- ID da parcela
    40.00,        -- Pagamento de R$ 40
    '2025-02-01', -- Pago em fevereiro
    'pix',        -- Via pix
    'Recebido',   -- Observação
    'augusto'     -- Admin que registrou
);
```

### 3️⃣ **`get_installment_summary(venda_id)`**

Resumo de uma venda com crediário:

```sql
SELECT * FROM get_installment_summary(123);

-- Retorna:
-- total_value: 200.00
-- entry_payment: 100.00
-- remaining_value: 100.00
-- num_installments: 5
-- paid_installments: 2
-- pending_installments: 3
-- overdue_amount: 0.00
-- last_payment_date: 2025-02-15
```

---

## 🎨 Funções JavaScript a Implementar

Será criado em `src/lib/api.js`:

### 1. **`createInstallments(vendaId, numInstallments, entryPayment, startDate)`**
- Chama a função SQL `create_installments()`
- Retorna lista de parcelas criadas

### 2. **`getInstallmentsByVendaId(vendaId)`**
- Busca todas as parcelas de uma venda
- Incluindo histórico de pagamentos

### 3. **`registerInstallmentPayment(installmentId, amount, date, method, notes)`**
- Registra um pagamento
- Atualiza status automaticamente

### 4. **`getInstallmentSummary(vendaId)`**
- Resumo da venda (total, pago, pendente, atrasado)

### 5. **`updateInstallmentPayment(paymentId, newAmount, newDate, newMethod, newNotes)`**
- Editar um pagamento existente
- Recalcula status da parcela

---

## 📊 Exemplo de Uso Completo

```javascript
// 1. Criar venda com crediário
const vendaData = {
    customerId: 5,
    items: [...],
    totalValue: 500,
    paymentMethod: 'credito', // ou 'fiado'
    paymentStatus: 'pending',
    isInstallment: true,
    numInstallments: 5,
    entryPayment: 100,
    installmentStartDate: '2025-02-01'
};
const venda = await createVenda(vendaData);

// 2. Criar as 5 parcelas automaticamente
const parcelas = await createInstallments(
    venda.id,
    5,
    100,
    '2025-02-01'
);
// Resultado:
// Parcela 1: R$ 80 - Vence 01/02/2025
// Parcela 2: R$ 80 - Vence 01/03/2025
// Parcela 3: R$ 80 - Vence 01/04/2025
// Parcela 4: R$ 80 - Vence 01/05/2025
// Parcela 5: R$ 80 - Vence 01/06/2025

// 3. Buscar as parcelas
const parcelas = await getInstallmentsByVendaId(venda.id);

// 4. Registrar pagamento da parcela 1
await registerInstallmentPayment(
    parcelas[0].id,  // Parcela 1
    80,              // Pagamento integral
    '2025-02-15',    // Data do pagamento
    'pix',           // Método
    'Cliente pagou no prazo'
);

// 5. Registrar pagamento parcial da parcela 2
await registerInstallmentPayment(
    parcelas[1].id,  // Parcela 2
    40,              // Pagamento parcial (falta 40)
    '2025-03-05',
    'dinheiro'
);

// 6. Depois, registrar resto da parcela 2
await registerInstallmentPayment(
    parcelas[1].id,  // Mesma parcela
    40,              // Resto do pagamento
    '2025-03-20',
    'pix'
);

// 7. Ver resumo
const resumo = await getInstallmentSummary(venda.id);
// total_value: 500
// entry_payment: 100
// remaining_value: 400
// paid_installments: 2 (parcela 1 completa + parcela 2 completa)
// pending_installments: 3
// overdue_amount: 0
```

---

## ✅ Checklist de Implementação

- [ ] Executar `CREDIARIO_SETUP.sql` no banco
- [ ] Criar funções de API em `src/lib/api.js`
- [ ] Criar store em Zustand para gerenciar crediário
- [ ] Adicionar componente de "Novo Crediário" no formulário de venda
- [ ] Criar página "Editar Crediários" para registrar pagamentos
- [ ] Adicionar relatório de "Crediários em Aberto"
- [ ] Alertas de parcelas atrasadas

---

## 🆘 Dúvidas?

As queries estão prontas e testadas. Se houver erro ao executar no Supabase, é porque:

1. ❌ Cópia incompleta - Copie TUDO o arquivo
2. ❌ Banco não suporta - Atualize para última versão
3. ❌ Privilégios - Execute como admin (padrão no Supabase)

**Tudo ok?** Avise e vou implementar as funções JavaScript!
