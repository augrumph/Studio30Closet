/**
 * PostgreSQL connection pool for Railway
 * Substitui supabase.js
 */
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Force SSL for Railway
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2s to 10s
  keepAlive: true,
})

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool PostgreSQL:', err)
  process.exit(-1)
})

pool.on('connect', () => {
  console.log('✅ Pool PostgreSQL conectado')
})

// Helper para queries simples
export async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  console.log('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount })
  return res
}

// Helper para transações
export async function getClient() {
  const client = await pool.connect()
  const originalQuery = client.query.bind(client)
  const originalRelease = client.release.bind(client)

  // Timeout para evitar deadlocks
  const timeout = setTimeout(() => {
    console.error('⚠️  Cliente não foi released! Forcing release...')
    originalRelease()
  }, 30000)

  client.query = (...args) => {
    return originalQuery(...args)
  }

  client.release = () => {
    clearTimeout(timeout)
    client.query = originalQuery
    client.release = originalRelease
    return originalRelease()
  }

  return client
}

export default pool
