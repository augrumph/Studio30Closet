import { supabase } from './supabase'

// ==================== HELPER FUNCTIONS ====================

// Converter camelCase para snake_case
function toSnakeCase(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => toSnakeCase(item));
    }

    const snakeObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeObj[snakeKey] = typeof value === 'object' && !Array.isArray(value) && value !== null
            ? toSnakeCase(value)
            : value;
    }
    return snakeObj;
}

// ⚡ Converter snake_case para camelCase - OTIMIZADO
// Não processa arrays de primitivos (strings/números)
function toCamelCase(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        // Se é array de strings/primitivos, retorna direto (comum em images URLs)
        if (obj.length === 0 || typeof obj[0] !== 'object') {
            return obj;
        }
        // Caso contrário, processa cada objeto
        return obj.map(item => typeof item === 'object' ? toCamelCase(item) : item);
    }

    const camelObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

        if (value === null || value === undefined || typeof value !== 'object') {
            // Primitivos: copia direto
            camelObj[camelKey] = value;
        } else if (Array.isArray(value)) {
            // Arrays: só processa se contém objetos
            camelObj[camelKey] = typeof value[0] === 'object'
                ? value.map(item => typeof item === 'object' ? toCamelCase(item) : item)
                : value;
        } else {
            // Objetos: converte recursivamente
            camelObj[camelKey] = toCamelCase(value);
        }
    }
    return camelObj;
}

// ==================== PRODUCTS ====================

// ⚡ OTIMIZADO: Carregar produtos em LOTES (paginação no servidor)
export async function getProducts(page = 1, pageSize = 20) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    console.log(`📡 Buscando produtos página ${page} (${start}-${end})...`);

    const { data, error, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end);

    if (error) {
        console.error('❌ Erro ao buscar produtos:', error);
        throw error;
    }

    console.log(`✅ Produtos carregados: ${data?.length} de ${count} total`);

    return {
        products: data.map(product => {
            const camelProduct = toCamelCase(product);
            // Garantir que variants é um array
            if (!camelProduct.variants) {
                camelProduct.variants = [];
            }
            return camelProduct;
        }),
        total: count,
        page,
        pageSize
    };
}

// ⚡ Catálogo: Carregar todos os produtos
export async function getAllProducts() {
    const startTime = performance.now();
    console.log('📡 [Catálogo] Carregando todos os produtos...');

    const queryStart = performance.now();
    // Selecionar apenas campos essenciais para catálogo (sem colunas pesadas)
    const { data, error } = await supabase
        .from('products')
        .select('id, name, price, original_price, images, category, is_new, is_featured, sizes, color, variants, stock, description')
        .order('created_at', { ascending: false });

    const queryTime = (performance.now() - queryStart).toFixed(0);

    if (error) {
        console.error('❌ [Catálogo] Erro na query:', error);
        throw error;
    }

    console.log(`⏱️  [Catálogo] Query Supabase: ${queryTime}ms (${data?.length} produtos encontrados)`);

    // Converter para camelCase
    const convertStart = performance.now();
    const result = data
        .map(product => {
            const camel = toCamelCase(product);
            // Garantir que variants é um array (se existir na tabela)
            if (!camel.variants) {
                camel.variants = [];
            }
            return camel;
        });
    // Já vem ordenado do banco (order_by), não precisa fazer sort em JS
    const convertTime = (performance.now() - convertStart).toFixed(0);

    console.log(`⏱️  [Catálogo] Processamento: ${convertTime}ms`);

    const totalTime = (performance.now() - startTime).toFixed(0);
    console.log(`✅ [Catálogo] Total: ${totalTime}ms (${result.length} produtos carregados)`);

    return result;
}

export async function getProductById(id) {
    // Carregar todos os dados quando é um acesso individual (modal de detalhe)
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return toCamelCase(data);
}

export async function createProduct(productData) {
    const snakeData = toSnakeCase(productData);

    // Log para debug
    console.log('Dados sendo enviados:', snakeData);

    const { data, error } = await supabase
        .from('products')
        .insert([snakeData])
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar produto:', error);
        throw error;
    }

    return toCamelCase(data);
}

export async function updateProduct(id, productData) {
    console.log('API: Updating product with id:', id, 'and data:', productData);
    const snakeData = toSnakeCase(productData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const productRecord = {
        name: snakeData.name,
        price: snakeData.price,
        cost_price: snakeData.costPrice || snakeData.cost_price,
        description: snakeData.description,
        stock: snakeData.stock,
        sizes: snakeData.sizes,
        images: snakeData.images,
        category: snakeData.category,
        is_featured: snakeData.isFeatured || snakeData.is_featured,
        active: snakeData.active,
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        color: snakeData.color,
        variants: snakeData.variants,
        is_new: snakeData.isNew || snakeData.is_new,
        original_price: snakeData.originalPrice || snakeData.original_price
    };

    console.log('API: Prepared record for update:', productRecord);

    const { data, error } = await supabase
        .from('products')
        .update(productRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating product:', error);
        throw error;
    }
    console.log('API: Updated product:', data);
    return toCamelCase(data);
}

export async function deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
}

export async function deleteMultipleProducts(productIds) {
    const { error } = await supabase.from('products').delete().in('id', productIds);
    if (error) throw error;
    return true;
}

// ==================== CUSTOMERS ====================

export async function getCustomers(page = 1, limit = 50) {
    console.log(`🔍 API: Getting customers (page ${page}, limit ${limit})...`);
    const offset = (page - 1) * limit;
    const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('❌ API Error getting customers:', error);
        throw error;
    }
    console.log(`✅ API: Got ${data?.length || 0} customers (total: ${count})`);
    return {
        customers: data.map(toCamelCase),
        total: count,
        page,
        limit
    };
}

