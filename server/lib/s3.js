import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
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
        ContentType: file.mimetype,
        ACL: 'public-read' // Check if your provider supports ACLs, otherwise remove
    })

    try {
        await s3Client.send(command)
        // Construct public URL. Adjust format based on your S3 provider (e.g., R2, DigitalOcean, MinIO)
        // For standard S3-compatible: endpoint/bucket/key
        // If endpoint includes bucket, then just endpoint/key.
        // Assuming Railway/generic S3 provider style:
        const url = `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${fileName}`
        return url
    } catch (error) {
        console.error('❌ S3 Upload Error:', error)
        throw new Error('Falha ao fazer upload da imagem')
    }
}

/**
 * Delete a file from S3
 * @param {String} fileUrl - Full URL of the file
 */
export async function deleteFile(fileUrl) {
    try {
        const urlObj = new URL(fileUrl)
        // Extract key from URL. This depends heavily on URL structure.
        // Assumes: .../bucketName/key
        const pathParts = urlObj.pathname.split(`/${BUCKET_NAME}/`)
        if (pathParts.length < 2) return // Invalid URL format for this bucket

        const key = pathParts[1]

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
