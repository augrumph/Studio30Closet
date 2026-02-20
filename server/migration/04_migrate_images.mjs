/**
 * FASE 4 — Migrar imagens do Supabase Storage para Railway S3
 * 1. Listar arquivos no bucket site-images do Supabase
 * 2. Baixar cada arquivo
 * 3. Upload para Railway S3
 * 4. Atualizar URLs na tabela site_images do Railway
 */
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import pg from 'pg'
import https from 'https'
import http from 'http'

const { Pool } = pg

const supabase = createClient(
  'https://wvghryqufnjmdfnjypbu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Z2hyeXF1Zm5qbWRmbmp5cGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDc3NTgsImV4cCI6MjA4MTk4Mzc1OH0.hxxwNFxkc6oB0xR0r9LLP_tg-dY3FlW4hsUBcQ-ELSM'
)

const s3 = new S3Client({
  endpoint: 'https://t3.storageapi.dev',
  region: 'auto',
  credentials: {
    accessKeyId: 'tid_ZcoFUDFKXqzZnttldsjlFGwzysbwZFdQTzurNROlwgjmSrNlaz',
    secretAccessKey: 'tsec_wtqkSS2R0TS_UX9ypwhc4Y2Tuu9-jNpGjMRX9TxRHRgVyGSeiB2LJL_S+tYRJA3xX-_wQU'
  },
  forcePathStyle: true
})

const railwayPool = new Pool({
  connectionString: 'postgresql://postgres:lkFzFRvxtPZHhwtxIKxPlqtLsFLaxtAk@maglev.proxy.rlwy.net:18204/railway',
  ssl: { rejectUnauthorized: false }
})

const S3_BUCKET = 'arranged-trunk-2k2olfwm3k'
const SUPABASE_BUCKET = 'site-images'

// Download file from URL
async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// Get MIME type from filename
function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const mimes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml'
  }
  return mimes[ext] || 'application/octet-stream'
}

console.log('🚀 Fase 4: Migração de imagens Supabase → Railway S3\n')

// 1. Listar arquivos no Supabase Storage
console.log('📦 Listando arquivos no Supabase Storage bucket:', SUPABASE_BUCKET)
const { data: files, error: listError } = await supabase.storage.from(SUPABASE_BUCKET).list('site-images')

if (listError) {
  console.error('❌ Erro ao listar arquivos:', listError.message)
  process.exit(1)
}

if (!files || files.length === 0) {
  console.log('ℹ️  Nenhum arquivo encontrado no bucket Supabase')
  console.log('ℹ️  Isso é normal se as imagens estão em base64 na tabela site_images')

  // Verificar URLs na tabela
  const client = await railwayPool.connect()
  const { rows } = await client.query('SELECT * FROM site_images LIMIT 1')
  client.release()

  if (rows.length > 0) {
    console.log('\n📊 URLs atuais na tabela site_images:')
    const img = rows[0]
    Object.keys(img).forEach(k => {
      if (k.includes('image') && img[k]) {
        const url = img[k]
        if (url.startsWith('http')) {
          console.log(`  ${k}: ${url.substring(0, 80)}...`)
        } else {
          console.log(`  ${k}: ${url.substring(0, 50)}... (base64 ou local)`)
        }
      }
    })
  }

  console.log('\n✅ Fase 4 concluída (sem arquivos para migrar)')
  await railwayPool.end()
  process.exit(0)
}

console.log(`✅ Encontrados ${files.length} arquivos\n`)

// 2 & 3. Download e Upload
const urlMap = []
for (const file of files) {
  const fileName = file.name
  const filePath = `site-images/${fileName}`

  process.stdout.write(`📤 ${fileName}... `)

  // Get public URL from Supabase
  const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath)
  const oldUrl = urlData.publicUrl

  // Download
  const buffer = await downloadFile(oldUrl)

  // Upload to Railway S3
  const contentType = getMimeType(fileName)
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: filePath,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read'
  }))

  const newUrl = `https://t3.storageapi.dev/${S3_BUCKET}/${filePath}`

  urlMap.push({ oldUrl, newUrl, fileName })
  console.log(`✅ (${(buffer.length / 1024).toFixed(1)} KB)`)
}

console.log(`\n✅ ${files.length} imagens enviadas para Railway S3\n`)

// 4. Atualizar URLs no banco Railway
console.log('🔄 Atualizando URLs na tabela site_images...')
const client = await railwayPool.connect()

try {
  const { rows } = await client.query('SELECT * FROM site_images LIMIT 1')
  if (rows.length === 0) {
    console.log('⚠️  Nenhuma linha na tabela site_images')
  } else {
    const row = rows[0]
    const updates = {}

    // Para cada coluna de imagem, substituir URL
    Object.keys(row).forEach(col => {
      if (col.includes('image') && row[col]) {
        const oldVal = row[col]
        urlMap.forEach(({ oldUrl, newUrl }) => {
          if (oldVal.includes(oldUrl) || oldVal === oldUrl) {
            updates[col] = newUrl
          }
        })
      }
    })

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k} = $${Object.keys(updates).indexOf(k) + 2}`).join(', ')
      const values = [row.id, ...Object.values(updates)]

      await client.query(
        `UPDATE site_images SET ${setClauses}, updated_at = NOW() WHERE id = $1`,
        values
      )
      console.log(`✅ ${Object.keys(updates).length} URLs atualizadas`)
    } else {
      console.log('ℹ️  Nenhuma URL precisou ser atualizada')
    }
  }
} finally {
  client.release()
  await railwayPool.end()
}

console.log('\n✅ FASE 4 CONCLUÍDA — Imagens migradas para Railway S3!')