export async function getCustomerById(id) {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createCustomer(customerData) {
    console.log('API: Creating customer with data:', customerData);
    const snakeData = toSnakeCase(customerData);
    console.log('API: Converted to snake_case:', snakeData);
    const { data, error } = await supabase.from('customers').insert([snakeData]).select().single();
    if (error) {
        console.error('API Error creating customer:', error);
        throw error;
    }
    console.log('API: Created customer:', data);
    return toCamelCase(data);
}

export async function updateCustomer(id, customerData) {
    console.log('API: Updating customer with id:', id, 'and data:', customerData);
    const snakeData = toSnakeCase(customerData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const customerRecord = {
        name: snakeData.name,
        phone: snakeData.phone,
        email: snakeData.email || null,
        cpf: snakeData.cpf || null,
        address: snakeData.address || null,
        complement: snakeData.complement || null,
        instagram: snakeData.instagram || null,
        addresses: snakeData.addresses || []
    };

    console.log('API: Prepared record for update:', customerRecord);

    const { data, error } = await supabase
        .from('customers')
        .update(customerRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating customer:', error);
        throw error;
    }
    console.log('API: Updated customer:', data);
    return toCamelCase(data);
}

export async function deleteCustomer(id) {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== ORDERS ====================

export async function getOrders(page = 1, limit = 30) {
    console.log(`🔍 API: Getting orders (page ${page}, limit ${limit})...`);
    const offset = (page - 1) * limit;
    const { data, error, count } = await supabase
        .from('orders')
        .select('id, customer_id, status, total_value, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('❌ API Error getting orders:', error);
        throw error;
    }

    console.log(`✅ API: Got ${data?.length || 0} orders (total: ${count})`);

    const camelCasedData = data.map(toCamelCase);

    // Buscar dados dos clientes para cada pedido
    const ordersWithCustomers = await Promise.all(
        camelCasedData.map(async (order) => {
            let customer = null;

            if (order.customerId) {
                const { data: customerData } = await supabase
                    .from('customers')
                    .select('id, name, phone')
                    .eq('id', order.customerId)
                    .single();

                if (customerData) {
                    customer = toCamelCase(customerData);
                }
            }

            return {
                ...order,
                orderNumber: `#${String(order.id).padStart(6, '0')}`,
                customer: customer
            };
        })
    );

    return {
        orders: ordersWithCustomers,
        total: count,
        page,
        limit
    };
}

export async function getOrderById(id) {
    console.log('📥 API: Fetching order with id:', id);

    const { data, error } = await supabase
        .from('orders')
        .select('*, order_items ( * )')
        .eq('id', id)
        .single();

    if (error) {
        console.error('❌ ERROR fetching order:', error);
        throw error;
    }

    console.log('✅ Raw order data:', data);
    console.log('📦 Order items count:', data.order_items?.length || 0);
    console.log('📦 Raw order_items:', data.order_items);
    if (data.order_items && data.order_items.length > 0) {
        console.log('📦 Primeiro item RAW:', data.order_items[0]);
    }

    const camelData = toCamelCase(data);

    // Buscar dados do cliente usando customer_id
    if (camelData.customerId) {
        console.log('👤 Buscando cliente com ID:', camelData.customerId);
        const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', camelData.customerId)
            .single();

        if (customerError) {
            console.warn('⚠️ Erro ao buscar cliente:', customerError);
        } else if (customerData) {
            console.log('✅ Cliente encontrado:', customerData);
            camelData.customer = toCamelCase(customerData);
        }
    } else {
        console.warn('⚠️ Order sem customer_id:', camelData.id);
    }

    console.log('📦 Camel cased order_items:', camelData.orderItems);
    if (camelData.orderItems && camelData.orderItems.length > 0) {
        console.log('📦 Primeiro item CAMELCASE:', camelData.orderItems[0]);
        console.log('📦 productId do primeiro:', camelData.orderItems[0].productId);
    }

    // Mapear order_items para items com informações completas do produto
    if (camelData.orderItems && camelData.orderItems.length > 0) {
        console.log('🔄 Processing order items...');

        // Buscar informações completas dos produtos
        const productIds = [...new Set(camelData.orderItems.map(item => item.productId).filter(id => id))];

        console.log('📦 Product IDs encontrados:', productIds);

        let products = {};

        // Se encontrou product_ids, buscar dados dos produtos
        if (productIds.length > 0) {
            console.log('📦 Fetching product data for IDs:', productIds);
            console.log('📦 IDs tipos:', productIds.map(id => typeof id));
            try {
                // Garantir que os IDs são números
                const numericIds = productIds.map(id => parseInt(id));
                console.log('📦 Numeric IDs:', numericIds);

                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('id, name, images, price, cost_price, description, stock, sizes, color, category')
                    .in('id', numericIds);

                console.log('✅ Query result - Error:', productsError);
                console.log('✅ Query result - Data:', productsData);

                if (productsError) {
                    console.warn('⚠️ Aviso ao buscar produtos:', productsError);
                    // Não lançar erro, continuar com placeholder
                } else if (productsData && productsData.length > 0) {
                    console.log('✅ Products fetched successfully:', productsData);
                    products = productsData.reduce((acc, p) => {
                        acc[p.id] = toCamelCase(p);
                        return acc;
                    }, {});
                    console.log('✅ Products map created:', products);
                } else {
                    console.warn('⚠️ Nenhum produto encontrado para os IDs:', numericIds);
                }
            } catch (err) {
                console.warn('⚠️ Exceção ao buscar produtos (continuando com placeholders):', err);
            }
        } else {
            console.warn('⚠️ Nenhum product_id válido encontrado nos items (usando placeholders)');
        }

        camelData.items = camelData.orderItems.map(item => {
            const product = products[item.productId];

            if (!product && item.productId) {
                console.warn(`⚠️ Produto ${item.productId} não encontrado, usando dados do item`);
            }

            if (!item.productId) {
                console.warn(`⚠️ Item sem product_id (order_item id: ${item.id})`);
            }

            console.log(`  Item ${item.productId}:`, { item, product });

            return {
                id: item.id,
                orderId: item.orderId,
                productId: item.productId || 'unknown',
                // Dados do produto (completo)
                productName: product?.name || 'Produto indisponível',
                description: product?.description || '',
                images: product?.images || ['https://via.placeholder.com/150'],
                image: product?.images?.[0] || 'https://via.placeholder.com/150',
                price: product?.price || item.priceAtTime || 0,
                costPrice: product?.costPrice || item.costPriceAtTime || 0,
                color: product?.color || '',
                category: product?.category || '',
                stock: product?.stock || 0,
                sizes: product?.sizes || [],
                // Dados do pedido
                quantity: item.quantity || 1,
                priceAtTime: item.priceAtTime || 0,
                costPriceAtTime: item.costPriceAtTime || 0,
                selectedSize: item.sizeSelected || '',
                sizeSelected: item.sizeSelected || ''
            };
        });
        console.log('✅ Processed items:', camelData.items);
        delete camelData.orderItems;
    } else {
        console.warn('⚠️ WARNING: No order items found');
        camelData.items = [];
    }

    return camelData;
}

/**
 * Função para decrementar estoque de produtos quando uma venda é feita
 * @param {Array} items - Items do pedido com productId, quantity, selectedSize, selectedColor
 * @param {Object} productsMap - Mapa de produtos com dados atuais
 */
async function decrementProductStock(items, productsMap) {
    try {
        console.log('📦 Iniciando decréscimo de estoque para', items.length, 'produtos');

        // Para cada item do pedido
        for (const item of items) {
            const productId = item.productId;
            const quantity = item.quantity || 1;
            const selectedSize = item.selectedSize;
            const selectedColor = item.selectedColor;

            if (!productId) {
                console.warn('⚠️ Item sem productId, pulando decréscimo de estoque');
                continue;
            }

            // Buscar produto atual com variants
            const { data: currentProduct, error: fetchError } = await supabase
                .from('products')
                .select('id, variants, stock')
                .eq('id', productId)
                .single();

            if (fetchError) {
                console.error(`❌ Erro ao buscar produto ${productId}:`, fetchError);
                throw new Error(`Não foi possível atualizar estoque do produto ${productId}`);
            }

            if (!currentProduct) {
                console.warn(`⚠️ Produto ${productId} não encontrado`);
                continue;
            }

            console.log(`📍 Decrementando estoque para produto ${productId}:`);
            console.log(`   - Cor: ${selectedColor}, Tamanho: ${selectedSize}, Quantidade: ${quantity}`);

            // Copiar variants para modificar
            let updatedVariants = JSON.parse(JSON.stringify(currentProduct.variants || []));

            // Se não houver variants, criar estrutura padrão
            if (updatedVariants.length === 0) {
                console.warn(`⚠️ Produto ${productId} sem variantes definidas`);
                continue;
            }

            // Encontrar a variante correta (por cor)
            const variantIndex = updatedVariants.findIndex(
                v => v.colorName === selectedColor || v.colorName === currentProduct.color
            );

            if (variantIndex === -1) {
                console.warn(`⚠️ Cor "${selectedColor}" não encontrada no produto ${productId}`);
                console.log('   Cores disponíveis:', updatedVariants.map(v => v.colorName).join(', '));
                continue;
            }

            const variant = updatedVariants[variantIndex];

            // Encontrar o tamanho correto no sizeStock
            const sizeStockIndex = variant.sizeStock?.findIndex(s => s.size === selectedSize);

            if (sizeStockIndex === undefined || sizeStockIndex === -1) {
                console.warn(`⚠️ Tamanho "${selectedSize}" não encontrado na cor "${selectedColor}"`);
                console.log('   Tamanhos disponíveis:', variant.sizeStock?.map(s => s.size).join(', '));
                continue;
            }

            // Verificar se há estoque suficiente
            const currentStockQuantity = variant.sizeStock[sizeStockIndex].quantity || 0;

            if (currentStockQuantity < quantity) {
                console.error(
                    `❌ Estoque insuficiente: ${currentStockQuantity} disponível, ${quantity} solicitado`
                );
                throw new Error(
                    `Estoque insuficiente para ${variant.colorName} - Tamanho ${selectedSize}`
                );
            }

            // Decrementar o estoque
            variant.sizeStock[sizeStockIndex].quantity -= quantity;

            console.log(`✅ Estoque decrementado: ${currentStockQuantity} → ${variant.sizeStock[sizeStockIndex].quantity}`);

            // Calcular novo estoque total
            const newTotalStock = updatedVariants.reduce((total, v) => {
                return total + (v.sizeStock || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
            }, 0);

            // Atualizar produto no banco com novos variants e stock
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    variants: updatedVariants,
                    stock: newTotalStock,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);

            if (updateError) {
                console.error(`❌ Erro ao atualizar estoque do produto ${productId}:`, updateError);
                throw new Error(`Falha ao atualizar estoque do produto ${productId}`);
            }

            console.log(`✅ Produto ${productId} atualizado: stock total = ${newTotalStock}`);
        }

        return true;
    } catch (error) {
        console.error('❌ Erro crítico no decréscimo de estoque:', error);
        throw error;
    }
}

/**
 * Reservar estoque quando uma malinha é ativada (emprestada)
 * Decrementa o estoque de cada item para indicar que está reservado
 * @param {Array} items - Items da malinha com productId, selectedSize, selectedColor, quantity
 * @returns {Promise<{success: boolean, reserved: Array, error?: string}>}
 */
export async function reserveStockForMalinha(items) {
    console.log('🔒 Reservando estoque para malinha:', items.length, 'itens');
    const reserved = [];

    try {
        for (const item of items) {
            const productId = item.productId;
            const quantity = item.quantity || 1;
            const selectedSize = item.selectedSize;
            const selectedColor = item.selectedColor;

            if (!productId) {
                console.warn('⚠️ Item sem productId, pulando reserva');
                continue;
            }

            // Buscar produto atual
            const { data: product, error: fetchError } = await supabase
                .from('products')
                .select('id, name, variants, stock')
                .eq('id', productId)
                .single();

            if (fetchError || !product) {
                console.error(`❌ Produto ${productId} não encontrado:`, fetchError);
                continue;
            }

            // Copiar variants para modificar
            let updatedVariants = JSON.parse(JSON.stringify(product.variants || []));

            if (updatedVariants.length === 0) {
                console.warn(`⚠️ Produto ${productId} sem variantes`);
                continue;
            }

            // Encontrar variante pela cor
            const variantIndex = updatedVariants.findIndex(
                v => v.colorName === selectedColor || (!selectedColor && v.colorName)
            );

            if (variantIndex === -1) {
                console.warn(`⚠️ Cor "${selectedColor}" não encontrada no produto ${productId}`);
                continue;
            }

            const variant = updatedVariants[variantIndex];

            // Encontrar tamanho
            const sizeStockIndex = variant.sizeStock?.findIndex(s => s.size === selectedSize);

            if (sizeStockIndex === undefined || sizeStockIndex === -1) {
                console.warn(`⚠️ Tamanho "${selectedSize}" não encontrado na cor "${selectedColor}"`);
                continue;
            }

            const currentQty = variant.sizeStock[sizeStockIndex].quantity || 0;

            if (currentQty < quantity) {
                console.error(`❌ Estoque insuficiente: ${currentQty} disponível, ${quantity} solicitado`);
                throw new Error(`Estoque insuficiente para ${product.name} (${selectedColor} - ${selectedSize})`);
            }

            // Decrementar estoque
            variant.sizeStock[sizeStockIndex].quantity -= quantity;

            // Calcular novo total
            const newTotalStock = updatedVariants.reduce((total, v) => {
                return total + (v.sizeStock || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
            }, 0);

            // Atualizar no banco
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    variants: updatedVariants,
                    stock: newTotalStock,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);

            if (updateError) {
                console.error(`❌ Erro ao reservar estoque do produto ${productId}:`, updateError);
                throw updateError;
            }

            reserved.push({
                productId,
                productName: product.name,
                selectedColor,
                selectedSize,
                quantity
            });

            console.log(`✅ Reservado: ${product.name} (${selectedColor} - ${selectedSize}) x${quantity}`);
        }

        console.log(`✅ ${reserved.length} itens reservados com sucesso`);
        return { success: true, reserved };

    } catch (error) {
        console.error('❌ Erro ao reservar estoque:', error);
        return { success: false, reserved, error: error.message };
    }
}

/**
 * Liberar/restaurar estoque quando itens da malinha são devolvidos
 * Incrementa o estoque de cada item devolvido
 * @param {Array} items - Items a serem restaurados com productId, selectedSize, selectedColor, quantity
 * @returns {Promise<{success: boolean, released: Array, error?: string}>}
 */
export async function releaseStockForMalinha(items) {
    console.log('🔓 Restaurando estoque de malinha:', items.length, 'itens');
    const released = [];

    try {
        for (const item of items) {
            const productId = item.productId;
            const quantity = item.quantity || 1;
            const selectedSize = item.selectedSize;
            const selectedColor = item.selectedColor;

            if (!productId) {
                console.warn('⚠️ Item sem productId, pulando restauração');
                continue;
            }

            // Buscar produto atual
            const { data: product, error: fetchError } = await supabase
                .from('products')
                .select('id, name, variants, stock')
                .eq('id', productId)
                .single();

            if (fetchError || !product) {
                console.error(`❌ Produto ${productId} não encontrado:`, fetchError);
                continue;
            }

            // Copiar variants para modificar
            let updatedVariants = JSON.parse(JSON.stringify(product.variants || []));

            if (updatedVariants.length === 0) {
                console.warn(`⚠️ Produto ${productId} sem variantes`);
                continue;
            }

            // Encontrar variante pela cor
            const variantIndex = updatedVariants.findIndex(
                v => v.colorName === selectedColor || (!selectedColor && v.colorName)
            );

            if (variantIndex === -1) {
                console.warn(`⚠️ Cor "${selectedColor}" não encontrada, criando entrada`);
                continue;
            }

            const variant = updatedVariants[variantIndex];

            // Encontrar tamanho
            const sizeStockIndex = variant.sizeStock?.findIndex(s => s.size === selectedSize);

            if (sizeStockIndex === undefined || sizeStockIndex === -1) {
                console.warn(`⚠️ Tamanho "${selectedSize}" não encontrado, criando entrada`);
                // Criar entrada se não existir
                variant.sizeStock = variant.sizeStock || [];
                variant.sizeStock.push({ size: selectedSize, quantity: quantity });
            } else {
                // Incrementar estoque
                variant.sizeStock[sizeStockIndex].quantity += quantity;
            }

            // Calcular novo total
            const newTotalStock = updatedVariants.reduce((total, v) => {
                return total + (v.sizeStock || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
            }, 0);

            // Atualizar no banco
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    variants: updatedVariants,
                    stock: newTotalStock,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);

            if (updateError) {
                console.error(`❌ Erro ao restaurar estoque do produto ${productId}:`, updateError);
                throw updateError;
            }

            released.push({
                productId,
                productName: product.name,
                selectedColor,
                selectedSize,
                quantity
            });

            console.log(`✅ Restaurado: ${product.name} (${selectedColor} - ${selectedSize}) x${quantity}`);
        }

        console.log(`✅ ${released.length} itens restaurados com sucesso`);
        return { success: true, released };

    } catch (error) {
        console.error('❌ Erro ao restaurar estoque:', error);
        return { success: false, released, error: error.message };
    }
}

export async function createOrder(orderData) {
    console.log('🔍 DEBUG createOrder - Received orderData:', orderData);

    const { customer, items, customerId: customerIdFromData, ...restOfOrderData } = orderData;

    console.log('📦 DEBUG - Destructured data:', {
        customer,
        items: items?.length || 0,
        customerId: customerIdFromData,
        restOfOrderData
    });

    let customerId = customerIdFromData;

    if (!customerId) {
        throw new Error("customerId é obrigatório para criar um pedido. Selecione um cliente antes de salvar.");
    }

    console.log('📝 Creating order record with customer_id:', customerId);

    const orderRecord = {
        customer_id: customerId,
        status: restOfOrderData.status || 'pending',
        total_value: restOfOrderData.totalValue !== undefined
            ? restOfOrderData.totalValue
            : (items || []).reduce((sum, item) => sum + (item.price || 0), 0),
        delivery_date: restOfOrderData.deliveryDate || null,
        pickup_date: restOfOrderData.pickupDate || null,
        converted_to_sale: restOfOrderData.convertedToSale !== undefined ? restOfOrderData.convertedToSale : false,
    };

    console.log('💾 Order record to insert:', orderRecord);

    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([orderRecord])
        .select()
        .single();

    if (orderError) {
        console.error('❌ ERROR creating order:', orderError);
        throw orderError;
    }

    console.log('✅ Order created:', newOrder);

    console.log('📋 Processing items:', items?.length || 0);

    // Buscar dados dos produtos para preencher preços corretos
    const productIds = [...new Set((items || []).map(item => item.productId).filter(id => id))];
    let productsMap = {};

    if (productIds.length > 0) {
        const { data: productsData } = await supabase
            .from('products')
            .select('id, price, cost_price')
            .in('id', productIds);

        if (productsData) {
            productsMap = productsData.reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
            }, {});
        }
    }

    const orderItems = (items || []).map(item => {
        // Validação forte: product_id DEVE estar definido
        if (!item.productId) {
            throw new Error(`❌ ERRO CRÍTICO: Produto sem ID no item. Dados: ${JSON.stringify(item)}`);
        }

        // Se price/costPrice vierem como 0, buscar do banco
        const productData = productsMap[item.productId];
        const finalPrice = item.price && item.price > 0 ? item.price : productData?.price || 0;
        const finalCostPrice = item.costPrice && item.costPrice > 0 ? item.costPrice : productData?.cost_price || null;

        const mapped = {
            order_id: newOrder.id,
            product_id: item.productId,
            quantity: item.quantity || 1,
            price_at_time: finalPrice,
            size_selected: item.selectedSize,
            cost_price_at_time: finalCostPrice
        };
        console.log('🔄 Mapped item:', mapped);
        return mapped;
    });

    if (orderItems.length > 0) {
        console.log('💾 Inserting order items:', orderItems);
        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) {
            console.error('❌ ERROR inserting order items:', itemsError);
            throw itemsError;
        }
        console.log('✅ Order items inserted');
    } else {
        console.warn('⚠️ WARNING: No items to insert');
    }

    // 📦 IMPORTANTE: Decrementar estoque automaticamente para cada item vendido
    console.log('📦 Iniciando decréscimo automático de estoque...');
    try {
        // Adicionar informação de cor aos items para o decréscimo de estoque
        const itemsWithColor = items.map(item => ({
            ...item,
            selectedColor: item.selectedColor || productsData[item.productId]?.color || 'Padrão'
        }));

        await decrementProductStock(itemsWithColor, productsData);
        console.log('✅ Estoque decrementado com sucesso');
    } catch (stockError) {
        console.error('❌ ERRO CRÍTICO ao decrementar estoque:', stockError);
        // NÃO lançar erro aqui - o pedido foi criado, mas log o erro
        // Em produção, poderia enviar um alert para administrador
    }

    // 🔄 IMPORTANTE: Buscar os dados completos da ordem criada para retornar com infos do produto
    console.log('🔄 Buscando dados completos do pedido com informações do cliente...');
    const completeOrderData = await getOrderById(newOrder.id);

    // ✅ CONFIRMAÇÃO FINAL - Cliente Associado com Sucesso
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ VENDA REALIZADA COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📦 PEDIDO:', {
        orderId: newOrder.id,
        customerId: customerId,
        items: items?.length || 0,
        totalValue: completeOrderData?.totalValue || 'N/A',
        status: completeOrderData?.status || 'pending'
    });
    console.log('👤 CLIENTE ASSOCIADO:', {
        id: customerId,
        name: customer?.name || 'N/A',
        phone: customer?.phone || 'N/A',
        email: customer?.email || 'N/A'
    });
    console.log('═══════════════════════════════════════════════════════════');

    return completeOrderData;
}

