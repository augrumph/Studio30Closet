import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Credenciais fixas (hardcoded)
const ADMIN_CREDENTIALS = {
    username: 'admin_studio30',
    password: 'studio30@@closet'
}

export const useAuthStore = create(
    persist(
        (set, get) => ({
            // Estado
            isAuthenticated: false,
            user: null,
            loginError: null,

            // Login
            login: (username, password) => {
                if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
                    set({
                        isAuthenticated: true,
                        user: {
                            username: ADMIN_CREDENTIALS.username,
                            name: 'Administrador',
                            role: 'admin'
                        },
                        loginError: null
                    })
                    return { success: true }
                } else {
                    set({
                        isAuthenticated: false,
                        user: null,
                        loginError: 'Usuário ou senha inválidos'
                    })
                    return { success: false, error: 'Usuário ou senha inválidos' }
                }
            },

            // Logout
            logout: () => {
                set({
                    isAuthenticated: false,
                    user: null,
                    loginError: null
                })
            },

            // Verificar autenticação
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
            // Não persistir loginError
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                user: state.user
            })
        }
    )
)
