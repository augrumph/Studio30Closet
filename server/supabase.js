import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Only load .env file in development (Railway injects env vars directly)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') })
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos no .env')
    process.exit(1)
}

// Optimized configuration for server-side usage
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false, // Server-side doesn't need session persistence
        autoRefreshToken: false,
        detectSessionInUrl: false
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: {
            'x-application-name': 'studio30-backend',
        }
    },
    realtime: {
        params: {
            eventsPerSecond: 10 // Rate limit for realtime events
        }
    }
})

console.log('✅ Supabase Client inicializado no Backend com otimizações')
