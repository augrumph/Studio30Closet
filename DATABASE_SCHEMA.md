# Schema do Banco de Dados - Studio 30 Closet

Este documento detalha a estrutura do banco de Dados PostgreSQL utilizado no sistema Studio 30 Closet, incluindo tabelas, colunas, finalidades e relacionamentos.

---

## Sumário das Tabelas

| Tabela | Descrição |
| :--- | :--- |
| `admins` | Usuários com acesso ao painel administrativo. |
| `analytics_sessions` | Rastreamento de sessões de visitantes no site. |
| `analytics_events` | Eventos específicos (cliques, visualizações) capturados. |
| `bingo_games` | Gerenciamento de rodadas de bingo. |
| `bingo_participants` | Jogadores inscritos em rodadas de bingo. |
| `collections` | Agrupamentos/Coleções de produtos. |
| `coupons` | Cupons de desconto e regras de aplicação. |
| `customers` | Cadastro principal de clientes (CRM). |
| `customers_with_metrics` | **(View)** Métricas consolidadas de clientes (LTV, segmento). |
| `suppliers` | Cadastro de fornecedores de produtos e insumos. |
| `products` | Catálogo principal de produtos e controle de estoque. |
| `orders` | Reservas ou pedidos iniciais (podem converter em vendas). |
| `vendas` | Registro definitivo de transações comerciais. |
| `order_items` | Itens vinculados a um pedido (`orders`). |
| `abandoned_carts` | Carrinhos não finalizados para recuperação de vendas. |
| `entregas` | Logística, rastreamento e integração (ex: TikTok). |
| `fixed_expenses` | Controle de custos fixos operacionais. |
| `installments` | Controle de parcelamentos de vendas. |
| `installment_payments` | Registro de pagamentos individuais de parcelas. |
| `materials_stock` | Controle de estoque de insumos (embalagens, etc). |
| `midi_insights` | Insights e alertas gerados automaticamente pelo sistema. |
| `payment_fees` | Configuração de taxas de operadoras de pagamento. |
| `purchases` | Compras realizadas pela loja (reposição de estoque). |
| `settings` | Configurações globais do sistema. |
| `site_images` | Gestão de imagens da interface do site (heros, banners). |
| `stock_movements` | Histórico detalhado de entradas e saídas de produtos. |

---

## 1. admins
Armazena as credenciais dos administradores do sistema.
- `id` (uuid): Identificador único.
- `username` (text): Nome de usuário para login (único).
- `password` (text): Senha (criptografada).
- `name` (text): Nome completo do administrador.
- `created_at` (timestamp): Data de criação da conta.

## 2. analytics_sessions
Registra o início e fim de cada acesso de usuário ao site.
- `id` (text): ID da sessão (gerado no frontend).
- `first_seen_at` (timestamp): Primeiro contato.
- `last_seen_at` (timestamp): Última atividade registrada.
- `page_views` (int): Total de páginas visitadas nesta sessão.
- `device_type` (text): Tipo de dispositivo (mobile, desktop).
- `user_agent` (text): String do navegador.
- `referrer` (text): Origem do tráfego.
- `is_converted` (boolean): Se a sessão resultou em venda.

## 3. analytics_events
Detalha ações específicas dentro de uma sessão.
- `id` (bigint): Identificador sequencial.
- `session_id` (text): FK para `analytics_sessions`.
- `event_type` (text): Tipo do evento (ex: 'click', 'add_to_cart').
- `event_data` (jsonb): Dados extras do evento.
- `page_path` (text): URL onde ocorreu.
- `created_at` (timestamp): Momento do evento.

## 4. bingo_games
Controle dos jogos de bingo realizados pela loja.
- `id` (uuid): Identificador único.
- `title` (text): Nome do bingo.
- `pin` (text): Código de acesso para participantes.
- `status` (text): Estado ('waiting', 'started', 'finished').
- `called_numbers` (integer[]): Lista de números já sorteados.

## 5. customers
Cadastro central de clientes.
- `id` (bigint): Identificador sequencial.
- `name` (text): Nome do cliente.
- `phone` (text): Telefone de contato (único).
- `email` (text): E-mail de contato.
- `cpf` (text): Documento fiscal.
- `address`, `complement`, `addresses` (jsonb): Localização e múltiplos endereços.
- `birth_date` (date): Data de aniversário.

## 6. products
O coração do catálogo de produtos.
- `id` (bigint): Identificador sequencial.
- `name` (text): Nome do produto.
- `price` (numeric): Preço de venda.
- `cost_price` (numeric): Preço de custo (para cálculo de margem).
- `stock` (int): Quantidade atual em estoque.
- `stock_status` (text): Status ('disponivel', 'em_malinha', 'vendido', 'quarentena').
- `images` (text[]), `image_urls` (text[]): Caminhos das fotos.
- `category` (text): Categoria do produto.
- `supplier_id` (bigint): FK para `suppliers`.
- `collection_ids` (bigint[]): Array de IDs de coleções vinculadas.

## 7. vendas
Registro de vendas finalizadas.
- `id` (bigint): Identificador sequencial.
- `order_id` (bigint): FK para `orders`.
- `customer_id` (bigint): FK para `customers`.
- `total_value` (numeric): Valor final da venda.
- `payment_method` (text): Forma de pagamento (PIX, Cartão, etc).
- `payment_status` (text): Status ('pending', 'paid', 'cancelled').
- `is_installment` (boolean): Se foi parcelado.
- `items` (jsonb): Snapshot dos itens vendidos no momento da venda.

## 8. stock_movements
Logs de auditoria para cada peça de roupa/produto.
- `id` (bigint): Identificador sequencial.
- `product_id` (bigint): FK para `products`.
- `movement_type` (text): Tipo ('entrada', 'saida_malinha', 'venda', etc).
- `from_status` / `to_status` (text): Mudança de estado do produto.
- `quantity` (int): Quantidade movimentada.
- `notes` (text): Observações sobre o movimento.

## 9. installments & installment_payments
Gestão de faturamento parcelado.
- `installments`: Define as parcelas geradas para uma venda (`venda_id`).
- `installment_payments`: Registra quando uma parcela específica foi paga, permitindo pagamentos parciais.

## 10. midi_insights
Alertas e recomendações inteligentes.
- `type`: 'alert', 'opportunity', 'trend', 'recommendation'.
- `category`: 'sales', 'inventory', 'customers', etc.
- `severity`: 'low' a 'critical'.
- `context` (jsonb): Contém os dados que dispararam o insight (ex: IDs dos produtos com estoque baixo).

---

## Relacionamentos Principais (Entidade-Relacionamento)

- **Vendas e Clientes**: Uma `venda` pertence a um `customer`.
- **Produtos e Fornecedores**: Um `product` é fornecido por um `supplier`.
- **Vendas e Entregas**: Uma `venda` pode gerar uma `entrega`.
- **Movimentação de Estoque**: Cada registro em `stock_movements` aponta para um `product`.
- **Parcelas**: `installments` referenciam `vendas`, e `installment_payments` referenciam `installments`.
