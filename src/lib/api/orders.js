import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers.js'

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
 * Buscar todas as orders com paginação
 * @param {Object} params - Parâmetros de busca
 * @param {number} params.page - Número da página
 * @param {number} params.limit - Itens por página
 * @param {string} params.status - Filtro de status (opcional)
 * @param {string} params.searchTerm - Termo de busca (opcional)
 * @returns {Promise<{orders: Array, total: number, page: number, limit: number}>}
 */
export async function getOrders(paramsOrPage = {}, limitArg) {
    // Suporta tanto objeto quanto parâmetros posicionais para retrocompatibilidade
    // Uso: getOrders({ page, limit }) ou getOrders(page, limit)
    let page, limit;

    if (typeof paramsOrPage === 'object' && paramsOrPage !== null) {
        // Chamada com objeto: getOrders({ page, limit, status, searchTerm })
        page = paramsOrPage.page || 1;
        limit = paramsOrPage.limit || 30;
    } else {
        // Chamada posicional: getOrders(page, limit)
        page = paramsOrPage || 1;
        limit = limitArg || 30;
    }

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

/**
 * Buscar uma order por ID com seus items
 * @param {number} id - ID da order
 * @returns {Promise<Object>} Dados completos da order
 */
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
 * Criar uma nova order (malinha)
 * @param {Object} orderData - Dados da order
 * @returns {Promise<Object>} Order criada
 */
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
                    }
                }
            }

            // 4. Se encontrou cliente (por CPF ou Telefone), ATUALIZAR os dados (Nome, Email, etc.)
            // Isso resolve o bug onde pedidos ficavam no nome de "Larissa Lacerda" se o CPF já existisse
            if (customerId) {
                console.log('🔄 Atualizando dados do cliente existente:', customerId);
                const updatePayload = {
                    name: customer.name,
                    email: customer.email || null,
                    phone: customer.phone?.replace(/\D/g, '') || null,
                    // CPF já está correto pois ou buscamos por ele ou já o temos
                    cpf: cpf,
                    updated_at: new Date().toISOString()
                };

                const { error: updateError } = await supabase
                    .from('customers')
                    .update(updatePayload)
                    .eq('id', customerId);

                if (updateError) {
                    console.warn('⚠️ Falha ao atualizar dados do cliente existente (não fatal):', updateError.message);
                } else {
                    console.log('✅ Dados do cliente atualizados com sucesso.');
                }
            }

            // 5. Se ainda não encontrou, criar novo cliente
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

/**
 * Atualizar uma order existente
 * @param {number} id - ID da order
 * @param {Object} orderData - Dados para atualizar
 * @returns {Promise<Object>} Order atualizada
 */
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

/**
 * Deletar uma order e RESTAURAR estoque
 * @param {number} id - ID da order
 * @returns {Promise<boolean>}
 */
export async function deleteOrder(id) {
    try {
        console.log(`🗑️ Iniciando deleção da Malinha #${id} com restauração de estoque...`);

        // 1. Buscar os itens da malinha antes de deletar
        // Precisamos dos dados completos para restaurar o estoque corretamente
        const { data: orderWithItems, error: fetchError } = await supabase
            .from('orders')
            .select(`
                id,
                status,
                order_items (
                    product_id,
                    quantity,
                    size_selected,
                    color_selected
                )
            `)
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('❌ Erro ao buscar malinha para deleção:', fetchError);
            throw fetchError;
        }

        // 2. Se a malinha não estava cancelada ou convertida, restaurar o estoque
        // (Assumimos que malinhas pendentes/em uso reservam estoque)
        if (orderWithItems && orderWithItems.order_items && orderWithItems.order_items.length > 0) {
            const itemsToRestore = orderWithItems.order_items.map(item => ({
                productId: item.product_id,
                quantity: item.quantity,
                selectedSize: item.size_selected,
                selectedColor: item.color_selected
            }));

            console.log(`🔓 Restaurando estoque de ${itemsToRestore.length} itens da malinha #${id}...`);
            const restoreResult = await releaseStockForMalinha(itemsToRestore);

            if (!restoreResult.success) {
                console.error('⚠️ Falha parcial ao restaurar estoque:', restoreResult.error);
                // Prosseguimos com a deleção mesmo se a restauração falhar em algum item?
                // Em um sistema crítico poderíamos travar, mas para malinha é melhor limpar o lixo.
            }
        }

        // 3. Deletar a malinha (o banco deve deletar order_items via CASCADE se configurado)
        const { error: deleteError } = await supabase
            .from('orders')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('❌ Erro ao deletar malinha:', deleteError);
            throw deleteError;
        }

        console.log(`✅ Malinha #${id} deletada e estoque restaurado.`);
        return true;
    } catch (error) {
        console.error(`❌ Erro em deleteOrder(${id}):`, error);
        throw error;
    }
}

