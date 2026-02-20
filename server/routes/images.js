import express from 'express'
import multer from 'multer'
import { pool } from '../db.js'
import { uploadFile, s3Client } from '../lib/s3.js'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { validateFileUpload } from '../middleware/fileSanitization.js'

const router = express.Router()
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only 1 file at a time
    }
})

// GET /api/images/proxy/* - Proxy para imagens do S3 (caso bucket seja privado)
router.get('/proxy/*', async (req, res) => {
    try {
        const key = req.params[0]
        const { w, h, q } = req.query

        if (!key) return res.status(400).send('Key required')

        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key
        })

        const response = await s3Client.send(command)

        // Cache Headers (1 ano - immutable)
        res.set('Cache-Control', 'public, max-age=31536000, immutable')

        // Se não tiver parametros de redimensionamento, stream direto (rápido)
        if (!w && !h && !q) {
            if (response.ContentType) res.set('Content-Type', response.ContentType)
            if (response.ContentLength) res.set('Content-Length', response.ContentLength)
            if (response.LastModified) res.set('Last-Modified', response.LastModified.toUTCString())
            return response.Body.pipe(res)
        }

        // ⚡ OTIMIZAÇÃO ON-THE-FLY COM SHARP
        const width = w ? parseInt(w) : null
        const height = h ? parseInt(h) : null
        const quality = q ? parseInt(q) : 80

        // Pipeline de Transformação
        const transform = sharp()

        // 1. Resize
        if (width || height) {
            transform.resize({
                width,
                height,
                fit: 'cover', // Cortar para caber
                withoutEnlargement: true // Não aumentar se for pequena
            })
        }

        // 2. Formato e Compressão (WebP automático)
        transform.webp({ quality })
        res.set('Content-Type', 'image/webp')

        // Pipe: S3 Stream -> Sharp Transform -> Response
        response.Body.pipe(transform).pipe(res)

    } catch (err) {
        console.error('❌ Proxy Error:', err.message)
        if (err.name === 'NoSuchKey') return res.status(404).send('Image not found')
        res.status(500).send('Error fetching image')
    }
})

// GET /api/images - Fetch site images configuration
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM site_images LIMIT 1')
        if (rows.length === 0) {
            return res.json({}) // Return empty object if not configured
        }
        res.json(rows[0])
    } catch (error) {
        console.error('❌ Erro ao buscar imagens:', error)
        res.status(500).json({ error: 'Erro ao buscar configurações de imagens' })
    }
})

// POST /api/images/upload - Upload image to S3 and update DB
router.post('/upload',
    upload.single('image'),
    validateFileUpload({
        allowedTypes: ['images'],
        maxSize: 5 * 1024 * 1024, // 5MB
        checkMagicBytes: true,
        generateUniqueName: true
    }),
    async (req, res) => {
        const { fieldName } = req.body
        const file = req.file

        if (!file || !fieldName) {
            return res.status(400).json({ error: 'Imagem e nome do campo são obrigatórios' })
        }

        try {
            // Use sanitized filename
            file.originalname = file.sanitizedName

            // 1. Upload to S3
            const publicUrl = await uploadFile(file, 'site-images')

            // 2. Ensure row exists (Singleton)
            let { rows } = await pool.query('SELECT id FROM site_images LIMIT 1')
            let rowId

            if (rows.length === 0) {
                const insertRes = await pool.query(
                    `INSERT INTO site_images (updated_by, updated_at, "${fieldName}") VALUES ($1, NOW(), $2) RETURNING id`,
                    ['system', publicUrl]
                )
                rowId = insertRes.rows[0].id
            } else {
                rowId = rows[0].id
                // Update existing row
                await pool.query(
                    `UPDATE site_images SET "${fieldName}" = $1, updated_at = NOW() WHERE id = $2`,
                    [publicUrl, rowId]
                )
            }

            res.json({ success: true, url: publicUrl })
        } catch (error) {
            console.error('❌ Erro no upload:', error)
            res.status(500).json({ error: 'Falha ao processar upload' })
        }
    })

// PUT /api/images - Update image URL directly
router.put('/', async (req, res) => {
    const { fieldName, url } = req.body

    if (!fieldName || !url) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando' })
    }

    try {
        // Ensure row exists
        let { rows } = await pool.query('SELECT id FROM site_images LIMIT 1')

        if (rows.length === 0) {
            await pool.query(
                `INSERT INTO site_images (updated_by, updated_at, "${fieldName}") VALUES ($1, NOW(), $2)`,
                ['admin', url]
            )
        } else {
            await pool.query(
                `UPDATE site_images SET "${fieldName}" = $1, updated_at = NOW() WHERE id = $2`,
                [url, rows[0].id]
            )
        }

        res.json({ success: true })
    } catch (error) {
        console.error('❌ Erro ao atualizar URL:', error)
        res.status(500).json({ error: 'Erro ao atualizar imagem' })
    }
})

// GET /api/images/optimize - Legacy route compatibility
router.get('/optimize', async (req, res) => {
    const { id, table } = req.query

    if (!id || !table) {
        return res.status(400).json({ error: 'Missing parameters' })
    }

    try {
        // Sanitize table name to prevent injection (basic allowlist)
        const allowedTables = ['products', 'site_images']
        if (!allowedTables.includes(table)) {
            return res.status(400).json({ error: 'Invalid table' })
        }

        const { rows } = await pool.query(`SELECT image FROM ${table} WHERE id = $1`, [id])
        if (rows.length === 0) return res.status(404).json({ error: 'Image not found' })

        res.json({ data: rows[0].image })
    } catch (error) {
        console.error("❌ Erro ao otimizar imagem:", error)
        res.status(500).json({ error: 'Erro ao otimizar imagem' })
    }
})

export default router
