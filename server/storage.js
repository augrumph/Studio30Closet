import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Only load .env file in development (Railway injects env vars directly)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') })
}

let s3ModulesPromise

async function getS3Modules() {
  if (!s3ModulesPromise) {
    s3ModulesPromise = import('@aws-sdk/client-s3').then(({ S3Client, PutObjectCommand, DeleteObjectCommand }) => {
      const client = new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
        },
        forcePathStyle: true
      })

      return { client, PutObjectCommand, DeleteObjectCommand }
    })
  }

  return s3ModulesPromise
}

const BUCKET_NAME = process.env.S3_BUCKET

if (!BUCKET_NAME) {
  console.error('❌ S3_BUCKET não definido no .env')
}

/**
 * Upload de Buffer para o S3
 * @param {Buffer} buffer - Buffer do arquivo
 * @param {string} contentType - Tipo do arquivo (image/jpeg, etc)
 * @param {string} folder - Pasta no bucket
 * @returns {Promise<string>} URL pública
 */
export async function uploadBuffer(buffer, contentType, folder = 'uploads') {
  try {
    // Gerar nome único
    const ext = contentType.split('/')[1] || 'jpg'
    const filename = `${folder}/${crypto.randomUUID()}.${ext}`

    const { client, PutObjectCommand } = await getS3Modules()
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    })

    await client.send(command)

    // Reset endpoint trailing slash
    const endpoint = process.env.S3_ENDPOINT.replace(/\/$/, '')
    const publicUrl = `${endpoint}/${BUCKET_NAME}/${filename}`

    return publicUrl
  } catch (error) {
    console.error('❌ Erro no uploadBuffer S3:', error)
    throw error
  }
}

/**
 * Upload de arquivo Base64 para o S3
 * @param {string} base64String - String base64 (data:image/jpeg;base64,...)
 * @param {string} folder - Pasta no bucket (ex: 'products')
 * @returns {Promise<string>} URL pública do arquivo
 */
export async function uploadBase64Image(base64String, folder = 'uploads') {
  try {
    if (!base64String) return null

    // Se já for uma URL http, retorna ela mesma (não faz upload)
    if (typeof base64String === 'string' && base64String.startsWith('http')) {
      return base64String
    }

    // Se não for base64 válido (ex: blob url ou inválido), retorna null ou erro
    if (typeof base64String !== 'string' || !base64String.startsWith('data:')) {
      console.warn('⚠️ uploadBase64Image: formato inválido ignorado (não é base64 nem http)')
      return null
    }

    // Extrair metadados e buffer
    // Ex: data:image/jpeg;base64,/9j/4AAQSs...
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)

    if (!matches || matches.length !== 3) {
      console.warn('⚠️ uploadBase64Image: falha ao fazer parse do base64')
      return null
    }

    const contentType = matches[1]
    const buffer = Buffer.from(matches[2], 'base64')

    return await uploadBuffer(buffer, contentType, folder)

  } catch (error) {
    console.error('❌ Erro no upload S3:', error)
    throw error
  }
}

/**
 * Deletar arquivo do S3
 * @param {string} fileUrl - URL completa do arquivo
 */
export async function deleteImage(fileUrl) {
  try {
    if (!fileUrl) return

    // Tentar extrair a Key da URL
    // A URL é: endpoint/bucket/FOLDER/FILE.EXT
    // Precisamos de FOLDER/FILE.EXT

    // Estratégia: Split pelo bucket name
    const parts = fileUrl.split(`${BUCKET_NAME}/`)
    if (parts.length < 2) return // URL não bate com nosso bucket

    const key = parts[1] // Pegar tudo depois do bucket/

    const { client, DeleteObjectCommand } = await getS3Modules()
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })

    await client.send(command)
    console.log(`🗑️ Imagem deletada do S3: ${key}`)

  } catch (error) {
    console.error('⚠️ Erro ao deletar imagem S3:', error)
    // Não lançar erro para não bloquear fluxo principal de deleção de produto
  }
}
