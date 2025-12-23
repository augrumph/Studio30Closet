# Schema SQL Completo - Sistema Studio30 Closet

## Tabelas existentes no schema original

```sql
-- Create products table
CREATE TABLE products (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    price NUMERIC,
    cost_price NUMERIC,
    description TEXT,
    stock INT,
    sizes JSONB,
    images TEXT[],
    category TEXT,
    is_featured BOOLEAN,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table
CREATE TABLE customers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    address TEXT,
    complement TEXT,
    instagram TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE orders (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_id BIGINT REFERENCES customers(id),
    status TEXT CHECK (status IN ('pending', 'shipped', 'completed', 'cancelled')),
    total_value NUMERIC,
    delivery_date TIMESTAMPTZ,
    pickup_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE order_items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id),
    quantity INT,
    price_at_time NUMERIC,
    size_selected TEXT
);

-- Create Vendas table
CREATE TABLE vendas (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id BIGINT REFERENCES orders(id),
    customer_id BIGINT REFERENCES customers(id),
    total_value NUMERIC,
    cost_price NUMERIC,
    items JSONB,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Coupons table
CREATE TABLE coupons (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL,
    discount_value NUMERIC NOT NULL,
    usage_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Settings table
CREATE TABLE settings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    setting_key TEXT NOT NULL UNIQUE,  -- Corrigido de 'key' para 'setting_key' para evitar conflito com palavra reservada
    value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Tabelas novas necessárias para o sistema completo

```sql
-- Create suppliers table
CREATE TABLE suppliers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE purchases (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    supplier_id BIGINT REFERENCES suppliers(id),
    value NUMERIC NOT NULL,
    date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    pieces INT,
    parcelas INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create fixed_expenses table
CREATE TABLE fixed_expenses (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    category TEXT,
    recurrence TEXT CHECK (recurrence IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    due_day INT, -- Day of the month when it's due
    paid BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create materials_stock table
CREATE TABLE materials_stock (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    description TEXT,
    quantity INT DEFAULT 0,
    unit_cost NUMERIC,
    category TEXT,
    supplier_id BIGINT REFERENCES suppliers(id),
    min_stock_level INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_fees table (para taxas de pagamento do sistema operational_costs)
CREATE TABLE payment_fees (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    payment_type TEXT NOT NULL,
    fee_percentage NUMERIC NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Índices para melhorar performance

```sql
-- Índices nas tabelas existentes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_vendas_customer_id ON vendas(customer_id);
CREATE INDEX idx_vendas_created_at ON vendas(created_at);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupons_code ON coupons(code);

-- Índices nas novas tabelas
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(date);
CREATE INDEX idx_purchases_payment_method ON purchases(payment_method);
CREATE INDEX idx_fixed_expenses_category ON fixed_expenses(category);
CREATE INDEX idx_fixed_expenses_recurrence ON fixed_expenses(recurrence);
CREATE INDEX idx_materials_stock_supplier_id ON materials_stock(supplier_id);
CREATE INDEX idx_materials_stock_category ON materials_stock(category);
```

## Atualização de policies para incluir as novas tabelas

```sql
-- Enable Row Level Security (RLS) para todas as tabelas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_fees ENABLE ROW LEVEL SECURITY;

-- Policies para products
CREATE POLICY "Public can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Admin can do all on products" ON products FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para customers
CREATE POLICY "Admin can do all on customers" ON customers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para orders
CREATE POLICY "Admin can do all on orders" ON orders FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para order_items
CREATE POLICY "Admin can do all on order_items" ON order_items FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para vendas
CREATE POLICY "Admin can do all on vendas" ON vendas FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para coupons
CREATE POLICY "Admin can do all on coupons" ON coupons FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para settings
CREATE POLICY "Public can read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Admin can do all on settings" ON settings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para suppliers
CREATE POLICY "Admin can do all on suppliers" ON suppliers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para purchases
CREATE POLICY "Admin can do all on purchases" ON purchases FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para fixed_expenses
CREATE POLICY "Admin can do all on fixed_expenses" ON fixed_expenses FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para materials_stock
CREATE POLICY "Admin can do all on materials_stock" ON materials_stock FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies para payment_fees
CREATE POLICY "Public can read payment fees" ON payment_fees FOR SELECT USING (true);
CREATE POLICY "Admin can do all on payment_fees" ON payment_fees FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
```

## Dados iniciais para payment_fees

```sql
-- Inserir dados iniciais para taxas de pagamento
INSERT INTO payment_fees (payment_type, fee_percentage, description) VALUES
('debit', 1.99, 'Taxa para pagamentos com débito à vista'),
('credit_vista', 3.49, 'Taxa para pagamentos com crédito à vista'),
('credit_parcelado_2x', 4.99, 'Taxa para pagamentos com crédito em 2x'),
('credit_parcelado_3x', 5.49, 'Taxa para pagamentos com crédito em 3x'),
('credit_parcelado_4x', 5.99, 'Taxa para pagamentos com crédito em 4x'),
('credit_parcelado_5x', 6.49, 'Taxa para pagamentos com crédito em 5x'),
('credit_parcelado_6x', 6.99, 'Taxa para pagamentos com crédito de 6x a 12x'),
('pix', 0.99, 'Taxa para pagamentos com PIX'),
('dinheiro', 0.00, 'Taxa para pagamentos em dinheiro');
```

## Funções utilitárias para cálculos financeiros

```sql
-- Função para calcular lucro e margem de contribuição
CREATE OR REPLACE FUNCTION calculate_profit_margin(sale_value NUMERIC, cost_value NUMERIC)
RETURNS TABLE(profit_value NUMERIC, profit_percentage NUMERIC, contribution_margin NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (sale_value - cost_value) AS profit_value,
        CASE 
            WHEN sale_value > 0 THEN ROUND(((sale_value - cost_value) / sale_value) * 100, 2)
            ELSE 0 
        END AS profit_percentage,
        CASE 
            WHEN sale_value > 0 THEN ROUND(((sale_value - cost_value) / sale_value) * 100, 2)
            ELSE 0 
        END AS contribution_margin;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar estoque disponível
CREATE OR REPLACE FUNCTION check_product_stock(product_id BIGINT, required_quantity INT)
RETURNS TABLE(is_available BOOLEAN, available_quantity INT) AS $$
DECLARE
    current_stock INT;
BEGIN
    SELECT COALESCE(stock, 0) INTO current_stock 
    FROM products 
    WHERE id = check_product_stock.product_id;
    
    RETURN QUERY
    SELECT 
        (current_stock >= check_product_stock.required_quantity) AS is_available,
        current_stock AS available_quantity;
END;
$$ LANGUAGE plpgsql;
```

## Views para relatórios financeiros

```sql
-- View para relatório de vendas
CREATE OR REPLACE VIEW sales_report AS
SELECT 
    v.id,
    v.created_at,
    v.total_value,
    v.cost_price,
    (v.total_value - v.cost_price) AS profit,
    c.name AS customer_name,
    v.payment_method,
    calculate_profit_margin(v.total_value, v.cost_price).profit_percentage AS profit_margin
FROM vendas v
LEFT JOIN customers c ON v.customer_id = c.id;

-- View para relatório de produtores e estoque
CREATE OR REPLACE VIEW supplier_inventory_report AS
SELECT 
    s.name AS supplier_name,
    p.name AS product_name,
    p.stock,
    p.price,
    p.cost_price,
    (p.price - p.cost_price) AS profit_per_unit,
    (p.stock * (p.price - p.cost_price)) AS potential_profit
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id  -- Assumindo que produtos terão relacionamento com fornecedores
WHERE p.active = true;

-- Atualizar a tabela products para incluir supplier_id se necessário
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id);
```

## Atualizações em tabelas existentes para melhor integração

```sql
-- Adicionar campo de custo nos itens do pedido para acompanhamento de custos
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_price_at_time NUMERIC;

-- Adicionar campo para indicar se o pedido foi convertido em venda
ALTER TABLE orders ADD COLUMN IF NOT EXISTS converted_to_sale BOOLEAN DEFAULT FALSE;
```