export async function updateOrder(id, orderData) {
    console.log('API: Updating order with id:', id, 'and data:', orderData);

    // Criar objeto com campos explícitos em snake_case para evitar problemas
    const orderRecord = {};

    // Mapear apenas campos que são colunas reais da tabela orders
    if (orderData.customerId !== undefined) orderRecord.customer_id = orderData.customerId;
    if (orderData.customer_id !== undefined) orderRecord.customer_id = orderData.customer_id;
    if (orderData.status !== undefined) orderRecord.status = orderData.status;
    if (orderData.totalValue !== undefined) orderRecord.total_value = orderData.totalValue;
    if (orderData.total_value !== undefined) orderRecord.total_value = orderData.total_value;
    if (orderData.deliveryDate !== undefined) orderRecord.delivery_date = orderData.deliveryDate;
    if (orderData.delivery_date !== undefined) orderRecord.delivery_date = orderData.delivery_date;
    if (orderData.pickupDate !== undefined) orderRecord.pickup_date = orderData.pickupDate;
    if (orderData.pickup_date !== undefined) orderRecord.pickup_date = orderData.pickup_date;
    if (orderData.convertedToSale !== undefined) orderRecord.converted_to_sale = orderData.convertedToSale;
    if (orderData.converted_to_sale !== undefined) orderRecord.converted_to_sale = orderData.converted_to_sale;

    console.log('API: Prepared record for update (only DB fields):', orderRecord);

    const { data, error } = await supabase
        .from('orders')
        .update(orderRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating order:', error);
        throw error;
    }
    console.log('API: Updated order:', data);
    return toCamelCase(data);
}

