import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'
import { enrichImages } from '../lib/s3.js'
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Import S3 storage
import { uploadBase64Image, deleteImage } from '../storage.js'

// Helper para processar array de imagens (Base64 -> S3 URL)
async function processImages(images) {
    if (!images || !Array.isArray(images) || images.length === 0) return []

    const processedImages = await Promise.all(images.map(async (img) => {
        // Se for Base64, faz upload e retorna URL. Se for URL, retorna ela mesma.
        return await uploadBase64Image(img, 'products')
    }))

    // Filtrar nulos em caso de erro
    return processedImages.filter(img => img !== null)
}

// Helper para processar variants e converter imagens base64 para S3 URLs
async function processVariants(variants) {
    if (!variants || !Array.isArray(variants) || variants.length === 0) return []

    const processedVariants = await Promise.all(variants.map(async (variant) => {
        if (!variant) return variant

        // Se o variant tem imagens, processar elas
        if (variant.images && Array.isArray(variant.images)) {
            variant.images = await processImages(variant.images)
        }

        return variant
    }))

    return processedVariants
}

// Listagem de Produtos com Paginação e Busca (Público, mas revela custos se Admin)
router.get('/', optionalAuthenticateToken, async (req, res) => {
    const {
        page = 1,
        pageSize = req.query.limit || 20, // Suporte a limit ou pageSize
        search = req.query.searchTerm || '', // Suporte a search ou searchTerm
        category = 'all',
        active = 'all',
        featured,
        sizes,       // CSV string: 'P,M,G'
        collection,   // ID da coleção
        inStock      // 'true' para filtrar apenas items com stock > 0
    } = req.query

    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    console.log(`🔍 Products API: Página ${page} [Search: "${search}"]`)

    try {
        const isFull = req.query.full === 'true'

        // Construir WHERE clause dinamicamente
        let whereConditions = []
        let params = []
        let paramIndex = 1

        if (category !== 'all') {
            whereConditions.push(`category = $${paramIndex++}`)
            params.push(category)
        }

        if (active !== 'all') {
            whereConditions.push(`active = $${paramIndex++}`)
            params.push(active === 'true')
        }

        if (featured === 'true') {
            whereConditions.push(`is_featured = true`)
        }

        if (inStock === 'true') {
            whereConditions.push(`stock > 0`)
        }

        if (search) {
            const searchLower = search.toLowerCase().trim()
            if (!isNaN(searchLower) && searchLower !== '') {
                whereConditions.push(`(name ILIKE $${paramIndex} OR id = $${paramIndex + 1} OR category ILIKE $${paramIndex})`)
                params.push(`%${searchLower}%`, parseInt(searchLower))
                paramIndex += 2
            } else {
                // Busca com ILIKE — normalizar acentos no lado JS para maior compatibilidade
                // (evita dependência de unaccent extension no PostgreSQL)
                const normalized = searchLower
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
                whereConditions.push(`(
                    name ILIKE $${paramIndex}
                    OR category ILIKE $${paramIndex}
                    OR name ILIKE $${paramIndex + 1}
                    OR category ILIKE $${paramIndex + 1}
                )`)
                params.push(`%${searchLower}%`, `%${normalized}%`)
                paramIndex += 2
            }
        }

        // Filtro por tamanhos: produto precisa ter ao menos um dos tamanhos selecionados
        if (sizes) {
            const sizesArray = sizes.split(',').map(s => s.trim()).filter(Boolean)
            if (sizesArray.length > 0) {
                whereConditions.push(`sizes && $${paramIndex++}::text[]`)
                params.push(sizesArray)
            }
        }

        // Filtro por coleção: produto precisa pertencer à coleção
        if (collection) {
            whereConditions.push(`$${paramIndex++}::text = ANY(collection_ids)`)
            params.push(String(collection))
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

        // Determina se o usuário é admin para ver dados sensíveis (cost_price)
        const isAdmin = !!req.user; // Token verificado pelo middleware opcional (see below)

        // Lite columns: exclui variants e description (pesados) e cost_price (sensível)
        const selectColumns = (isFull && isAdmin)
            ? '*'
            : 'id, name, price, original_price, category, stock, active, collection_ids, created_at, supplier_id, images, is_featured, is_new, is_catalog_featured, is_best_seller'

        const { rows } = await pool.query(`
            SELECT COUNT(*) OVER() as total_count, ${selectColumns}
            FROM products
            ${whereClause}
            ORDER BY is_catalog_featured DESC NULLS LAST, name ASC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        // Otimização: No modo lite, retornar apenas a primeira imagem
        const items = isFull
            ? toCamelCase(rows)
            : toCamelCase(rows).map(item => ({
                ...item,
                images: item.images ? [item.images[0]] : []
            }))

        res.json({
            items: enrichImages(items),
            total,
            page: Number(page),
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        })

    } catch (err) {
        console.error('❌ Erro na API de Produtos:', err)
        res.status(500).json({ error: `Erro ao buscar produtos: ${err.message}` })
    }
})

// Sell-Through Rate (STR) - Capacidade de Venda
router.get('/metrics/sell-through', async (req, res) => {
    console.log('📊 Calculando Sell-Through Rate...')

    try {
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        // 1. FATURAMENTO ESTIMADO TOTAL (Valor de venda do estoque TOTAL)
        const { rows: products } = await pool.query(
            'SELECT price, stock, active FROM products'
        )

        const faturamentoEstimadoTotal = (products || [])
            .filter(p => p.active)
            .reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0)

        // 2. VENDAS DO MÊS (Faturamento Real)
        const { rows: vendas } = await pool.query(`
            SELECT total_value, payment_status
            FROM vendas
            WHERE created_at >= $1 AND created_at <= $2
        `, [firstDayOfMonth, lastDayOfMonth])

        const vendasMes = (vendas || [])
            .filter(v => ['paid', 'pending'].includes(v.payment_status?.toLowerCase()))
            .reduce((sum, v) => sum + (v.total_value || 0), 0)

        // 3. META DE VENDA = 30% do Faturamento Estimado Total
        const metaVenda = faturamentoEstimadoTotal * 0.30

        // 4. CAPACIDADE DE VENDA (% da Meta Atingida)
        const sellThroughRate = metaVenda > 0 ? (vendasMes / metaVenda) * 100 : 0

        // 5. ANÁLISE QUALITATIVA
        let status = 'excellent'
        let message = 'Meta atingida! Parabéns!'

        if (sellThroughRate < 50) {
            status = 'critical'
            message = 'Crítico! Muito abaixo da meta.'
        } else if (sellThroughRate < 80) {
            status = 'warning'
            message = 'Atenção! Abaixo da meta.'
        } else if (sellThroughRate < 100) {
            status = 'good'
            message = 'Bom! Quase lá!'
        } else if (sellThroughRate >= 120) {
            status = 'excellent'
            message = 'Excelente! Superou a meta! 🎉'
        }

        // 6. FALTA PARA META
        const faltaParaMeta = Math.max(0, metaVenda - vendasMes)

        res.json({
            sellThroughRate: Number(sellThroughRate.toFixed(1)),
            vendasMes,
            faturamentoEstimadoTotal,
            metaVenda,
            faltaParaMeta,
            status,
            message,
            periodo: {
                inicio: firstDayOfMonth,
                fim: lastDayOfMonth
            }
        })

    } catch (err) {
        console.error('❌ Erro ao calcular STR:', err)
        res.status(500).json({ error: 'Erro ao calcular Sell-Through Rate' })
    }
})

// Detalhes do Produto
router.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { rows } = await pool.query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        )

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' })
        }

        res.json(enrichImages(toCamelCase(rows[0])))
    } catch (err) {
        console.error(`❌ Erro ao buscar produto ${id}:`, err)
        res.status(500).json({ error: 'Erro ao buscar produto' })
    }
})

// Criar Produto (Admin)
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('📝 Creating new product...')
        const data = req.body

        // Validar campos obrigatórios
        if (!data.name || !data.price) {
            return res.status(400).json({ error: 'Name and Price are required' })
        }
        if (Number(data.price) <= 0) {
            return res.status(400).json({ error: 'Price must be greater than zero' })
        }
        if (data.cost_price !== undefined && Number(data.cost_price) < 0) {
            return res.status(400).json({ error: 'Cost price cannot be negative' })
        }

        // 🖼️ Processar Imagens (Upload S3)
        const imageUrls = await processImages(data.images)

        // 🎨 Processar Variants (incluindo suas imagens)
        const processedVariants = await processVariants(data.variants)

        // Inserir no banco
        const { rows } = await pool.query(`
            INSERT INTO products (
                name, price, cost_price, original_price, description,
                stock, category, active, is_featured, is_new,
                is_catalog_featured, is_best_seller, supplier_id,
                color, variants, sizes, images, collection_ids,
                updated_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13,
                $14, $15, $16, $17, $18,
                NOW()
            ) RETURNING *
        `, [
            data.name,
            data.price,
            data.cost_price || 0,
            data.original_price,
            data.description,
            data.stock || 0,
            data.category,
            data.active ?? true,
            data.is_featured ?? data.isFeatured ?? false,
            data.is_new ?? data.isNew ?? true,
            data.is_catalog_featured ?? data.isCatalogFeatured ?? false,
            data.is_best_seller ?? data.isBestSeller ?? false,
            data.supplier_id ?? data.supplierId,
            data.color,
            processedVariants ? JSON.stringify(processedVariants) : null,
            data.sizes ? JSON.stringify(data.sizes) : null,
            imageUrls,
            data.collection_ids,
        ])

        console.log(`✅ Product created with ID: ${rows[0].id}`)
        res.status(201).json(enrichImages(toCamelCase(rows[0])))

    } catch (err) {
        console.error('❌ Error creating product:', err)
        res.status(500).json({ error: err.message })
    }
})

// Atualizar Produto (Admin)
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    try {
        console.log(`📝 Updating product ${id}...`)
        const data = req.body

        // 🖼️ Processar Imagens (Upload S3)
        const imageUrls = data.images ? await processImages(data.images) : null

        // 🎨 Processar Variants (incluindo suas imagens)
        const processedVariants = data.variants ? await processVariants(data.variants) : null

        const params = [
            data.name,
            data.price,
            data.cost_price ?? data.costPrice,
            data.original_price ?? data.originalPrice,
            data.description,
            data.stock,
            data.category,
            data.active,
            data.is_featured ?? data.isFeatured,
            data.is_new ?? data.isNew,
            data.is_catalog_featured ?? data.isCatalogFeatured,
            data.is_best_seller ?? data.isBestSeller,
            data.supplier_id ?? data.supplierId,
            data.color,
            processedVariants && processedVariants.length > 0 ? JSON.stringify(processedVariants) : null,
            data.sizes && data.sizes.length > 0 ? JSON.stringify(data.sizes) : null,
            imageUrls && imageUrls.length > 0 ? imageUrls : null,
            data.collection_ids ?? data.collectionIds,
            id
        ]

        const { rows } = await pool.query(`
            UPDATE products SET
                name = COALESCE($1, name),
                price = COALESCE($2, price),
                cost_price = COALESCE($3, cost_price),
                original_price = COALESCE($4, original_price),
                description = COALESCE($5, description),
                stock = COALESCE($6, stock),
                category = COALESCE($7, category),
                active = COALESCE($8, active),
                is_featured = COALESCE($9, is_featured),
                is_new = COALESCE($10, is_new),
                is_catalog_featured = COALESCE($11, is_catalog_featured),
                is_best_seller = COALESCE($12, is_best_seller),
                supplier_id = COALESCE($13, supplier_id),
                color = COALESCE($14, color),
                variants = COALESCE($15, variants),
                sizes = COALESCE($16, sizes),
                images = COALESCE($17, images),
                collection_ids = COALESCE($18, collection_ids),
                updated_at = NOW()
            WHERE id = $19
            RETURNING *
        `, params)

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' })
        }

        console.log(`✅ Product ${id} updated`)
        res.json(enrichImages(toCamelCase(rows[0])))

    } catch (err) {
        console.error(`❌ Error updating product ${id}:`, err)
        res.status(500).json({ error: err.message })
    }
})

// Deletar Produto (Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    try {
        // Bloquear deleção se o produto estiver em malinhas ativas (order_items)
        const { rows: activeOrders } = await pool.query(`
            SELECT o.id FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = $1
            AND o.status NOT IN ('completed', 'cancelled')
            LIMIT 1
        `, [id])

        if (activeOrders.length > 0) {
            return res.status(409).json({
                error: 'Produto está em uso em uma ou mais malinhas ativas. Conclua ou cancele as malinhas antes de excluir o produto.'
            })
        }

        const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id])

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Product not found' })
        }

        console.log(`✅ Product ${id} deleted`)
        res.json({ success: true })
    } catch (err) {
        console.error(`❌ Error deleting product ${id}:`, err)
        res.status(500).json({ error: err.message })
    }
})

// Batch check stock for multiple products
router.post('/stock-check', async (req, res) => {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'IDs array is required' })
    }

    try {
        const { rows } = await pool.query(
            'SELECT id, stock, name, images, price, variants FROM products WHERE id = ANY($1)',
            [ids]
        )
        res.json(enrichImages(toCamelCase(rows)))
    } catch (err) {
        console.error('❌ Erro no stock-check:', err)
        res.status(500).json({ error: err.message })
    }
})

export default router
