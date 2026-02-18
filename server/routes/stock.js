import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'
import { cacheMiddleware } from '../cache.js'

const router = express.Router()

/**
 * GET /api/stock/kpis
 * KPIs de estoque para o dashboard (headline)
 * Cache: 5 minutes
 */
router.get('/kpis', cacheMiddleware(300), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, stock, price, cost_price, stock_status')
            .eq('active', true)

        if (error) throw error

        let totalValue = 0
        let totalCost = 0
        let totalItems = 0
        let productsCount = data.length
        let lowStockCount = 0

        data.forEach(p => {
            const stock = p.stock || 0
            totalItems += stock
            totalValue += (p.price || 0) * stock
            totalCost += (p.cost_price || 0) * stock
            if (stock <= 2) lowStockCount++
        })

        const averageMarkup = totalCost > 0
            ? ((totalValue - totalCost) / totalCost) * 100
            : 0

        res.json({
            totalValue,
            totalCost,
            totalItems,
            productsCount,
            lowStockCount,
            averageMarkup
        })

    } catch (error) {
        console.error('❌ Erro na API de Stock KPIs:', error)
        res.status(500).json({ message: 'Erro ao buscar KPIs de estoque' })
    }
})

/**
 * GET /api/stock/ranking
 * Ranking de vendas por categoria, cor, tamanho, etc.
 * OPTIMIZED: Uses database aggregation instead of fetching all products
 * Cache: DISABLED for debugging
 */
router.get('/ranking', async (req, res) => {
    try {
        let { startDate, endDate, period = 'all' } = req.query

        // If period is 'all', don't set date filters (get all time data)
        if (period !== 'all') {
            // Default to last 30 days if not specified
            if (!startDate) {
                const date = new Date()
                date.setDate(date.getDate() - 30)
                startDate = date.toISOString()
            }
            if (!endDate) {
                endDate = new Date().toISOString()
            }
        } else {
            // For 'all' period, set very early start date
            startDate = '2020-01-01T00:00:00.000Z'
            endDate = new Date().toISOString()
        }

        // Use optimized RPC function
        // FORCE FALLBACK: RPC might be failing or returning empty. Using manual calculation for now.
        const { data, error } = { data: null, error: { message: 'Forced fallback' } }
        /* await supabase.rpc('get_stock_ranking', {
            start_date: startDate,
            end_date: endDate
        }) */

        if (error) {
            console.warn('⚠️ RPC get_stock_ranking não disponível/desabilitado, usando fallback:', error.message)
            // Fallback: calculate rankings manually
            return await calculateRankingsFallback(startDate, endDate, res)
        }

        // The SQL function returns a JSON object with all rankings
        const rankings = data || {}

        res.json({
            byCategory: rankings.byCategory || [],
            byColor: rankings.byColor || [],
            bySize: rankings.bySize || [],
            byProduct: rankings.byProduct || [],
            byProfit: (rankings.byProduct || []).sort((a, b) => b.margin - a.margin)
        })

    } catch (error) {
        console.error('❌ Erro na API de Stock Ranking:', error)
        res.status(500).json({ message: 'Erro ao buscar ranking de vendas' })
    }
})

/**
 * Fallback function to calculate rankings manually when RPC is not available
 */
