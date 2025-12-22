import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_ITEMS = 20

export const useMalinhaStore = create(
    persist(
        (set, get) => ({
            items: [],
            customerData: {
                name: '',
                phone: '',
                address: '',
                complement: '',
                notes: '',
            },

            // Add item to malinha
            addItem: (product, size) => {
                const { items } = get()
                if (items.length >= MAX_ITEMS) {
                    return { success: false, message: 'Limite de 20 peças atingido!' }
                }

                const itemId = `${product.id}-${size}-${Date.now()}`
                const newItem = {
                    ...product,
                    itemId,
                    selectedSize: size,
                    addedAt: new Date().toISOString(),
                }

                set({ items: [...items, newItem] })
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
                set({ customerData: { ...get().customerData, ...data } }),

            // Reset customer data
            resetCustomerData: () =>
                set({
                    customerData: {
                        name: '',
                        phone: '',
                        address: '',
                        complement: '',
                        notes: '',
                    }
                }),

            // Get total items count
            getItemsCount: () => get().items.length,

            // Get total price
            getTotalPrice: () =>
                get().items.reduce((sum, item) => sum + item.price, 0),

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
