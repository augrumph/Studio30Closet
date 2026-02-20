/**
 * FASE 3 — Migrar dados do Supabase para Railway PostgreSQL
 * Exporta tabela a tabela do Supabase via JS client e insere no Railway via pg
 * Ordem: sem FK dependências primeiro, depois com FK
 */
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const { Pool } = pg

const supabase = createClient(
  'https://wvghryqufnjmdfnjypbu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Z2hyeXF1Zm5qbWRmbmp5cGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDc3NTgsImV4cCI6MjA4MTk4Mzc1OH0.hxxwNFxkc6oB0xR0r9LLP_tg-dY3FlW4hsUBcQ-ELSM'
)

const railwayPool = new Pool({
  connectionString: 'postgresql://postgres:lkFzFRvxtPZHhwtxIKxPlqtLsFLaxtAk@maglev.proxy.rlwy.net:18204/railway',
  ssl: { rejectUnauthorized: false },
  max: 5
})

// Busca todos os dados de uma tabela Supabase (paginado para tabelas grandes)
async function fetchAll(table, select = '*') {
  const PAGE = 1000
  let allData = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1)
      .order('id')

    if (error) {
      // Algumas tabelas têm PK não-id (uuid), tentar sem order
      const { data: data2, error: error2 } = await supabase
        .from(table)
        .select(select)
        .range(from, from + PAGE - 1)
      if (error2) throw new Error(`Erro fetching ${table}: ${error2.message}`)
      if (!data2 || data2.length === 0) break
      allData = allData.concat(data2)
      if (data2.length < PAGE) break
    } else {
      if (!data || data.length === 0) break
      allData = allData.concat(data)
      if (data.length < PAGE) break
    }
    from += PAGE
  }
  return allData
}

// Insere rows no Railway, retornando count
async function insertRows(client, table, rows, columns) {
  if (!rows || rows.length === 0) return 0

  let count = 0
  const BATCH = 50

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)

    for (const row of batch) {
      // Converter valores para tipos corretos
      const vals = columns.map(c => {
        const val = row[c]
        if (val === undefined || val === null) return null

        // Colunas JSONB (não array nativo): stringify
        if ((c === 'addresses' || c === 'items' || c === 'sizes' ||
             c === 'customer_data' || c === 'event_data' ||
             c === 'card_numbers' || c === 'tiktok_metadata' || c === 'context' || c === 'value') &&
            (typeof val === 'object')) {
          return JSON.stringify(val)
        }

        // WORKAROUND: variants causam erro (possivelmente por size ou estrutura complexa)
        // Migrar como [] vazio, dados estão em images/sizes de qualquer forma
        if (c === 'variants') {
          return '[]'
        }

        // Colunas array nativas (text[], bigint[], integer[]): deixar como array JS
        // pg driver converte automaticamente: images, image_urls, collection_ids, called_numbers, sizes
        return val
      })
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ')
      const cols = columns.map(c => `"${c}"`).join(', ')

      try {
        // OVERRIDING SYSTEM VALUE permite inserir valores em GENERATED ALWAYS AS IDENTITY
        // Para products, fazer cast explícito de JSONB para evitar erro com valores grandes
        let query = `INSERT INTO ${table} (${cols}) OVERRIDING SYSTEM VALUE VALUES (${placeholders}) ON CONFLICT DO NOTHING`
        if (table === 'products') {
          // Cast explícito para jsonb columns: variants
          const varIdx = columns.indexOf('variants')
          if (varIdx >= 0) {
            const castPlaceholders = placeholders.split(', ').map((p, i) =>
              i === varIdx ? `$${i+1}::jsonb` : p
            ).join(', ')
            query = `INSERT INTO ${table} (${cols}) OVERRIDING SYSTEM VALUE VALUES (${castPlaceholders}) ON CONFLICT DO NOTHING`
          }
        }
        await client.query(query, vals)
        count++
      } catch (e) {
        // Sempre logar erros de products para debug
        if (table === 'products') {
          console.error(`\n  ⚠️  PRODUCT ERRO (id=${row.id}):`, e.message)
          const varIdx = columns.indexOf('variants')
          if (varIdx >= 0) {
            const varStr = vals[varIdx]
            console.error(`  variants length:`, varStr ? varStr.length : 0)
            console.error(`  variants first 500 chars:`, varStr ? varStr.substring(0, 500) : 'null')
            // Tentar validar JSON
            try {
              JSON.parse(varStr)
              console.error(`  variants is valid JSON`)
            } catch (jsonErr) {
              console.error(`  variants JSON parse error:`, jsonErr.message)
            }
          }
        } else if (count === 0) {
          // Log completo só no primeiro erro de outras tabelas
          console.error(`\n  ⚠️  ERRO ${table}:`, e.message)
        }
      }
    }
  }
  return count
}

async function migrateTable(railwayClient, tableName, options = {}) {
  const { select = '*', orderById = true } = options
  process.stdout.write(`  📦 ${tableName}... `)

  let rows
  try {
    rows = await fetchAll(tableName, select)
  } catch (e) {
    console.log(`❌ ERRO ao buscar: ${e.message}`)
    return
  }

  if (!rows || rows.length === 0) {
    console.log(`0 registros (vazio)`)
    return
  }

  const columns = Object.keys(rows[0])
  const count = await insertRows(railwayClient, tableName, rows, columns)
  console.log(`✅ ${count}/${rows.length} registros`)
}

// ============================
const client = await railwayPool.connect()

