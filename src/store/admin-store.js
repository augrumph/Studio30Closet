import { create } from 'zustand'
import {
    getProducts,
    getAllProducts,
    getAllProductsAdmin,
    getProductsPaginated,
    getOrders,
    getCustomers,
    getVendas,
    createProduct,
    updateProduct,
    deleteProduct,
    deleteMultipleProducts,
    createOrder,
    updateOrderStatus,
    updateOrderSchedule,
    deleteOrder,
    createVenda,
    updateVenda,
    deleteVenda,
    updateCustomer,
    createCustomer,
    deleteCustomer,
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    updateOrder,
    getOrderById as getOrderByIdFromApi,
    reserveStockForMalinha,
    releaseStockForMalinha,
    getCustomerPreferences,
    updateCustomerPreferences
} from '@/lib/api'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { useOperationalCostsStore } from './operational-costs-store'

export const useAdminStore = create((set, get) => ({
    // ==================== ESTADO ====================

    // Global Loading
    isInitialLoading: true, // True até carregar todos os dados iniciais

    // Produtos
    products: [],
    productsLoading: false,
    productsError: null,

    // Pedidos
    orders: [],
    ordersLoading: false,
    ordersError: null,

    // Clientes
    customers: [],
    customersLoading: false,
    customersError: null,

    // Vendas
    vendas: [],
    vendasLoading: false,
    vendasError: null,

    // Cupons
    coupons: [],
    couponsLoading: false,
    couponsError: null,

    // ==================== PRODUTOS ====================

    loadProducts: async (page = 1) => {
        set({ productsLoading: true, productsError: null })
        try {
            // Carregar apenas 1ª página (20 produtos)
            // Muito mais rápido que carregar tudo!
            const result = await getProducts(page, 20)
            const sortedProducts = [...result.products].sort((a, b) => b.id - a.id)
            set({
                products: sortedProducts,
                productsLoading: false,
                productsTotal: result.total
            })
        } catch (error) {
            set({ productsError: error.message, productsLoading: false })
        }
    },

    // Carregar TODOS os produtos para o Catálogo (com images)
    loadAllProductsForCatalog: async () => {
        set({ productsLoading: true, productsError: null })
        try {
            console.log('📂 Carregando TODOS os produtos para catálogo...')
            const allProducts = await getAllProducts()

            // FILTRO DE SEGURANÇA: Remover undefined/null para evitar crash
            const validProducts = allProducts.filter(p => p && typeof p === 'object')

            const sortedProducts = [...validProducts].sort((a, b) => b.id - a.id)
            set({
                products: sortedProducts,
                productsLoading: false,
                productsTotal: validProducts.length
            })
            console.log(`✅ ${validProducts.length} produtos carregados para catálogo`)
        } catch (error) {
            set({ productsError: error.message, productsLoading: false })
        }
    },

    // Carregar TODOS os produtos para a Tabela de Admin (com Preço de Custo)
    loadInventoryForAdmin: async () => {
        set({ productsLoading: true, productsError: null })
        try {
            console.log('🔐 Carregando inventário completo para Admin...')
            const allProducts = await getAllProductsAdmin()

            const sortedProducts = [...allProducts].sort((a, b) => b.id - a.id)
            set({
                products: sortedProducts,
                productsLoading: false,
                productsTotal: allProducts.length
            })
            console.log(`✅ ${allProducts.length} produtos carregados com custo.`)
        } catch (error) {
            set({ productsError: error.message, productsLoading: false })
        }
    },

    // ⚡ INFINITE SCROLL: Carregar primeira página com FILTROS (Reset)
    loadFirstProductsPage: async (filters = {}) => {
        set({ productsLoading: true, productsError: null, products: [], productsTotal: 0 })
        try {
            console.log('🚀 Carregando primeiros 6 produtos...', filters)
            const { products, total } = await getProductsPaginated(0, 6, filters)
            set({
                products,
                productsLoading: false,
                productsTotal: total
            })
            console.log(`✅ ${products.length} produtos carregados (de ${total} total)`)
        } catch (error) {
            set({ productsError: error.message, productsLoading: false })
        }
    },

    // ⚡ INFINITE SCROLL: Carregar mais produtos com FILTROS (Append)
    loadMoreProducts: async (offset, filters = {}) => {
        // Evitar loading state global para não piscar a tela
        try {
            console.log(`📜 Carregando mais produtos a partir de ${offset}...`, filters)
            const { products: newProducts, total } = await getProductsPaginated(offset, 6, filters)

            set(state => ({
                products: [...state.products, ...newProducts],
                productsTotal: total
            }))
            console.log(`✅ ${newProducts.length} produtos adicionados`)
            return newProducts.length
        } catch (error) {
            console.error('❌ Erro ao carregar mais produtos:', error)
            return 0
        }
    },

    addProduct: async (productData) => {
        set({ productsLoading: true, productsError: null })
        try {
            const newProduct = await createProduct(productData)
            set(state => ({
                // Adicionar no início da lista
                products: [newProduct, ...state.products],
                productsLoading: false
            }))
            return { success: true, product: newProduct }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ productsError: userFriendlyError, productsLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    editProduct: async (id, productData) => {
        set({ productsLoading: true, productsError: null })
        try {
            const updatedProduct = await updateProduct(id, productData)
            set(state => ({
                products: state.products.map(p =>
                    p.id === parseInt(id) ? updatedProduct : p
                ),
                productsLoading: false
            }))
            return { success: true, product: updatedProduct }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ productsError: userFriendlyError, productsLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    removeProduct: async (id) => {
        set({ productsLoading: true, productsError: null })
        try {
            await deleteProduct(id)
            set(state => ({
                products: state.products.filter(p => p.id !== parseInt(id)),
                productsLoading: false
            }))
            return { success: true }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ productsError: userFriendlyError, productsLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    removeMultipleProducts: async (productIds) => {
        set({ productsLoading: true, productsError: null })
        try {
            await deleteMultipleProducts(productIds)
            const idsToDelete = productIds.map(id => parseInt(id, 10));
            set(state => ({
                products: state.products.filter(p => !idsToDelete.includes(p.id)),
                productsLoading: false
            }))
            return { success: true }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ productsError: userFriendlyError, productsLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    // ==================== PEDIDOS ====================

    loadOrders: async (page = 1) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            console.log(`⏳ Carregando pedidos (página ${page})...`);
            const result = await getOrders(page, 30)
            const orders = result.orders.sort((a, b) => b.id - a.id)
            set({ orders, ordersLoading: false, ordersTotal: result.total, ordersPage: page })
            console.log(`✅ ${orders.length} pedidos carregados`);
        } catch (error) {
            set({ ordersError: error.message, ordersLoading: false })
        }
    },

    addOrder: async (orderData) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            // 1. Criar a malinha no banco
            const newOrder = await createOrder(orderData)

            // 2. 🔒 Reservar estoque imediatamente
            // Usamos os itens enviados no orderData pois o newOrder pode demorar para sincronizar
            if (orderData.items && orderData.items.length > 0) {
                console.log('🔒 Reservando estoque automaticamente para nova malinha...');
                const reserveResult = await reserveStockForMalinha(orderData.items);
                if (!reserveResult.success) {
                    // Se falhar a reserva, podemos opcionalmente deletar a order ou apenas avisar
                    console.error('⚠️ Falha ao reservar estoque para nova malinha:', reserveResult.error);
                }
            }

            set(state => ({
                orders: [newOrder, ...state.orders],
                ordersLoading: false
            }))

            // Recarregar produtos para atualizar estoque na UI
            get().loadProducts();

            return { success: true, order: newOrder }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ ordersError: userFriendlyError, ordersLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    updateOrder: async (id, orderData) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            // Status que LIBERAM estoque (malinha finalizada/cancelada)
            const statusesThatReleaseStock = ['completed', 'cancelled', 'delivered'];

            // 1. Buscar a malinha ATUAL para saber o que estornar
            // Tentamos pegar do estado local primeiro
            let currentOrder = get().orders.find(o => o.id === parseInt(id));
            if (!currentOrder || !currentOrder.items) {
                currentOrder = await getOrderByIdFromApi(id);
            }

            // 2. 🔓 Estornar estoque dos itens ANTIGOS se a malinha tinha estoque reservado
            if (currentOrder && currentOrder.items && !statusesThatReleaseStock.includes(currentOrder.status)) {
                console.log('🔓 Estornando estoque dos itens anteriores para atualização...');
                await releaseStockForMalinha(currentOrder.items);
            }

            // 3. Atualizar no banco
            const updatedOrder = await updateOrder(id, orderData)

            // 4. 🔒 Reservar estoque dos NOVOS itens se o status mantém reserva
            if (orderData.items && orderData.items.length > 0 && !statusesThatReleaseStock.includes(orderData.status)) {
                console.log('🔒 Reservando estoque dos novos itens...');
                await reserveStockForMalinha(orderData.items);
            }

            set(state => ({
                orders: state.orders.map(o =>
                    o.id === parseInt(id) ? updatedOrder : o
                ),
                ordersLoading: false
            }))

            // Recarregar produtos
            get().loadProducts();

            return { success: true, order: updatedOrder }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ ordersError: userFriendlyError, ordersLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    updateStatus: async (id, status) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            // Obter o pedido atual para verificar o status anterior
            const currentOrder = get().orders.find(o => o.id === parseInt(id));
            const previousStatus = currentOrder?.status;

            // Status que LIBERAM estoque (malinha finalizada/cancelada)
            const statusesThatReleaseStock = ['completed', 'cancelled', 'delivered'];
            // Status que MANTÊM estoque reservado (malinha ativa)
            const statusesThatReserveStock = ['pending', 'shipped', 'active'];

            // 🔓 MALINHA: Liberar estoque se mudar para status final (completed, cancelled, delivered)
            if (statusesThatReleaseStock.includes(status) && !statusesThatReleaseStock.includes(previousStatus)) {
                console.log(`🔓 Malinha mudando para "${status}" - liberando estoque...`);
                const items = currentOrder?.items || [];
                if (items.length > 0) {
                    const releaseResult = await releaseStockForMalinha(items);
                    if (!releaseResult.success) {
                        console.warn('⚠️ Aviso: Erro ao liberar estoque:', releaseResult.error);
                    } else {
                        console.log('✅ Estoque liberado');
                    }
                }
            }

            // 🔒 MALINHA: Reservar estoque se voltar de status final para status ativo
            // (exemplo: cancelamento desfeito)
            if (statusesThatReserveStock.includes(status) && statusesThatReleaseStock.includes(previousStatus)) {
                console.log(`🔒 Malinha voltando para "${status}" - reservando estoque novamente...`);
                const items = currentOrder?.items || [];
                if (items.length > 0) {
                    const reserveResult = await reserveStockForMalinha(items);
                    if (!reserveResult.success) {
                        throw new Error(`Erro ao reservar estoque: ${reserveResult.error}`);
                    }
                    console.log('✅ Estoque reservado para malinha');
                }
            }

            const updatedOrder = await updateOrderStatus(id, status)

            // Adicionar histórico de status se não existir
            const now = new Date().toISOString();
            const statusHistory = currentOrder?.statusHistory || [];
            statusHistory.push({
                status,
                timestamp: now,
                source: 'admin-panel'
            });

            // Atualizar o pedido com o histórico de status
            const orderWithHistory = { ...updatedOrder, statusHistory };

            set(state => ({
                orders: state.orders.map(o =>
                    o.id === parseInt(id) ? orderWithHistory : o
                ),
                ordersLoading: false
            }))

            // Recarregar produtos para atualizar estoque na UI se houve mudança de estoque
            if (
                (statusesThatReleaseStock.includes(status) && !statusesThatReleaseStock.includes(previousStatus)) ||
                (statusesThatReserveStock.includes(status) && statusesThatReleaseStock.includes(previousStatus))
            ) {
                get().loadProducts();
            }

            // Enviar notificação para a cliente se o status for entregue
            if (status === 'delivered' && currentOrder?.customer?.phone) {
                // Aqui você pode adicionar uma função para enviar notificação
                console.log(`Notificação de entrega enviada para cliente: ${currentOrder.customer.phone}`);
            }

            return { success: true, order: orderWithHistory }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ ordersError: userFriendlyError, ordersLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    updateSchedule: async (id, scheduleData) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            const updatedOrder = await updateOrderSchedule(id, scheduleData)
            set(state => ({
                orders: state.orders.map(o =>
                    o.id === parseInt(id) ? updatedOrder : o
                ),
                ordersLoading: false
            }))
            return { success: true, order: updatedOrder }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ ordersError: userFriendlyError, ordersLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    finalizeMalinha: async (id, keptItemsIndexes, vendaData) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            // 1. Buscar os dados da order
            const order = await getOrderByIdFromApi(id)
            if (!order) {
                throw new Error('Malinha não encontrada')
            }

            // 2. Garantir que temos customerId - CRÍTICO PARA ASSOCIAÇÃO
            if (!order.customerId) {
                console.error('❌ ERRO: Malinha sem cliente associado:', order);
                throw new Error(
                    'Esta malinha não tem cliente associado. ' +
                    'Malinhas devem ser criadas pelo cliente no site com suas informações. ' +
                    'Verifique se a malinha foi criada corretamente.'
                )
            }

            console.log('✅ Malinha tem customerId:', order.customerId)

            // 3. 🔓 RESTAURAR ESTOQUE DOS ITENS DEVOLVIDOS (não vendidos)
            // Os itens que NÃO estão em keptItemsIndexes são devolvidos
            const allItems = order.items || [];
            const returnedItems = allItems.filter((_, idx) => !keptItemsIndexes.includes(idx));

            if (returnedItems.length > 0) {
                console.log(`🔓 Restaurando estoque de ${returnedItems.length} itens devolvidos...`);
                const releaseResult = await releaseStockForMalinha(returnedItems);
                if (!releaseResult.success) {
                    console.warn('⚠️ Aviso: Erro ao restaurar estoque:', releaseResult.error);
                } else {
                    console.log('✅ Estoque restaurado para itens devolvidos');
                }
            }

            // 4. Preparar dados da venda com customerId OBRIGATÓRIO
            const vendaDataWithCustomer = {
                ...vendaData,
                customerId: order.customerId,  // Cliente vem da malinha (criado no site)
                orderId: order.id
            }

            console.log('📝 Criando venda com dados:', vendaDataWithCustomer)

            // 5. Criar a venda (isso NÃO deve baixar estoque novamente pois já estava reservado)
            // A venda terá apenas os itens vendidos, que já tiveram estoque reservado
            const newVenda = await createVenda(vendaDataWithCustomer)

            // 6. Atualizar a order para marcar como converted_to_sale
            const updatedOrder = await updateOrder(id, {
                status: 'completed',
                convertedToSale: true
            })

            // 7. Atualizar estado local
            set(state => ({
                orders: state.orders.map(o => o.id === parseInt(id) ? updatedOrder : o),
                vendas: [newVenda, ...state.vendas],
                ordersLoading: false
            }))

            // 8. Sincronizar estoque (apenas estoque, clientes não mudam)
            get().loadProducts()

            // 9. Consumir embalagem
            const { consumePackaging } = useOperationalCostsStore.getState()
            consumePackaging()

            console.log('✅ Venda finalizada com sucesso! Customer ID:', order.customerId)

            return { success: true, order: updatedOrder, venda: newVenda }
        } catch (error) {
            console.error('❌ Erro ao finalizar malinha:', error)
            const userFriendlyError = formatUserFriendlyError(error)
            set({ ordersError: userFriendlyError, ordersLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    removeOrder: async (id) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            // Status que LIBERAM estoque (malinha finalizada/cancelada)
            const statusesThatReleaseStock = ['completed', 'cancelled', 'delivered'];

            // 1. Buscar order para estornar estoque
            const order = get().orders.find(o => o.id === parseInt(id)) || await getOrderByIdFromApi(id);

            // 2. 🔓 Estornar estoque se necessário (se estava reservado)
            if (order && order.items && !statusesThatReleaseStock.includes(order.status)) {
                console.log('🔓 Estornando estoque por exclusão de malinha...');
                await releaseStockForMalinha(order.items);
            }

            // 3. Deletar
            await deleteOrder(id)

            set(state => ({
                orders: state.orders.filter(o => o.id !== parseInt(id)),
                ordersLoading: false
            }))

            // Recarregar produtos
            get().loadProducts();

            return { success: true }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ ordersError: userFriendlyError, ordersLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    // ==================== VENDAS ====================

    loadVendas: async (page = 1) => {
        console.log(`⏳ Carregando vendas (página ${page})...`);
        set({ vendasLoading: true, vendasError: null })
        try {
            const result = await getVendas(page, 30)
            const vendas = result.vendas.sort((a, b) => b.id - a.id)
            console.log(`✅ ${vendas.length} vendas carregadas (total: ${result.total})`);
            set({ vendas, vendasLoading: false, vendasTotal: result.total, vendasPage: page })
        } catch (error) {
            set({ vendasError: error.message, vendasLoading: false })
        }
    },

    addVenda: async (vendaData) => {
        set({ vendasLoading: true, vendasError: null })
        try {
            const newVenda = await createVenda(vendaData)
            set(state => ({
                vendas: [newVenda, ...state.vendas],
                vendasLoading: false
            }))
            // Não recarregar tudo - usar optimistic update
            get().loadProducts() // Apenas estoque muda

            // Consumir embalagem do estoque (abater 1 unidade)
            const { consumePackaging } = useOperationalCostsStore.getState()
            consumePackaging()

            return { success: true, venda: newVenda }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ vendasError: userFriendlyError, vendasLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    editVenda: async (id, vendaData) => {
        set({ vendasLoading: true, vendasError: null })
        try {
            const updatedVenda = await updateVenda(id, vendaData)
            set(state => ({
                vendas: state.vendas.map(v =>
                    v.id === parseInt(id) ? updatedVenda : v
                ),
                vendasLoading: false
            }))
            // Não recarregar estoque - apenas vendas mudaram
            return { success: true, venda: updatedVenda }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ vendasError: userFriendlyError, vendasLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    removeVenda: async (id) => {
        set({ vendasLoading: true, vendasError: null })
        try {
            await deleteVenda(id)
            set(state => ({
                vendas: state.vendas.filter(v => v.id !== parseInt(id)),
                vendasLoading: false
            }))
            // Não recarregar estoque - apenas vendas mudaram
            return { success: true }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ vendasError: userFriendlyError, vendasLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    // ==================== CUPONS ====================

    loadCoupons: async () => {
        set({ couponsLoading: true, couponsError: null })
        try {
            const coupons = await getCoupons()
            set({ coupons, couponsLoading: false })
        } catch (error) {
            set({ couponsError: error.message, couponsLoading: false })
        }
    },

    addCoupon: async (couponData) => {
        set({ couponsLoading: true, couponsError: null })
        try {
            const newCoupon = await createCoupon(couponData)
            set(state => ({
                coupons: [newCoupon, ...state.coupons],
                couponsLoading: false
            }))
            return { success: true, coupon: newCoupon }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ couponsError: userFriendlyError, couponsLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    editCoupon: async (id, couponData) => {
        set({ couponsLoading: true, couponsError: null })
        try {
            const updatedCoupon = await updateCoupon(id, couponData)
            set(state => ({
                coupons: state.coupons.map(c =>
                    c.id === parseInt(id) ? updatedCoupon : c
                ),
                couponsLoading: false
            }))
            return { success: true, coupon: updatedCoupon }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ couponsError: userFriendlyError, couponsLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    removeCoupon: async (id) => {
        set({ couponsLoading: true, couponsError: null })
        try {
            await deleteCoupon(id)
            set(state => ({
                coupons: state.coupons.filter(c => c.id !== parseInt(id)),
                couponsLoading: false
            }))
            return { success: true }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ couponsError: userFriendlyError, couponsLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    // ==================== CLIENTES ====================

    loadCustomers: async (page = 1) => {
        console.log(`⏳ Carregando clientes (página ${page})...`);
        set({ customersLoading: true, customersError: null })
        try {
            const result = await getCustomers(page, 50)
            const customers = result.customers.sort((a, b) => b.id - a.id)
            console.log(`✅ ${customers.length} clientes carregados (total: ${result.total})`);
            set({ customers, customersLoading: false, customersTotal: result.total, customersPage: page })
        } catch (error) {
            console.error('❌ Erro ao carregar clientes:', error);
            set({ customersError: error.message, customersLoading: false })
        }
    },

    addCustomer: async (customerData) => {
        console.log('Store: Adding customer with data:', customerData);
        set({ customersLoading: true, customersError: null })
        try {
            const newCustomer = await createCustomer(customerData)
            console.log('Store: Customer added successfully:', newCustomer);
            set(state => ({
                customers: [...state.customers, newCustomer],
                customersLoading: false
            }))
            return { success: true, customer: newCustomer }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            console.error('Store: Error adding customer:', error);
            set({ customersError: userFriendlyError, customersLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    editCustomer: async (id, customerData) => {
        console.log('Store: Editing customer with id:', id, 'and data:', customerData);
        set({ customersLoading: true, customersError: null })
        try {
            const updatedCustomer = await updateCustomer(id, customerData)
            console.log('Store: Customer updated successfully:', updatedCustomer);
            set(state => ({
                customers: state.customers.map(c =>
                    c.id === parseInt(id) ? updatedCustomer : c
                ),
                customersLoading: false
            }))
            return { success: true, customer: updatedCustomer }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            console.error('Store: Error editing customer:', error);
            set({ customersError: userFriendlyError, customersLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    removeCustomer: async (id) => {
        set({ customersLoading: true, customersError: null })
        try {
            await deleteCustomer(id)
            set(state => ({
                customers: state.customers.filter(c => c.id !== parseInt(id)),
                customersLoading: false
            }))
            return { success: true }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ customersError: userFriendlyError, customersLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    // ==================== CUSTOMER PREFERENCES ====================

    loadCustomerPreferences: async (customerId) => {
        try {
            const preferences = await getCustomerPreferences(customerId);
            return preferences || {};
        } catch (error) {
            // Silencioso pois a API já trata casos esperados
            return {};
        }
    },

    updateCustomerPreferences: async (customerId, preferences) => {
        try {
            const updatedPreferences = await updateCustomerPreferences(customerId, preferences);
            return { success: true, preferences: updatedPreferences };
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            console.error('Error updating customer preferences:', error);
            return { success: false, error: userFriendlyError };
        }
    },

    // ==================== HELPERS ====================

    getProductById: (id) => {
        const { products } = get()
        return products.find(p => p.id === parseInt(id))
    },

    getOrderById: (id) => {
        const { orders } = get()
        return orders.find(o => o.id === parseInt(id))
    },

    fetchOrder: async (id) => {
        set({ ordersLoading: true, ordersError: null });
        try {
            const order = await getOrderByIdFromApi(id);
            set(state => ({
                orders: state.orders.map(o => o.id === parseInt(id) ? { ...o, ...order } : o),
                ordersLoading: false
            }));
            return order;
        } catch (error) {
            set({ ordersError: error.message, ordersLoading: false });
            return null;
        }
    },

    getCustomerById: (id) => {
        const { customers } = get()
        console.log('Store: Looking for customer with id:', id, 'in customers list:', customers);
        const customer = customers.find(c => c.id === parseInt(id))
        console.log('Store: Found customer:', customer);
        return customer
    },

    getVendaById: (id) => {
        const { vendas } = get()
        return vendas.find(v => v.id === parseInt(id))
    },

    getCouponById: (id) => {
        const { coupons } = get()
        return coupons.find(c => c.id === parseInt(id))
    },

    reloadAll: async () => {
        set({ isInitialLoading: true })
        await Promise.all([
            get().loadProducts(),
            get().loadOrders(),
            get().loadCustomers(),
            get().loadVendas(),
            get().loadCoupons()
        ])
        set({ isInitialLoading: false })
    }
}))
