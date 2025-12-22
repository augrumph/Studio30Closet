import { create } from 'zustand'

const PAYMENT_FEES_KEY = 'studio30_payment_fees'
const MATERIALS_STOCK_KEY = 'studio30_materials_stock'

// Taxas de Pagamento (Infinity Pay)
const getPaymentFees = () => {
    const data = localStorage.getItem(PAYMENT_FEES_KEY)
    return data ? JSON.parse(data) : {
        debit: 1.99,                    // Débito à vista
        creditVista: 3.49,              // Crédito à vista
        creditParcelado2x: 4.99,        // 2x
        creditParcelado3x: 5.49,        // 3x
        creditParcelado4x: 5.99,        // 4x
        creditParcelado5x: 6.49,        // 5x
        creditParcelado6x: 6.99,        // 6x a 12x
        pix: 0.99                       // PIX
    }
}

const savePaymentFees = (fees) => {
    localStorage.setItem(PAYMENT_FEES_KEY, JSON.stringify(fees))
}

// Estoque de Materiais
const getMaterialsStock = () => {
    const data = localStorage.getItem(MATERIALS_STOCK_KEY)
    return data ? JSON.parse(data) : []
}

const saveMaterialsStock = (materials) => {
    localStorage.setItem(MATERIALS_STOCK_KEY, JSON.stringify(materials))
}

export const useOperationalCostsStore = create((set, get) => ({
    // ==================== ESTADO ====================

    // Taxas de Pagamento
    paymentFees: getPaymentFees(),

    // Estoque de Materiais
    materialsStock: getMaterialsStock(),
    materialsLoading: false,

    // ==================== TAXAS DE PAGAMENTO ====================

    updatePaymentFees: (fees) => {
        savePaymentFees(fees)
        set({ paymentFees: fees })
    },

    // Calcular taxa baseado no método de pagamento
    calculateFee: (value, paymentMethod, parcelas = 1) => {
        const fees = get().paymentFees
        let feePercentage = 0

        switch(paymentMethod) {
            case 'debit':
            case 'debito':
                feePercentage = fees.debit
                break
            case 'pix':
                feePercentage = fees.pix
                break
            case 'credito_vista':
            case 'credit_vista':
                feePercentage = fees.creditVista
                break
            case 'credito_parcelado':
            case 'credit_parcelado':
                if (parcelas === 2) feePercentage = fees.creditParcelado2x
                else if (parcelas === 3) feePercentage = fees.creditParcelado3x
                else if (parcelas === 4) feePercentage = fees.creditParcelado4x
                else if (parcelas === 5) feePercentage = fees.creditParcelado5x
                else feePercentage = fees.creditParcelado6x
                break
            default:
                feePercentage = 0
        }

        const feeValue = (value * feePercentage) / 100
        return {
            feePercentage,
            feeValue,
            netValue: value - feeValue
        }
    },

    // ==================== ESTOQUE DE MATERIAIS ====================

    loadMaterialsStock: () => {
        set({ materialsLoading: true })
        const materials = getMaterialsStock()
        set({ materialsStock: materials, materialsLoading: false })
    },

    addMaterial: (material) => {
        const materials = get().materialsStock
        const newMaterial = {
            id: Date.now(),
            ...material,
            createdAt: new Date().toISOString()
        }
        const updated = [...materials, newMaterial]
        saveMaterialsStock(updated)
        set({ materialsStock: updated })
        return { success: true, material: newMaterial }
    },

    updateMaterial: (id, material) => {
        const materials = get().materialsStock
        const updated = materials.map(m =>
            m.id === id ? { ...m, ...material, updatedAt: new Date().toISOString() } : m
        )
        saveMaterialsStock(updated)
        set({ materialsStock: updated })
        return { success: true }
    },

    removeMaterial: (id) => {
        const materials = get().materialsStock
        const updated = materials.filter(m => m.id !== id)
        saveMaterialsStock(updated)
        set({ materialsStock: updated })
        return { success: true }
    },

    // Atualizar quantidade em estoque
    updateStock: (id, quantity) => {
        const materials = get().materialsStock
        const updated = materials.map(m =>
            m.id === id ? { ...m, quantity, updatedAt: new Date().toISOString() } : m
        )
        saveMaterialsStock(updated)
        set({ materialsStock: updated })
        return { success: true }
    },

    // Adicionar entrada de estoque
    addStockEntry: (id, quantity) => {
        const materials = get().materialsStock
        const material = materials.find(m => m.id === id)
        if (material) {
            const newQuantity = (material.quantity || 0) + quantity
            return get().updateStock(id, newQuantity)
        }
        return { success: false }
    },

    // Remover saída de estoque
    removeStockExit: (id, quantity) => {
        const materials = get().materialsStock
        const material = materials.find(m => m.id === id)
        if (material) {
            const newQuantity = Math.max(0, (material.quantity || 0) - quantity)
            return get().updateStock(id, newQuantity)
        }
        return { success: false }
    },

    // Consumir embalagem (abater 1 unidade da categoria embalagem)
    consumePackaging: () => {
        const materials = get().materialsStock
        // Encontrar o primeiro material da categoria 'embalagem' que tenha estoque
        const packaging = materials.find(m => m.category === 'embalagem' && m.quantity > 0)

        if (packaging) {
            return get().removeStockExit(packaging.id, 1)
        }

        return { success: false, message: 'Nenhuma embalagem disponível em estoque' }
    }
}))
