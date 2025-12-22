import { create } from 'zustand'
import {
    getProducts,
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
    finalizeMalinhaAsSale
} from '@/lib/api'
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

    loadProducts: async () => {
        set({ productsLoading: true, productsError: null })
        try {
            const products = await getProducts()
            // Ordenar por ID decrescente para que os mais novos apareçam primeiro
            const sortedProducts = [...products].sort((a, b) => b.id - a.id)
            set({ products: sortedProducts, productsLoading: false })
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
            set({ productsError: error.message, productsLoading: false })
            return { success: false, error: error.message }
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
            set({ productsError: error.message, productsLoading: false })
            return { success: false, error: error.message }
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
            set({ productsError: error.message, productsLoading: false })
            return { success: false, error: error.message }
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
            set({ productsError: error.message, productsLoading: false })
            return { success: false, error: error.message }
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
            set({ ordersError: error.message, ordersLoading: false })
            return { success: false, error: error.message }
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
            set({ ordersError: error.message, ordersLoading: false })
            return { success: false, error: error.message }
        }
    },

    updateStatus: async (id, status) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            const updatedOrder = await updateOrderStatus(id, status)
            set(state => ({
                orders: state.orders.map(o =>
                    o.id === parseInt(id) ? updatedOrder : o
                ),
                ordersLoading: false
            }))
            return { success: true, order: updatedOrder }
        } catch (error) {
            set({ ordersError: error.message, ordersLoading: false })
            return { success: false, error: error.message }
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
            set({ ordersError: error.message, ordersLoading: false })
            return { success: false, error: error.message }
        }
    },

    finalizeMalinha: async (id, keptItemsIndexes, vendaData) => {
        set({ ordersLoading: true, ordersError: null })
        try {
            const { order, venda } = await finalizeMalinhaAsSale(id, keptItemsIndexes, vendaData)
            set(state => ({
                orders: state.orders.map(o => o.id === parseInt(id) ? order : o),
                vendas: [venda, ...state.vendas],
                ordersLoading: false
            }))
            get().loadProducts() // Sincronizar estoque real
            return { success: true, order, venda }
        } catch (error) {
            set({ ordersError: error.message, ordersLoading: false })
            return { success: false, error: error.message }
        }
    },

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
            set({ ordersError: error.message, ordersLoading: false })
            return { success: false, error: error.message }
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
            set({ vendasError: error.message, vendasLoading: false })
            return { success: false, error: error.message }
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
            set({ vendasError: error.message, vendasLoading: false })
            return { success: false, error: error.message }
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
            set({ vendasError: error.message, vendasLoading: false })
            return { success: false, error: error.message }
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
            set({ couponsError: error.message, couponsLoading: false })
            return { success: false, error: error.message }
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
            set({ couponsError: error.message, couponsLoading: false })
            return { success: false, error: error.message }
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
            set({ couponsError: error.message, couponsLoading: false })
            return { success: false, error: error.message }
        }
    },

    // ==================== CLIENTES ====================

    loadCustomers: async () => {
        set({ customersLoading: true, customersError: null })
        try {
            const customers = await getCustomers()
            set({ customers, customersLoading: false })
        } catch (error) {
            set({ customersError: error.message, customersLoading: false })
        }
    },

    addCustomer: async (customerData) => {
        set({ customersLoading: true, customersError: null })
        try {
            const newCustomer = await createCustomer(customerData)
            set(state => ({
                customers: [...state.customers, newCustomer],
                customersLoading: false
            }))
            return { success: true, customer: newCustomer }
        } catch (error) {
            set({ customersError: error.message, customersLoading: false })
            return { success: false, error: error.message }
        }
    },

    editCustomer: async (id, customerData) => {
        set({ customersLoading: true, customersError: null })
        try {
            const updatedCustomer = await updateCustomer(id, customerData)
            set(state => ({
                customers: state.customers.map(c =>
                    c.id === parseInt(id) ? updatedCustomer : c
                ),
                customersLoading: false
            }))
            return { success: true, customer: updatedCustomer }
        } catch (error) {
            set({ customersError: error.message, customersLoading: false })
            return { success: false, error: error.message }
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
            set({ customersError: error.message, customersLoading: false })
            return { success: false, error: error.message }
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

    getCustomerById: (id) => {
        const { customers } = get()
        return customers.find(c => c.id === parseInt(id))
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
