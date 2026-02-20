/**
 * FASE 5 - Automatizar reescrita de rotas Supabase → PostgreSQL
 * Cria versões novas de todas as rotas de uma vez
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROUTES_DIR = path.join(__dirname, '../routes')
const BACKUP_DIR = path.join(__dirname, './routes_backup')

// Criar backup
fs.mkdirSync(BACKUP_DIR, { recursive: true })

// Patterns de conversão
const patterns = [
  // Import statements
  { from: /import { supabase } from ['"]\.\.\/supabase\.js['"]/g, to: "import { pool } from '../db.js'" },

  // SELECT queries básicos
  {
    from: /const { data, error } = await supabase\s*\.from\(['"](\w+)['"]\)\s*\.select\(['"](.+?)['"]\)/g,
    to: (match, table, cols) => `const { rows: data, error: pgError } = await pool.query('SELECT ${cols} FROM ${table}')\nconst error = pgError`
  },

  // SELECT com .single()
  {
    from: /const { data, error } = await supabase\s*\.from\(['"](\w+)['"]\)\s*\.select\(['"](.+?)['"]\)\s*\.eq\(['"](\w+)['"], (\w+)\)\s*\.single\(\)/g,
    to: (match, table, cols, col, val) => `const { rows } = await pool.query('SELECT ${cols} FROM ${table} WHERE ${col} = $1', [${val}])\nconst data = rows[0]\nconst error = null`
  },

  // COUNT with select
  {
    from: /\.select\(['"](.+?)['"]\s*,\s*{\s*count:\s*['"]exact['"]\s*}\)/g,
    to: (match, cols) => `.query('SELECT COUNT(*) OVER() as total_count, ${cols}`
  },
]

const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js') && f !== 'index.js')

console.log(`📝 Reescrevendo ${routeFiles.length} arquivos de rota...\n`)

for (const file of routeFiles) {
  const filePath = path.join(ROUTES_DIR, file)
  const backupPath = path.join(BACKUP_DIR, file)

  // Backup
  fs.copyFileSync(filePath, backupPath)
  console.log(`✅ Backup: ${file} → routes_backup/`)

  let content = fs.readFileSync(filePath, 'utf8')

  // Aplicar patterns básicos
  for (const { from, to } of patterns) {
    if (typeof to === 'function') {
      content = content.replace(from, to)
    } else {
      content = content.replace(from, to)
    }
  }

  // Comentário no topo
  const header = `// MIGRADO AUTOMATICAMENTE PARA POSTGRESQL - REVISAR E TESTAR\n// Original em routes_backup/${file}\n\n`
  content = header + content

  fs.writeFileSync(filePath, content)
}

console.log(`\n✅ ${routeFiles.length} rotas reescritas (versão automática)`)
console.log(`⚠️  ATENÇÃO: Revisar manualmente cada rota antes de usar em produção`)
console.log(`📁 Backups em: ${BACKUP_DIR}`)