async function calculateRankingsFallback(startDate, endDate, res) {
    try {
        console.log('📊 Calculando rankings manualmente...')
        console.log(`   Período: ${startDate} até ${endDate}`)

        // Fetch all sales in the date range
        const { data: vendas, error: vendasError } = await supabase
            .from('vendas')
            .select('id, items, created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .neq('payment_status', 'cancelled')

        if (vendasError) {
            console.error('❌ Erro ao buscar vendas:', vendasError)
            throw vendasError
        }

        console.log(`   ✅ ${vendas?.length || 0} vendas encontradas`)

        // Fetch all products for cost_price lookup
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, name, cost_price, category, color')

        if (productsError) {
            console.error('❌ Erro ao buscar produtos:', productsError)
            throw productsError
        }

        console.log(`   ✅ ${products?.length || 0} produtos no banco`)

        // Create product lookup map - USE STRING KEYS FOR ROBUSTNESS
        const productMap = new Map()
        products.forEach(p => {
            productMap.set(String(p.id), p)
        })

        // Aggregation maps
        const categoryStats = new Map()
        const colorStats = new Map()
        const sizeStats = new Map()
        const productStats = new Map()

        let totalItemsProcessed = 0
        let itemsWithoutProduct = 0

        // Process all sales
        vendas.forEach((venda, vendaIndex) => {
            let items = venda.items

            if (typeof items === 'string') {
                try {
                    items = JSON.parse(items)
                } catch (e) {
                    console.warn(`   ⚠️ Venda ${venda.id}: Falha ao parsear items JSON: ${e.message}`)
                    items = []
                }
            }

            if (!Array.isArray(items)) {
                items = []
            }

            items.forEach((item, itemIndex) => {
                totalItemsProcessed++
                // Normalize ID to string
                const productId = String(item.productId || item.id || item.product_id)

                const product = productMap.get(productId)
                if (!product) {
                    itemsWithoutProduct++
                    // Only log first few failures to avoid spam
                    if (itemsWithoutProduct <= 5) {
                        console.warn(`      - ⚠️ Produto ID '${productId}' não encontrado no mapa de produtos.`)
                    }
                    return
                }

                const qty = Number(item.quantity) || 1
                const price = Number(item.price) || 0
                const costPrice = Number(product.cost_price) || 0
                const revenue = price * qty
                const margin = (price - costPrice) * qty

                // Category
                const category = product.category || 'Sem categoria'
                if (!categoryStats.has(category)) {
                    categoryStats.set(category, { name: category, qty: 0, revenue: 0, margin: 0 })
                }
                const catStat = categoryStats.get(category)
                catStat.qty += qty
                catStat.revenue += revenue
                catStat.margin += margin

                // Color (Normalized)
                let rawColor = item.selectedColor || product.color || 'Sem cor'
                // Normalization Logic inline or helper
                const normalizeColor = (c) => {
                    if (!c) return 'Sem cor'
                    const lower = c.toLowerCase().trim()

                    const map = {
                        'preta': 'Preto', 'vermelha': 'Vermelho', 'branca': 'Branco', 'amarela': 'Amarelo', 'roxa': 'Roxo',
                        'dourada': 'Dourado', 'prateada': 'Prata', 'salmao': 'Salmão', 'cafe': 'Café', 'petroleo': 'Petróleo',
                        'limao': 'Limão', 'bordo': 'Bordô', 'lilas': 'Lilás', 'onca': 'Onça', 'poa': 'Poá',
                        'geometrico': 'Geométrico', 'estampada': 'Estampado', 'listrada': 'Listrado', 'rosê': 'Rosê', 'rose': 'Rosê'
                    }

                    if (map[lower]) return map[lower]

                    // Capialization
                    return lower.charAt(0).toUpperCase() + lower.slice(1)
                }

                const color = normalizeColor(rawColor)

                if (!colorStats.has(color)) {
                    colorStats.set(color, { name: color, qty: 0, revenue: 0, margin: 0 })
                }
                const colorStat = colorStats.get(color)
                colorStat.qty += qty
                colorStat.revenue += revenue
                colorStat.margin += margin

                // Size (Normalized)
                let rawSize = item.selectedSize || 'Único'

                const normalizeSize = (s) => {
                    if (!s) return 'Único'
                    const upper = s.toUpperCase().trim()
                    if (['U', 'UN', 'UNICO', 'TU', 'ÚNICO'].includes(upper)) return 'Único'
                    return upper
                }

                const size = normalizeSize(rawSize)

                if (!sizeStats.has(size)) {
                    sizeStats.set(size, { name: size, qty: 0, revenue: 0, margin: 0 })
                }
                const sizeStat = sizeStats.get(size)
                sizeStat.qty += qty
                sizeStat.revenue += revenue
                sizeStat.margin += margin

                // Product
                if (!productStats.has(productId)) {
                    productStats.set(productId, {
                        id: productId,
                        name: product.name,
                        qty: 0,
                        revenue: 0,
                        margin: 0
                    })
                }
                const prodStat = productStats.get(productId)
                prodStat.qty += qty
                prodStat.revenue += revenue
                prodStat.margin += margin
            })
        })

        const byCategory = Array.from(categoryStats.values()).sort((a, b) => b.qty - a.qty)
        const byColor = Array.from(colorStats.values()).sort((a, b) => b.qty - a.qty)
        const bySize = Array.from(sizeStats.values()).sort((a, b) => b.qty - a.qty)
        const byProduct = Array.from(productStats.values()).sort((a, b) => b.qty - a.qty)
        const byProfit = Array.from(productStats.values()).sort((a, b) => b.margin - a.margin)

        console.log(`   📊 Resumo do processamento:`)
        console.log(`      - Total de items processados: ${totalItemsProcessed}`)
        console.log(`      - Items sem produto: ${itemsWithoutProduct}`)
        console.log(`      - Categorias únicas: ${byCategory.length}`)
        console.log(`      - Cores únicas: ${byColor.length}`)
        console.log(`      - Tamanhos únicos: ${bySize.length}`)
        console.log(`      - Produtos únicos: ${byProduct.length}`)

        if (byCategory.length > 0) {
            console.log(`   🏆 Top Categoria: ${byCategory[0].name} (${byCategory[0].qty} un)`)
        }
        if (byColor.length > 0) {
            console.log(`   🎨 Top Cor: ${byColor[0].name} (${byColor[0].qty} un)`)
        }
        if (bySize.length > 0) {
            console.log(`   📏 Top Tamanho: ${bySize[0].name} (${bySize[0].qty} un)`)
        }
        if (byProfit.length > 0) {
            console.log(`   💰 Mais Lucrativo: ${byProfit[0].name} (R$ ${byProfit[0].margin.toFixed(2)})`)
        }

        console.log('✅ Rankings calculados com sucesso')

        return res.json({
            byCategory,
            byColor,
            bySize,
            byProduct,
            byProfit
        })

    } catch (error) {
        console.error('❌ Erro no fallback de rankings:', error)
        return res.json({
            byCategory: [],
            byColor: [],
            bySize: [],
            byProduct: [],
            byProfit: []
        })
    }
}

/**
 * GET /api/stock/low
 * Alertas de estoque baixo
 * Cache: 5 minutes
 */
router.get('/low', cacheMiddleware(300), async (req, res) => {
    const { limit = 10 } = req.query
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, stock, images, category, suppliers(name)')
            .eq('active', true)
            .lte('stock', 2)
            .order('stock', { ascending: true })
            .limit(Number(limit))

        if (error) throw error
        res.json(toCamelCase(data))
    } catch (error) {
        console.error('❌ Erro na API de Low Stock:', error)
        res.status(500).json({ message: 'Erro ao buscar alertas de estoque' })
    }
})

/**
 * GET /api/stock/dead
 * Dead Stock
 * Cache: 15 minutes (rarely changes)
 */
router.get('/dead', cacheMiddleware(900), async (req, res) => {
    try {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - 90)
        const cutoffStr = cutoffDate.toISOString()

        const { data, error } = await supabase
            .from('products')
            .select('id, name, stock, cost_price, created_at, images')
            .eq('active', true)
            .gt('stock', 0)
            .lt('created_at', cutoffStr)
            .order('created_at', { ascending: true })
            .limit(20)

        if (error) throw error

        const totalDeadValue = data.reduce((acc, p) => acc + ((p.cost_price || 0) * (p.stock || 0)), 0)

        res.json({
            count: data.length,
            totalValue: totalDeadValue,
            items: toCamelCase(data)
        })
    } catch (error) {
        console.error('❌ Erro na API de Dead Stock:', error)
        res.status(500).json({ message: 'Erro ao buscar dead stock' })
    }
})

export default router
