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
    active BOOLEAN,
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
    key TEXT NOT NULL UNIQUE,
    value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for products
CREATE POLICY "Public can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Admin can do all on products" ON products FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies for customers
CREATE POLICY "Admin can do all on customers" ON customers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies for orders
CREATE POLICY "Admin can do all on orders" ON orders FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies for order_items
CREATE POLICY "Admin can do all on order_items" ON order_items FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies for vendas
CREATE POLICY "Admin can do all on vendas" ON vendas FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies for coupons
CREATE POLICY "Admin can do all on coupons" ON coupons FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policies for settings
CREATE POLICY "Public can read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Admin can do all on settings" ON settings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
