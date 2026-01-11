import { supabase } from './supabase'
import { toSnakeCase, toCamelCase } from './api/helpers.js'

// ==================== RE-EXPORTS (MIGRATED MODULES) ====================
// Re-exportar funções que foram migradas para módulos separados
export * from './api/settings.js'
export * from './api/coupons.js'
export * from './api/suppliers.js'
export * from './api/payment-fees.js'
export * from './api/expenses.js'
export * from './api/materials.js'
export * from './api/purchases.js'

// ==================== PRODUCTS ====================

// ⚡ OTIMIZADO: Carregar produtos em LOTES (paginação no servidor)
export async function getProducts(page = 1, pageSize = 20) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    console.log(`📡 Buscando produtos página ${page} (${start}-${end})...`);

    const { data, error, count } = await supabase
        .from('products')
        // Select essential columns including analytics data (confirmed safe by debug)
        // Removed: supplier_id (problematic), description (heavy)
        .select('id, name, price, cost_price, images, category, stock, created_at, active, stock_status, trip_count', { count: 'estimated' })
        .order('created_at', { ascending: false })
        .range(start, end);

    if (error) {
        console.error('❌ Erro ao buscar produtos:', error);
        throw error;
    }

    console.log(`✅ Produtos carregados: ${data?.length} de ${count} total`);

    const mappedProducts = data.map(product => {
        const camelProduct = toCamelCase(product);
        // Garantir que variants é um array
        if (!camelProduct.variants) {
            camelProduct.variants = [];
        }

        // Log detalhado para produto ID 24 (Calça Dora)
        if (camelProduct.id === 24) {
            console.log('🔍 PRODUTO ID 24 CARREGADO DO BANCO:');
            console.log('   Nome:', camelProduct.name);
            console.log('   Stock total:', camelProduct.stock);
            // Remover images/urls das variants para logs mais limpos
            const variantsClean = camelProduct.variants?.map(v => ({
                colorName: v.colorName,
                colorHex: v.colorHex,
                sizeStock: v.sizeStock
            }));
            console.log('   Variants:', JSON.stringify(variantsClean, null, 2));
            console.log('   Timestamp:', new Date().toISOString());
        }

        return camelProduct;
    });

    return {
        products: mappedProducts,
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
        // Using safe minimal select to avoid 500 errors
        .select('id, name, price, images, category, stock, created_at, active')
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

            // Log detalhado para produto ID 24 (Calça Dora) removed

            return camel;
        });
    // Já vem ordenado do banco (order_by), não precisa fazer sort em JS
    const convertTime = (performance.now() - convertStart).toFixed(0);

    console.log(`⏱️  [Catálogo] Processamento: ${convertTime}ms`);

    const totalTime = (performance.now() - startTime).toFixed(0);
    console.log(`✅ [Catálogo] Total: ${totalTime}ms (${result.length} produtos carregados)`);

    return result;
}

// ⚡ Catálogo: Carregar produtos PAGINADOS com FILTROS (Infinite Scroll)
export async function getProductsPaginated(offset = 0, limit = 6, filters = {}) {
    const { category, sizes, search } = filters;
    const startTime = performance.now();
    console.log(`📡 [Catálogo] Carregando produtos ${offset}-${offset + limit - 1}...`, filters);

    // Construir query base
    let query = supabase
        .from('products')
        // Using safe minimal select to avoid 500 errors
        .select('id, name, price, images, category, stock, created_at, active, variants', { count: 'estimated' })
        .eq('active', true);

    // Filtro de categoria
    if (category && category !== 'all') {
        query = query.eq('category', category);
    }

    // Filtro de busca (nome, cor, categoria)
    if (search && search.trim()) {
        query = query.or(`name.ilike.%${search}%,color.ilike.%${search}%,category.ilike.%${search}%`);
    }

    // Filtro de tamanhos (contains any of the sizes)
    if (sizes && sizes.length > 0) {
        // Supabase array overlap: sizes column contains at least one of the filter sizes
        query = query.overlaps('sizes', sizes);
    }

    // Ordenação e paginação
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error('❌ [Catálogo] Erro na query paginada:', error);
        throw error;
    }

    const result = data.map(product => {
        const camel = toCamelCase(product);
        if (!camel.variants) camel.variants = [];
        return camel;
    });

    const totalTime = (performance.now() - startTime).toFixed(0);
    console.log(`✅ [Catálogo] ${result.length} produtos em ${totalTime}ms (Total filtrado: ${count})`);

    return { products: result, total: count };
}

