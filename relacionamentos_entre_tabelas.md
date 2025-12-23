# Análise Completa de Relacionamentos entre Tabelas - Studio30 Closet

## Relacionamentos Existentes (Original)

1. **customers → orders** (1:N)
   - `orders.customer_id` referencia `customers.id`
   - Um cliente pode ter muitos pedidos

2. **orders → order_items** (1:N)
   - `order_items.order_id` referencia `orders.id`
   - Um pedido pode ter muitos itens

3. **products → order_items** (1:N)
   - `order_items.product_id` referencia `products.id`
   - Um produto pode estar em muitos itens de pedido

## Relacionamentos Adicionados

4. **suppliers → purchases** (1:N)
   - `purchases.supplier_id` referencia `suppliers.id`
   - Um fornecedor pode ter muitas compras

5. **suppliers → materials_stock** (1:N)
   - `materials_stock.supplier_id` referencia `suppliers.id`
   - Um fornecedor pode fornecer muitos materiais em estoque

6. **orders → vendas** (1:1 opcional)
   - `vendas.order_id` referencia `orders.id`
   - Um pedido pode ser convertido em uma venda

7. **customers → vendas** (1:N)
   - `vendas.customer_id` referencia `customers.id`
   - Um cliente pode ter muitas vendas

## Correções e Ajustes Necessários

### 1. Relacionamento entre Products e Suppliers
- No sistema atual, produtos não estão diretamente ligados a fornecedores
- Adicionado campo `supplier_id` à tabela `products` para rastrear origem dos produtos

### 2. Relacionamento entre Orders e Vendas
- A tabela `vendas` tem tanto `order_id` quanto `customer_id`
- `customer_id` é redundante já que `orders` já tem `customer_id`
- Este relacionamento direto é mantido para simplicidade nos relatórios

### 3. Integridade Referencial
Todos os relacionamentos respeitam a integridade referencial com:
- Foreign Keys apropriadas
- Restrições de exclusão (ex: `ON DELETE CASCADE` em `order_items`)

## Consistência de Dados

### Campos de Auditoria
Todas as tabelas novas incluem:
- `created_at`: Timestamp de criação
- `updated_at`: Timestamp da última atualização (quando aplicável)

### Constraints Importantes
- `customers.phone` é UNIQUE
- `coupons.code` é UNIQUE
- `settings.setting_key` é UNIQUE
- `suppliers.cnpj` é UNIQUE
- Status das tabelas usam CHECK constraints para valores válidos

## Relacionamentos Faltantes e Correções

### A. Relacionamento de Estoque de Materiais
- `materials_stock` → `suppliers` (1:N) - OK
- Este relacionamento é importante para rastrear fornecedores de materiais

### B. Relacionamento de Pagamento e Taxas
- `payment_fees` não tem relacionamento direto com outras tabelas
- É usada como tabela de lookup para cálculos financeiros
- Acessada por função utilitária

### C. Relacionamentos Financeiros
- `vendas` contém `payment_method` que se relaciona com `payment_fees`
- Embora não tenha FK direta, há uma relação conceitual
- Poderia ser melhorado com uma tabela intermediária

## Propostas de Melhoria em Relacionamentos

### 1. Histórico de Preços
Considerar adicionar uma tabela para histórico de preços:
```sql
CREATE TABLE price_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    product_id BIGINT REFERENCES products(id),
    old_price NUMERIC,
    new_price NUMERIC,
    change_date TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Categoria de Produtos
A coluna `category` em `products` poderia ser normalizada:
```sql
CREATE TABLE product_categories (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);
```

### 3. Categoria de Gastos
A coluna `category` em `fixed_expenses` poderia ser normalizada:
```sql
CREATE TABLE expense_categories (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);
```

## Considerações de Performance

### Índices Recomendados
1. Índices nas colunas de relacionamento (chaves estrangeiras)
2. Índices nas colunas de busca frequentes
3. Índices nas colunas de data para consultas temporais

### Estratégias de Consulta
- Usar JOINs apropriados para obter informações relacionadas
- Considerar views para consultas complexas frequentes
- Utilizar funções para cálculos repetidos

## Validação dos Dados

### Regras de Negócio
1. Um produto não pode ter estoque negativo
2. Um pedido não pode ser criado com itens sem estoque suficiente
3. Os gastos fixos devem ter valores positivos
4. Os fornecedores devem ter CNPJ único

### Restrições de Segurança
- RLS (Row Level Security) implementada em todas as tabelas
- Políticas apropriadas para diferentes níveis de acesso
- Dados sensíveis protegidos com políticas de acesso

## Resumo Final

O sistema tem uma estrutura de relacionamentos bem definida com:
- 11 tabelas principais no total
- 8 relacionamentos diretos entre tabelas
- Boas práticas de normalização
- Integridade referencial mantida
- Políticas de segurança implementadas
- Considerações de performance com índices