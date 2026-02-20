import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:lkFzFRvxtPZHhwtxIKxPlqtLsFLaxtAk@maglev.proxy.rlwy.net:18204/railway',
  ssl: { rejectUnauthorized: false }
})

await client.connect()

const { rows } = await client.query(`
  SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_name = 'products'
  ORDER BY ordinal_position
`)

console.log('Products columns:')
rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (${r.udt_name})`))

await client.end()
