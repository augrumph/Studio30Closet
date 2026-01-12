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
export * from './api/orders.js'
export * from './api/installments.js'

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


// ==================== VENDAS ====================

/**
 * Função interna para decrementar estoque de produtos quando uma venda é feita
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
