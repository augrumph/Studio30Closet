-- Schema SQL Completo - Sistema Studio30 Closet
-- Script otimizado para execução no Supabase

-- 1. CRIAR TABELAS SEM REFERÊNCIAS EXTERNAS PRIMEIRO

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna updated_at se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'updated_at') THEN
        ALTER TABLE suppliers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    address TEXT,
    complement TEXT,
    instagram TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CRIAR TABELAS COM REFERÊNCIAS

-- Create products table (sem supplier_id e updated_at inicialmente)
CREATE TABLE IF NOT EXISTS products (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    price NUMERIC,
    cost_price NUMERIC,
    description TEXT,
    stock INT DEFAULT 0,
    sizes JSONB,
    images TEXT[],
    category TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas dinamicamente se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'updated_at') THEN
        ALTER TABLE products ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'supplier_id') THEN
        ALTER TABLE products ADD COLUMN supplier_id BIGINT REFERENCES suppliers(id);
    END IF;
END $$;

-- Create orders table (sem converted_to_sale inicialmente)
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_id BIGINT REFERENCES customers(id),
    status TEXT CHECK (status IN ('pending', 'shipped', 'completed', 'cancelled')),
    total_value NUMERIC,
    delivery_date TIMESTAMPTZ,
    pickup_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna converted_to_sale se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'converted_to_sale') THEN
        ALTER TABLE orders ADD COLUMN converted_to_sale BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create order_items table (sem cost_price_at_time inicialmente)
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id),
    quantity INT,
    price_at_time NUMERIC,
    size_selected TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna cost_price_at_time se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'cost_price_at_time') THEN
        ALTER TABLE order_items ADD COLUMN cost_price_at_time NUMERIC;
    END IF;
END $$;

