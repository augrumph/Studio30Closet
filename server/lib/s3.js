import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import dotenv from 'dotenv'

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Only load .env file in development (Railway injects env vars directly)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') })
}

export const s3Client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    forcePathStyle: true // Needed for some S3-compatible providers
})

const BUCKET_NAME = process.env.S3_BUCKET

/**
 * Upload a file to S3
 * @param {Object} file - Multer file object
 * @param {String} folder - Folder path in bucket (default 'uploads')
 * @returns {String} - Public URL of the uploaded file
 */
export async function uploadFile(file, folder = 'uploads') {
    const fileExtension = file.originalname.split('.').pop()
    const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype
        // ACL removed - Railway S3 doesn't support ACLs
    })

    try {
        await s3Client.send(command)
        // Return the key/path instead of full URL
        // Frontend will request signed URLs as needed
        const url = `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${fileName}`
        return url
    } catch (error) {
        console.error('❌ S3 Upload Error:', error)
        throw new Error('Falha ao fazer upload da imagem')
    }
}

/**
 * Generate a presigned URL for an S3 object (valid for 1 hour)
 * @param {String} key - S3 object key (file path in bucket)
 * @returns {String} - Presigned URL
 */
export async function getPresignedUrl(key) {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        })
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour
        return url
    } catch (error) {
        console.error('❌ Error generating presigned URL:', error)
        return null
    }
}

/**
 * Extract S3 key from full URL
 * @param {String} fileUrl - Full URL of the file
 * @returns {String} - S3 key
 */
export function extractKeyFromUrl(fileUrl) {
    try {
        const urlObj = new URL(fileUrl)
        const pathParts = urlObj.pathname.split(`/${BUCKET_NAME}/`)
        if (pathParts.length >= 2) return pathParts[1]
        // Fallback: just use the pathname without leading slash
        return urlObj.pathname.substring(1)
    } catch (error) {
        console.error('⚠️ Error extracting key from URL:', error)
        return null
    }
}

/**
 * Delete a file from S3
 * @param {String} fileUrl - Full URL of the file
 */
export async function deleteFile(fileUrl) {
    try {
        const key = extractKeyFromUrl(fileUrl)
        if (!key) return

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        })

        await s3Client.send(command)
    } catch (error) {
        console.error('⚠️ S3 Delete Warning:', error)
        // Don't throw, just log
    }
}
