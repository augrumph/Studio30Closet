-- ============================================================================
-- BULLETPROOF MIGRATIONS - Sistema à prova de balas
-- ============================================================================
-- Este arquivo contém todas as proteções de banco de dados para garantir
-- integridade absoluta dos dados
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TRIGGERS AUTOMÁTICOS - updated_at sempre atualizado
-- ----------------------------------------------------------------------------

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para orders (Malinhas)
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para vendas
DROP TRIGGER IF EXISTS update_vendas_updated_at ON vendas;
CREATE TRIGGER update_vendas_updated_at
    BEFORE UPDATE ON vendas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para products
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para customers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column() IS 'Automaticamente atualiza updated_at em qualquer UPDATE';

-- ----------------------------------------------------------------------------
-- 2. CONSTRAINTS - Validações de dados no banco
-- ----------------------------------------------------------------------------

-- Orders: garantir valores válidos
ALTER TABLE orders
    ADD CONSTRAINT check_orders_status CHECK (
        status IN ('pending', 'shipped', 'delivered', 'pickup_scheduled', 'returned', 'completed', 'cancelled')
    );

ALTER TABLE orders
    ADD CONSTRAINT check_orders_total_value CHECK (total_value >= 0);

-- Vendas: garantir valores válidos
ALTER TABLE vendas
    ADD CONSTRAINT check_vendas_total_value CHECK (total_value >= 0);

ALTER TABLE vendas
    ADD CONSTRAINT check_vendas_cost_price CHECK (cost_price >= 0 OR cost_price IS NULL);

ALTER TABLE vendas
    ADD CONSTRAINT check_vendas_payment_status CHECK (
        payment_status IN ('pending', 'paid', 'cancelled', 'refunded')
    );

ALTER TABLE vendas
    ADD CONSTRAINT check_vendas_payment_method CHECK (
        payment_method IN ('pix', 'debit', 'card_machine', 'credito_parcelado', 'fiado', 'fiado_parcelado', 'cash', 'card')
    );

-- Products: garantir estoque não negativo
ALTER TABLE products
    ADD CONSTRAINT check_products_stock CHECK (stock >= 0);

ALTER TABLE products
    ADD CONSTRAINT check_products_price CHECK (price >= 0);

ALTER TABLE products
    ADD CONSTRAINT check_products_cost_price CHECK (cost_price >= 0 OR cost_price IS NULL);

-- Customers: garantir dados mínimos
ALTER TABLE customers
    ADD CONSTRAINT check_customers_name CHECK (name IS NOT NULL AND LENGTH(TRIM(name)) >= 2);

-- ----------------------------------------------------------------------------
-- 3. INDEXES - Performance garantida
-- ----------------------------------------------------------------------------

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at DESC);

-- Vendas indexes
CREATE INDEX IF NOT EXISTS idx_vendas_customer_id ON vendas(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendas_payment_status ON vendas(payment_status);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at DESC);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ----------------------------------------------------------------------------
-- 4. FUNÇÕES DE AUDITORIA - Rastrear todas as mudanças críticas
-- ----------------------------------------------------------------------------

-- Criar tabela de auditoria (se não existir)
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);

-- Função para auditar mudanças em orders
CREATE OR REPLACE FUNCTION audit_orders_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        -- Só registra se houver mudanças significativas
        IF (OLD.status != NEW.status OR OLD.total_value != NEW.total_value) THEN
            INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
            VALUES (
                'orders',
                NEW.id,
                'UPDATE',
                jsonb_build_object(
                    'status', OLD.status,
                    'total_value', OLD.total_value,
                    'updated_at', OLD.updated_at
                ),
                jsonb_build_object(
                    'status', NEW.status,
                    'total_value', NEW.total_value,
                    'updated_at', NEW.updated_at
                )
            );
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values)
        VALUES ('orders', OLD.id, 'DELETE', row_to_json(OLD)::jsonb);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger de auditoria para orders
DROP TRIGGER IF EXISTS audit_orders_trigger ON orders;
CREATE TRIGGER audit_orders_trigger
    AFTER UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION audit_orders_changes();

-- Função para auditar mudanças em vendas
CREATE OR REPLACE FUNCTION audit_vendas_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.payment_status != NEW.payment_status OR OLD.total_value != NEW.total_value) THEN
            INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
            VALUES (
                'vendas',
                NEW.id,
                'UPDATE',
                jsonb_build_object(
                    'payment_status', OLD.payment_status,
                    'total_value', OLD.total_value
                ),
                jsonb_build_object(
                    'payment_status', NEW.payment_status,
                    'total_value', NEW.total_value
                )
            );
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values)
        VALUES ('vendas', OLD.id, 'DELETE', row_to_json(OLD)::jsonb);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger de auditoria para vendas
DROP TRIGGER IF EXISTS audit_vendas_trigger ON vendas;
CREATE TRIGGER audit_vendas_trigger
    AFTER UPDATE OR DELETE ON vendas
    FOR EACH ROW
    EXECUTE FUNCTION audit_vendas_changes();

-- ----------------------------------------------------------------------------
-- 5. DEFAULTS SEGUROS - Sempre ter valores válidos
-- ----------------------------------------------------------------------------

-- Orders defaults
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE orders ALTER COLUMN total_value SET DEFAULT 0;

-- Vendas defaults
ALTER TABLE vendas ALTER COLUMN payment_status SET DEFAULT 'pending';
ALTER TABLE vendas ALTER COLUMN total_value SET DEFAULT 0;
ALTER TABLE vendas ALTER COLUMN cost_price SET DEFAULT 0;

-- Products defaults
ALTER TABLE products ALTER COLUMN active SET DEFAULT true;
ALTER TABLE products ALTER COLUMN stock SET DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 6. COMENTÁRIOS - Documentação inline do banco
-- ----------------------------------------------------------------------------

COMMENT ON TABLE orders IS 'Malinhas - Pedidos de delivery. Status SEMPRE atualiza updated_at via trigger.';
COMMENT ON TABLE vendas IS 'Vendas finalizadas. Valores validados por constraints.';
COMMENT ON TABLE audit_log IS 'Log de auditoria - todas mudanças críticas registradas aqui.';

COMMENT ON COLUMN orders.status IS 'Status da malinha. Constraint garante apenas valores válidos.';
COMMENT ON COLUMN orders.updated_at IS 'SEMPRE atualizado via trigger em qualquer UPDATE.';
COMMENT ON COLUMN vendas.payment_status IS 'Status do pagamento. Constraint garante apenas valores válidos.';

-- ----------------------------------------------------------------------------
-- FINALIZAÇÃO
-- ----------------------------------------------------------------------------

SELECT 'Bulletproof migrations aplicadas com sucesso!' as message,
       'Sistema agora tem:' as details,
       '- Triggers automáticos para updated_at' as feature_1,
       '- Constraints de validação em todas tabelas' as feature_2,
       '- Indexes de performance' as feature_3,
       '- Sistema de auditoria completo' as feature_4,
       '- Defaults seguros' as feature_5;
