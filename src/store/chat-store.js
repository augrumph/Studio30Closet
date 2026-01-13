import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useChatStore = create(
    persist(
        (set, get) => ({
            chats: [],
            activeChatId: null,
            isStreaming: false, // ✅ Estado para streaming

            // Create a new chat and set it as active
            createChat: () => {
                const newChat = {
                    id: Date.now().toString(),
                    title: 'Nova Conversa',
                    createdAt: new Date().toISOString(),
                    messages: [{
                        id: 'welcome',
                        role: 'assistant',
                        content: 'Olá! Sou a **Midi**, a cientista de dados da Studio 30. 👩‍🔬\n\nComo posso ajudar você a tomar melhores decisões hoje?'
                    }]
                }

                set((state) => ({
                    chats: [newChat, ...state.chats],
                    activeChatId: newChat.id
                }))

                return newChat.id
            },

            // Set the active chat to display
            setActiveChat: (chatId) => {
                set({ activeChatId: chatId })
            },

            // Add a message to the active chat
            addMessage: (chatId, message) => {
                set((state) => ({
                    chats: state.chats.map((chat) =>
                        chat.id === chatId
                            ? { ...chat, messages: [...chat.messages, message] }
                            : chat
                    )
                }))
            },

            // ✅ Atualizar mensagem existente (para streaming e dados finais)
            updateMessage: (chatId, messageId, updates) => {
                set((state) => ({
                    chats: state.chats.map((chat) =>
                        chat.id === chatId
                            ? {
                                ...chat,
                                messages: chat.messages.map((msg) =>
                                    msg.id === messageId
                                        ? { ...msg, ...(typeof updates === 'string' ? { content: updates } : updates) }
                                        : msg
                                )
                            }
                            : chat
                    )
                }))
            },

            // ✅ Controlar estado de streaming
            setStreaming: (isStreaming) => {
                set({ isStreaming })
            },

            // Update the title of a chat (e.g., based on first user message)
            updateChatTitle: (chatId, title) => {
                set((state) => ({
                    chats: state.chats.map((chat) =>
                        chat.id === chatId
                            ? { ...chat, title }
                            : chat
                    )
                }))
            },

            // Delete a chat
            deleteChat: (chatId) => {
                set((state) => {
                    const filteredChats = state.chats.filter((c) => c.id !== chatId)
                    // If we deleted the active chat, switch to the first available or null
                    let newActiveId = state.activeChatId
                    if (state.activeChatId === chatId) {
                        newActiveId = filteredChats.length > 0 ? filteredChats[0].id : null
                    }
                    return {
                        chats: filteredChats,
                        activeChatId: newActiveId
                    }
                })
            },

            // Clear all chats (optional)
            clearAllChats: () => {
                set({ chats: [], activeChatId: null })
            }
        }),
        {
            name: 'studio30-chat-storage', // unique name
            storage: createJSONStorage(() => sessionStorage), // Use sessionStorage (clears on browser close)
        }
    )
)

// ✅ Selectors otimizados para evitar re-renders desnecessários
export const selectActiveChat = (state) => state.chats.find(c => c.id === state.activeChatId)
export const selectActiveChatMessages = (state) => selectActiveChat(state)?.messages || []
export const selectIsStreaming = (state) => state.isStreaming
export const selectChatsCount = (state) => state.chats.length
