import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { trackAddToCart, trackRemoveFromCart, saveCartSnapshot } from '@/lib/api/analytics'

const MAX_ITEMS = 20

const initialCustomerData = {
    name: '',
    phone: '',
    email: '',
    cpf: '',
    birth_date: '',
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
                const newItem = {
                    itemId,                         // ID único do item na malinha
                    productId: product.id,          // ID do produto
                    selectedSize: size,             // Tamanho selecionado
                    selectedColor: color,           // ✅ Cor selecionada (IMPORTANTÍSSIMO PARA ESTOQUE)
                    price: product.price || 0,      // ✅ Preço no momento da adição (para getTotalPrice)
                    image: product.images?.[0],     // ✅ Salvar a imagem exata que o usuário viu (Variação)
                    addedAt: new Date().toISOString(),
                }

                set({ items: [...items, newItem] })

                // 📊 Analytics: Rastrear adição ao carrinho
                trackAddToCart(product, size, color)

                // 📊 Analytics: Salvar snapshot para detectar abandono
                const updatedItems = [...items, newItem]
                saveCartSnapshot(updatedItems)

                // ✨ Feedback háptico no mobile (vibração sutil)
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate([15, 50, 15])
                }

                return { success: true, message: 'Peça adicionada à malinha!' }
            },

            // Update item in malinha (size, color, etc)
1:             updateItem: (itemId, updates) => {
2:                 set((state) => ({
3:                     items: state.items.map((item) =>
4:                         item.itemId === itemId ? { ...item, ...updates } : item
5:                     ),
6:                 }))
7: 
8:                 // 📊 Analytics: Atualizar snapshot
9:                 const { items } = get()
10:                 saveCartSnapshot(items)
11:             },
12: 
13:             // Remove item from malinha
14:             removeItem: (itemId) => {
                const { items } = get()
                const removedItem = items.find(item => item.itemId === itemId)
                const newItems = items.filter(item => item.itemId !== itemId)
                set({ items: newItems })

                // 📊 Analytics: Rastrear remoção do carrinho
                if (removedItem) {
                    trackRemoveFromCart(removedItem.productId)
                }

                // 📊 Analytics: Atualizar snapshot
                saveCartSnapshot(newItems)

                // ✨ Feedback háptico no mobile (vibração curta para remoção)
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(10) // vibração curta para ação de remoção
                }
            },

            // Clear all items
            clearItems: () => {
                set({ items: [] })
                // 📊 Analytics: Limpar snapshot
                saveCartSnapshot([])
            },

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
            // 🔒 Persistir APENAS os items do carrinho, NÃO os dados do cliente
            // Isso garante que cada novo checkout tenha formulário limpo
            partialize: (state) => ({ items: state.items }),
        }
    )
)
