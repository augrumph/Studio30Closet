-- Script de Teste CRUD para o Schema Studio30 Closet
-- Este script testa as operações CREATE, READ, UPDATE e DELETE em todas as tabelas

-- TESTE PARA SUPPLIERS
DO $$
DECLARE
    supplier_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para suppliers...';
    
    -- CREATE
    INSERT INTO suppliers (name, cnpj, email, phone, address, city, state, notes) 
    VALUES ('Fornecedor Teste', '12345678901234', 'teste@fornecedor.com', '11999999999', 'Rua Teste, 123', 'São Paulo', 'SP', 'Fornecedor para testes')
    RETURNING id INTO supplier_id_test;
    RAISE NOTICE 'CREATE suppliers: OK (ID: %)', supplier_id_test;
    
    -- READ
    PERFORM id, name FROM suppliers WHERE id = supplier_id_test;
    RAISE NOTICE 'READ suppliers: OK';
    
    -- UPDATE
    UPDATE suppliers SET name = 'Fornecedor Teste Atualizado' WHERE id = supplier_id_test;
    RAISE NOTICE 'UPDATE suppliers: OK';
    
    -- DELETE
    DELETE FROM suppliers WHERE id = supplier_id_test;
    RAISE NOTICE 'DELETE suppliers: OK';
    
    RAISE NOTICE 'Teste para suppliers concluído com sucesso!';
END $$;

-- TESTE PARA CUSTOMERS
DO $$
DECLARE
    customer_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para customers...';
    
    -- CREATE
    INSERT INTO customers (name, phone, address, complement, instagram) 
    VALUES ('Cliente Teste', '11988888888', 'Rua Cliente, 456', 'Apto 101', '@cliente.teste')
    RETURNING id INTO customer_id_test;
    RAISE NOTICE 'CREATE customers: OK (ID: %)', customer_id_test;
    
    -- READ
    PERFORM id, name FROM customers WHERE id = customer_id_test;
    RAISE NOTICE 'READ customers: OK';
    
    -- UPDATE
    UPDATE customers SET name = 'Cliente Teste Atualizado' WHERE id = customer_id_test;
    RAISE NOTICE 'UPDATE customers: OK';
    
    -- DELETE
    DELETE FROM customers WHERE id = customer_id_test;
    RAISE NOTICE 'DELETE customers: OK';
    
    RAISE NOTICE 'Teste para customers concluído com sucesso!';
END $$;

-- TESTE PARA PRODUCTS
DO $$
DECLARE
    product_id_test BIGINT;
    supplier_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para products...';
    
    -- Primeiro criar um fornecedor para referenciar
    INSERT INTO suppliers (name, cnpj, email, phone) 
    VALUES ('Fornecedor Produto Teste', '98765432109876', 'produto@fornecedor.com', '11977777777')
    RETURNING id INTO supplier_id_test;
    
    -- CREATE
    INSERT INTO products (name, price, cost_price, description, stock, sizes, images, category, supplier_id) 
    VALUES ('Produto Teste', 100.00, 50.00, 'Produto para testes', 10, '["P", "M", "G"]', '["produto.jpg"]', 'Vestidos', supplier_id_test)
    RETURNING id INTO product_id_test;
    RAISE NOTICE 'CREATE products: OK (ID: %)', product_id_test;
    
    -- READ
    PERFORM id, name FROM products WHERE id = product_id_test;
    RAISE NOTICE 'READ products: OK';
    
    -- UPDATE
    UPDATE products SET name = 'Produto Teste Atualizado' WHERE id = product_id_test;
    RAISE NOTICE 'UPDATE products: OK';
    
    -- DELETE
    DELETE FROM products WHERE id = product_id_test;
    DELETE FROM suppliers WHERE id = supplier_id_test; -- Limpar o fornecedor criado
    RAISE NOTICE 'DELETE products: OK';
    
    RAISE NOTICE 'Teste para products concluído com sucesso!';
END $$;

