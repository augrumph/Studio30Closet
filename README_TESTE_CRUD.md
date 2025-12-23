# Teste CRUD para o Schema Studio30 Closet

Este script executa testes completos de CRUD (Create, Read, Update, Delete) em todas as tabelas do schema Studio30 Closet para garantir que tudo está funcionando corretamente no Supabase.

## Arquivo Incluído

**`teste_crud_supabase.sql`** - Script SQL que testa todas as operações CRUD em todas as tabelas

## Instruções de Execução

### Passo 1: Executar o Script de Teste
1. Acesse o painel do Supabase
2. Vá até a seção SQL Editor
3. Copie o conteúdo do arquivo `teste_crud_supabase.sql`
4. Cole no editor SQL e execute o script

### Passo 2: Verificar os Resultados
- O script mostrará mensagens de "OK" para cada operação bem-sucedida
- Cada teste inclui CREATE, READ, UPDATE e DELETE
- No final, aparecerá a mensagem: "*** Todos os testes CRUD foram executados com sucesso! ***"

## O que o Teste Faz

O script executa testes para:

1. **Todas as Tabelas**: suppliers, customers, products, orders, order_items, vendas, coupons, settings, purchases, fixed_expenses, materials_stock, payment_fees

2. **Operações CRUD**: 
   - CREATE: Insere registros de teste
   - READ: Consulta os registros inseridos
   - UPDATE: Atualiza os registros
   - DELETE: Remove os registros de teste

3. **Integridade Referencial**: Testa as relações entre tabelas (ex: products com suppliers, orders com customers)

4. **Views e Funções**: Testa se as views e funções criadas estão funcionando corretamente

## Resultado Esperado

Se todos os testes passarem, você verá uma mensagem confirmando que o schema está funcionando corretamente. O script inclui tratamento adequado de dependências para não deixar registros órfãos e limpar tudo após os testes.

## Próximos Passos

Após confirmar que todos os testes passaram:
1. Seu schema Supabase está pronto para uso
2. Você pode começar a integrar sua aplicação com o Supabase
3. Todas as operações CRUD estão funcionando corretamente
4. As políticas de segurança e relacionamentos entre tabelas estão funcionando como esperado