/**
 * Utilitários para gestão de estoque
 */

/**
 * Atualiza o estoque de um produto (reserva ou libera/devolve)
 * @param {Object} client - Cliente PostgreSQL conectado (dentro de transação)
 * @param {number} productId - ID do produto
 * @param {number} quantity - Quantidade a atualizar (positivo)
 * @param {string} color - Nome da cor
 * @param {string} size - Tamanho
 * @param {string} type - Tipo de operação: 'reserve' (saída/venda) ou 'restore' (entrada/devolução)
 */
export async function updateProductStock(client, productId, quantity, color, size, type = 'reserve') {
    const multiplier = type === 'reserve' ? -1 : 1
    const qtyChange = quantity * multiplier

    console.log(`📦 Stock Update [${type.toUpperCase()}]: Product ${productId}, Qty: ${qtyChange}, Color: ${color}, Size: ${size}`)

    // 1. Fetch Product with Row Lock (FOR UPDATE) to prevent race conditions
    const { rows: products } = await client.query(
        'SELECT id, variants, stock, name, color FROM products WHERE id = $1 FOR UPDATE',
        [productId]
    )

    if (products.length === 0) {
        throw new Error(`Product ${productId} not found`)
    }

    const product = products[0]

    // 2. Find Variant
    let variants = product.variants || []
    if (!variants.length) throw new Error(`Product ${productId} has no variants`)

    // Helper for robust string matching
    const normalize = s => String(s || '').trim().toLowerCase()
    const colorNorm = normalize(color)
    const sizeNorm = normalize(size)

    // Find Color Variant
    let variantIndex = variants.findIndex(v => normalize(v.colorName) === colorNorm)

    // Fallback 1: If there's only one variant total, assume it's the intended one
    if (variantIndex === -1 && variants.length === 1) {
        variantIndex = 0;
        console.warn(`[STOCK WARNING] Strict color match failed for "${color}" on Product ${product.id} ("${product.name}"). Defaulting to its only variant: "${variants[0].colorName}".`)
    }

    // Fallback 2: Try to match by the product's default color field
    if (variantIndex === -1) {
        variantIndex = variants.findIndex(v => normalize(v.colorName) === normalize(product.color))
        if (variantIndex !== -1) {
            console.warn(`[STOCK WARNING] Strict color match failed for "${color}" on Product ${product.id} ("${product.name}"). Matched using default product color: "${product.color}".`)
        }
    }

    if (variantIndex === -1) {
        throw new Error(`Color "${color}" not found in product ${product.id} ("${product.name}")`)
    }
    const variant = variants[variantIndex]

    // Find Size in Variant
    let sizeIndex = variant.sizeStock?.findIndex(s => normalize(s.size) === sizeNorm)

    // Size Fallback logic: e.g., 'u' vs 'único'
    if (sizeIndex === -1 && (sizeNorm === 'u' || sizeNorm === 'unico' || sizeNorm === 'único')) {
        sizeIndex = variant.sizeStock?.findIndex(s => {
            const sn = normalize(s.size)
            return sn === 'u' || sn === 'unico' || sn === 'único'
        })
    }

    // Fallback 1: If the matched color variant only has one size, assume it's the intended one
    if (sizeIndex === -1 && variant.sizeStock?.length === 1) {
        sizeIndex = 0;
        console.warn(`[STOCK WARNING] Strict size match failed for "${size}" on Product ${product.id} ("${product.name}", color: "${variant.colorName}"). Defaulting to its only size: "${variant.sizeStock[0].size}".`)
    }

    if (sizeIndex === undefined || sizeIndex === -1) {
        throw new Error(`Size "${size}" not found in color "${variant.colorName}" for product ${product.id} ("${product.name}")`)
    }

    // 3. Check / Update Stock
    const currentQty = variant.sizeStock[sizeIndex].quantity || 0

    if (type === 'reserve' && currentQty < quantity) {
        throw new Error(`Insufficient stock for ${product.name} (${variant.colorName}/${variant.sizeStock[sizeIndex].size}). Requested: ${quantity}, Available: ${currentQty}`)
    }

    // Update Quantity
    variant.sizeStock[sizeIndex].quantity = currentQty + qtyChange

    // Recalculate Total Stock (Sum of all sizes in all variants)
    const newTotalStock = variants.reduce((acc, v) =>
        acc + (v.sizeStock || []).reduce((sum, s) => sum + (s.quantity || 0), 0), 0
    )

    // 4. Save to DB
    await client.query(
        'UPDATE products SET variants = $1, stock = $2, updated_at = NOW() WHERE id = $3',
        [JSON.stringify(variants), newTotalStock, productId]
    )

    // 5. Log Movement
    await client.query(
        `INSERT INTO stock_movements (product_id, quantity, movement_type, notes, from_status, to_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            productId,
            quantity,
            type === 'reserve' ? 'venda' : 'entrada',
            `Stock Update (${type}): ${color}/${size}`,
            'active',
            'active'
        ]
    )

    return true
}
