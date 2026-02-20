/**
 * Centralized Error Handling Middleware
 * Catches all errors and returns consistent JSON responses
 */

import winston from 'winston'

// Configure logger
const logger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
})

/**
 * Error handler middleware
 * Must be added AFTER all routes
 */
export function errorHandler(err, req, res, next) {
    // Log error details
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    })

    // Default error response
    const statusCode = err.statusCode || err.status || 500
    const message = err.message || 'Internal Server Error'

    // Don't leak error details in production
    const response = {
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err.details
        })
    }

    res.status(statusCode).json(response)
}

/**
 * 404 Not Found handler
 * Must be added BEFORE error handler
 */
export function notFoundHandler(req, res, next) {
    const error = new Error(`Not Found - ${req.originalUrl}`)
    error.statusCode = 404
    next(error)
}

/**
 * Async route wrapper
 * Automatically catches errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next)
    }
}
