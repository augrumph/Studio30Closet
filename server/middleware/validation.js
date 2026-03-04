/**
 * VALIDATION MIDDLEWARE - Camada de validação robusta
 * Garante que apenas dados válidos entrem no sistema
 */

/**
 * Validador genérico de schemas
 */
export function validateSchema(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Retorna todos os erros, não apenas o primeiro
            stripUnknown: true // Remove campos não definidos no schema
        })

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))

            console.error('❌ Validação falhou:', errors)

            return res.status(400).json({
                error: 'Dados inválidos',
                details: errors
            })
        }

        // Substitui req.body com valor validado e sanitizado
        req.body = value
        next()
    }
}

/**
 * Validadores específicos para rotas críticas
 */

// Validação de Order/Malinha
export function validateOrder(req, res, next) {
    const { customerId, items, totalValue, status } = req.body

    const errors = []

    // Customer ID obrigatório
    if (!customerId) {
        errors.push({ field: 'customerId', message: 'Cliente é obrigatório' })
    } else if (typeof customerId !== 'number' || customerId <= 0) {
        errors.push({ field: 'customerId', message: 'ID do cliente inválido' })
    }

    // Items obrigatório e não vazio
    if (!items || !Array.isArray(items)) {
        errors.push({ field: 'items', message: 'Lista de itens é obrigatória' })
    } else if (items.length === 0) {
        errors.push({ field: 'items', message: 'Malinha deve ter pelo menos 1 item' })
    } else {
        // Validar cada item
        items.forEach((item, index) => {
            if (!item.productId) {
                errors.push({ field: `items[${index}].productId`, message: 'ID do produto é obrigatório' })
            }
            if (!item.quantity || item.quantity <= 0) {
                errors.push({ field: `items[${index}].quantity`, message: 'Quantidade deve ser maior que 0' })
            }
        })
    }

    // Total value deve ser >= 0
    if (totalValue !== undefined && (typeof totalValue !== 'number' || totalValue < 0)) {
        errors.push({ field: 'totalValue', message: 'Valor total deve ser um número >= 0' })
    }

    // Status deve ser válido
    const validStatuses = ['pending', 'shipped', 'delivered', 'pickup_scheduled', 'returned', 'completed', 'cancelled']
    if (status && !validStatuses.includes(status)) {
        errors.push({ field: 'status', message: `Status deve ser um de: ${validStatuses.join(', ')}` })
    }

    if (errors.length > 0) {
        console.error('❌ Validação de Order falhou:', errors)
        return res.status(400).json({
            error: 'Dados da malinha inválidos',
            details: errors
        })
    }

    next()
}

// Validação de Venda
export function validateVenda(req, res, next) {
    const { customerId, items, totalValue, paymentMethod, paymentStatus } = req.body

    const errors = []

    // Customer ID obrigatório
    if (!customerId) {
        errors.push({ field: 'customerId', message: 'Cliente é obrigatório' })
    }

    // Items obrigatório
    if (!items || !Array.isArray(items) || items.length === 0) {
        errors.push({ field: 'items', message: 'Venda deve ter pelo menos 1 item' })
    }

    // Total value obrigatório e > 0
    if (!totalValue || typeof totalValue !== 'number' || totalValue <= 0) {
        errors.push({ field: 'totalValue', message: 'Valor total deve ser maior que 0' })
    }

    // Payment method válido
    const validMethods = ['pix', 'debit', 'card_machine', 'credito_parcelado', 'fiado', 'fiado_parcelado', 'cash', 'card']
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
        errors.push({ field: 'paymentMethod', message: `Método de pagamento deve ser um de: ${validMethods.join(', ')}` })
    }

    // Payment status válido
    const validStatuses = ['pending', 'paid', 'cancelled', 'refunded']
    if (paymentStatus && !validStatuses.includes(paymentStatus)) {
        errors.push({ field: 'paymentStatus', message: `Status de pagamento deve ser um de: ${validStatuses.join(', ')}` })
    }

    if (errors.length > 0) {
        console.error('❌ Validação de Venda falhou:', errors)
        return res.status(400).json({
            error: 'Dados da venda inválidos',
            details: errors
        })
    }

    next()
}

