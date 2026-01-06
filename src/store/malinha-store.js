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
            addItem: (product, size) => {
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
                // As imagens e dados completos serão buscados dinamicamente do banco
                const newItem = {
                    itemId,           // ID único do item na malinha
                    productId: product.id,  // ID do produto (para buscar dados depois)
                    selectedSize: size,     // Tamanho selecionado
                    addedAt: new Date().toISOString(),
                    // NÃO salvar nada mais: images, name, price, description, stock, sizes, variants, etc
                    // Todos esses dados serão buscados do banco quando necessário
                }

                set({ items: [...items, newItem] })

                // ✨ Feedback háptico no mobile (vibração sutil)
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate([15, 50, 15]) // padrão sutil: vibra-pausa-vibra
                }

                return { success: true, message: 'Peça adicionada à malinha!' }
            },

            // Remove item from malinha
            removeItem: (itemId) => {
                const { items } = get()
                set({ items: items.filter(item => item.itemId !== itemId) })
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
