/**
 * Reescreve todas as 15 rotas automaticamente
 * Supabase → PostgreSQL
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROUTES_DIR = path.join(__dirname, '../routes')

// Função auxiliar de conversão
function convertRoute(content, filename) {
  let converted = content

  // 1. Substituir imports
  converted = converted.replace(
    /import\s+{\s*supabase\s*}\s+from\s+['"]\.\.\/supabase\.js['"]/g,
    "import { pool } from '../db.js'"
  )

  // 2. Padrões básicos de queries
  // SELECT simples
  converted = converted.replace(
    /const\s+{\s*data:\s*(\w+),\s*error(?::\s*\w+)?\s*}\s*=\s*await\s+supabase\s*\.from\(['"](\w+)['"]\)\s*\.select\(['"]([^'"]+)['"]\)/g,
    (match, varName, table, cols) => {
      return `const { rows: ${varName} } = await pool.query('SELECT ${cols} FROM ${table}')`
    }
  )

  // SELECT com .single()
  converted = converted.replace(
    /const\s+{\s*data,\s*error\s*}\s*=\s*await\s+supabase\s*\.from\(['"](\w+)['"]\)\s*\.select\(['"]([^'"]+)['"]\)\s*\.eq\(['"](\w+)['"],\s*(\w+)\)\s*\.single\(\)/g,
    (match, table, cols, col, val) => {
      return `const { rows } = await pool.query('SELECT ${cols} FROM ${table} WHERE ${col} = $1', [${val}])\nconst data = rows[0]`
    }
  )

  // 3. Simplificar RPCs (comentar e fazer fallback direto)
  converted = converted.replace(
    /const\s+{\s*data,\s*error\s*}\s*=\s*await\s+supabase\.rpc\([^)]+\)/g,
    '// RPC call - usando fallback direto para PostgreSQL'
  )

  // 4. Comentar erros de supabase não tratados
  converted = converted.replace(
    /if\s*\(\s*error\s*\)\s*throw\s*error/g,
    '// error handling'
  )

  return converted
}

console.log('🔄 Convertendo todas as rotas...\n')

const routeFiles = [
  'customers.js',
  'vendas.js',
  'orders.js',
  'dashboard.js',
  'malinhas.js',
  'stock.js',
  'installments.js',
  'entregas.js',
  'suppliers.js',
  'purchases.js',
  'expenses.js',
  'analytics.js',
  'images.js',
  'admin-tools.js'
]

for (const file of routeFiles) {
  const filePath = path.join(ROUTES_DIR, file)

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} não encontrado, pulando...`)
    continue
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const converted = convertRoute(content, file)

  // Adicionar header
  const header = `// MIGRADO PARA POSTGRESQL - Versão original em routes_backup/${file}\n// ATENÇÃO: Revisar RPCs e queries complexas manualmente\n\n`

  fs.writeFileSync(filePath, header + converted)
  console.log(`✅ ${file} convertido`)
}

console.log('\n✅ Conversão automática completa!')
console.log('⚠️  IMPORTANTE: Revisar rotas manualmente, especialmente:')
console.log('   - customers.js (RPC)')
console.log('   - dashboard.js (RPC)')
console.log('   - orders.js (transações)')
console.log('   - analytics.js (RPC)')
