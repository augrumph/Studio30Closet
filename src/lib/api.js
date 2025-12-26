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
            // Otimizar imagens: manter apenas a primeira imagem para lista
            if (camelProduct.images && Array.isArray(camelProduct.images)) {
                camelProduct.images = [camelProduct.images[0]].filter(Boolean);
            }
            return camelProduct;
        }),
        total: count,
        page,
        pageSize
    };
}

// ⚡ Catálogo: Usar RPC com função PostgreSQL otimizada
// Função retorna apenas primeira imagem = MUITO mais rápido
export async function getAllProducts() {
    const startTime = performance.now();
    console.log('📡 [Catálogo] Carregando produtos via RPC...');

    // Usar RPC para chamar função otimizada no banco
    const queryStart = performance.now();
    const { data, error } = await supabase.rpc('get_products_catalog');
    const queryTime = (performance.now() - queryStart).toFixed(0);

    if (error) {
        console.error('❌ [Catálogo] Erro na query:', error);
        throw error;
    }

    console.log(`⏱️  [Catálogo] Query Supabase: ${queryTime}ms (${data?.length} produtos)`);

    // Converter para camelCase (já tem apenas primeira imagem do PostgreSQL)
    const convertStart = performance.now();
    const result = data
        .map(product => toCamelCase(product))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const convertTime = (performance.now() - convertStart).toFixed(0);

    console.log(`⏱️  [Catálogo] Processamento: ${convertTime}ms`);

    const totalTime = (performance.now() - startTime).toFixed(0);
    console.log(`✅ [Catálogo] Total: ${totalTime}ms (${result.length} produtos com primeira imagem)`);

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

export async function getCustomers() {
    console.log('API: Getting customers...');
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('API Error getting customers:', error);
        throw error;
    }
    console.log('API: Got customers:', data);
    return data.map(toCamelCase);
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

export async function getOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('*, customers ( * ), order_items (count)')
        .order('created_at', { ascending: false });
    if (error) throw error;

    const camelCasedData = data.map(toCamelCase);

    return camelCasedData.map(order => ({
        ...order,
        orderNumber: `#${String(order.id).padStart(6, '0')}`,
        itemsCount: order.orderItems && order.orderItems.length > 0 ? order.orderItems[0].count : 0,
        customer: order.customers // Mapear customers (plural) para customer (singular)
    }));
}

export async function getOrderById(id) {
    console.log('📥 API: Fetching order with id:', id);

    const { data, error } = await supabase
        .from('orders')
        .select('*, customers ( * ), order_items ( * )')
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

    if (!customerId && customer && customer.phone) {
        console.log('👤 ASSOCIANDO CLIENTE - Buscando por telefone:', customer.phone);

        const { data: existingCustomer, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', customer.phone)
            .single();

        if (customerError && customerError.code !== 'PGRST116') {
            console.error('❌ ERRO ao buscar cliente:', customerError);
            throw customerError;
        }

        if (existingCustomer) {
            console.log('✅ Cliente encontrado:', existingCustomer.id);
            customerId = existingCustomer.id;

            // ATUALIZAR dados do cliente se houver novas informações
            console.log('📝 Atualizando dados do cliente existente...');
            const customerSnakeCase = toSnakeCase(customer);
            const { error: updateError } = await supabase
                .from('customers')
                .update(customerSnakeCase)
                .eq('id', customerId);

            if (updateError) {
                console.warn('⚠️ AVISO: Não foi possível atualizar cliente, mas pedido será criado:', updateError);
            } else {
                console.log('✅ Dados do cliente atualizados com sucesso');
            }
        } else {
            console.log('➕ Cliente não encontrado - CRIANDO NOVO CLIENTE');
            console.log('   📋 Dados do cliente:', {
                name: customer.name,
                phone: customer.phone,
                email: customer.email || 'não informado',
                cpf: customer.cpf || 'não informado',
                addresses: customer.addresses?.length || 0
            });

            const customerSnakeCase = toSnakeCase(customer);

            const { data: newCustomer, error: newCustomerError } = await supabase
                .from('customers')
                .insert([customerSnakeCase])
                .select('id, name, phone')
                .single();

            if (newCustomerError) {
                console.error('❌ ERRO ao criar cliente:', newCustomerError);
                throw new Error(`Falha ao criar cliente: ${newCustomerError.message}`);
            }

            console.log('✅ NOVO CLIENTE CRIADO:', {
                id: newCustomer.id,
                name: newCustomer.name,
                phone: newCustomer.phone
            });
            customerId = newCustomer.id;
        }
    }

    if (!customerId) {
        throw new Error("Não foi possível associar um cliente ao pedido.");
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

export async function getVendas() {
    const { data, error } = await supabase
        .from('vendas')
        .select('*, customers ( name )')
        .order('created_at', { ascending: false });
    if (error) throw error;

    const camelCasedData = data.map(toCamelCase);

    return camelCasedData.map(venda => ({
        ...venda,
        customerName: venda.customers ? venda.customers.name : 'Cliente desconhecido',
    }));
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
        net_amount: snakeData.net_amount
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
        net_amount: snakeData.net_amount
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
    const { data, error } = await supabase.from('payment_fees').insert([snakeData]).select().single();
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

// Buscar taxa específica por método e bandeira
export async function getPaymentFee(paymentMethod, cardBrand = null) {
    let query = supabase.from('payment_fees').select('*').eq('payment_method', paymentMethod);

    if (cardBrand) {
        query = query.eq('card_brand', cardBrand);
    } else {
        query = query.is('card_brand', null);
    }

    const { data, error } = await query.single();
    if (error) return null;
    return toCamelCase(data);
}
