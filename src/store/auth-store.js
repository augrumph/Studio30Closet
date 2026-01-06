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

            // Login com username e senha via Supabase RPC (bcrypt no servidor)
            login: async (username, password) => {
                set({ isLoading: true, loginError: null })

                try {
                    // Usar RPC para login seguro (verificação bcrypt no PostgreSQL)
                    const { data, error } = await supabase
                        .rpc('admin_login', {
                            p_username: username,
                            p_password: password
                        })
                        .single()

                    if (error) {
                        console.error('Erro na RPC admin_login:', error)
                        set({
                            isAuthenticated: false,
                            user: null,
                            loginError: 'Erro ao conectar. Tente novamente.',
                            isLoading: false
                        })
                        return { success: false, error: 'Erro de conexão' }
                    }

                    // Verificar resultado da RPC
                    if (!data?.success) {
                        set({
                            isAuthenticated: false,
                            user: null,
                            loginError: data?.error_message || 'Usuário ou senha inválidos',
                            isLoading: false
                        })
                        return { success: false, error: 'Credenciais inválidas' }
                    }

                    // Login bem-sucedido
                    set({
                        isAuthenticated: true,
                        user: {
                            id: data.id,
                            username: data.username,
                            name: data.name || 'Administrador',
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
