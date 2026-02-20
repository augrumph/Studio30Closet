/**
 * Request Validation Middleware using Zod
 * Validates request body, params, and query
 */

import { z } from 'zod'

/**
 * Validation middleware factory
 * @param {Object} schema - Zod schema object with body, params, query properties
 * @returns {Function} Express middleware
 */
export function validate(schema) {
    return async (req, res, next) => {
        try {
            // Validate body if schema provided
            if (schema.body) {
                req.body = await schema.body.parseAsync(req.body)
            }

            // Validate params if schema provided
            if (schema.params) {
                req.params = await schema.params.parseAsync(req.params)
            }

            // Validate query if schema provided
            if (schema.query) {
                req.query = await schema.query.parseAsync(req.query)
            }

            next()
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation Error',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                })
            }
            next(error)
        }
    }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
    // ID param validation
    idParam: z.object({
        id: z.string().regex(/^\d+$/, 'ID must be a number')
    }),

    // Pagination query validation
    pagination: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default('1'),
        pageSize: z.string().regex(/^\d+$/).transform(Number).default('20')
    }),

    // Search query validation
    search: z.object({
        search: z.string().optional().default('')
    })
}
