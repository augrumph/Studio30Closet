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

            // Validar sessão no servidor (segurança extra)
            validateSession: async () => {
                const { user, isAuthenticated } = get()
                if (!isAuthenticated || !user?.id) return false

                try {
                    // Verificar se usuário ainda existe na tabela admins
                    const { data, error } = await supabase
                        .from('admins')
                        .select('id')
                        .eq('id', user.id)
                        .maybeSingle()

                    if (error || !data) {
                        console.warn('Sessão inválida: Usuário não encontrado no banco')
                        set({ isAuthenticated: false, user: null })
                        return false
                    }
                    return true
                } catch (error) {
                    console.error('Erro ao validar sessão:', error)
                    return false // Em caso de erro de rede, mantemos logado ou deslogamos? Segurança = deslogar ou tentar dnv.
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
