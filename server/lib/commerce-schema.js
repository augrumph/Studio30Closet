import { pool } from '../db.js'

export async function ensureCommerceSchema() {
    await pool.query(`
        ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC DEFAULT 0.3;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS height_cm NUMERIC DEFAULT 2;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS width_cm NUMERIC DEFAULT 25;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS length_cm NUMERIC DEFAULT 35;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS ncm TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS cfop TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS cest TEXT;

        ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'malinha';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'not_started';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS fiscal_status TEXT DEFAULT 'not_issued';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_value NUMERIC DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_value NUMERIC DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMP;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_snapshot JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_quote JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS abacate_checkout_id TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS abacate_payment_url TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS melhor_envio_service_id TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS melhor_envio_order_id TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS melhor_envio_tracking_code TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS melhor_envio_label_url TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS nfe_id TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS nfe_access_key TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS nfe_xml_url TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS nfe_pdf_url TEXT;

        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_snapshot JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS weight_kg NUMERIC DEFAULT 0.3;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS height_cm NUMERIC DEFAULT 2;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS width_cm NUMERIC DEFAULT 25;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS length_cm NUMERIC DEFAULT 35;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sku TEXT;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS ncm TEXT;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cfop TEXT;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cest TEXT;

        CREATE TABLE IF NOT EXISTS stock_reservations (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id),
            quantity INTEGER NOT NULL CHECK (quantity > 0),
            selected_size TEXT,
            selected_color TEXT,
            status TEXT NOT NULL DEFAULT 'reserved',
            reserved_at TIMESTAMP NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL,
            confirmed_at TIMESTAMP,
            released_at TIMESTAMP,
            release_reason TEXT
        );

        CREATE TABLE IF NOT EXISTS payment_events (
            id SERIAL PRIMARY KEY,
            provider TEXT NOT NULL,
            event_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            order_id INTEGER REFERENCES orders(id),
            payload JSONB NOT NULL,
            processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(provider, event_id)
        );

        CREATE TABLE IF NOT EXISTS order_events (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL,
            message TEXT,
            payload JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS shipment_events (
            id SERIAL PRIMARY KEY,
            provider TEXT NOT NULL,
            provider_event_id TEXT,
            melhor_envio_order_id TEXT,
            order_id INTEGER REFERENCES orders(id),
            payload JSONB NOT NULL,
            processed_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
        CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
        CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
        CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);
        CREATE INDEX IF NOT EXISTS idx_stock_reservations_order ON stock_reservations(order_id);
        CREATE INDEX IF NOT EXISTS idx_stock_reservations_expiry ON stock_reservations(status, expires_at);

        ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_orders_status;
        ALTER TABLE orders ADD CONSTRAINT check_orders_status CHECK (
            status IN (
                'pending', 'shipped', 'delivered', 'pickup_scheduled', 'returned',
                'completed', 'cancelled', 'awaiting_payment', 'paid',
                'invoice_issued', 'separating', 'label_generated'
            )
        );

        ALTER TABLE vendas DROP CONSTRAINT IF EXISTS check_vendas_payment_method;
        ALTER TABLE vendas ADD CONSTRAINT check_vendas_payment_method CHECK (
            payment_method IN (
                'pending_decision', 'pix', 'debit', 'card_machine', 'credito_parcelado',
                'fiado', 'fiado_parcelado', 'cash', 'card', 'abacate_pay'
            )
        );

        -- ── Fraud prevention ─────────────────────────────────────────────────

        -- Log de avaliações de risco por pedido
        CREATE TABLE IF NOT EXISTS fraud_risk_log (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
            customer_cpf TEXT,
            customer_email TEXT,
            risk_score INTEGER,
            risk_action TEXT,
            signals JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Lista de entidades bloqueadas (CPF, email, telefone, endereço)
        CREATE TABLE IF NOT EXISTS blocked_entities (
            id SERIAL PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_value TEXT NOT NULL,
            reason TEXT,
            blocked_by TEXT DEFAULT 'manual',
            blocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(entity_type, entity_value)
        );

        -- Colunas de risco nos pedidos
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS fraud_score INTEGER;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS fraud_action TEXT DEFAULT 'allow';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS fraud_signals JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_approved_at TIMESTAMP;

        -- Fluxo de devolução/troca
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT 'none';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMP;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_received_at TIMESTAMP;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_inspected_at TIMESTAMP;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_notes TEXT;

        -- Índices de fraude
        CREATE INDEX IF NOT EXISTS idx_fraud_risk_log_order ON fraud_risk_log(order_id);
        CREATE INDEX IF NOT EXISTS idx_fraud_risk_log_cpf ON fraud_risk_log(customer_cpf);
        CREATE INDEX IF NOT EXISTS idx_blocked_entities_lookup ON blocked_entities(entity_type, entity_value);
        CREATE INDEX IF NOT EXISTS idx_orders_fraud_action ON orders(fraud_action) WHERE fraud_action = 'review';
        CREATE INDEX IF NOT EXISTS idx_orders_return_status ON orders(return_status) WHERE return_status <> 'none';

        -- ── Integration settings (admin configurável via painel) ──────────────
        CREATE TABLE IF NOT EXISTS integration_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `)
}