-- TESTE PARA ORDERS
DO $$
DECLARE
    order_id_test BIGINT;
    customer_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para orders...';
    
    -- Primeiro criar um cliente para referenciar
    INSERT INTO customers (name, phone) 
    VALUES ('Cliente Pedido Teste', '11966666666')
    RETURNING id INTO customer_id_test;
    
    -- CREATE
    INSERT INTO orders (customer_id, status, total_value, delivery_date, pickup_date) 
    VALUES (customer_id_test, 'pending', 250.00, NOW() + INTERVAL '7 days', NOW() + INTERVAL '14 days')
    RETURNING id INTO order_id_test;
    RAISE NOTICE 'CREATE orders: OK (ID: %)', order_id_test;
    
    -- READ
    PERFORM id, status FROM orders WHERE id = order_id_test;
    RAISE NOTICE 'READ orders: OK';
    
    -- UPDATE
    UPDATE orders SET status = 'shipped' WHERE id = order_id_test;
    RAISE NOTICE 'UPDATE orders: OK';
    
    -- DELETE
    DELETE FROM orders WHERE id = order_id_test;
    DELETE FROM customers WHERE id = customer_id_test; -- Limpar o cliente criado
    RAISE NOTICE 'DELETE orders: OK';
    
    RAISE NOTICE 'Teste para orders concluído com sucesso!';
END $$;

-- TESTE PARA ORDER_ITEMS
DO $$
DECLARE
    order_item_id_test BIGINT;
    order_id_test BIGINT;
    product_id_test BIGINT;
    customer_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para order_items...';
    
    -- Criar dependências
    INSERT INTO customers (name, phone) 
    VALUES ('Cliente Item Teste', '11955555555')
    RETURNING id INTO customer_id_test;
    
    INSERT INTO orders (customer_id, status, total_value) 
    VALUES (customer_id_test, 'pending', 150.00)
    RETURNING id INTO order_id_test;
    
    INSERT INTO products (name, price, stock) 
    VALUES ('Produto Item Teste', 75.00, 5)
    RETURNING id INTO product_id_test;
    
    -- CREATE
    INSERT INTO order_items (order_id, product_id, quantity, price_at_time, size_selected) 
    VALUES (order_id_test, product_id_test, 2, 75.00, 'M')
    RETURNING id INTO order_item_id_test;
    RAISE NOTICE 'CREATE order_items: OK (ID: %)', order_item_id_test;
    
    -- READ
    PERFORM id, quantity FROM order_items WHERE id = order_item_id_test;
    RAISE NOTICE 'READ order_items: OK';
    
    -- UPDATE
    UPDATE order_items SET quantity = 3 WHERE id = order_item_id_test;
    RAISE NOTICE 'UPDATE order_items: OK';
    
    -- DELETE
    DELETE FROM order_items WHERE id = order_item_id_test;
    DELETE FROM orders WHERE id = order_id_test;
    DELETE FROM products WHERE id = product_id_test;
    DELETE FROM customers WHERE id = customer_id_test; -- Limpar todas as dependências
    RAISE NOTICE 'DELETE order_items: OK';
    
    RAISE NOTICE 'Teste para order_items concluído com sucesso!';
END $$;

-- TESTE PARA VENDAS
DO $$
DECLARE
    venda_id_test BIGINT;
    order_id_test BIGINT;
    customer_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para vendas...';
    
    -- Criar dependências
    INSERT INTO customers (name, phone) 
    VALUES ('Cliente Venda Teste', '11944444444')
    RETURNING id INTO customer_id_test;
    
    INSERT INTO orders (customer_id, status, total_value) 
    VALUES (customer_id_test, 'completed', 300.00)
    RETURNING id INTO order_id_test;
    
    -- CREATE
    INSERT INTO vendas (order_id, customer_id, total_value, cost_price, items, payment_method) 
    VALUES (order_id_test, customer_id_test, 300.00, 180.00, '[{"productId": 1, "quantity": 2}]', 'credit_vista')
    RETURNING id INTO venda_id_test;
    RAISE NOTICE 'CREATE vendas: OK (ID: %)', venda_id_test;
    
    -- READ
    PERFORM id, total_value FROM vendas WHERE id = venda_id_test;
    RAISE NOTICE 'READ vendas: OK';
    
    -- UPDATE
    UPDATE vendas SET total_value = 320.00 WHERE id = venda_id_test;
    RAISE NOTICE 'UPDATE vendas: OK';
    
    -- DELETE
    DELETE FROM vendas WHERE id = venda_id_test;
    DELETE FROM orders WHERE id = order_id_test;
    DELETE FROM customers WHERE id = customer_id_test; -- Limpar dependências
    RAISE NOTICE 'DELETE vendas: OK';
    
    RAISE NOTICE 'Teste para vendas concluído com sucesso!';