/**
 * Atualizar status de uma order
 * @param {number} id - ID da order
 * @param {string} newStatus - Novo status
 * @returns {Promise<Object>} Order atualizada
 */
export async function updateOrderStatus(id, newStatus) {
    const { data, error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id).select().single();
    if (error) throw error;
    return toCamelCase(data);
}

/**
 * Atualizar datas de agendamento de uma order
 * @param {number} id - ID da order
 * @param {Object} scheduleData - Dados de agendamento (deliveryDate, pickupDate)
 * @returns {Promise<Object>} Order atualizada
 */
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

            // Encontrar variante pela cor (Case Insensitive e Trimmed)
            const normalize = (str) => String(str || '').trim().toLowerCase();

            const variantIndex = updatedVariants.findIndex(
                v => normalize(v.colorName) === normalize(selectedColor)
            );

            if (variantIndex === -1) {
                // Tenta encontrar uma cor padrão se falhar
                const defaultVariantIndex = updatedVariants.findIndex(v => v.colorName === product.color);
                if (defaultVariantIndex !== -1) {
                    console.log(`⚠️ Usando cor principal do produto na reserva: ${product.color}`);
                    // Usa a cor padrão, mas o selectedColor original será preservado no log/item
                } else {
                    console.error(`❌ Cor "${selectedColor}" não encontrada no produto ${product.name} (ID: ${productId})`);
                    console.log('   Cores disponíveis:', updatedVariants.map(v => v.colorName).join(', '));
                    throw new Error(`Cor "${selectedColor}" não encontrada no produto ${product.name}. Cores disponíveis: ${updatedVariants.map(v => v.colorName).join(', ')}`);
                }
            }

            // Pega a variante correta ou a padrão (se encontrou fallback)
            const actualVariantIndex = variantIndex !== -1 ? variantIndex : updatedVariants.findIndex(v => v.colorName === product.color);
            const variant = updatedVariants[actualVariantIndex];

            // Encontrar tamanho
            const sizeStockIndex = variant.sizeStock?.findIndex(s => normalize(s.size) === normalize(selectedSize));

            if (sizeStockIndex === undefined || sizeStockIndex === -1) {
                console.error(`❌ Tamanho "${selectedSize}" não encontrado na cor "${variant.colorName}"`);
                console.log('   Tamanhos disponíveis:', variant.sizeStock?.map(s => `${s.size} (${s.quantity} un.)`).join(', '));
                throw new Error(`Tamanho "${selectedSize}" não encontrado no produto ${product.name} cor ${variant.colorName}. Tamanhos disponíveis: ${variant.sizeStock?.map(s => s.size).join(', ')}`);
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

            // Encontrar variante pela cor (Case Insensitive e Trimmed)
            const normalize = (str) => String(str || '').trim().toLowerCase();

            let variantIndex = updatedVariants.findIndex(
                v => normalize(v.colorName) === normalize(selectedColor)
            );

            // Se não encontrou a cor exata
            if (variantIndex === -1) {
                console.warn(`⚠️ Cor "${selectedColor}" não encontrada nas variantes. Tentando fallback...`);

                // 1. Tentar achar pelo nome da cor principal do produto
                variantIndex = updatedVariants.findIndex(v => normalize(v.colorName) === normalize(product.color));

                // 2. Se ainda não achou e só tem uma variante, usa ela (comum em produtos de cor única)
                if (variantIndex === -1 && updatedVariants.length === 1) {
                    console.log(`⚠️ Usando única variante disponível: ${updatedVariants[0].colorName}`);
                    variantIndex = 0;
                }

                // 3. Se ainda não achou, criar a variante para não perder o estoque
                if (variantIndex === -1) {
                    console.warn(`⚠️ Criando nova variante para cor "${selectedColor}" para salvar o estoque.`);
                    updatedVariants.push({
                        colorName: selectedColor || 'Padrão',
                        sizeStock: [],
                        images: []
                    });
                    variantIndex = updatedVariants.length - 1;
                }
            }

            const variant = updatedVariants[variantIndex];

            // Encontrar tamanho
            const sizeStockIndex = variant.sizeStock?.findIndex(s => normalize(s.size) === normalize(selectedSize));

            if (sizeStockIndex === undefined || sizeStockIndex === -1) {
                console.warn(`⚠️ Tamanho "${selectedSize}" não encontrado na variante "${variant.colorName}", criando entrada.`);
                // Criar entrada se não existir
                variant.sizeStock = variant.sizeStock || [];
                variant.sizeStock.push({ size: selectedSize, quantity: quantity });
            } else {
                // Incrementar estoque
                variant.sizeStock[sizeStockIndex].quantity = (variant.sizeStock[sizeStockIndex].quantity || 0) + quantity;
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
