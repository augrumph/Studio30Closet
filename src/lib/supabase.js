import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// MOCK CLIENT se não houver credenciais (evita crash no dev)
// O usuário pediu explicitamente para "tirar a necessidade das credenciais"
let supabaseInstance

if (!supabaseUrl || !supabaseAnonKey) {
  // console.warn('⚠️ Supabase Creds Missing: Running in MOCK mode.')

  const createMockChain = () => {
    const chain = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => ({ data: {}, error: null }),
      maybeSingle: () => ({ data: null, error: null }),
      then: (resolve) => resolve({ data: [], error: null }) // Allow await
    }
    return chain
  }

  supabaseInstance = {
    from: () => createMockChain(),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
    },
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    }
  }
} else {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = supabaseInstance
