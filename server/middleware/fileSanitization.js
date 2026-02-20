/**
 * File Upload Sanitization & Validation Middleware
 * Protege contra uploads maliciosos e path traversal attacks
 */

import path from 'path'
import crypto from 'crypto'

// MIME types permitidos (whitelist)
const ALLOWED_MIME_TYPES = {
    images: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml'
    ],
    documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
}

// Extensões permitidas (whitelist)
const ALLOWED_EXTENSIONS = {
    images: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'],
    documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
}

// Extensões perigosas (blacklist)
const DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
    '.jar', '.zip', '.rar', '.7z', '.tar', '.gz',
    '.sh', '.bash', '.ps1', '.dll', '.so', '.dylib',
    '.php', '.asp', '.aspx', '.jsp', '.cgi'
]

// Magic bytes para detectar tipo real do arquivo
const MAGIC_BYTES = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46]
}

/**
 * Sanitiza nome de arquivo removendo caracteres perigosos
 */
export function sanitizeFileName(filename) {
    if (!filename || typeof filename !== 'string') {
        throw new Error('Nome de arquivo inválido')
    }

    // Remove path traversal (.., ./, \, etc)
    let sanitized = filename.replace(/\.\./g, '')
    sanitized = sanitized.replace(/[/\\]/g, '')

    // Remove caracteres especiais perigosos
    sanitized = sanitized.replace(/[^\w\s.-]/g, '')

    // Remove múltiplos pontos consecutivos
    sanitized = sanitized.replace(/\.{2,}/g, '.')

    // Remove espaços no início/fim e múltiplos espaços
    sanitized = sanitized.trim().replace(/\s+/g, '_')

    // Limite de comprimento
    if (sanitized.length > 255) {
        const ext = path.extname(sanitized)
        const name = path.basename(sanitized, ext)
        sanitized = name.substring(0, 255 - ext.length) + ext
    }

    return sanitized
}

/**
 * Gera nome de arquivo único e seguro
 */
export function generateSafeFileName(originalName) {
    const ext = path.extname(originalName).toLowerCase()
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString('hex')
    return `${timestamp}_${random}${ext}`
}

/**
 * Valida extensão do arquivo
 */
export function validateExtension(filename, allowedTypes = ['images']) {
    const ext = path.extname(filename).toLowerCase()

    // Verificar blacklist
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
        throw new Error(`Extensão perigosa detectada: ${ext}`)
    }

    // Verificar whitelist
    const allowed = allowedTypes.flatMap(type => ALLOWED_EXTENSIONS[type] || [])
    if (allowed.length > 0 && !allowed.includes(ext)) {
        throw new Error(`Extensão não permitida: ${ext}. Permitidas: ${allowed.join(', ')}`)
    }

    return ext
}

/**
 * Valida MIME type do arquivo
 */
export function validateMimeType(mimetype, allowedTypes = ['images']) {
    if (!mimetype || typeof mimetype !== 'string') {
        throw new Error('MIME type inválido')
    }

    const allowed = allowedTypes.flatMap(type => ALLOWED_MIME_TYPES[type] || [])
    if (allowed.length > 0 && !allowed.includes(mimetype)) {
        throw new Error(`Tipo de arquivo não permitido: ${mimetype}`)
    }

    return mimetype
}

/**
 * Verifica magic bytes do arquivo (primeiros bytes)
 */
export function validateFileSignature(buffer, expectedMimeType) {
    if (!buffer || buffer.length < 4) {
        throw new Error('Arquivo muito pequeno ou corrompido')
    }

    const magicBytes = MAGIC_BYTES[expectedMimeType]
    if (!magicBytes) {
        // Se não temos magic bytes para esse tipo, aceitar
        return true
    }

    // Verificar se os primeiros bytes correspondem
    for (let i = 0; i < magicBytes.length; i++) {
        if (buffer[i] !== magicBytes[i]) {
            throw new Error(`Arquivo não corresponde ao tipo declarado (${expectedMimeType})`)
        }
    }

    return true
}

/**
 * Valida tamanho do arquivo
 */
export function validateFileSize(size, maxSize = 5 * 1024 * 1024) { // 5MB padrão
    if (!size || typeof size !== 'number') {
        throw new Error('Tamanho de arquivo inválido')
    }

    if (size > maxSize) {
        const maxMB = (maxSize / 1024 / 1024).toFixed(1)
        const actualMB = (size / 1024 / 1024).toFixed(1)
        throw new Error(`Arquivo muito grande: ${actualMB}MB. Máximo: ${maxMB}MB`)
    }

    if (size === 0) {
        throw new Error('Arquivo vazio')
    }

    return true
}

/**
 * Middleware completo de validação de arquivo
 */
export function validateFileUpload(options = {}) {
    const {
        allowedTypes = ['images'],
        maxSize = 5 * 1024 * 1024, // 5MB
        checkMagicBytes = true,
        generateUniqueName = true
    } = options

    return (req, res, next) => {
        try {
            const file = req.file
            if (!file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' })
            }

            // 1. Validar tamanho
            validateFileSize(file.size, maxSize)

            // 2. Validar MIME type
            validateMimeType(file.mimetype, allowedTypes)

            // 3. Validar extensão
            const ext = validateExtension(file.originalname, allowedTypes)

            // 4. Verificar magic bytes (assinatura real do arquivo)
            if (checkMagicBytes && file.buffer) {
                validateFileSignature(file.buffer, file.mimetype)
            }

            // 5. Sanitizar e gerar nome seguro
            if (generateUniqueName) {
                file.sanitizedName = generateSafeFileName(file.originalname)
            } else {
                file.sanitizedName = sanitizeFileName(file.originalname)
            }

            // 6. Adicionar metadata de validação
            file.validated = true
            file.validatedAt = new Date().toISOString()

            next()

        } catch (error) {
            console.error('❌ Validação de arquivo falhou:', error.message)
            return res.status(400).json({
                error: 'Arquivo inválido',
                details: error.message
            })
        }
    }
}

/**
 * Detecta tentativas de path traversal
 */
export function preventPathTraversal(inputPath) {
    if (!inputPath || typeof inputPath !== 'string') {
        throw new Error('Path inválido')
    }

    // Normalizar path
    const normalized = path.normalize(inputPath)

    // Detectar tentativas de sair do diretório
    if (normalized.includes('..') || normalized.startsWith('/') || normalized.includes('\\')) {
        throw new Error('Path traversal detectado')
    }

    return normalized
}

/**
 * Wrapper para operações de arquivo seguras
 */
export function safePathJoin(base, ...segments) {
    // Sanitizar todos os segmentos
    const sanitizedSegments = segments.map(seg => {
        if (typeof seg !== 'string') {
            throw new Error('Segmento de path inválido')
        }
        return preventPathTraversal(seg)
    })

    // Juntar paths de forma segura
    const joined = path.join(base, ...sanitizedSegments)

    // Verificar se o resultado ainda está dentro do diretório base
    const resolved = path.resolve(joined)
    const baseResolved = path.resolve(base)

    if (!resolved.startsWith(baseResolved)) {
        throw new Error('Tentativa de acesso fora do diretório permitido')
    }

    return joined
}
