import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://postgres:lkFzFRvxtPZHhwtxIKxPlqtLsFLaxtAk@maglev.proxy.rlwy.net:18204/railway',
  ssl: { rejectUnauthorized: false }
})

const { rows: products } = await pool.query(`
  SELECT id, name, images, array_length(images, 1) as num_images
  FROM products
  WHERE images IS NOT NULL
  ORDER BY id
  LIMIT 10
`)

console.log(`\n📊 Primeiros 10 produtos com imagens:\n`)
products.forEach(p => {
  const firstImg = p.images && p.images[0] ? p.images[0] : null
  const imgSize = firstImg ? `${(firstImg.length / 1024).toFixed(1)} KB` : 'N/A'
  const isBase64 = firstImg && firstImg.startsWith('data:image') ? 'base64' : 'URL'

  console.log(`  ID ${p.id}: ${p.name}`)
  console.log(`    → ${p.num_images || 0} imagens, primeira: ${imgSize} (${isBase64})\n`)
})

const { rows: total } = await pool.query('SELECT COUNT(*) FROM products WHERE images IS NOT NULL AND array_length(images, 1) > 0')
console.log(`✅ Total de produtos com imagens: ${total[0].count}\n`)

await pool.end()
