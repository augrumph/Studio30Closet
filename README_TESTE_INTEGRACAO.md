# Teste de Integração com Supabase - Studio30 Closet

Script para testar a integração completa do sistema Studio30 Closet com o Supabase, verificando se todas as operações CRUD funcionam corretamente através da biblioteca do Supabase.

## Arquivos Incluídos

- `teste_integracao_supabase.js` - Script JavaScript para testar a integração com Supabase
- `package.json` - Arquivo de dependências do projeto
- `README_TESTE_INTEGRACAO.md` - Este arquivo com instruções

## Instalação

1. Certifique-se de que o Node.js está instalado em seu sistema
2. Instale as dependências:
```bash
npm install
```

## Configuração

Antes de executar os testes, você precisa configurar as variáveis de ambiente com as credenciais do seu projeto Supabase:

1. Acesse o painel do Supabase
2. Vá até Project Settings > API
3. Copie a URL do projeto e a anon key

## Execução dos Testes

### Opção 1: Usando variáveis de ambiente
```bash
SUPABASE_URL=https://[SEU_PROJETO].supabase.co SUPABASE_ANON_KEY=sua_anon_key_aqui npm run test
```

### Opção 2: Editando o script
Edite o arquivo `teste_integracao_supabase.js` e substitua as variáveis:
```javascript
const supabaseUrl = 'https://[SEU_PROJETO].supabase.co';
const supabaseAnonKey = 'sua_anon_key_aqui';
```

### Opção 3: Usando arquivo .env
Crie um arquivo `.env` na raiz do projeto:
```bash
SUPABASE_URL=https://[SEU_PROJETO].supabase.co
SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## O que o Teste Faz

O script executa testes completos para:

1. **Operações CRUD** em todas as tabelas principais:
   - suppliers (fornecedores)
   - customers (clientes)
   - products (produtos)
   - orders (pedidos)
   - vendas (vendas)
   - coupons (cupons)
   - settings (configurações)
   - fixed_expenses (gastos fixos)
   - purchases (compras)
   - materials_stock (estoque de materiais)
   - payment_fees (taxas de pagamento)

2. **Relacionamentos entre tabelas**:
   - Testa relacionamentos products-suppliers
   - Verifica chaves estrangeiras e integridade referencial

3. **Views e funções**:
   - Verifica se as views estão acessíveis
   - Testa a função calculate_profit_margin

4. **Segurança e permissões**:
   - Testa se as políticas de segurança estão funcionando
   - Verifica se as operações permitem o acesso apropriado

## Resultado Esperado

Se todos os testes passarem:
- ✅ Mensagens de "OK" para cada operação
- ✅ Status geral: "TODOS OS TESTES PASSARAM"
- ✅ Confirmação de que o sistema está funcionando corretamente com o Supabase

## Interpretando os Resultados

- **Verde (✅)**: Operação bem-sucedida
- **Vermelho (❌)**: Operação falhou
- **Amarelo (⚠️)**: Aviso (view não disponível, etc.)

## Próximos Passos

Após confirmar que todos os testes passaram:
1. Sua integração com o Supabase está funcionando corretamente
2. Você pode prosseguir com a integração na sua aplicação React
3. Todas as operações CRUD estão funcionando como esperado
4. Os relacionamentos entre tabelas estão corretos
5. As políticas de segurança estão aplicadas corretamente