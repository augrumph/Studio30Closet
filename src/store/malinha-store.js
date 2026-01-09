import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_ITEMS = 20

const initialCustomerData = {
    name: '',
    phone: '',
    email: '',
    cpf: '',
    addresses: [{
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: 'Santos',
        state: 'SP',
        zipCode: '',
        isDefault: true
    }],
    notes: ''
}

export const useMalinhaStore = create(
    persist(
        (set, get) => ({
            items: [],
            customerData: initialCustomerData,

            // Add item to malinha
            addItem: (product, size, color) => {
                const { items } = get()
                if (items.length >= MAX_ITEMS) {
                    return { success: false, message: 'Limite de 20 peças atingido!' }
                }

                // Validação: garantir que product tem ID
                if (!product.id) {
                    return { success: false, message: 'Produto sem ID válido!' }
                }

                const itemId = `${product.id}-${size}-${Date.now()}`
                // ULTRA OTIMIZADO: Salvar APENAS productId + metadados leves
                const newItem = {
                    itemId,           // ID único do item na malinha
                    productId: product.id,  // ID do produto
                    selectedSize: size,     // Tamanho selecionado
                    selectedColor: color,   // ✅ Cor selecionada (IMPORTANTÍSSIMO PARA ESTOQUE)
                    addedAt: new Date().toISOString(),
                }

                set({ items: [...items, newItem] })

                // ✨ Feedback háptico no mobile (vibração sutil)
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate([15, 50, 15])
                }

                return { success: true, message: 'Peça adicionada à malinha!' }
            },

            // Remove item from malinha
            removeItem: (itemId) => {
                const { items } = get()
                set({ items: items.filter(item => item.itemId !== itemId) })

                // ✨ Feedback háptico no mobile (vibração curta para remoção)
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(10) // vibração curta para ação de remoção
                }
            },

            // Clear all items
            clearItems: () => set({ items: [] }),

            // Update customer data
            setCustomerData: (data) =>
                set((state) => ({ customerData: { ...state.customerData, ...data } })),

            // Update address data
            setAddressData: (data) =>
                set((state) => {
                    const newAddresses = [...state.customerData.addresses]
                    newAddresses[0] = { ...newAddresses[0], ...data }
                    return { customerData: { ...state.customerData, addresses: newAddresses } }
                }),

            // Reset customer data
            resetCustomerData: () =>
                set({ customerData: initialCustomerData }),

            // Get total items count
            getItemsCount: () => get().items.length,

            // Get total price
            getTotalPrice: () =>
                get().items.reduce((sum, item) => sum + (item.price || 0), 0),

            // Check if limit reached
            isLimitReached: () => get().items.length >= MAX_ITEMS,

            // Reset everything
            resetAll: () => {
                set({ items: [] })
                get().resetCustomerData()
            },
        }),
        {
            name: 'studio30-malinha',
        }
    )
)