export async function deleteOrder(id) {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    return true;
}

export async function updateOrderStatus(id, newStatus) {
    const { data, error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id).select().single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function updateOrderSchedule(id, scheduleData) {
    console.log('API: Updating order schedule with id:', id, 'and data:', scheduleData);
    const snakeData = toSnakeCase(scheduleData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const scheduleRecord = {
        delivery_date: snakeData.deliveryDate || snakeData.delivery_date,
        pickup_date: snakeData.pickupDate || snakeData.pickup_date
    };

    console.log('API: Prepared record for update:', scheduleRecord);

    const { data, error } = await supabase
        .from('orders')
        .update(scheduleRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating order schedule:', error);
        throw error;
    }
    console.log('API: Updated order schedule:', data);
    return toCamelCase(data);
}

// ==================== VENDAS ====================

export async function getVendas(page = 1, limit = 30) {
    console.log(`🔍 API: Getting vendas (page ${page}, limit ${limit})...`);
    const offset = (page - 1) * limit;
    const { data, error, count } = await supabase
        .from('vendas')
        .select('id, customer_id, total_value, payment_method, payment_status, created_at, fee_amount, net_amount, items, entry_payment, is_installment, customers(id, name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('❌ API Error getting vendas:', error);
        throw error;
    }

    console.log(`✅ API: Got ${data?.length || 0} vendas (total: ${count})`);

    const camelCasedData = data.map(toCamelCase);

    // Debug: verificar se items estão sendo carregados
    if (camelCasedData.length > 0) {
        console.log('🔍 DEBUG getVendas - Primeira venda RAW:', data[0]);
        console.log('🔍 DEBUG getVendas - Primeira venda CAMELCASE:', camelCasedData[0]);
        console.log('🔍 DEBUG getVendas - items:', camelCasedData[0].items);
    }

    return {
        vendas: camelCasedData.map(venda => ({
            ...venda,
            customerName: venda.customers ? venda.customers.name : 'Cliente desconhecido',
            items: venda.items || [] // items já vem do JSON da venda
        })),
        total: count,
        page,
        limit
    };
}

export async function createVenda(vendaData) {
    console.log('API: Creating venda with data:', vendaData);
    const snakeData = toSnakeCase(vendaData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const vendaRecord = {
        order_id: snakeData.order_id || null,
        customer_id: snakeData.customer_id,
        total_value: snakeData.total_value,
        cost_price: snakeData.cost_price || null,
        items: snakeData.items || [],
        payment_method: snakeData.payment_method,
        payment_status: snakeData.payment_status || (snakeData.payment_method === 'fiado' ? 'pending' : 'paid'),
        card_brand: snakeData.card_brand || null,
        fee_percentage: snakeData.fee_percentage || 0,
        fee_amount: snakeData.fee_amount || 0,
        net_amount: snakeData.net_amount,
        // ✅ CAMPOS DE PARCELAMENTO (CORRIGIDO)
        is_installment: snakeData.is_installment || false,
        num_installments: snakeData.num_installments || 1,
        entry_payment: snakeData.entry_payment || 0,
        installment_start_date: snakeData.installment_start_date || null
    };

    console.log('API: Prepared record for insert:', vendaRecord);

    const { data, error } = await supabase
        .from('vendas')
        .insert([vendaRecord])
        .select()
        .single();

    if (error) {
        console.error('API Error creating venda:', error);
        throw error;
    }
    console.log('API: Created venda:', data);
    return toCamelCase(data);
}

export async function updateVenda(id, vendaData) {
    console.log('API: Updating venda with id:', id, 'and data:', vendaData);
    const snakeData = toSnakeCase(vendaData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const vendaRecord = {
        order_id: snakeData.order_id || null,
        customer_id: snakeData.customer_id,
        total_value: snakeData.total_value,
        cost_price: snakeData.cost_price || null,
        items: snakeData.items || [],
        payment_method: snakeData.payment_method,
        payment_status: snakeData.payment_status || (snakeData.payment_method === 'fiado' ? 'pending' : 'paid'),
        card_brand: snakeData.card_brand || null,
        fee_percentage: snakeData.fee_percentage || 0,
        fee_amount: snakeData.fee_amount || 0,
        net_amount: snakeData.net_amount,
        // ✅ CAMPOS DE PARCELAMENTO (CORRIGIDO)
        is_installment: snakeData.is_installment || false,
        num_installments: snakeData.num_installments || 1,
        entry_payment: snakeData.entry_payment || 0,
        installment_start_date: snakeData.installment_start_date || null
    };

    console.log('API: Prepared record for update:', vendaRecord);

    const { data, error } = await supabase
        .from('vendas')
        .update(vendaRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating venda:', error);
        throw error;
    }
    console.log('API: Updated venda:', data);
    return toCamelCase(data);
}

export async function deleteVenda(id) {
    const { error } = await supabase.from('vendas').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== SETTINGS ====================

export async function getSettings() {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    // convert array of objects to a single object
    return data.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.value;
        return acc;
    }, {});
}

export async function updateSettings(settingsData) {
    const updates = Object.keys(settingsData).map(key =>
        supabase.from('settings').update({ value: settingsData[key] }).eq('setting_key', key)
    );
    const results = await Promise.all(updates);
    results.forEach(result => {
        if (result.error) throw result.error;
    });
    return true;
}


// ==================== COUPONS ====================

export async function getCoupons() {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    // Mapear campos do banco para o formato esperado pelo frontend
    return data.map(coupon => {
        const camelCased = toCamelCase(coupon);
        return {
            ...camelCased,
            type: camelCased.discountType, // discount_type -> type
            value: camelCased.discountValue, // discount_value -> value
            expiryDate: camelCased.expiresAt // expires_at -> expiryDate
        };
    });
}

export async function createCoupon(couponData) {
    console.log('API: Creating coupon with data:', couponData);
    const snakeData = toSnakeCase(couponData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const couponRecord = {
        code: snakeData.code,
        discount_type: snakeData.type, // Mapear 'type' para 'discount_type'
        discount_value: snakeData.value, // Mapear 'value' para 'discount_value'
        min_purchase: snakeData.min_purchase || null,
        expires_at: snakeData.expiry_date || null,
        is_active: snakeData.is_active !== undefined ? snakeData.is_active : true,
        is_special: snakeData.is_special || false,
        description: snakeData.description || null
    };

    console.log('API: Prepared record for insert:', couponRecord);

    const { data, error } = await supabase
        .from('coupons')
        .insert([couponRecord])
        .select()
        .single();

    if (error) {
        console.error('API Error creating coupon:', error);
        throw error;
    }
    console.log('API: Created coupon:', data);

    // Mapear campos do retorno para o formato esperado pelo frontend
    const camelCased = toCamelCase(data);
    return {
        ...camelCased,
        type: camelCased.discountType,
        value: camelCased.discountValue,
        expiryDate: camelCased.expiresAt
    };
}

export async function updateCoupon(id, couponData) {
    console.log('API: Updating coupon with id:', id, 'and data:', couponData);
    const snakeData = toSnakeCase(couponData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const couponRecord = {
        code: snakeData.code,
        discount_type: snakeData.type, // Mapear 'type' para 'discount_type'
        discount_value: snakeData.value, // Mapear 'value' para 'discount_value'
        min_purchase: snakeData.min_purchase || null,
        expires_at: snakeData.expiry_date || null,
        is_active: snakeData.is_active !== undefined ? snakeData.is_active : true,
        is_special: snakeData.is_special || false,
        description: snakeData.description || null
    };

    console.log('API: Prepared record for update:', couponRecord);

    const { data, error } = await supabase
        .from('coupons')
        .update(couponRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating coupon:', error);
        throw error;
    }
    console.log('API: Updated coupon:', data);

    // Mapear campos do retorno para o formato esperado pelo frontend
    const camelCased = toCamelCase(data);
    return {
        ...camelCased,
        type: camelCased.discountType,
        value: camelCased.discountValue,
        expiryDate: camelCased.expiresAt
    };
}

export async function deleteCoupon(id) {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) throw error;
    return true;
}


// ==================== SUPPLIERS ====================

export async function getSuppliers() {
    console.log('API: Getting suppliers...');
    const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('API Error getting suppliers:', error);
        throw error;
    }
    console.log('API: Got suppliers:', data);
    return data.map(toCamelCase);
}

export async function getSupplierById(id) {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createSupplier(supplierData) {
    console.log('API: Creating supplier with data:', supplierData);
    const snakeData = toSnakeCase(supplierData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const supplierRecord = {
        name: snakeData.name,
        cnpj: snakeData.cnpj || null,
        phone: snakeData.phone || null,
        email: snakeData.email || null,
        address: snakeData.address || null,
        city: snakeData.city || null,
        state: snakeData.state || null,
        zip_code: snakeData.zip_code || null,
        contact_person: snakeData.contact_person || null,
        notes: snakeData.notes || null
    };

    console.log('API: Prepared record for insert:', supplierRecord);

    const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierRecord])
        .select()
        .single();

    if (error) {
        console.error('API Error creating supplier:', error);
        throw error;
    }
    console.log('API: Created supplier:', data);
    return toCamelCase(data);
}

export async function updateSupplier(id, supplierData) {
    console.log('API: Updating supplier with id:', id, 'and data:', supplierData);
    const snakeData = toSnakeCase(supplierData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const supplierRecord = {
        name: snakeData.name,
        cnpj: snakeData.cnpj || null,
        phone: snakeData.phone || null,
        email: snakeData.email || null,
        address: snakeData.address || null,
        city: snakeData.city || null,
        state: snakeData.state || null,
        zip_code: snakeData.zip_code || null,
        contact_person: snakeData.contact_person || null,
        notes: snakeData.notes || null
    };

    console.log('API: Prepared record for update:', supplierRecord);

    const { data, error } = await supabase
        .from('suppliers')
        .update(supplierRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating supplier:', error);
        throw error;
    }
    console.log('API: Updated supplier:', data);
    return toCamelCase(data);
}

export async function deleteSupplier(id) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    return true;
}


// ==================== PURCHASES ====================

export async function getPurchases() {
    const { data, error } = await supabase.from('purchases').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function getPurchaseById(id) {
    const { data, error } = await supabase.from('purchases').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createPurchase(purchaseData) {
    console.log('API: Creating purchase with data:', purchaseData);
    const snakeData = toSnakeCase(purchaseData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const purchaseRecord = {
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        payment_method: snakeData.paymentMethod || snakeData.payment_method,
        value: snakeData.value,
        date: snakeData.date,
        pieces: snakeData.pieces || null,
        parcelas: snakeData.parcelas || null,
        notes: snakeData.notes || null
    };

    console.log('API: Prepared record for insert:', purchaseRecord);

    const { data, error } = await supabase
        .from('purchases')
        .insert([purchaseRecord])
        .select()
        .single();

    if (error) {
        console.error('API Error creating purchase:', error);
        throw error;
    }
    console.log('API: Created purchase:', data);
    return toCamelCase(data);
}

export async function updatePurchase(id, purchaseData) {
    console.log('API: Updating purchase with id:', id, 'and data:', purchaseData);
    const snakeData = toSnakeCase(purchaseData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const purchaseRecord = {
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        payment_method: snakeData.paymentMethod || snakeData.payment_method,
        value: snakeData.value,
        date: snakeData.date,
        pieces: snakeData.pieces || null,
        parcelas: snakeData.parcelas || null,
        notes: snakeData.notes || null
    };

    console.log('API: Prepared record for update:', purchaseRecord);

    const { data, error } = await supabase
        .from('purchases')
        .update(purchaseRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating purchase:', error);
        throw error;
    }
    console.log('API: Updated purchase:', data);
    return toCamelCase(data);
}

export async function deletePurchase(id) {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) throw error;
    return true;
}


// ==================== FIXED EXPENSES ====================

export async function getFixedExpenses() {
    const { data, error } = await supabase.from('fixed_expenses').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function getFixedExpenseById(id) {
    const { data, error } = await supabase.from('fixed_expenses').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createFixedExpense(expenseData) {
    const snakeData = toSnakeCase(expenseData);
    const { data, error } = await supabase.from('fixed_expenses').insert([snakeData]).select().single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function updateFixedExpense(id, expenseData) {
    console.log('API: Updating fixed expense with id:', id, 'and data:', expenseData);
    const snakeData = toSnakeCase(expenseData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const expenseRecord = {
        name: snakeData.name,
        value: snakeData.value,
        category: snakeData.category,
        recurrence: snakeData.recurrence,
        due_day: snakeData.dueDay || snakeData.due_day,
        paid: snakeData.paid,
        notes: snakeData.notes
    };

    console.log('API: Prepared record for update:', expenseRecord);

    const { data, error } = await supabase
        .from('fixed_expenses')
        .update(expenseRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating fixed expense:', error);
        throw error;
    }
    console.log('API: Updated fixed expense:', data);
    return toCamelCase(data);
}

export async function deleteFixedExpense(id) {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (error) throw error;
    return true;
}


// ==================== MATERIALS STOCK ====================

export async function getMaterialsStock() {
    const { data, error } = await supabase.from('materials_stock').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function getMaterialById(id) {
    const { data, error } = await supabase.from('materials_stock').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createMaterial(materialData) {
    const snakeData = toSnakeCase(materialData);
    const { data, error } = await supabase.from('materials_stock').insert([snakeData]).select().single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function updateMaterial(id, materialData) {
    console.log('API: Updating material with id:', id, 'and data:', materialData);
    const snakeData = toSnakeCase(materialData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const materialRecord = {
        name: snakeData.name,
        description: snakeData.description,
        quantity: snakeData.quantity,
        unit_cost: snakeData.unitCost || snakeData.unit_cost,
        category: snakeData.category,
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        min_stock_level: snakeData.minStockLevel || snakeData.min_stock_level
    };

    console.log('API: Prepared record for update:', materialRecord);

    const { data, error } = await supabase
        .from('materials_stock')
        .update(materialRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating material:', error);
        throw error;
    }
    console.log('API: Updated material:', data);
    return toCamelCase(data);
}

export async function deleteMaterial(id) {
    const { error } = await supabase.from('materials_stock').delete().eq('id', id);
    if (error) throw error;
    return true;
}


// ==================== CUSTOMER PREFERENCES ====================

export async function getCustomerPreferences(customerId) {
    const { data, error } = await supabase
        .from('customer_preferences')
        .select('*')
        .eq('customer_id', customerId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
    }

    return data ? toCamelCase(data) : null;
}

export async function updateCustomerPreferences(customerId, preferencesData) {
    const snakeData = toSnakeCase(preferencesData);

    // Primeiro, tentar atualizar o registro existente
    const { data, error } = await supabase
        .from('customer_preferences')
        .upsert([{ customer_id: customerId, ...snakeData }], { onConflict: 'customer_id' })
        .select()
        .single();

    if (error) throw error;
    return toCamelCase(data);
}

// ==================== PAYMENT FEES ====================

export async function getPaymentFees() {
    const { data, error } = await supabase.from('payment_fees').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function getPaymentFeeById(id) {
    const { data, error } = await supabase.from('payment_fees').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createPaymentFee(feeData) {
    const snakeData = toSnakeCase(feeData);

    // Usar UPSERT: INSERT ou UPDATE se já existir (pela constraint unique)
    const { data, error } = await supabase.from('payment_fees')
        .upsert([snakeData], {
            onConflict: 'payment_method,card_brand'
        })
        .select()
        .single();

    if (error) throw error;
    return toCamelCase(data);
}

export async function updatePaymentFee(id, feeData) {
    console.log('API: Updating payment fee with id:', id, 'and data:', feeData);
    const snakeData = toSnakeCase(feeData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const feeRecord = {
        payment_method: snakeData.paymentMethod || snakeData.payment_method,
        card_brand: snakeData.cardBrand || snakeData.card_brand,
        fee_percentage: snakeData.feePercentage || snakeData.fee_percentage,
        fee_fixed: snakeData.feeFixed || snakeData.fee_fixed,
        description: snakeData.description,
        is_active: snakeData.isActive || snakeData.is_active
    };

    console.log('API: Prepared record for update:', feeRecord);

    const { data, error } = await supabase
        .from('payment_fees')
        .update(feeRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating payment fee:', error);
        throw error;
    }
    console.log('API: Updated payment fee:', data);
    return toCamelCase(data);
}

export async function deletePaymentFee(id) {
    const { error } = await supabase.from('payment_fees').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// Delete all payment fees
export async function deleteAllPaymentFees() {
    const { error } = await supabase.from('payment_fees').delete().neq('id', 0);
    if (error) throw error;
    return true;
}

/**
 * Buscar taxa de pagamento do banco de dados
 * @param {string} paymentMethod - 'pix', 'debito', 'credito'
 * @param {string} cardBrand - 'visa', 'mastercard', 'elo' (opcional)
 * @param {number} installments - número de parcelas 1-6 (opcional)
 * @returns {Promise<{feePercentage: number} | null>}
 */
export async function getPaymentFee(paymentMethod, cardBrand = null, installments = null) {
    try {
        // Construir query dinamicamente
        let query = supabase
            .from('payment_fees')
            .select('*')
            .eq('payment_method', paymentMethod)
            .eq('is_active', true);

        // Filtrar por bandeira
        if (cardBrand) {
            query = query.eq('card_brand', cardBrand);
        } else {
            query = query.is('card_brand', null);
        }

        // Filtrar por parcelas
        if (installments !== null && installments !== undefined) {
            query = query.eq('installments', installments);
        } else {
            query = query.is('installments', null);
        }

        const { data, error } = await query.single();

        if (error) {
            // Log silencioso para PIX (que nunca terá erro, pois sempre tem 0%)
            if (paymentMethod !== 'pix') {
                console.warn(`⚠️ Taxa não encontrada: ${paymentMethod}${cardBrand ? ` (${cardBrand})` : ''}${installments ? ` (${installments}x)` : ''}`);
            }
            return null;
        }

        return toCamelCase(data);
    } catch (err) {
        console.error(`❌ Erro ao buscar taxa de pagamento:`, err.message);
        return null;
    }
}

// ==================== CREDIÁRIO PARCELADO ====================

/**
 * Criar parcelas automaticamente para uma venda com crediário/parcelado
 * @param {number} vendaId - ID da venda (obrigatório)
 * @param {number} numInstallments - Número de parcelas (obrigatório, mín: 1)
 * @param {number} entryPayment - Valor de entrada pago no ato (padrão: 0)
 * @param {string} installmentStartDate - Data de início em YYYY-MM-DD (padrão: hoje)
 * @returns {Promise<{success: boolean, installments?: Array, error?: string}>}
 */
export async function createInstallments(
    vendaId,
    numInstallments,
    entryPayment = 0,
    installmentStartDate = null
) {
    // Validar parâmetros obrigatórios
    if (!vendaId || !numInstallments) {
        console.error('❌ Parâmetros obrigatórios faltando: vendaId e numInstallments');
        return {
            success: false,
            error: 'Parâmetros obrigatórios inválidos'
        };
    }

    // Usar data atual como padrão se não fornecida
    const startDate = installmentStartDate || new Date().toISOString().split('T')[0];

    console.log(`💳 Criando ${numInstallments}x | Venda: #${vendaId} | Entrada: R$ ${entryPayment}`);

    try {
        // ✅ IMPORTANTE: Como a função agora é RETURNS SETOF RECORD,
        // chamamos apenas pelo efeito colateral (criar parcelas no banco)
        // NÃO usamos o retorno 'data'
        const { error } = await supabase.rpc('create_installments', {
            p_venda_id: Number(vendaId), // ✅ BIGINT explícito
            p_num_installments: Number(numInstallments), // ✅ INTEGER explícito
            p_entry_payment: Number(entryPayment || 0), // ✅ DECIMAL explícito
            p_installment_start_date: startDate || null // ✅ DATE ou null
        });

        if (error) {
            console.error(`❌ Erro ao criar parcelas (venda #${vendaId}):`, error.message);
            return {
                success: false,
                error: error.message || 'Erro ao criar parcelas'
            };
        }

        console.log(`✅ ${numInstallments} parcelas criadas com sucesso para venda #${vendaId}`);

        return {
            success: true,
            count: numInstallments
        };
    } catch (err) {
        console.error(`❌ Exceção ao criar parcelas (venda #${vendaId}):`, err.message);
        return {
            success: false,
            error: err.message || 'Erro ao criar parcelas'
        };
    }
}

/**
 * Buscar todas as parcelas de uma venda
 * @param {number} vendaId - ID da venda
 * @returns {Object} { installments, totalValue, paidAmount, remainingAmount }
 */
export async function getInstallmentsByVendaId(vendaId) {
    console.log(`🔍 API: Buscando parcelas da venda ${vendaId}`);

    try {
        // Buscar parcelas
        const { data: installments, error: installmentsError } = await supabase
            .from('installments')
            .select('*')
            .eq('venda_id', vendaId)
            .order('installment_number', { ascending: true });

        if (installmentsError) throw installmentsError;

        // Buscar histórico de pagamentos para cada parcela
        const installmentsWithPayments = await Promise.all(
            installments.map(async (installment) => {
                const { data: payments, error: paymentsError } = await supabase
                    .from('installment_payments')
                    .select('*')
                    .eq('installment_id', installment.id)
                    .order('payment_date', { ascending: true });

                if (paymentsError) {
                    console.warn(`⚠️ Erro ao buscar pagamentos da parcela ${installment.id}:`, paymentsError);
                    return { ...toCamelCase(installment), payments: [] };
                }

                return {
                    ...toCamelCase(installment),
                    payments: payments.map(toCamelCase)
                };
            })
        );

        // Calcular resumo
        const totalValue = installmentsWithPayments.reduce((sum, inst) => sum + inst.originalAmount, 0);
        const paidAmount = installmentsWithPayments.reduce((sum, inst) => sum + inst.paidAmount, 0);
        const remainingAmount = totalValue - paidAmount;

        console.log(`✅ ${installmentsWithPayments.length} parcelas encontradas`);

        return {
            installments: installmentsWithPayments,
            totalValue,
            paidAmount,
            remainingAmount,
            paidPercentage: totalValue > 0 ? Math.round((paidAmount / totalValue) * 100) : 0
        };
    } catch (err) {
        console.error('❌ Erro ao buscar parcelas:', err);
        throw err;
    }
}

/**
 * Registrar um pagamento de parcela
 * @param {number} installmentId - ID da parcela
 * @param {number} paymentAmount - Valor do pagamento
 * @param {string} paymentDate - Data do pagamento (YYYY-MM-DD)
 * @param {string} paymentMethod - Método (pix, dinheiro, cartao, etc)
 * @param {string} notes - Observações opcionais
 * @param {string} createdBy - Username do admin que registrou
 * @returns {boolean} Sucesso
 */
export async function registerInstallmentPayment(
    installmentId,
    paymentAmount,
    paymentDate,
    paymentMethod = 'dinheiro',
    notes = null,
    createdBy = 'admin'
) {
    console.log(`💳 API: Registrando pagamento de R$ ${paymentAmount} na parcela ${installmentId}`);

    try {
        const { data, error } = await supabase.rpc('register_installment_payment', {
            p_installment_id: installmentId,
            p_payment_amount: paymentAmount,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_notes: notes,
            p_created_by: createdBy
        });

        if (error) {
            console.error('❌ Erro ao registrar pagamento:', error);
            throw error;
        }

        console.log('✅ Pagamento registrado com sucesso');

        // Buscar dados atualizados da parcela
        const { data: updatedInstallment, error: fetchError } = await supabase
            .from('installments')
            .select('*')
            .eq('id', installmentId)
            .single();

        if (fetchError) throw fetchError;

        return toCamelCase(updatedInstallment);
    } catch (err) {
        console.error('❌ Exceção ao registrar pagamento:', err);
        throw err;
    }
}

/**
 * Editar um pagamento existente
 * @param {number} paymentId - ID do pagamento (em installment_payments)
 * @param {number} newAmount - Novo valor
 * @param {string} newDate - Nova data
 * @param {string} newMethod - Novo método
 * @param {string} newNotes - Novas observações
 * @returns {Object} Pagamento atualizado
 */
export async function updateInstallmentPayment(
    paymentId,
    newAmount,
    newDate,
    newMethod,
    newNotes
) {
    console.log(`✏️ API: Atualizando pagamento ${paymentId}`);

    try {
        // Buscar pagamento antigo para calcular diferença
        const { data: oldPayment, error: fetchError } = await supabase
            .from('installment_payments')
            .select('payment_amount, installment_id')
            .eq('id', paymentId)
            .single();

        if (fetchError) throw fetchError;

        const amountDifference = newAmount - oldPayment.payment_amount;

        // Atualizar pagamento
        const { data: updatedPayment, error: updateError } = await supabase
            .from('installment_payments')
            .update({
                payment_amount: newAmount,
                payment_date: newDate,
                payment_method: newMethod,
                notes: newNotes,
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Atualizar parcela com a diferença
        const { data: updatedInstallment, error: installmentError } = await supabase
            .from('installments')
            .select('*')
            .eq('id', oldPayment.installment_id)
            .single();

        if (installmentError) throw installmentError;

        const newPaidAmount = Math.max(0, updatedInstallment.paid_amount + amountDifference);

        const { error: updateInstallmentError } = await supabase
            .from('installments')
            .update({
                paid_amount: newPaidAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', oldPayment.installment_id);

        if (updateInstallmentError) throw updateInstallmentError;

        console.log('✅ Pagamento atualizado com sucesso');

        return {
            ...toCamelCase(updatedPayment),
            installmentId: oldPayment.installment_id
        };
    } catch (err) {
        console.error('❌ Erro ao atualizar pagamento:', err);
        throw err;
    }
}

/**
 * Deletar um pagamento
 * @param {number} paymentId - ID do pagamento
 * @returns {boolean} Sucesso
 */
export async function deleteInstallmentPayment(paymentId) {
    console.log(`🗑️ API: Deletando pagamento ${paymentId}`);

    try {
        // Buscar pagamento para recuperar dados da parcela
        const { data: payment, error: fetchError } = await supabase
            .from('installment_payments')
            .select('payment_amount, installment_id')
            .eq('id', paymentId)
            .single();

        if (fetchError) throw fetchError;

        // Deletar pagamento
        const { error: deleteError } = await supabase
            .from('installment_payments')
            .delete()
            .eq('id', paymentId);

        if (deleteError) throw deleteError;

        // Atualizar parcela (reduzir paid_amount)
        const { error: updateError } = await supabase
            .from('installments')
            .select('paid_amount')
            .eq('id', payment.installment_id)
            .single()
            .then(async ({ data: installment }) => {
                const newPaidAmount = Math.max(0, installment.paid_amount - payment.payment_amount);
                return await supabase
                    .from('installments')
                    .update({ paid_amount: newPaidAmount })
                    .eq('id', payment.installment_id);
            });

        console.log('✅ Pagamento deletado com sucesso');
        return true;
    } catch (err) {
        console.error('❌ Erro ao deletar pagamento:', err);
        throw err;
    }
}

/**
 * Obter resumo de uma venda com crediário
 * @param {number} vendaId - ID da venda
 * @returns {Object} Resumo: total, entrada, pago, pendente, atrasado
 */
export async function getInstallmentSummary(vendaId) {
    console.log(`📊 API: Obtendo resumo de crediário da venda ${vendaId}`);

    try {
        const { data, error } = await supabase.rpc('get_installment_summary', {
            p_venda_id: vendaId
        });

        if (error) {
            console.error('❌ Erro ao buscar resumo:', error);
            throw error;
        }

        const summary = data[0];
        console.log('✅ Resumo obtido:', summary);

        return {
            totalValue: parseFloat(summary.total_value),
            entryPayment: parseFloat(summary.entry_payment),
            remainingValue: parseFloat(summary.remaining_value),
            numInstallments: summary.num_installments,
            paidInstallments: summary.paid_installments,
            pendingInstallments: summary.pending_installments,
            overdueAmount: parseFloat(summary.overdue_amount || 0),
            lastPaymentDate: summary.last_payment_date,
            paidPercentage: summary.total_value > 0
                ? Math.round(((summary.total_value - summary.remaining_value) / summary.total_value) * 100)
                : 0
        };
    } catch (err) {
        console.error('❌ Erro ao obter resumo:', err);
        throw err;
    }
}

/**
 * Listar todas as vendas com crediário em aberto
 * @param {number} page - Página (padrão 1)
 * @param {number} limit - Itens por página (padrão 30)
 * @returns {Object} { vendas, total }
 */
export async function getOpenInstallmentSales(page = 1, limit = 30) {
    console.log(`📋 API: Buscando vendas com crediário em aberto (página ${page})`);

    try {
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('vendas')
            .select('id, customer_id, total_value, entry_payment, num_installments, is_installment, created_at, customers(id, name, phone)', { count: 'exact' })
            .eq('is_installment', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Buscar resumo de cada venda
        const vendasComResumo = await Promise.all(
            data.map(async (venda) => {
                const summary = await getInstallmentSummary(venda.id);
                const camelVenda = toCamelCase(venda);

                return {
                    ...camelVenda,
                    // ✅ Mapear corretamente o nome do cliente (JOIN com customers)
                    customerName: venda.customers?.name || 'Cliente desconhecido',
                    customers: venda.customers ? toCamelCase(venda.customers) : null,
                    // ✅ Mapear campos do summary para a raiz (para compatibilidade com UI)
                    dueAmount: summary.remainingValue,
                    paidAmount: summary.totalValue - summary.remainingAmount,
                    overdueCount: 0, // TODO: Calcular do banco
                    summary
                };
            })
        );

        console.log(`✅ ${vendasComResumo.length} vendas com crediário encontradas`);

        return {
            vendas: vendasComResumo,
            total: count,
            page,
            limit
        };
    } catch (err) {
        console.error('❌ Erro ao buscar vendas com crediário:', err);
        throw err;
    }
}


// ==================== DASHBOARD ANALYTICS ====================

/**
 * Obter métricas financeiras completas para DRE gerencial
 * @returns {Object} Métricas de receita, custos, despesas, lucro
 */
export async function getDashboardMetrics() {
    console.log('📊 API: Buscando métricas do dashboard...');

    try {
        // 1. DESPESAS FIXAS
        const { data: expensesData, error: expensesError } = await supabase
            .from('fixed_expenses')
            .select('*');

        if (expensesError) throw expensesError;

        // 2. CUPONS APLICADOS
        const { data: couponsData, error: couponsError } = await supabase
            .from('coupons')
            .select('*')
            .eq('is_active', true);

        if (couponsError) throw couponsError;

        // 3. INSTALLMENTS (para análise de fluxo de caixa)
        const { data: installmentsData, error: installmentsError } = await supabase
            .from('installments')
            .select('*, installment_payments(*)');

        if (installmentsError) throw installmentsError;

        // 4. COMPRAS (para análise de custo de estoque)
        const { data: purchasesData, error: purchasesError } = await supabase
            .from('purchases')
            .select('*, suppliers(id, name)');

        if (purchasesError) throw purchasesError;

        const camelExpenses = expensesData.map(toCamelCase);
        const camelCoupons = couponsData.map(toCamelCase);
        const camelInstallments = installmentsData.map(toCamelCase);
        const camelPurchases = purchasesData.map(toCamelCase);

        return {
            expenses: camelExpenses,
            coupons: camelCoupons,
            installments: camelInstallments,
            purchases: camelPurchases
        };
    } catch (err) {
        console.error('❌ Erro ao buscar métricas do dashboard:', err);
        throw err;
    }
}
