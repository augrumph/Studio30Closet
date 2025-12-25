import { create } from 'zustand'
import {
    getProducts,
    getAllProducts,
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
    // finalizeMalinhaAsSale
} from '@/lib/api'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { useOperationalCostsStore } from './operational-costs-store'

export const useAdminStore = create((set, get) => ({
    // ==================== ESTADO ====================

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
            const sortedProducts = [...allProducts].sort((a, b) => b.id - a.id)
            set({
                products: sortedProducts,
                productsLoading: false,
                productsTotal: allProducts.length
            })
            console.log(`✅ ${allProducts.length} produtos carregados para catálogo`)
        } catch (error) {
            set({ productsError: error.message, productsLoading: false })
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

    loadOrders: async () => {
        set({ ordersLoading: true, ordersError: null })
        try {
            const orders = await getOrders()
            set({ orders, ordersLoading: false })
        } catch (error) {
            set({ ordersError: error.message, ordersLoading: false })
        }
    },

    addOrder: async (orderData) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            const newOrder = await createOrder(orderData)
            set(state => ({
                orders: [newOrder, ...state.orders],
                ordersLoading: false
            }))
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
            const updatedOrder = await updateOrder(id, orderData)
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

    updateStatus: async (id, status) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            // Obter o pedido atual para verificar o status anterior
            const currentOrder = get().orders.find(o => o.id === parseInt(id));
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

    // finalizeMalinha: async (id, keptItemsIndexes, vendaData) => {
    //     set({ ordersLoading: true, ordersError: null })
    //     try {
    //         const { order, venda } = await finalizeMalinhaAsSale(id, keptItemsIndexes, vendaData)
    //         set(state => ({
    //             orders: state.orders.map(o => o.id === parseInt(id) ? order : o),
    //             vendas: [venda, ...state.vendas],
    //             ordersLoading: false
    //         }))
    //         get().loadProducts() // Sincronizar estoque real
    //         return { success: true, order, venda }
    //     } catch (error) {
    //         set({ ordersError: error.message, ordersLoading: false })
    //         return { success: false, error: error.message }
    //     }
    // },

    removeOrder: async (id) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            await deleteOrder(id)
            set(state => ({
                orders: state.orders.filter(o => o.id !== parseInt(id)),
                ordersLoading: false
            }))
            return { success: true }
        } catch (error) {
            const userFriendlyError = formatUserFriendlyError(error);
            set({ ordersError: userFriendlyError, ordersLoading: false })
            return { success: false, error: userFriendlyError }
        }
    },

    // ==================== VENDAS ====================

    loadVendas: async () => {
        set({ vendasLoading: true, vendasError: null })
        try {
            const vendas = await getVendas()
            set({ vendas, vendasLoading: false })
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
            get().loadProducts()
            get().loadCustomers()

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
            get().loadProducts()
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
            get().loadProducts()
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

    loadCustomers: async () => {
        console.log('Store: Loading customers...');
        set({ customersLoading: true, customersError: null })
        try {
            const customers = await getCustomers()
            console.log('Store: Loaded customers:', customers);
            set({ customers, customersLoading: false })
        } catch (error) {
            console.error('Store: Error loading customers:', error);
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
            console.error('Error loading customer preferences:', error);
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
        await Promise.all([
            get().loadProducts(),
            get().loadOrders(),
            get().loadCustomers(),
            get().loadVendas(),
            get().loadCoupons()
        ])
    }
}))
