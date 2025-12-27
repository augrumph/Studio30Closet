import { create } from 'zustand'
import {
    getPaymentFees,
    createPaymentFee,
    updatePaymentFee,
    getMaterialsStock,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    deleteAllPaymentFees
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
            // UPSERT: criar ou atualizar cada taxa (não precisa deletar)
            const createdFees = []
            for (const fee of fees) {
                const newFee = await createPaymentFee(fee)
                createdFees.push(newFee)
            }

            set({ paymentFees: createdFees })
            return { success: true, fees: createdFees }
        } catch (error) {
            console.error("Erro ao atualizar taxas de pagamento:", error)
            return { success: false, error: error.message }
        }
    },

    // Calcular taxa baseado no método de pagamento e bandeira
    calculateFee: (value, paymentMethod, cardBrand = null, parcelas = 1) => {
        const fees = get().paymentFees

        // PIX tem taxa de 0% em todos os cenários
        if (paymentMethod === 'pix') {
            return {
                feePercentage: 0,
                feeValue: 0,
                netValue: value
            }
        }

        // First, try to find a specific fee for the payment method and card brand
        let feePercentage = 0
        let specificFee = null

        // Look for a specific fee for this payment method and card brand
        if (cardBrand) {
            specificFee = fees.find(fee =>
                fee.payment_method === paymentMethod &&
                fee.card_brand === cardBrand
            )
        }

        // If no specific fee found, look for a general fee for this payment method
        if (!specificFee) {
            specificFee = fees.find(fee =>
                fee.payment_method === paymentMethod &&
                fee.card_brand === null
            )
        }

        // If we found a specific fee, use it
        if (specificFee) {
            feePercentage = specificFee.fee_percentage
        } else {
            // Default values based on payment method
            switch(paymentMethod) {
                case 'debit':
                case 'debito':
                    feePercentage = 1.99
                    break
                case 'credito_vista':
                case 'credit_vista':
                    feePercentage = 3.49
                    break
                case 'credito_parcelado':
                case 'credit_parcelado':
                    // Até 3x: sem taxa (loja cobre)
                    if (parcelas <= 3) {
                        feePercentage = 0
                    }
                    // 4x ou mais: cobra a taxa do cliente
                    else if (parcelas === 4) feePercentage = 5.99
                    else if (parcelas === 5) feePercentage = 6.49
                    else feePercentage = 6.99
                    break
                default:
                    feePercentage = 0
            }
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
