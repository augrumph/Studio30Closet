import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'



// Extending the store definition to include validateSession properly inside the object
export const useAuthStore = create(
    persist(
        (set, get) => ({
            // Estado
            isAuthenticated: false,
            user: null,
            loginError: null,
            isLoading: false,

            // Login com email e senha via Supabase Auth
            login: async (email, password) => {
                set({ isLoading: true, loginError: null })

                try {
                    // Usar Supabase Auth padrão
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    })

                    if (error) {
                        console.error('Erro no Supabase Auth:', error)
                        let errorMessage = 'Erro ao conectar. Tente novamente.'
                        
                        // Mensagens de erro mais amigáveis
                        if (error.message === 'Invalid login credentials') {
                            errorMessage = 'Email ou senha inválidos'
                        } else if (error.message.includes('Email not confirmed')) {
                            errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.'
                        }

                        set({
                            isAuthenticated: false,
                            user: null,
                            loginError: errorMessage,
                            isLoading: false
                        })
                        return { success: false, error: errorMessage }
                    }

                    if (!data.user) {
                         set({
                            isAuthenticated: false,
                            user: null,
                            loginError: 'Erro inesperado: Usuário não retornado',
                            isLoading: false
                        })
                        return { success: false, error: 'Erro inesperado' }
                    }

                    // Login bem-sucedido
                    const adminUser = {
                        id: data.user.id,
                        email: data.user.email,
                        name: data.user.user_metadata?.name || 'Administrador',
                        role: 'admin'
                    }

                    set({
                        isAuthenticated: true,
                        user: adminUser,
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
            logout: async () => {
                try {
                    await supabase.auth.signOut()
                } catch (error) {
                    console.error('Erro ao fazer logout:', error)
                }
                
                set({
                    isAuthenticated: false,
                    user: null,
                    loginError: null
                })
            },

            // Validar sessão no servidor (segurança extra)
            validateSession: async () => {
                // Verificar sessão real do Supabase
                try {
                    const { data: { session }, error } = await supabase.auth.getSession()

                    if (error || !session) {
                         // Se não tem sessão váida no Supabase, desloga localmente
                        set({ isAuthenticated: false, user: null })
                        return false
                    }

                    // Se tem sessão, sincroniza se necessário (opcional)
                   const { user } = get()
                   if (!user) {
                        set({
                            isAuthenticated: true,
                            user: {
                                id: session.user.id,
                                email: session.user.email,
                                name: session.user.user_metadata?.name || 'Administrador',
                                role: 'admin'
                            }
                        })
                   }

                    return true
                } catch (error) {
                    console.error('Erro ao validar sessão:', error)
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
