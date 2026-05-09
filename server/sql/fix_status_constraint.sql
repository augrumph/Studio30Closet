-- Remove a constraint antiga e restritiva que impedia status como 'delivered' ou 'pickup_scheduled'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Nota: A constraint 'check_orders_status' (com os 7 status corretos) já existe
-- e foi adicionada via bulletproof-migrations.sql.
