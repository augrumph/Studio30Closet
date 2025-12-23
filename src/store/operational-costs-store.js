import { create } from 'zustand'
import {
    getPaymentFees,
    updatePaymentFee,
    getMaterialsStock,
    createMaterial,
    updateMaterial,
    deleteMaterial
} from '@/lib/api'

export const useOperationalCostsStore = create((set, get) => ({
    // ==================== ESTADO ====================

    // Taxas de Pagamento
    paymentFees: [],
    paymentFeesLoading: false,

    // Estoque de Materiais
    materialsStock: [],
    materialsLoading: false,

    // ==================== INITIALIZATION ====================

    initialize: async () => {
        await Promise.all([
            get().loadPaymentFees(),
            get().loadMaterialsStock()
        ])
    },

    // ==================== TAXAS DE PAGAMENTO ====================

    loadPaymentFees: async () => {
        set({ paymentFeesLoading: true })
        try {
            const fees = await getPaymentFees()
            set({ paymentFees: fees, paymentFeesLoading: false })
        } catch (error) {
            console.error("Erro ao carregar taxas de pagamento:", error)
            set({ paymentFees: [], paymentFeesLoading: false })
        }
    },

    updatePaymentFees: async (fees) => {
        try {
            // Update each fee individually
            const updatedFees = []
            for (const fee of fees) {
                if (fee.id) {
                    const updated = await updatePaymentFee(fee.id, fee)
                    updatedFees.push(updated)
                } else {
                    // If no ID, it's a new fee
                    const newFee = await createPaymentFee(fee)
                    updatedFees.push(newFee)
                }
            }
            set({ paymentFees: updatedFees })
            return { success: true, fees: updatedFees }
        } catch (error) {
            console.error("Erro ao atualizar taxas de pagamento:", error)
            return { success: false, error: error.message }
        }
    },

    // Calcular taxa baseado no método de pagamento
    calculateFee: (value, paymentMethod, parcelas = 1) => {
        const fees = get().paymentFees
        let feePercentage = 0

        // Convert the array of fee objects to a map for easier lookup
        const feesMap = {}
        fees.forEach(fee => {
            if (fee.payment_type === 'debit') feesMap.debit = fee.fee_percentage
            else if (fee.payment_type === 'credit_vista') feesMap.creditVista = fee.fee_percentage
            else if (fee.payment_type === 'credit_parcelado_2x') feesMap.creditParcelado2x = fee.fee_percentage
            else if (fee.payment_type === 'credit_parcelado_3x') feesMap.creditParcelado3x = fee.fee_percentage
            else if (fee.payment_type === 'credit_parcelado_4x') feesMap.creditParcelado4x = fee.fee_percentage
            else if (fee.payment_type === 'credit_parcelado_5x') feesMap.creditParcelado5x = fee.fee_percentage
            else if (fee.payment_type === 'credit_parcelado_6x') feesMap.creditParcelado6x = fee.fee_percentage
            else if (fee.payment_type === 'pix') feesMap.pix = fee.fee_percentage
        })

        switch(paymentMethod) {
            case 'debit':
            case 'debito':
                feePercentage = feesMap.debit || 1.99
                break
            case 'pix':
                feePercentage = feesMap.pix || 0.99
                break
            case 'credito_vista':
            case 'credit_vista':
                feePercentage = feesMap.creditVista || 3.49
                break
            case 'credito_parcelado':
            case 'credit_parcelado':
                if (parcelas === 2) feePercentage = feesMap.creditParcelado2x || 4.99
                else if (parcelas === 3) feePercentage = feesMap.creditParcelado3x || 5.49
                else if (parcelas === 4) feePercentage = feesMap.creditParcelado4x || 5.99
                else if (parcelas === 5) feePercentage = feesMap.creditParcelado5x || 6.49
                else feePercentage = feesMap.creditParcelado6x || 6.99
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

    loadMaterialsStock: async () => {
        set({ materialsLoading: true })
        try {
            const materials = await getMaterialsStock()
            set({ materialsStock: materials, materialsLoading: false })
        } catch (error) {
            console.error("Erro ao carregar estoque de materiais:", error)
            set({ materialsStock: [], materialsLoading: false })
        }
    },

    addMaterial: async (material) => {
        try {
            const newMaterial = await createMaterial(material)
            set(state => ({
                materialsStock: [...state.materialsStock, newMaterial]
            }))
            return { success: true, material: newMaterial }
        } catch (error) {
            console.error("Erro ao adicionar material:", error)
            return { success: false, error: error.message }
        }
    },

    updateMaterial: async (id, material) => {
        try {
            const updated = await updateMaterial(id, material)
            set(state => ({
                materialsStock: state.materialsStock.map(m => m.id === id ? updated : m)
            }))
            return { success: true, material: updated }
        } catch (error) {
            console.error("Erro ao atualizar material:", error)
            return { success: false, error: error.message }
        }
    },

    removeMaterial: async (id) => {
        try {
            await deleteMaterial(id)
            set(state => ({
                materialsStock: state.materialsStock.filter(m => m.id !== id)
            }))
            return { success: true }
        } catch (error) {
            console.error("Erro ao remover material:", error)
            return { success: false, error: error.message }
        }
    },

    // Atualizar quantidade em estoque
    updateStock: async (id, quantity) => {
        try {
            const materials = get().materialsStock
            const material = materials.find(m => m.id === id)
            if (material) {
                const updated = await updateMaterial(id, { ...material, quantity })
                set(state => ({
                    materialsStock: state.materialsStock.map(m => m.id === id ? updated : m)
                }))
                return { success: true, material: updated }
            }
            return { success: false, error: 'Material não encontrado' }
        } catch (error) {
            console.error("Erro ao atualizar estoque:", error)
            return { success: false, error: error.message }
        }
    },

    // Adicionar entrada de estoque
    addStockEntry: async (id, quantity) => {
        const materials = get().materialsStock
        const material = materials.find(m => m.id === id)
        if (material) {
            const newQuantity = (material.quantity || 0) + quantity
            return get().updateStock(id, newQuantity)
        }
        return { success: false, error: 'Material não encontrado' }
    },

    // Remover saída de estoque
    removeStockExit: async (id, quantity) => {
        const materials = get().materialsStock
        const material = materials.find(m => m.id === id)
        if (material) {
            const newQuantity = Math.max(0, (material.quantity || 0) - quantity)
            return get().updateStock(id, newQuantity)
        }
        return { success: false, error: 'Material não encontrado' }
    },

    // Consumir embalagem (abater 1 unidade da categoria embalagem)
    consumePackaging: async () => {
        const materials = get().materialsStock
        // Encontrar o primeiro material da categoria 'embalagem' que tenha estoque
        const packaging = materials.find(m => m.category === 'embalagem' && m.quantity > 0)

        if (packaging) {
            return get().removeStockExit(packaging.id, 1)
        }

        return { success: false, message: 'Nenhuma embalagem disponível em estoque' }
    }
}))