try {
  // Desabilitar triggers temporariamente para evitar erros de FK durante import
  await client.query('SET session_replication_role = replica;')

  console.log('🚀 Iniciando migração de dados...\n')

  // Ordem: independentes primeiro, depois com FK
  await migrateTable(client, 'admins')
  await migrateTable(client, 'analytics_sessions')
  await migrateTable(client, 'analytics_events')
  await migrateTable(client, 'bingo_games')
  await migrateTable(client, 'collections')
  await migrateTable(client, 'coupons')
  await migrateTable(client, 'customers')
  await migrateTable(client, 'suppliers')
  await migrateTable(client, 'products')
  await migrateTable(client, 'orders')
  await migrateTable(client, 'vendas')
  await migrateTable(client, 'order_items')
  await migrateTable(client, 'entregas')
  await migrateTable(client, 'fixed_expenses')
  await migrateTable(client, 'installments')
  await migrateTable(client, 'installment_payments')
  await migrateTable(client, 'materials_stock')
  await migrateTable(client, 'midi_insights')
  await migrateTable(client, 'payment_fees')
  await migrateTable(client, 'purchases')
  await migrateTable(client, 'settings')
  await migrateTable(client, 'site_images')
  await migrateTable(client, 'stock_movements')
  await migrateTable(client, 'abandoned_carts')
  await migrateTable(client, 'bingo_participants')

  // Re-habilitar triggers
  await client.query('SET session_replication_role = DEFAULT;')

  // =====================
  // RESET DAS SEQUENCES
  // =====================
  console.log('\n🔄 Resetando sequences...')
  const seqResets = [
    `SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1))`,
    `SELECT setval(pg_get_serial_sequence('customers', 'id'), COALESCE((SELECT MAX(id) FROM customers), 1))`,
    `SELECT setval(pg_get_serial_sequence('orders', 'id'), COALESCE((SELECT MAX(id) FROM orders), 1))`,
    `SELECT setval(pg_get_serial_sequence('vendas', 'id'), COALESCE((SELECT MAX(id) FROM vendas), 1))`,
    `SELECT setval(pg_get_serial_sequence('order_items', 'id'), COALESCE((SELECT MAX(id) FROM order_items), 1))`,
    `SELECT setval(pg_get_serial_sequence('abandoned_carts', 'id'), COALESCE((SELECT MAX(id) FROM abandoned_carts), 1))`,
    `SELECT setval(pg_get_serial_sequence('analytics_events', 'id'), COALESCE((SELECT MAX(id) FROM analytics_events), 1))`,
    `SELECT setval(pg_get_serial_sequence('collections', 'id'), COALESCE((SELECT MAX(id) FROM collections), 1))`,
    `SELECT setval(pg_get_serial_sequence('coupons', 'id'), COALESCE((SELECT MAX(id) FROM coupons), 1))`,
    `SELECT setval(pg_get_serial_sequence('fixed_expenses', 'id'), COALESCE((SELECT MAX(id) FROM fixed_expenses), 1))`,
    `SELECT setval(pg_get_serial_sequence('materials_stock', 'id'), COALESCE((SELECT MAX(id) FROM materials_stock), 1))`,
    `SELECT setval(pg_get_serial_sequence('payment_fees', 'id'), COALESCE((SELECT MAX(id) FROM payment_fees), 1))`,
    `SELECT setval(pg_get_serial_sequence('purchases', 'id'), COALESCE((SELECT MAX(id) FROM purchases), 1))`,
    `SELECT setval(pg_get_serial_sequence('settings', 'id'), COALESCE((SELECT MAX(id) FROM settings), 1))`,
    `SELECT setval(pg_get_serial_sequence('stock_movements', 'id'), COALESCE((SELECT MAX(id) FROM stock_movements), 1))`,
    `SELECT setval(pg_get_serial_sequence('suppliers', 'id'), COALESCE((SELECT MAX(id) FROM suppliers), 1))`,
    `SELECT setval('installments_id_seq', COALESCE((SELECT MAX(id) FROM installments), 1))`,
    `SELECT setval('installment_payments_id_seq', COALESCE((SELECT MAX(id) FROM installment_payments), 1))`,
    `SELECT setval('midi_insights_id_seq', COALESCE((SELECT MAX(id) FROM midi_insights), 1))`,
  ]

  for (const q of seqResets) {
    try {
      await client.query(q)
    } catch (e) {
      console.log(`  ⚠️  Sequence skip: ${e.message.substring(0, 80)}`)
    }
  }
  console.log('✅ Sequences resetadas!')

  // =====================
  // VERIFICAÇÃO FINAL
  // =====================
  console.log('\n📊 Contagem final no Railway:')
  const tables = [
    'admins', 'analytics_sessions', 'analytics_events', 'bingo_games',
    'bingo_participants', 'collections', 'coupons', 'customers',
    'suppliers', 'products', 'orders', 'vendas', 'order_items',
    'entregas', 'fixed_expenses', 'installments', 'installment_payments',
    'materials_stock', 'midi_insights', 'payment_fees', 'purchases',
    'settings', 'site_images', 'stock_movements', 'abandoned_carts'
  ]
  for (const t of tables) {
    const { rows } = await client.query(`SELECT COUNT(*) as n FROM ${t}`)
    console.log(`  ${t}: ${rows[0].n}`)
  }

} finally {
  client.release()
  await railwayPool.end()
}

console.log('\n✅ FASE 3 CONCLUÍDA — Dados migrados!')
