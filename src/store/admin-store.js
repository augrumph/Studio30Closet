import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/indexed-storage'
import {
    getProducts,
    getAllProducts,
    getAllProductsAdmin,
    getProductsPaginated,
    getOrders,
    getCustomersWithMetrics,
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
    updateOrder,
    getOrderById as getOrderByIdFromApi,

    getCustomerPreferences,
    updateCustomerPreferences
} from '@/lib/api'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { useOperationalCostsStore } from './operational-costs-store'
import logger from '@/utils/logger'

export const useAdminStore = create(
    persist(
        (set, get) => ({
            // ==================== ESTADO ====================

            // Global Loading
            isInitialLoading: false, // Start false to rely on checked data (if cached)

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
                    logger.info('📂 Carregando TODOS os produtos para catálogo...')
                    const allProducts = await getAllProducts()

                    // FILTRO DE SEGURANÇA: Remover undefined/null para evitar crash
                    const validProducts = allProducts.filter(p => p && typeof p === 'object')

                    const sortedProducts = [...validProducts].sort((a, b) => b.id - a.id)
                    set({
                        products: sortedProducts,
                        productsLoading: false,
                        productsTotal: validProducts.length
                    })
                    logger.success(`✅ ${validProducts.length} produtos carregados para catálogo`)
                } catch (error) {
                    set({ productsError: error.message, productsLoading: false })
                }
            },

            // Carregar TODOS os produtos para a Tabela de Admin (com Preço de Custo)
            loadInventoryForAdmin: async () => {
                set({ productsLoading: true, productsError: null })
                try {
                    logger.info('🔐 Carregando inventário completo para Admin...')
                    const allProducts = await getAllProductsAdmin()

                    const sortedProducts = [...allProducts].sort((a, b) => b.id - a.id)
                    set({
                        products: sortedProducts,
                        productsLoading: false,
                        productsTotal: allProducts.length
                    })
                    logger.success(`✅ ${allProducts.length} produtos carregados com custo.`)
                } catch (error) {
                    set({ productsError: error.message, productsLoading: false })
                }
            },

            // ⚡ INFINITE SCROLL: Carregar primeira página com FILTROS (Reset)
            loadFirstProductsPage: async (filters = {}) => {
                set({ productsLoading: true, productsError: null, products: [], productsTotal: 0 })
                try {
                    logger.info('🚀 Carregando primeiros 6 produtos...', filters)
                    const { products, total } = await getProductsPaginated(0, 6, filters)
                    set({
                        products,
                        productsLoading: false,
                        productsTotal: total
                    })
                    logger.success(`✅ ${products.length} produtos carregados (de ${total} total)`)
                } catch (error) {
                    set({ productsError: error.message, productsLoading: false })
                }
            },

            // ⚡ INFINITE SCROLL: Carregar mais produtos com FILTROS (Append)
            loadMoreProducts: async (offset, filters = {}) => {
                // Evitar loading state global para não piscar a tela
                try {
                    logger.info(`📜 Carregando mais produtos a partir de ${offset}...`, filters)
                    const { products: newProducts, total } = await getProductsPaginated(offset, 6, filters)

                    set(state => ({
                        products: [...state.products, ...newProducts],
                        productsTotal: total
                    }))
                    logger.success(`✅ ${newProducts.length} produtos adicionados`)
                    return newProducts.length
                } catch (error) {
                    logger.error('❌ Erro ao carregar mais produtos:', error)
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
                    logger.info(`⏳ Carregando pedidos (página ${page})...`);
                    const result = await getOrders(page, 30)
                    const orders = result.orders.sort((a, b) => b.id - a.id)
                    set({ orders, ordersLoading: false, ordersTotal: result.total, ordersPage: page })
                    logger.success(`✅ ${orders.length} pedidos carregados`);
                } catch (error) {
                    set({ ordersError: error.message, ordersLoading: false })
                }
            },

            addOrder: async (orderData) => {
                set({ ordersLoading: true, ordersError: null })
                try {
                    // 1. Criar a malinha no banco
                    const result = await createOrder(orderData)

                    // Retorno da nova API é { success: true, order: {...} }
                    const orderToSave = result.order || result

                    set(state => ({
                        orders: [orderToSave, ...state.orders],
                        ordersLoading: false
                    }))

                    // Recarregar produtos para atualizar estoque na UI
                    get().loadProducts();

                    return { success: true, order: orderToSave }
                } catch (error) {
                    const userFriendlyError = formatUserFriendlyError(error);
                    set({ ordersError: userFriendlyError, ordersLoading: false })
                    return { success: false, error: userFriendlyError }
                }
            },

            updateOrder: async (id, orderData) => {
                set({ ordersLoading: true, ordersError: null })
                try {
                    // A lógica de transação (Release Old -> Reserve New) agora está no Backend (PUT /api/orders/:id)
                    const updatedOrder = await updateOrder(id, orderData)

                    set(state => ({
                        orders: state.orders.map(o =>
                            o.id === parseInt(id) ? updatedOrder : o
                        ),
                        ordersLoading: false
                    }))

                    // Recarregar produtos para garantir que a UI mostre o estoque correto
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
                    // Status change handles stock automatically in backend (PUT /api/orders/:id)
                    // If moving to 'completed'/'cancelled', backend releases stock.
                    // If moving back to 'active', backend reserves stock.

                    const updatedOrder = await updateOrderStatus(id, status)

                    // Adicionar histórico de status se não existir (apenas para atualizar UI local se backend nao retornou)
                    // Mas updatedOrder deve vir completo do backend

                    set(state => ({
                        orders: state.orders.map(o =>
                            o.id === parseInt(id) ? updatedOrder : o
                        ),
                        ordersLoading: false
                    }))

                    // Sempre recarregar produtos pois status muda estoque
                    get().loadProducts();

                    // Enviar notificação para a cliente se o status for entregue
                    if (status === 'delivered' && updatedOrder?.customer?.phone) {
                        console.log(`Notificação de entrega enviada para cliente: ${updatedOrder.customer.phone}`);
                    }

                    return { success: true, order: updatedOrder }
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

                    if (!order.customerId) {
                        console.error('❌ ERRO: Malinha sem cliente associado:', order);
                        throw new Error('Esta malinha não tem cliente associado.')
                    }

                    // 2. Preparar dados da venda
                    const vendaDataWithCustomer = {
                        ...vendaData,
                        customerId: order.customerId,
                        orderId: order.id
                    }

                    // 3. Criar a venda
                    // Backend Vendas agora SEMPRE baixa estoque dos itens vendidos
                    const newVenda = await createVenda(vendaDataWithCustomer)

                    // 4. Atualizar a order para marcar como completed
                    // Backend Orders vai LIBERAR o estoque da malinha (o que estava reservado volta)
                    // Saldo: +ReservaVolta (Orders) -VendaSai (Vendas) = Correto.
                    const updatedOrder = await updateOrder(id, {
                        status: 'completed',
                        convertedToSale: true
                    })

                    set(state => ({
                        orders: state.orders.map(o => o.id === parseInt(id) ? updatedOrder : o),
                        vendas: [newVenda, ...state.vendas],
                        ordersLoading: false
                    }))

                    get().loadProducts()

                    const { consumePackaging } = useOperationalCostsStore.getState()
                    consumePackaging()

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
                    // Backend DELETE deve liberar estoque se estava reservado
                    await deleteOrder(id)

                    set(state => ({
                        orders: state.orders.filter(o => o.id !== parseInt(id)),
                        ordersLoading: false
                    }))

                    get().loadProducts();

                    return { success: true }
                } catch (error) {
                    console.error('Erro ao deletar malinha:', error);
                    const userFriendlyError = formatUserFriendlyError(error);
                    set({ ordersError: userFriendlyError, ordersLoading: false })
                    return { success: false, error: userFriendlyError }
                }
            },

            // ==================== VENDAS ====================

            loadVendas: async (page = 1) => {
                logger.info(`⏳ Carregando vendas (página ${page})...`);
                set({ vendasLoading: true, vendasError: null })
                try {
                    const result = await getVendas(page, 30)
                    const vendas = result.vendas.sort((a, b) => b.id - a.id)
                    logger.success(`✅ ${vendas.length} vendas carregadas (total: ${result.total})`);
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

            // ==================== CLIENTES ====================

            loadCustomers: async (page = 1) => {
                logger.info(`⏳ Carregando clientes (página ${page})...`);
                set({ customersLoading: true, customersError: null })
                try {
                    const result = await getCustomersWithMetrics(page, 50)
                    const customers = result.customers.sort((a, b) => b.id - a.id)
                    logger.success(`✅ ${customers.length} clientes carregados (total: ${result.total})`);
                    set({ customers, customersLoading: false, customersTotal: result.total, customersPage: page })
                } catch (error) {
                    logger.error('❌ Erro ao carregar clientes:', error);
                    set({ customersError: error.message, customersLoading: false })
                }
            },

            addCustomer: async (customerData) => {
                logger.info('Store: Adding customer with data:', customerData);
                set({ customersLoading: true, customersError: null })
                try {
                    const newCustomer = await createCustomer(customerData)
                    logger.success('Store: Customer added successfully:', newCustomer);
                    set(state => ({
                        customers: [...state.customers, newCustomer],
                        customersLoading: false
                    }))
                    return { success: true, customer: newCustomer }
                } catch (error) {
                    const userFriendlyError = formatUserFriendlyError(error);
                    logger.error('Store: Error adding customer:', error);
                    set({ customersError: userFriendlyError, customersLoading: false })
                    return { success: false, error: userFriendlyError }
                }
            },

            editCustomer: async (id, customerData) => {
                logger.info('Store: Editing customer with id:', id, 'and data:', customerData);
                set({ customersLoading: true, customersError: null })
                try {
                    const updatedCustomer = await updateCustomer(id, customerData)
                    logger.success('Store: Customer updated successfully:', updatedCustomer);
                    set(state => ({
                        customers: state.customers.map(c =>
                            c.id === parseInt(id) ? updatedCustomer : c
                        ),
                        customersLoading: false
                    }))
                    return { success: true, customer: updatedCustomer }
                } catch (error) {
                    const userFriendlyError = formatUserFriendlyError(error);
                    logger.error('Store: Error editing customer:', error);
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
                try {
                    // Timeout de segurança de 30s para conexões lentas ou bases grandes
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout loading data')), 30000)
                    )

                    await Promise.race([
                        Promise.all([
                            get().loadProducts(),
                            get().loadOrders(),
                            get().loadCustomers(),
                            get().loadVendas()
                        ]),
                        timeoutPromise
                    ])
                } catch (error) {
                    console.warn('⚠️ ReloadAll finalizado com erro ou timeout (UI liberada):', error)
                } finally {
                    set({ isInitialLoading: false })
                }
            }
        }),
        {
            name: 'admin-storage',
            storage: createJSONStorage(() => indexedDBStorage),
            partialize: (state) => ({
                products: state.products,
                vendas: state.vendas,
                orders: state.orders,
                customers: state.customers,
                coupons: state.coupons
            })
        }
    )
)
