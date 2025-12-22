import { create } from 'zustand'

// Simulação de API (localStorage) - seguindo o padrão do projeto
const STORAGE_KEY = 'studio30_suppliers'
const PURCHASES_KEY = 'studio30_purchases'
const EXPENSES_KEY = 'studio30_fixed_expenses'

const getSuppliers = async () => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
}

const createSupplier = async (supplierData) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const suppliers = await getSuppliers()
    const newSupplier = {
        id: Date.now(),
        ...supplierData,
        createdAt: new Date().toISOString()
    }
    const updated = [...suppliers, newSupplier]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return newSupplier
}

const updateSupplier = async (id, supplierData) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const suppliers = await getSuppliers()
    const updated = suppliers.map(s => s.id === id ? { ...s, ...supplierData, updatedAt: new Date().toISOString() } : s)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated.find(s => s.id === id)
}

const deleteSupplier = async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const suppliers = await getSuppliers()
    const updated = suppliers.filter(s => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return { success: true }
}

// Compras
const getPurchases = async () => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const data = localStorage.getItem(PURCHASES_KEY)
    return data ? JSON.parse(data) : []
}

const createPurchase = async (purchaseData) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const purchases = await getPurchases()
    const newPurchase = {
        id: Date.now(),
        ...purchaseData,
        createdAt: new Date().toISOString(),
        status: purchaseData.status || 'pendente'
    }
    const updated = [...purchases, newPurchase]
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(updated))
    return newPurchase
}

const updatePurchase = async (id, purchaseData) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const purchases = await getPurchases()
    const updated = purchases.map(p => p.id === id ? { ...p, ...purchaseData, updatedAt: new Date().toISOString() } : p)
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(updated))
    return updated.find(p => p.id === id)
}

const deletePurchase = async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const purchases = await getPurchases()
    const updated = purchases.filter(p => p.id !== id)
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(updated))
    return { success: true }
}

// Gastos Fixos
const getExpenses = async () => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const data = localStorage.getItem(EXPENSES_KEY)
    return data ? JSON.parse(data) : []
}

const createExpense = async (expenseData) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const expenses = await getExpenses()
    const newExpense = {
        id: Date.now(),
        ...expenseData,
        createdAt: new Date().toISOString()
    }
    const updated = [...expenses, newExpense]
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated))
    return newExpense
}

const updateExpense = async (id, expenseData) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const expenses = await getExpenses()
    const updated = expenses.map(e => e.id === id ? { ...e, ...expenseData, updatedAt: new Date().toISOString() } : e)
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated))
    return updated.find(e => e.id === id)
}

const deleteExpense = async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const expenses = await getExpenses()
    const updated = expenses.filter(e => e.id !== id)
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated))
    return { success: true }
}

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

    // ==================== FORNECEDORES ====================

    loadSuppliers: async () => {
        set({ suppliersLoading: true, suppliersError: null })
        try {
            const suppliers = await getSuppliers()
            const sorted = [...suppliers].sort((a, b) => b.id - a.id)
            set({ suppliers: sorted, suppliersLoading: false })
        } catch (error) {
            set({ suppliersError: error.message, suppliersLoading: false })
        }
    },

    addSupplier: async (supplierData) => {
        set({ suppliersLoading: true, suppliersError: null })
        try {
            const newSupplier = await createSupplier(supplierData)
            set(state => ({
                suppliers: [newSupplier, ...state.suppliers],
                suppliersLoading: false
            }))
            return { success: true, supplier: newSupplier }
        } catch (error) {
            set({ suppliersError: error.message, suppliersLoading: false })
            return { success: false, error: error.message }
        }
    },

    editSupplier: async (id, supplierData) => {
        set({ suppliersLoading: true, suppliersError: null })
        try {
            const updated = await updateSupplier(id, supplierData)
            set(state => ({
                suppliers: state.suppliers.map(s => s.id === id ? updated : s),
                suppliersLoading: false
            }))
            return { success: true, supplier: updated }
        } catch (error) {
            set({ suppliersError: error.message, suppliersLoading: false })
            return { success: false, error: error.message }
        }
    },

    removeSupplier: async (id) => {
        set({ suppliersLoading: true, suppliersError: null })
        try {
            await deleteSupplier(id)
            set(state => ({
                suppliers: state.suppliers.filter(s => s.id !== id),
                suppliersLoading: false
            }))
            return { success: true }
        } catch (error) {
            set({ suppliersError: error.message, suppliersLoading: false })
            return { success: false, error: error.message }
        }
    },

    getSupplierById: (id) => {
        return get().suppliers.find(s => s.id === parseInt(id))
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
                purchases: state.purchases.map(p => p.id === id ? updated : p),
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
                purchases: state.purchases.filter(p => p.id !== id),
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
            const expenses = await getExpenses()
            const sorted = [...expenses].sort((a, b) => b.id - a.id)
            set({ expenses: sorted, expensesLoading: false })
        } catch (error) {
            set({ expensesError: error.message, expensesLoading: false })
        }
    },

    addExpense: async (expenseData) => {
        set({ expensesLoading: true, expensesError: null })
        try {
            const newExpense = await createExpense(expenseData)
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
            const updated = await updateExpense(id, expenseData)
            set(state => ({
                expenses: state.expenses.map(e => e.id === id ? updated : e),
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
            await deleteExpense(id)
            set(state => ({
                expenses: state.expenses.filter(e => e.id !== id),
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
