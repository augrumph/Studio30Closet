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

            // Login com username e senha via Supabase RPC
            login: async (username, password) => {
                set({ isLoading: true, loginError: null })

                try {
                    // Usar RPC para login (retorna array)
                    const { data, error } = await supabase
                        .rpc('admin_login', {
                            p_username: username,
                            p_password: password
                        })

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

                    // A RPC retorna um array: 1 linha = login OK, 0 linhas = credenciais inválidas
                    if (!data || data.length === 0) {
                        set({
                            isAuthenticated: false,
                            user: null,
                            loginError: 'Usuário ou senha inválidos',
                            isLoading: false
                        })
                        return { success: false, error: 'Credenciais inválidas' }
                    }

                    // Login bem-sucedido - pegar primeiro registro do array
                    const admin = data[0]
                    set({
                        isAuthenticated: true,
                        user: {
                            id: admin.id,
                            username: admin.username,
                            name: admin.name || 'Administrador',
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

                    // Se houver erro de rede ou query, NÃO deslogar - só deslogar se usuário realmente não existir
                    if (error) {
                        console.warn('⚠️ Erro ao validar sessão (mantendo login):', error)
                        return true // Manter logado em caso de erro de rede
                    }

                    if (!data) {
                        console.warn('❌ Sessão inválida: Usuário não encontrado no banco')
                        set({ isAuthenticated: false, user: null })
                        return false
                    }

                    return true
                } catch (error) {
                    console.error('⚠️ Erro ao validar sessão (mantendo login):', error)
                    return true // Manter logado em caso de exceção/erro de rede
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
