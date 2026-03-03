/**
 * ERROR HANDLER MIDDLEWARE - Tratamento centralizado de erros
 */

export class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message)
        this.statusCode = statusCode
        this.details = details
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Recurso') {
        super(`${resource} não encontrado`, 404)
    }
}

export class ValidationError extends AppError {
    constructor(details) {
        super('Dados inválidos', 400, details)
    }
}

export function errorHandler(err, req, res, next) {
    console.error('🔥 ERRO:', {
        message: err.message,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    })

    const statusCode = err.statusCode || 500

    // Tratar erros do PostgreSQL
    if (err.code === '23505') {
        return res.status(409).json({ error: 'Dado duplicado' })
    }
    if (err.code === '23503') {
        return res.status(409).json({ error: 'Operação bloqueada - registro em uso' })
    }
    if (err.code === '23502') {
        return res.status(400).json({ error: 'Campo obrigatório faltando' })
    }
    if (err.code === '23514') {
        return res.status(400).json({ error: 'Dados inválidos' })
    }

    res.status(statusCode).json({
        error: err.message || 'Erro interno',
        timestamp: new Date().toISOString()
    })
}

export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next)
    }
}

export function setupProcessErrorHandlers() {
    process.on('unhandledRejection', (reason) => {
        console.error('💣 PROMISE REJECTION:', reason)
    })

    process.on('uncaughtException', (error) => {
        console.error('💥 EXCEÇÃO NÃO CAPTURADA:', error)
        process.exit(1)
    })
}