END $$;

-- TESTE PARA COUPONS
DO $$
DECLARE
    coupon_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para coupons...';
    
    -- CREATE
    INSERT INTO coupons (code, discount_type, discount_value, usage_count, is_active) 
    VALUES ('TEST10OFF', 'percentage', 10.00, 0, true)
    RETURNING id INTO coupon_id_test;
    RAISE NOTICE 'CREATE coupons: OK (ID: %)', coupon_id_test;
    
    -- READ
    PERFORM id, code FROM coupons WHERE id = coupon_id_test;
    RAISE NOTICE 'READ coupons: OK';
    
    -- UPDATE
    UPDATE coupons SET discount_value = 15.00 WHERE id = coupon_id_test;
    RAISE NOTICE 'UPDATE coupons: OK';
    
    -- DELETE
    DELETE FROM coupons WHERE id = coupon_id_test;
    RAISE NOTICE 'DELETE coupons: OK';
    
    RAISE NOTICE 'Teste para coupons concluído com sucesso!';
END $$;

-- TESTE PARA SETTINGS
DO $$
DECLARE
    setting_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para settings...';
    
    -- CREATE
    INSERT INTO settings (setting_key, value) 
    VALUES ('test_setting', '{"value": "test_value", "enabled": true}')
    RETURNING id INTO setting_id_test;
    RAISE NOTICE 'CREATE settings: OK (ID: %)', setting_id_test;
    
    -- READ
    PERFORM id, setting_key FROM settings WHERE id = setting_id_test;
    RAISE NOTICE 'READ settings: OK';
    
    -- UPDATE
    UPDATE settings SET value = '{"value": "updated_test_value", "enabled": false}' WHERE id = setting_id_test;
    RAISE NOTICE 'UPDATE settings: OK';
    
    -- DELETE
    DELETE FROM settings WHERE id = setting_id_test;
    RAISE NOTICE 'DELETE settings: OK';
    
    RAISE NOTICE 'Teste para settings concluído com sucesso!';
END $$;

-- TESTE PARA PURCHASES
DO $$
DECLARE
    purchase_id_test BIGINT;
    supplier_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para purchases...';
    
    -- Criar fornecedor para referenciar
    INSERT INTO suppliers (name, cnpj, email, phone) 
    VALUES ('Fornecedor Compra Teste', '11122233344455', 'compra@fornecedor.com', '11933333333')
    RETURNING id INTO supplier_id_test;
    
    -- CREATE
    INSERT INTO purchases (supplier_id, value, date, payment_method, pieces, notes) 
    VALUES (supplier_id_test, 500.00, CURRENT_DATE, 'pix', 10, 'Compra para testes')
    RETURNING id INTO purchase_id_test;
    RAISE NOTICE 'CREATE purchases: OK (ID: %)', purchase_id_test;
    
    -- READ
    PERFORM id, value FROM purchases WHERE id = purchase_id_test;
    RAISE NOTICE 'READ purchases: OK';
    
    -- UPDATE
    UPDATE purchases SET value = 550.00 WHERE id = purchase_id_test;
    RAISE NOTICE 'UPDATE purchases: OK';
    
    -- DELETE
    DELETE FROM purchases WHERE id = purchase_id_test;
    DELETE FROM suppliers WHERE id = supplier_id_test; -- Limpar dependência
    RAISE NOTICE 'DELETE purchases: OK';
    
    RAISE NOTICE 'Teste para purchases concluído com sucesso!';
END $$;

-- TESTE PARA FIXED_EXPENSES
DO $$
DECLARE
    expense_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para fixed_expenses...';
    
    -- CREATE
    INSERT INTO fixed_expenses (name, value, category, recurrence, due_day, paid, notes) 
    VALUES ('Conta Teste', 200.00, 'Aluguel', 'monthly', 10, false, 'Conta para testes')
    RETURNING id INTO expense_id_test;
    RAISE NOTICE 'CREATE fixed_expenses: OK (ID: %)', expense_id_test;
    
    -- READ
    PERFORM id, name FROM fixed_expenses WHERE id = expense_id_test;
    RAISE NOTICE 'READ fixed_expenses: OK';
    
    -- UPDATE
    UPDATE fixed_expenses SET value = 220.00 WHERE id = expense_id_test;
    RAISE NOTICE 'UPDATE fixed_expenses: OK';
    
    -- DELETE
    DELETE FROM fixed_expenses WHERE id = expense_id_test;
    RAISE NOTICE 'DELETE fixed_expenses: OK';
    
    RAISE NOTICE 'Teste para fixed_expenses concluído com sucesso!';