// 🔐 Admin: Carregar Inventário Completo (inclui Preço de Custo)
export async function getAllProductsAdmin() {
    console.log('🔐 [Admin] Carregando inventário completo...');

    // Select explicit fields to include cost_price but avoid crashing columns
    const { data, error } = await supabase
        .from('products')
        .select('id, name, price, cost_price, images, category, stock, created_at, active, stock_status, trip_count, variants, sizes, color')
        .order('id', { ascending: false }); // Ordem decrescente por ID para ver os mais novos

    if (error) {
        console.error('❌ [Admin] Erro ao carregar inventário:', error);
        throw error;
    }

    console.log(`✅ [Admin] Inventário carregado: ${data?.length} produtos`);
    return toCamelCase(data);
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
        .select('*', { count: 'estimated' })
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

    // Fetch orders WITH customer data in a single query
    const { data, error, count } = await supabase
        .from('orders')
        .select('*, customer:customers(id, name, phone)', { count: 'estimated' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('❌ API Error getting orders:', error);
        throw error;
    }

    console.log(`✅ API: Got ${data?.length || 0} orders (total: ${count})`);

    // Map to camelCase
    const orders = data.map(order => {
        const camelOrder = toCamelCase(order);

        // Handle the joined customer data correctly
        // toCamelCase likely handles nested objects, but let's ensure structure
        const customer = order.customer ? toCamelCase(order.customer) : null;

        return {
            ...camelOrder,
            orderNumber: `#${String(order.id).padStart(6, '0')}`,
            customer: customer
        };
    });

    return {
        orders,
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
                sizeSelected: item.sizeSelected || '',
                selectedColor: item.colorSelected || 'Padrão'
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
            // ✅ Prioridade: selectedColor. Somente usa color como fallback se selectedColor for omisso.
            const variantIndex = updatedVariants.findIndex(
                v => selectedColor
                    ? v.colorName === selectedColor
                    : v.colorName === currentProduct.color
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
            const oldQty = variant.sizeStock[sizeStockIndex].quantity;
            variant.sizeStock[sizeStockIndex].quantity -= quantity;
            const newQty = variant.sizeStock[sizeStockIndex].quantity;

            console.log(`📉 DECREMENTO: ${selectedColor} - ${selectedSize}: ${oldQty} → ${newQty} unidades`);

            // Calcular novo estoque total
            const newTotalStock = updatedVariants.reduce((total, v) => {
                return total + (v.sizeStock || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
            }, 0);

            console.log(`📊 Estoque total do produto será atualizado para: ${newTotalStock}`);

            // Log detalhado para produto ID 24
            if (productId === 24) {
                console.log('🔍 ATUALIZANDO PRODUTO ID 24 NO BANCO:');
                console.log('   Novo stock total:', newTotalStock);
                // Remover images/urls das variants para logs mais limpos
                const variantsClean = updatedVariants?.map(v => ({
                    colorName: v.colorName,
                    colorHex: v.colorHex,
                    sizeStock: v.sizeStock
                }));
                console.log('   Variants atualizadas:', JSON.stringify(variantsClean, null, 2));
            }

            // Atualizar produto no banco com novos variants e stock
            const updatePayload = {
                variants: updatedVariants,
                stock: newTotalStock,
                updated_at: new Date().toISOString()
            };

            console.log(`💾 Enviando UPDATE para produto ${productId}...`);

            const { data: updateData, error: updateError } = await supabase
                .from('products')
                .update(updatePayload)
                .eq('id', productId)
                .select(); // Retorna o produto atualizado

            if (updateError) {
                console.error(`❌ Erro ao atualizar estoque do produto ${productId}:`, updateError);
                throw new Error(`Falha ao atualizar estoque do produto ${productId}`);
            }

            console.log(`✅ BANCO ATUALIZADO: Produto ${productId} agora tem stock total = ${newTotalStock}`);

            // Registrar movimentação no histórico
            try {
                await supabase.from('stock_movements').insert({
                    product_id: productId,
                    quantity: quantity,
                    movement_type: 'venda',
                    notes: `Venda automática (Item: ${selectedColor}/${selectedSize})`
                });
                console.log(`📝 Movimentação registrada: venda - ${quantity} un.`);
            } catch (movError) {
                console.error('⚠️ Falha ao registrar movimentação de estoque:', movError);
                // Não falhar a operação principal, apenas logar erro
            }

            // Confirmar o que foi salvo no banco
            if (productId === 24 && updateData && updateData.length > 0) {
                console.log('✅ CONFIRMAÇÃO DO BANCO - Produto ID 24:');
                console.log('   Stock salvo:', updateData[0].stock);
                // Remover images/urls das variants para logs mais limpos
                const variantsSaved = updateData[0].variants?.map(v => ({
                    colorName: v.colorName,
                    colorHex: v.colorHex,
                    sizeStock: v.sizeStock
                }));
                console.log('   Variants salvas:', JSON.stringify(variantsSaved, null, 2));
            }
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
    console.log('🔍 Items recebidos:', JSON.stringify(items, null, 2));
    const reserved = [];

    try {
        for (const item of items) {
            const productId = item.productId;
            const quantity = item.quantity || 1;
            const selectedSize = item.selectedSize;
            const selectedColor = item.selectedColor;

            console.log(`🔍 Processando item: productId=${productId}, size=${selectedSize}, color=${selectedColor}`);

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
                v => selectedColor
                    ? v.colorName === selectedColor
                    : v.colorName === (product?.color || currentProduct?.color || (updatedVariants[0]?.colorName))
            );

            if (variantIndex === -1) {
                console.error(`❌ Cor "${selectedColor}" não encontrada no produto ${product.name} (ID: ${productId})`);
                console.log('   Cores disponíveis:', updatedVariants.map(v => v.colorName).join(', '));
                console.log('   Variantes completas:', JSON.stringify(updatedVariants, null, 2));
                throw new Error(`Cor "${selectedColor}" não encontrada no produto ${product.name}. Cores disponíveis: ${updatedVariants.map(v => v.colorName).join(', ')}`);
            }

            const variant = updatedVariants[variantIndex];

            // Encontrar tamanho
            const sizeStockIndex = variant.sizeStock?.findIndex(s => s.size === selectedSize);

            if (sizeStockIndex === undefined || sizeStockIndex === -1) {
                console.error(`❌ Tamanho "${selectedSize}" não encontrado na cor "${selectedColor}"`);
                console.log('   Tamanhos disponíveis:', variant.sizeStock?.map(s => `${s.size} (${s.quantity} un.)`).join(', '));
                throw new Error(`Tamanho "${selectedSize}" não encontrado no produto ${product.name} cor ${selectedColor}. Tamanhos disponíveis: ${variant.sizeStock?.map(s => s.size).join(', ')}`);
            }

            const currentQty = variant.sizeStock[sizeStockIndex].quantity || 0;

            if (currentQty < quantity) {
                console.error(`❌ Estoque insuficiente para ${product.name} (${selectedColor} - ${selectedSize})`);
                console.error(`   Disponível: ${currentQty} unidade(s)`);
                console.error(`   Solicitado: ${quantity} unidade(s)`);
                console.error(`   Variante completa:`, JSON.stringify(variant, null, 2));
                throw new Error(`Estoque insuficiente para ${product.name} (${selectedColor} - ${selectedSize}). Disponível: ${currentQty}, Solicitado: ${quantity}`);
            }

            // Decrementar estoque
            const oldQty = variant.sizeStock[sizeStockIndex].quantity;
            variant.sizeStock[sizeStockIndex].quantity -= quantity;
            const newQty = variant.sizeStock[sizeStockIndex].quantity;

            console.log(`📉 Decrementando estoque: ${product.name} (${selectedColor} - ${selectedSize})`);
            console.log(`   Antes: ${oldQty} → Depois: ${newQty} unidades`);

            // Calcular novo total
            const newTotalStock = updatedVariants.reduce((total, v) => {
                return total + (v.sizeStock || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
            }, 0);

            console.log(`📊 Novo estoque total do produto: ${newTotalStock}`);

            // Log detalhado para produto ID 24
            if (productId === 24) {
                console.log('🔍 [RESERVA] ATUALIZANDO PRODUTO ID 24 NO BANCO:');
                console.log('   Novo stock total:', newTotalStock);
                // Remover images/urls das variants para logs mais limpos
                const variantsClean = updatedVariants?.map(v => ({
                    colorName: v.colorName,
                    colorHex: v.colorHex,
                    sizeStock: v.sizeStock
                }));
                console.log('   Variants atualizadas:', JSON.stringify(variantsClean, null, 2));
            }

            // Atualizar no banco
            const updatePayload = {
                variants: updatedVariants,
                stock: newTotalStock,
                updated_at: new Date().toISOString()
            };

            console.log(`💾 [RESERVA] Enviando UPDATE para produto ${productId}...`);

            const { data: updateData, error: updateError } = await supabase
                .from('products')
                .update(updatePayload)
                .eq('id', productId)
                .select(); // Retorna o produto atualizado

            if (updateError) {
                console.error(`❌ Erro ao reservar estoque do produto ${productId}:`, updateError);
                throw updateError;
            }

            console.log(`✅ [RESERVA] Estoque atualizado no banco para produto ${productId}`);

            // Registrar movimentação no histórico
            try {
                await supabase.from('stock_movements').insert({
                    product_id: productId,
                    quantity: quantity,
                    movement_type: 'saida_malinha',
                    notes: `Saída para Malinha (Item: ${selectedColor}/${selectedSize})`
                });
                console.log(`📝 Movimentação registrada: saida_malinha - ${quantity} un.`);
            } catch (movError) {
                console.error('⚠️ Falha ao registrar movimentação de malinha:', movError);
            }

            // Confirmar o que foi salvo no banco
            if (productId === 24 && updateData && updateData.length > 0) {
                console.log('✅ [RESERVA] CONFIRMAÇÃO DO BANCO - Produto ID 24:');
                console.log('   Stock salvo:', updateData[0].stock);
                // Remover images/urls das variants para logs mais limpos
                const variantsSaved = updateData[0].variants?.map(v => ({
                    colorName: v.colorName,
                    colorHex: v.colorHex,
                    sizeStock: v.sizeStock
                }));
                console.log('   Variants salvas:', JSON.stringify(variantsSaved, null, 2));
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
                v => selectedColor
                    ? v.colorName === selectedColor
                    : v.colorName === (product?.color || currentProduct?.color || (updatedVariants[0]?.colorName))
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

    // ✅ Se não tiver customerId mas tiver dados do cliente, criar ou buscar cliente
    if (!customerId && customer) {
        console.log('👤 Buscando/criando cliente a partir dos dados recebidos...');

        // 1. Validação Obrigatória de CPF
        const cpf = customer.cpf?.replace(/\D/g, '');
        if (!cpf || cpf.length < 11) {
            throw new Error("CPF válido (11 dígitos) é obrigatório para finalizar o pedido.");
        }

        try {
            // 2. Buscar cliente existente por CPF (Prioridade absoluta)
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id')
                .eq('cpf', cpf)
                .maybeSingle();

            if (existingCustomer) {
                customerId = existingCustomer.id;
                console.log('✅ Cliente existente encontrado por CPF:', customerId);
            }

            // 3. Se não encontrou, buscar por TELEFONE como fallback
            if (!customerId && customer.phone) {
                const phone = customer.phone?.replace(/\D/g, '');
                if (phone) {
                    const { data: existingByPhone } = await supabase
                        .from('customers')
                        .select('id')
                        .eq('phone', phone)
                        .maybeSingle();

                    if (existingByPhone) {
                        customerId = existingByPhone.id;
                        console.log('✅ Cliente existente encontrado por Telefone:', customerId);
                        // Atualizar CPF
                        await supabase.from('customers').update({ cpf: cpf }).eq('id', customerId);
                        console.log('🔄 CPF atualizado para o cliente encontrado por telefone.');
                    }
                }
            }

            // 4. Se ainda não encontrou, criar novo cliente
            if (!customerId) {
                console.log('📝 Criando novo cliente com CPF...');

                const customerRecord = {
                    name: customer.name,
                    phone: customer.phone?.replace(/\D/g, '') || null,
                    email: customer.email || null,
                    cpf: cpf,
                    addresses: customer.addresses || []
                };

                const { data: newCustomer, error: customerError } = await supabase
                    .from('customers')
                    .insert([customerRecord])
                    .select()
                    .single();

                if (customerError) {
                    if (customerError.code === '23505') {
                        console.warn('⚠️ Cliente duplicado detectado na criação, tentando recuperação...');
                        const { data: retryCustomer } = await supabase
                            .from('customers')
                            .select('id')
                            .or(`cpf.eq.${cpf},phone.eq.${customerRecord.phone}`)
                            .single();
                        if (retryCustomer) customerId = retryCustomer.id;
                    } else {
                        console.error('❌ Erro ao criar cliente:', customerError);
                        throw new Error('Erro ao criar cliente: ' + customerError.message);
                    }
                } else {
                    customerId = newCustomer.id;
                    console.log('✅ Novo cliente criado com ID:', customerId);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao processar cliente:', error);
            if (error.message && error.message.includes("CPF")) throw error;
            throw new Error('Erro ao processar dados do cliente: ' + error.message);
        }
    }

    if (!customerId) {
        throw new Error("Dados do cliente são obrigatórios. Preencha nome e telefone.");
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
            color_selected: item.selectedColor || 'Padrão',
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
    // NOTA: Isso foi movido para a criação da malinha (reserva de estoque)
    // Quando uma malinha é criada, o estoque já é reservado via reserveStockForMalinha
    console.log('📦 Ordem criada - estoque será gerenciado via reserveStockForMalinha');

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

    // 🔄 Atualizar itens se fornecidos
    if (orderData.items && orderData.items.length > 0) {
        console.log('📋 Atualizando order_items para order_id:', id);

        // 1. Deletar itens antigos
        const { error: deleteError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', id);

        if (deleteError) {
            console.error('❌ Erro ao deletar itens antigos:', deleteError);
            throw deleteError;
        }

        // 2. Inserir novos itens
        const orderItems = orderData.items.map(item => ({
            order_id: id,
            product_id: item.productId,
            quantity: item.quantity || 1,
            price_at_time: item.price || 0,
            size_selected: item.selectedSize || '',
            color_selected: item.selectedColor || 'Padrão',
            cost_price_at_time: item.costPrice || null
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            console.error('❌ Erro ao inserir novos itens:', itemsError);
            throw itemsError;
        }
        console.log('✅ Itens da malinha atualizados com sucesso');
    }

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
        .select('id, customer_id, total_value, payment_method, payment_status, created_at, fee_amount, net_amount, items, entry_payment, is_installment, customers(id, name)', { count: 'estimated' })
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
        // fee_amount e net_amount calculados via trigger
        // fee_amount: snakeData.fee_amount || 0,
        // net_amount: snakeData.net_amount,
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

    // 📦 IMPORTANTE: Decrementar estoque
    // Para vendas diretas: SEMPRE decrementa
    // Para vendas de malinha: NÃO decrementa pois o estoque já foi reservado quando a malinha foi criada
    const isFromMalinha = !!vendaRecord.order_id;

    if (!isFromMalinha) {
        // Venda direta - SEMPRE decrementa estoque
        console.log('📦 Venda direta - decrementando estoque...');
        try {
            const itemsWithColor = vendaData.items.map(item => ({
                ...item,
                selectedColor: item.selectedColor || item.color || 'Padrão'
            }));

            await decrementProductStock(itemsWithColor);
            console.log('✅ Estoque decrementado com sucesso');
        } catch (stockError) {
            console.error('❌ ERRO CRÍTICO ao decrementar estoque:', stockError);
            // Não lança erro para não impedir a venda de ser registrada
        }
    } else {
        // Venda de malinha - estoque já foi reservado quando a malinha foi criada
        console.log('📦 Venda de malinha (order_id: ' + vendaRecord.order_id + ') - estoque já foi reservado, não precisa decrementar novamente');
    }

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

// ==================== CUSTOMER PREFERENCES ====================

export async function getCustomerPreferences(customerId) {
    const { data, error } = await supabase
        .from('customer_preferences')
        .select('*')
        .eq('customer_id', customerId)
        .single();

    if (error) {
        // PGRST116 = not found (registro vazio), PGRST205 = table not found
        if (error.code === 'PGRST116' || error.code === 'PGRST205') {
            return null;
        }
        throw error;
    }

    return data ? toCamelCase(data) : null;
}

export async function updateCustomerPreferences(customerId, preferencesData) {
    const snakeData = toSnakeCase(preferencesData);

    try {
        const { data, error } = await supabase
            .from('customer_preferences')
            .upsert([{ customer_id: customerId, ...snakeData }], { onConflict: 'customer_id' })
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST205') {
                console.warn('⚠️ A tabela customer_preferences não existe no banco de dados.');
                return toCamelCase(snakeData);
            }
            throw error;
        }

        return toCamelCase(data);
    } catch (err) {
        console.error('❌ Erro inesperado ao salvar preferências:', err);
        return toCamelCase(snakeData);
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
            .select('id, customer_id, total_value, entry_payment, num_installments, is_installment, payment_method, payment_status, created_at, customers(id, name, phone)', { count: 'estimated' })
            // ✅ CORREÇÃO: Crediário = fiado (simples) OU fiado_parcelado
            // Inclui TODAS as vendas no fiado, parceladas ou não
            .in('payment_method', ['fiado', 'fiado_parcelado'])
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
            .select('*, installment_payments(*), vendas(id, order_id)');

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

/**
 * Buscar vencimentos de crediário do dia e da semana
 * @returns {Object} { today: [], thisWeek: [], overdueCount, totalDueToday, totalDueThisWeek }
 */
export async function getUpcomingInstallments() {
    console.log('📅 API: Buscando vencimentos de crediário...');

    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Calcular fim da semana (próximo domingo)
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
        const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

        // Buscar parcelas pendentes que vencem hoje ou até o fim da semana
        const { data, error } = await supabase
            .from('installments')
            .select(`
                id,
                venda_id,
                installment_number,
                due_date,
                original_amount,
                paid_amount,
                remaining_amount,
                status,
                vendas!inner(
                    id,
                    total_value,
                    customer_id,
                    customers(id, name, phone)
                )
            `)
            .in('status', ['pending', 'overdue'])
            .gte('due_date', todayStr)
            .lte('due_date', endOfWeekStr)
            .order('due_date', { ascending: true });

        if (error) throw error;

        // Converter para camelCase e separar por dia
        const allInstallments = data.map(inst => ({
            id: inst.id,
            vendaId: inst.venda_id,
            installmentNumber: inst.installment_number,
            dueDate: inst.due_date,
            originalAmount: inst.original_amount,
            paidAmount: inst.paid_amount,
            remainingAmount: inst.remaining_amount,
            status: inst.status,
            customerName: inst.vendas?.customers?.name || 'Cliente desconhecido',
            customerPhone: inst.vendas?.customers?.phone || null,
            totalValue: inst.vendas?.total_value || 0
        }));

        // Separar vencimentos de hoje e da semana
        const todayInstallments = allInstallments.filter(i => i.dueDate === todayStr);
        const weekInstallments = allInstallments.filter(i => i.dueDate !== todayStr);

        // Buscar quantidade de atrasados
        const { count: overdueCount } = await supabase
            .from('installments')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'overdue');

        const totalDueToday = todayInstallments.reduce((sum, i) => sum + (i.remainingAmount || 0), 0);
        const totalDueThisWeek = weekInstallments.reduce((sum, i) => sum + (i.remainingAmount || 0), 0);

        console.log(`✅ Vencimentos: ${todayInstallments.length} hoje, ${weekInstallments.length} na semana, ${overdueCount || 0} atrasados`);

        return {
            today: todayInstallments,
            thisWeek: weekInstallments,
            overdueCount: overdueCount || 0,
            totalDueToday,
            totalDueThisWeek
        };
    } catch (err) {
        console.error('❌ Erro ao buscar vencimentos:', err);
        return { today: [], thisWeek: [], overdueCount: 0, totalDueToday: 0, totalDueThisWeek: 0 };
    }
}
