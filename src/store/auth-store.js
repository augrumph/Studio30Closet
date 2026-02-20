
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api-client'

export const useAuthStore = create(
    persist(
        (set, get) => ({
            // Estado
            isAuthenticated: false,
            user: null,
            loginError: null,
            isLoading: false,

            // Login com email e senha via API Própria
            login: async (email, password) => {
                set({ isLoading: true, loginError: null })

                try {
                    const data = await apiClient('/auth/login', {
                        method: 'POST',
                        body: { email, password }
                    })

                    // Se falhar o apiClient lança erro, caindo no catch

                    const { token, user } = data

                    // Salvar token para uso no apiClient
                    localStorage.setItem('auth_token', token)

                    set({
                        isAuthenticated: true,
                        user: user,
                        loginError: null,
                        isLoading: false
                    })
                    return { success: true }

                } catch (error) {
                    console.error('Erro no login:', error)
                    const errorMessage = error.message || 'Erro ao fazer login. Tente novamente.'

                    set({
                        isAuthenticated: false,
                        user: null,
                        loginError: errorMessage,
                        isLoading: false
                    })
                    return { success: false, error: errorMessage }
                }
            },

            // Logout
            logout: async () => {
                localStorage.removeItem('auth_token')

                set({
                    isAuthenticated: false,
                    user: null,
                    loginError: null
                })
            },

            // Validar sessão no servidor
            validateSession: async () => {
                const token = localStorage.getItem('auth_token')
                if (!token) {
                    set({ isAuthenticated: false, user: null })
                    return false
                }

                try {
                    const data = await apiClient('/auth/me')

                    set({
                        isAuthenticated: true,
                        user: data.user
                    })
                    return true
                } catch (error) {
                    console.error('Sessão inválida:', error)
                    localStorage.removeItem('auth_token')
                    set({ isAuthenticated: false, user: null })
                    return false
                }
            },

            // Verificar autenticação (local)
            checkAuth: () => {
                const { isAuthenticated } = get()
                return isAuthenticated
            },

            // Limpar erro de login
            clearError: () => {
                set({ loginError: null })
            }
        }),
        {
            name: 'studio30-admin-auth',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                user: state.user
            })
        }
    )
)