-- Create Vendas table
CREATE TABLE IF NOT EXISTS vendas (
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
CREATE TABLE IF NOT EXISTS coupons (
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
CREATE TABLE IF NOT EXISTS settings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    setting_key TEXT NOT NULL UNIQUE,
    value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchases table (sem supplier_id e updated_at inicialmente)
CREATE TABLE IF NOT EXISTS purchases (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    value NUMERIC NOT NULL,
    date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    pieces INT,
    parcelas INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas dinamicamente se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'updated_at') THEN
        ALTER TABLE purchases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'supplier_id') THEN
        ALTER TABLE purchases ADD COLUMN supplier_id BIGINT REFERENCES suppliers(id);
    END IF;
END $$;

-- Create fixed_expenses table
CREATE TABLE IF NOT EXISTS fixed_expenses (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    category TEXT,
    recurrence TEXT CHECK (recurrence IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    due_day INT,
    paid BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna updated_at se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fixed_expenses' AND column_name = 'updated_at') THEN
        ALTER TABLE fixed_expenses ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create materials_stock table (sem supplier_id e updated_at inicialmente)
CREATE TABLE IF NOT EXISTS materials_stock (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    description TEXT,
    quantity INT DEFAULT 0,
    unit_cost NUMERIC,
    category TEXT,
    min_stock_level INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas dinamicamente se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials_stock' AND column_name = 'updated_at') THEN
        ALTER TABLE materials_stock ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials_stock' AND column_name = 'supplier_id') THEN
        ALTER TABLE materials_stock ADD COLUMN supplier_id BIGINT REFERENCES suppliers(id);
    END IF;
END $$;

-- Create payment_fees table
CREATE TABLE IF NOT EXISTS payment_fees (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    payment_type TEXT NOT NULL,
    fee_percentage NUMERIC NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna updated_at se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_fees' AND column_name = 'updated_at') THEN
        ALTER TABLE payment_fees ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. CRIAR ÍNDICES PARA MELHORAR PERFORMANCE

-- Índices nas tabelas existentes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- Adicionar índice para supplier_id apenas se a coluna existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'supplier_id') THEN
        CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Adicionar índice para converted_to_sale apenas se a coluna existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'converted_to_sale') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_converted_to_sale ON orders(converted_to_sale);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_vendas_customer_id ON vendas(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- Índices nas novas tabelas
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_method ON purchases(payment_method);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_category ON fixed_expenses(category);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_recurrence ON fixed_expenses(recurrence);

-- Adicionar índice para supplier_id em purchases apenas se a coluna existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'supplier_id') THEN
        CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
    END IF;
END $$;

-- Adicionar índice para supplier_id em materials_stock apenas se a coluna existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials_stock' AND column_name = 'supplier_id') THEN
        CREATE INDEX IF NOT EXISTS idx_materials_stock_supplier_id ON materials_stock(supplier_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_materials_stock_category ON materials_stock(category);

-- 4. ATIVAR ROW LEVEL SECURITY (RLS) PARA TODAS AS TABELAS

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

-- 5. CRIAR POLÍTICAS DE SEGURANÇA

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

-- 6. INSERIR DADOS INICIAIS

-- Inserir dados iniciais para taxas de pagamento
INSERT INTO payment_fees (payment_type, fee_percentage, description) 
SELECT 'debit', 1.99, 'Taxa para pagamentos com débito à vista'
WHERE NOT EXISTS (SELECT 1 FROM payment_fees WHERE payment_type = 'debit');

INSERT INTO payment_fees (payment_type, fee_percentage, description) 
SELECT 'credit_vista', 3.49, 'Taxa para pagamentos com crédito à vista'
WHERE NOT EXISTS (SELECT 1 FROM payment_fees WHERE payment_type = 'credit_vista');

INSERT INTO payment_fees (payment_type, fee_percentage, description) 
SELECT 'credit_parcelado_2x', 4.99, 'Taxa para pagamentos com crédito em 2x'
WHERE NOT EXISTS (SELECT 1 FROM payment_fees WHERE payment_type = 'credit_parcelado_2x');

INSERT INTO payment_fees (payment_type, fee_percentage, description) 
SELECT 'credit_parcelado_3x', 5.49, 'Taxa para pagamentos com crédito em 3x'
WHERE NOT EXISTS (SELECT 1 FROM payment_fees WHERE payment_type = 'credit_parcelado_3x');

INSERT INTO payment_fees (payment_type, fee_percentage, description) 
SELECT 'credit_parcelado_4x', 5.99, 'Taxa para pagamentos com crédito em 4x'
WHERE NOT EXISTS (SELECT 1 FROM payment_fees WHERE payment_type = 'credit_parcelado_4x');

INSERT INTO payment_fees (payment_type, fee_percentage, description) 
SELECT 'credit_parcelado_5x', 6.49, 'Taxa para pagamentos com crédito em 5x'
WHERE NOT EXISTS (SELECT 1 FROM payment_fees WHERE payment_type = 'credit_parcelado_5x');

INSERT INTO payment_fees (payment_type, fee_percentage, description) 
SELECT 'credit_parcelado_6x', 6.99, 'Taxa para pagamentos com crédito de 6x a 12x'
WHERE NOT EXISTS (SELECT 1 FROM payment_fees WHERE payment_type = 'credit_parcelado_6x');

INSERT INTO payment_fees (payment_type, fee_percentage, description) 
SELECT 'pix', 0.99, 'Taxa para pagamentos com PIX'
WHERE NOT EXISTS (SELECT 1 FROM payment_fees WHERE payment_type = 'pix');

INSERT INTO payment_fees (payment_type, fee_percentage, description) 
SELECT 'dinheiro', 0.00, 'Taxa para pagamentos em dinheiro'
WHERE NOT EXISTS (SELECT 1 FROM payment_fees WHERE payment_type = 'dinheiro');

-- 7. CRIAR FUNÇÕES E VIEWS PARA CÁLCULOS E RELATÓRIOS

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
    cp.profit_value,
    cp.profit_percentage,
    cp.contribution_margin
FROM vendas v
LEFT JOIN customers c ON v.customer_id = c.id
LEFT JOIN LATERAL calculate_profit_margin(v.total_value, v.cost_price) AS cp ON true;

-- View para relatório de fornecedores e estoque
DO $$
BEGIN
    -- Só criar a view se a coluna supplier_id existir
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'supplier_id') THEN
        DROP VIEW IF EXISTS supplier_inventory_report;
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
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.active = true;
    END IF;
END $$;

-- 8. TRIGGERS PARA ATUALIZAR CAMPOS DE AUDITORIA

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas que possuem updated_at
-- Só aplicar triggers se a coluna updated_at existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_products_updated_at ON products;
        CREATE TRIGGER update_products_updated_at 
            BEFORE UPDATE ON products 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
        CREATE TRIGGER update_suppliers_updated_at 
            BEFORE UPDATE ON suppliers 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
        CREATE TRIGGER update_purchases_updated_at 
            BEFORE UPDATE ON purchases 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fixed_expenses' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_fixed_expenses_updated_at ON fixed_expenses;
        CREATE TRIGGER update_fixed_expenses_updated_at 
            BEFORE UPDATE ON fixed_expenses 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials_stock' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_materials_stock_updated_at ON materials_stock;
        CREATE TRIGGER update_materials_stock_updated_at 
            BEFORE UPDATE ON materials_stock 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_fees' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_payment_fees_updated_at ON payment_fees;
        CREATE TRIGGER update_payment_fees_updated_at 
            BEFORE UPDATE ON payment_fees 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;