END $$;

-- TESTE PARA MATERIALS_STOCK
DO $$
DECLARE
    material_id_test BIGINT;
    supplier_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para materials_stock...';
    
    -- Criar fornecedor para referenciar
    INSERT INTO suppliers (name, cnpj, email, phone) 
    VALUES ('Fornecedor Material Teste', '55566677788899', 'material@fornecedor.com', '11922222222')
    RETURNING id INTO supplier_id_test;
    
    -- CREATE
    INSERT INTO materials_stock (name, description, quantity, unit_cost, category, supplier_id, min_stock_level) 
    VALUES ('Material Teste', 'Material para testes', 100, 5.00, 'Tecido', supplier_id_test, 10)
    RETURNING id INTO material_id_test;
    RAISE NOTICE 'CREATE materials_stock: OK (ID: %)', material_id_test;
    
    -- READ
    PERFORM id, name FROM materials_stock WHERE id = material_id_test;
    RAISE NOTICE 'READ materials_stock: OK';
    
    -- UPDATE
    UPDATE materials_stock SET quantity = 95 WHERE id = material_id_test;
    RAISE NOTICE 'UPDATE materials_stock: OK';
    
    -- DELETE
    DELETE FROM materials_stock WHERE id = material_id_test;
    DELETE FROM suppliers WHERE id = supplier_id_test; -- Limpar dependência
    RAISE NOTICE 'DELETE materials_stock: OK';
    
    RAISE NOTICE 'Teste para materials_stock concluído com sucesso!';
END $$;

-- TESTE PARA PAYMENT_FEES
DO $$
DECLARE
    fee_id_test BIGINT;
BEGIN
    RAISE NOTICE 'Iniciando teste para payment_fees...';
    
    -- CREATE
    INSERT INTO payment_fees (payment_type, fee_percentage, description, active) 
    VALUES ('test_method', 2.50, 'Método de teste', true)
    RETURNING id INTO fee_id_test;
    RAISE NOTICE 'CREATE payment_fees: OK (ID: %)', fee_id_test;
    
    -- READ
    PERFORM id, payment_type FROM payment_fees WHERE id = fee_id_test;
    RAISE NOTICE 'READ payment_fees: OK';
    
    -- UPDATE
    UPDATE payment_fees SET fee_percentage = 3.00 WHERE id = fee_id_test;
    RAISE NOTICE 'UPDATE payment_fees: OK';
    
    -- DELETE
    DELETE FROM payment_fees WHERE id = fee_id_test;
    RAISE NOTICE 'DELETE payment_fees: OK';
    
    RAISE NOTICE 'Teste para payment_fees concluído com sucesso!';
END $$;

-- TESTE FINAL - Consultar todas as views
DO $$
BEGIN
    RAISE NOTICE 'Iniciando teste para views...';
    
    -- Testar se as views existem e podem ser consultadas
    PERFORM * FROM sales_report LIMIT 1;
    RAISE NOTICE 'Consulta à view sales_report: OK';
    
    -- A view supplier_inventory_report só existe se a coluna supplier_id existir em products
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'supplier_id') THEN
        PERFORM * FROM supplier_inventory_report LIMIT 1;
        RAISE NOTICE 'Consulta à view supplier_inventory_report: OK';
    ELSE
        RAISE NOTICE 'View supplier_inventory_report não foi criada (coluna supplier_id em products não encontrada)';
    END IF;
    
    -- Testar função
    PERFORM * FROM calculate_profit_margin(100.00, 60.00);
    RAISE NOTICE 'Chamada à função calculate_profit_margin: OK';
    
    RAISE NOTICE 'Teste para views e funções concluído com sucesso!';
END $$;

RAISE NOTICE '*** Todos os testes CRUD foram executados com sucesso! ***';
RAISE NOTICE 'O schema Studio30 Closet está funcionando corretamente no Supabase.';