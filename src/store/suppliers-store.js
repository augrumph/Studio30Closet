import { create } from 'zustand'
import {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getPurchases,
    getPurchaseById,
    createPurchase,
    updatePurchase,
    deletePurchase,
    getFixedExpenses,
    getFixedExpenseById,
    createFixedExpense,
    updateFixedExpense,
    deleteFixedExpense
} from '@/lib/api'


export const useSuppliersStore = create((set, get) => ({
    // ==================== ESTADO ====================

    // Fornecedores
    suppliers: [],
    suppliersLoading: false,
    suppliersError: null,

    // Compras
    purchases: [],
    purchasesLoading: false,
    purchasesError: null,

    // Gastos Fixos
    expenses: [],
    expensesLoading: false,
    expensesError: null,

    // ==================== INITIALIZATION ====================

    initialize: async () => {
        await Promise.all([
            get().loadSuppliers(),
            get().loadPurchases(),
            get().loadExpenses()
        ])
    },

    // ==================== FORNECEDORES ====================

    loadSuppliers: async () => {
        console.log('Store: Loading suppliers...');
        set({ suppliersLoading: true, suppliersError: null })
        try {
            const suppliers = await getSuppliers()
            console.log('Store: Loaded suppliers:', suppliers);
            const sorted = [...suppliers].sort((a, b) => b.id - a.id)
            set({ suppliers: sorted, suppliersLoading: false })
        } catch (error) {
            console.error('Store: Error loading suppliers:', error);
            set({ suppliersError: error.message, suppliersLoading: false })
        }
    },

    addSupplier: async (supplierData) => {
        console.log('Store: Adding supplier with data:', supplierData);
        set({ suppliersLoading: true, suppliersError: null })
        try {
            const newSupplier = await createSupplier(supplierData)
            console.log('Store: Supplier added successfully:', newSupplier);
            set(state => ({
                suppliers: [newSupplier, ...state.suppliers],
                suppliersLoading: false
            }))
            return { success: true, supplier: newSupplier }
        } catch (error) {
            console.error('Store: Error adding supplier:', error);
            set({ suppliersError: error.message, suppliersLoading: false })
            return { success: false, error: error.message }
        }
    },

    editSupplier: async (id, supplierData) => {
        console.log('Store: Editing supplier with id:', id, 'and data:', supplierData);
        set({ suppliersLoading: true, suppliersError: null })
        try {
            const updated = await updateSupplier(id, supplierData)
            console.log('Store: Supplier updated successfully:', updated);
            set(state => ({
                suppliers: state.suppliers.map(s => s.id === parseInt(id) ? updated : s),
                suppliersLoading: false
            }))
            return { success: true, supplier: updated }
        } catch (error) {
            console.error('Store: Error editing supplier:', error);
            set({ suppliersError: error.message, suppliersLoading: false })
            return { success: false, error: error.message }
        }
    },

    removeSupplier: async (id) => {
        set({ suppliersLoading: true, suppliersError: null })
        try {
            await deleteSupplier(id)
            set(state => ({
                suppliers: state.suppliers.filter(s => s.id !== parseInt(id)),
                suppliersLoading: false
            }))
            return { success: true }
        } catch (error) {
            set({ suppliersError: error.message, suppliersLoading: false })
            return { success: false, error: error.message }
        }
    },

    getSupplierById: (id) => {
        const suppliers = get().suppliers;
        console.log('Store: Looking for supplier with id:', id, 'in suppliers list:', suppliers);
        const supplier = suppliers.find(s => s.id === parseInt(id))
        console.log('Store: Found supplier:', supplier);
        return supplier
    },

    // ==================== COMPRAS ====================

    loadPurchases: async () => {
        set({ purchasesLoading: true, purchasesError: null })
        try {
            const purchases = await getPurchases()
            const sorted = [...purchases].sort((a, b) => b.id - a.id)
            set({ purchases: sorted, purchasesLoading: false })
        } catch (error) {
            set({ purchasesError: error.message, purchasesLoading: false })
        }
    },

    addPurchase: async (purchaseData) => {
        set({ purchasesLoading: true, purchasesError: null })
        try {
            const newPurchase = await createPurchase(purchaseData)
            set(state => ({
                purchases: [newPurchase, ...state.purchases],
                purchasesLoading: false
            }))
            return { success: true, purchase: newPurchase }
        } catch (error) {
            set({ purchasesError: error.message, purchasesLoading: false })
            return { success: false, error: error.message }
        }
    },

    editPurchase: async (id, purchaseData) => {
        set({ purchasesLoading: true, purchasesError: null })
        try {
            const updated = await updatePurchase(id, purchaseData)
            set(state => ({
                purchases: state.purchases.map(p => p.id === parseInt(id) ? updated : p),
                purchasesLoading: false
            }))
            return { success: true, purchase: updated }
        } catch (error) {
            set({ purchasesError: error.message, purchasesLoading: false })
            return { success: false, error: error.message }
        }
    },

    removePurchase: async (id) => {
        set({ purchasesLoading: true, purchasesError: null })
        try {
            await deletePurchase(id)
            set(state => ({
                purchases: state.purchases.filter(p => p.id !== parseInt(id)),
                purchasesLoading: false
            }))
            return { success: true }
        } catch (error) {
            set({ purchasesError: error.message, purchasesLoading: false })
            return { success: false, error: error.message }
        }
    },

    getPurchaseById: (id) => {
        return get().purchases.find(p => p.id === parseInt(id))
    },

    // ==================== GASTOS FIXOS ====================

    loadExpenses: async () => {
        set({ expensesLoading: true, expensesError: null })
        try {
            const expenses = await getFixedExpenses()
            const sorted = [...expenses].sort((a, b) => b.id - a.id)
            set({ expenses: sorted, expensesLoading: false })
        } catch (error) {
            set({ expensesError: error.message, expensesLoading: false })
        }
    },

    addExpense: async (expenseData) => {
        set({ expensesLoading: true, expensesError: null })
        try {
            const newExpense = await createFixedExpense(expenseData)
            set(state => ({
                expenses: [newExpense, ...state.expenses],
                expensesLoading: false
            }))
            return { success: true, expense: newExpense }
        } catch (error) {
            set({ expensesError: error.message, expensesLoading: false })
            return { success: false, error: error.message }
        }
    },

    editExpense: async (id, expenseData) => {
        set({ expensesLoading: true, expensesError: null })
        try {
            const updated = await updateFixedExpense(id, expenseData)
            set(state => ({
                expenses: state.expenses.map(e => e.id === parseInt(id) ? updated : e),
                expensesLoading: false
            }))
            return { success: true, expense: updated }
        } catch (error) {
            set({ expensesError: error.message, expensesLoading: false })
            return { success: false, error: error.message }
        }
    },

    removeExpense: async (id) => {
        set({ expensesLoading: true, expensesError: null })
        try {
            await deleteFixedExpense(id)
            set(state => ({
                expenses: state.expenses.filter(e => e.id !== parseInt(id)),
                expensesLoading: false
            }))
            return { success: true }
        } catch (error) {
            set({ expensesError: error.message, expensesLoading: false })
            return { success: false, error: error.message }
        }
    },

    getExpenseById: (id) => {
        return get().expenses.find(e => e.id === parseInt(id))
    }
}))