// Validação de Product
export function validateProduct(req, res, next) {
    const { name, price, stock } = req.body

    const errors = []

    // Nome obrigatório
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        errors.push({ field: 'name', message: 'Nome do produto deve ter pelo menos 2 caracteres' })
    }

    // Price >= 0
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
        errors.push({ field: 'price', message: 'Preço deve ser um número >= 0' })
    }

    // Stock >= 0
    if (stock !== undefined && (typeof stock !== 'number' || stock < 0)) {
        errors.push({ field: 'stock', message: 'Estoque deve ser um número >= 0' })
    }

    if (errors.length > 0) {
        console.error('❌ Validação de Product falhou:', errors)
        return res.status(400).json({
            error: 'Dados do produto inválidos',
            details: errors
        })
    }

    next()
}

// Validação de Customer
export function validateCustomer(req, res, next) {
    const { name, phone } = req.body

    const errors = []

    // Nome obrigatório
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        errors.push({ field: 'name', message: 'Nome deve ter pelo menos 2 caracteres' })
    }

    // Phone opcional mas se fornecido deve ser válido
    if (phone && typeof phone !== 'string') {
        errors.push({ field: 'phone', message: 'Telefone deve ser uma string' })
    }

    if (errors.length > 0) {
        console.error('❌ Validação de Customer falhou:', errors)
        return res.status(400).json({
            error: 'Dados do cliente inválidos',
            details: errors
        })
    }

    next()
}

// Validação de Pagamento de Parcela
export function validateInstallmentPayment(req, res, next) {
    const { amount, date, method } = req.body
    const { installmentId } = req.params

    const errors = []

    // InstallmentId obrigatório e válido
    const numId = parseInt(installmentId)
    if (!installmentId || isNaN(numId) || numId <= 0) {
        errors.push({ field: 'installmentId', message: 'ID da parcela deve ser um número inteiro positivo' })
    }

    // Amount obrigatório e > 0
    if (!amount) {
        errors.push({ field: 'amount', message: 'Valor do pagamento é obrigatório' })
    } else if (typeof amount !== 'number' || amount <= 0) {
        errors.push({ field: 'amount', message: 'Valor do pagamento deve ser um número maior que 0' })
    } else if (amount > 1000000) {
        errors.push({ field: 'amount', message: 'Valor do pagamento excede o limite máximo permitido' })
    }

    // Date obrigatório e válido
    if (!date) {
        errors.push({ field: 'date', message: 'Data do pagamento é obrigatória' })
    } else {
        const parsedDate = new Date(date)
        if (isNaN(parsedDate.getTime())) {
            errors.push({ field: 'date', message: 'Data do pagamento inválida' })
        }
    }

    // Method opcional mas se fornecido deve ser válido
    const validMethods = ['dinheiro', 'pix', 'debito', 'credito', 'transferencia', 'cheque']
    if (method && !validMethods.includes(method)) {
        errors.push({ field: 'method', message: `Método de pagamento deve ser um de: ${validMethods.join(', ')}` })
    }

    if (errors.length > 0) {
        console.error('❌ Validação de Pagamento de Parcela falhou:', errors)
        return res.status(400).json({
            error: 'Dados do pagamento inválidos',
            details: errors
        })
    }

    next()
}

/**
 * Validação de IDs numéricos em params
 */
export function validateNumericId(paramName = 'id') {
    return (req, res, next) => {
        const id = req.params[paramName]
        const numId = parseInt(id)

        if (isNaN(numId) || numId <= 0) {
            console.error(`❌ ID inválido: ${paramName} = ${id}`)
            return res.status(400).json({
                error: 'ID inválido',
                message: `${paramName} deve ser um número inteiro positivo`
            })
        }

        // Substitui com versão numérica
        req.params[paramName] = numId
        next()
    }
}

/**
 * Sanitização de strings - Remove caracteres perigosos
 */
export function sanitizeStrings(req, res, next) {
    const sanitize = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                // Remove tags HTML, SQL injection attempts, etc
                obj[key] = obj[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/--/g, '')
                    .replace(/;/g, '')
                    .trim()
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key])
            }
        }
    }

    if (req.body) sanitize(req.body)
    if (req.query) sanitize(req.query)

    next()
}
