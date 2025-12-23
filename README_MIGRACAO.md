# Schema Supabase Studio30 Closet

Este repositório contém o script SQL completo para configurar o schema do Supabase para o sistema Studio30 Closet.

## Arquivo Incluído

**`supabase_schema_atualizado.sql`** - Script SQL completo para criar todo o schema no Supabase

## Instruções de Configuração

### Passo 1: Criar o Schema
1. Acesse o painel do Supabase
2. Vá até a seção SQL Editor
3. Execute o conteúdo do arquivo `supabase_schema_atualizado.sql`
4. Isso criará todas as tabelas, índices, policies, funções e dados iniciais necessários

## Tabelas Criadas

O script criará as seguintes tabelas:
- Produtos (products)
- Clientes (customers)
- Pedidos (orders)
- Itens de pedidos (order_items)
- Vendas (vendas)
- Cupons (coupons)
- Configurações (settings)
- Fornecedores (suppliers)
- Compras (purchases)
- Gastos fixos (fixed_expenses)
- Estoque de materiais (materials_stock)
- Taxas de pagamento (payment_fees)

## Recursos Configurados

- Índices para otimizar a performance
- Políticas de segurança (Row Level Security)
- Funções utilitárias para cálculos financeiros
- Views para relatórios
- Triggers para campos de auditoria
- Dados iniciais para taxas de pagamento

## Observações Importantes

- Todas as tabelas têm políticas de segurança configuradas
- Índices foram criados para otimizar a performance das consultas
- Dados iniciais para taxas de pagamento são inseridos automaticamente
- A estrutura está pronta para operar com o sistema Studio30 Closet

Após a execução do script, sua base de dados Supabase estará pronta para uso com o sistema!