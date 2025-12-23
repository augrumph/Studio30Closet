import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create(
    persist(
        (set, get) => ({
            // Estado
            isAuthenticated: false,
            user: null,
            loginError: null,
            isLoading: false,

            // Login com username e senha via Supabase
            login: async (username, password) => {
                set({ isLoading: true, loginError: null })

                try {
                    // Buscar admin na tabela admins
                    const { data: admins, error } = await supabase
                        .from('admins')
                        .select('*')
                        .eq('username', username)
                        .eq('password', password)
                        .single()

                    if (error || !admins) {
                        set({
                            isAuthenticated: false,
                            user: null,
                            loginError: 'Usuário ou senha inválidos',
                            isLoading: false
                        })
                        return { success: false, error: 'Usuário ou senha inválidos' }
                    }

                    // Login bem-sucedido
                    set({
                        isAuthenticated: true,
                        user: {
                            id: admins.id,
                            username: admins.username,
                            name: admins.name || 'Administrador',
                            role: 'admin'
                        },
                        loginError: null,
                        isLoading: false
                    })
                    return { success: true }

                } catch (error) {
                    console.error('Erro no login:', error)
                    set({
                        isAuthenticated: false,
                        user: null,
                        loginError: 'Erro ao fazer login. Tente novamente.',
                        isLoading: false
                    })
                    return { success: false, error: 'Erro ao fazer login' }
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
            // Persistir sessão
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                user: state.user
            })
        }
    )
)
