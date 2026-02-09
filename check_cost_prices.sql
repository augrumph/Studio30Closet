-- Verificar produtos sem preço de custo
SELECT 
    id,
    name,
    price,
    cost_price,
    CASE 
        WHEN cost_price IS NULL THEN 'NULL'
        WHEN cost_price = 0 THEN 'ZERO'
        ELSE 'OK'
    END as status
FROM products
WHERE cost_price IS NULL OR cost_price = 0
ORDER BY id;

-- Contar total
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN cost_price IS NULL OR cost_price = 0 THEN 1 END) as missing_cost_price,
    COUNT(CASE WHEN cost_price > 0 THEN 1 END) as with_cost_price
FROM products;
