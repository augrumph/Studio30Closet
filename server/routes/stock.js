import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'
import { cacheMiddleware } from '../cache.js'

const router = express.Router()

// Função de normalização de cores
function normalizeColor(color) {
    if (!color || color === 'Sem cor') return 'Sem cor'

    const normalized = color.toLowerCase().trim()

    // Mapeamento de variações comuns
    const colorMap = {
        'preto': 'Preto',
        'preta': 'Preto',
        'branco': 'Branco',
        'branca': 'Branco',
        'vermelho': 'Vermelho',
        'vermelha': 'Vermelho',
        'azul': 'Azul',
        'azul marinho': 'Azul marinho',
        'verde': 'Verde',
        'amarelo': 'Amarelo',
        'amarela': 'Amarelo',
        'rosa': 'Rosa',
        'roxo': 'Roxo',
        'roxa': 'Roxo',
        'laranja': 'Laranja',
        'marrom': 'Marrom',
        'bege': 'Bege',
        'cinza': 'Cinza',
        'mostarda': 'Mostarda',
        'nude': 'Nude',
        'caramelo': 'Caramelo',
        'off white': 'Off White',
        'vinho': 'Vinho'
    }

    return colorMap[normalized] || color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()
}

// Função de normalização de tamanhos
function normalizeSize(size) {
    if (!size) return 'Único'

    const normalized = size.toString().toUpperCase().trim()

    // Mapeamento de variações comuns
    const sizeMap = {
        'U': 'Único',
        'UN': 'Único',
        'UNICO': 'Único',
        'ÚNICO': 'Único',
        'PP': 'PP',
        'P': 'P',
        'M': 'M',
        'G': 'G',
        'GG': 'GG',
        'XG': 'XG',
        'EXG': 'EXG'
    }

    return sizeMap[normalized] || size
}

// GET /api/stock/kpis - Stock KPIs (Basic)
router.get('/kpis', cacheMiddleware(300), async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, stock, price, cost_price FROM products WHERE active = true')

        let totalValue = 0, totalCost = 0, totalItems = 0, lowStockCount = 0

        rows.forEach(p => {
            const stock = p.stock || 0
            totalItems += stock
            totalValue += (Number(p.price) || 0) * stock
            totalCost += (Number(p.cost_price) || 0) * stock
            if (stock <= 2) lowStockCount++
        })

        res.json({
            totalValue,
            totalCost,
            totalItems,
            productsCount: rows.length,
            lowStockCount,
            averageMarkup: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
        })
    } catch (error) {
        console.error("❌ Erro em Stock KPIs:", error)
        res.status(500).json({ message: 'Erro ao buscar KPIs' })
    }
})

// GET /api/stock/low - Low Stock Alerts
router.get('/low', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10
        const { rows } = await pool.query(`
            SELECT id, name, stock, images, price, cost_price
            FROM products
            WHERE active = true AND stock <= 2
            ORDER BY stock ASC
            LIMIT $1
        `, [limit])

        res.json(rows.map(toCamelCase))
    } catch (error) {
        console.error("❌ Erro ao buscar Low Stock:", error)
        res.status(500).json({ error: error.message })
    }
})

// GET /api/stock/dead - Dead Stock Summary
router.get('/dead', async (req, res) => {
    try {
        // Logica simplificada: Produtos ativos com estoque > 0 criados há mais de 60 dias
        // Idealmente usaria last_sale_at, mas vamos usar created_at como proxy inicial
        const { rows } = await pool.query(`
            SELECT id, name, stock, price, cost_price, created_at, images
            FROM products
            WHERE active = true
            AND stock > 0
            AND created_at < NOW() - INTERVAL '60 days'
            ORDER BY created_at ASC
        `)

        const deadStock = rows.map(p => {
            const daysInStock = Math.floor((new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24))
            return toCamelCase({ ...p, daysInStock })
        })

        const totalCost = deadStock.reduce((sum, p) => sum + (Number(p.costPrice) || 0) * p.stock, 0)

        res.json({
            products: deadStock,
            totalCost,
            count: deadStock.length
        })
    } catch (error) {
        console.error("❌ Erro ao buscar Dead Stock:", error)
        res.status(500).json({ error: error.message })
    }
})

// GET /api/stock/ranking - Ranking de Vendas por Categoria, Cor, Tamanho, Produto, Lucro
router.get('/ranking', async (req, res) => {
    try {
        const { startDate, endDate, period = 'all' } = req.query

        console.log(`📊 Stock Ranking API: period=${period}, startDate=${startDate}, endDate=${endDate}`)

        // Calcular datas do período
        let computedStartDate = startDate
        let computedEndDate = endDate

        if (period === 'last7days') {
            const today = new Date()
            computedStartDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
            computedEndDate = today.toISOString()
        } else if (period === 'last30days') {
            const today = new Date()
            computedStartDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
            computedEndDate = today.toISOString()
        } else if (period === 'currentMonth') {
            const today = new Date()
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
            computedStartDate = firstDay.toISOString()
            computedEndDate = today.toISOString()
        }

        // Montar query de vendas
        let whereConditions = ["v.payment_status != 'cancelled'"]
        const params = []
        let paramIndex = 1

        if (computedStartDate) {
            whereConditions.push(`v.created_at >= $${paramIndex++}`)
            params.push(computedStartDate)
        }

        if (computedEndDate) {
            whereConditions.push(`v.created_at <= $${paramIndex++}`)
            params.push(computedEndDate)
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ')

        // Buscar vendas com items
        const { rows: vendas } = await pool.query(`
            SELECT id, items, created_at
            FROM vendas v
            ${whereClause}
            ORDER BY v.created_at DESC
        `, params)

        console.log(`📦 Processando ${vendas.length} vendas para rankings...`)

        // Buscar todos os produtos para enriquecer os dados
        const { rows: products } = await pool.query('SELECT id, name, category, cost_price FROM products')
        // Converter IDs para string para garantir compatibilidade
        const productMap = new Map(products.map(p => [String(p.id), p]))

        // Agregadores
        const categoryStats = new Map()
        const colorStats = new Map()
        const sizeStats = new Map()
        const productStats = new Map()

        // Processar items de todas as vendas
        vendas.forEach(venda => {
            let items = venda.items

            // Parse items se necessário
            if (typeof items === 'string') {
                try {
                    items = JSON.parse(items)
                } catch (e) {
                    items = []
                }
            }

            if (!Array.isArray(items)) items = []

            items.forEach(item => {
                const productId = String(item.productId || item.product_id || item.id)
                const quantity = Number(item.quantity) || 1
                const price = Number(item.price) || 0

                // Normalizar cor e tamanho
                const rawColor = item.selectedColor || item.color || 'Sem cor'
                const rawSize = item.selectedSize || item.size || 'Único'
                const color = normalizeColor(rawColor)
                const size = normalizeSize(rawSize)

                const revenue = price * quantity
                const product = productMap.get(productId)
                const category = product?.category || 'Sem categoria'
                const costPrice = Number(product?.cost_price) || 0
                const profit = revenue - (costPrice * quantity)

                // Categoria
                if (!categoryStats.has(category)) {
                    categoryStats.set(category, { category, quantity: 0, revenue: 0, profit: 0 })
                }
                const catStat = categoryStats.get(category)
                catStat.quantity += quantity
                catStat.revenue += revenue
                catStat.profit += profit

                // Cor
                if (!colorStats.has(color)) {
                    colorStats.set(color, { color, quantity: 0, revenue: 0 })
                }
                const colorStat = colorStats.get(color)
                colorStat.quantity += quantity
                colorStat.revenue += revenue

                // Tamanho
                if (!sizeStats.has(size)) {
                    sizeStats.set(size, { size, quantity: 0, revenue: 0 })
                }
                const sizeStat = sizeStats.get(size)
                sizeStat.quantity += quantity
                sizeStat.revenue += revenue

                // Produto
                const productName = item.name || product?.name || 'Produto desconhecido'
                if (!productStats.has(productId)) {
                    productStats.set(productId, {
                        productId,
                        name: productName,
                        quantity: 0,
                        revenue: 0,
                        profit: 0
                    })
                }
                const prodStat = productStats.get(productId)
                prodStat.quantity += quantity
                prodStat.revenue += revenue
                prodStat.profit += profit
            })
        })

        // Converter Maps para Arrays e ordenar
        const byCategory = Array.from(categoryStats.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10)

        const byColor = Array.from(colorStats.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10)

        const bySize = Array.from(sizeStats.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10)

        const byProduct = Array.from(productStats.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10)

        const byProfit = Array.from(productStats.values())
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10)

        console.log(`✅ Rankings calculados: ${byCategory.length} categorias, ${byColor.length} cores, ${bySize.length} tamanhos, ${byProduct.length} produtos`)

        res.json({
            byCategory,
            byColor,
            bySize,
            byProduct,
            byProfit
        })
    } catch (error) {
        console.error("❌ Erro ao buscar Ranking:", error)
        res.status(500).json({ error: error.message })
    }
})

// GET /api/stock/advanced - Advanced Analytics (GMROI, ABC, etc)
router.get('/advanced', cacheMiddleware(600), async (req, res) => {
    try {
        console.log('🔄 Calculando Advanced Stock Metrics...')

        // 1. Fetch Products
        const { rows: products } = await pool.query(`
            SELECT id, name, stock, price, cost_price, created_at, category, images, brand
            FROM products
            WHERE active = true
        `)

        // 2. Fetch Sales (Last 30 days)
        const { rows: sales } = await pool.query(`
            SELECT items, total_value, created_at 
            FROM vendas 
            WHERE created_at >= NOW() - INTERVAL '30 days' 
            AND payment_status != 'cancelled'
        `)

        // 3. Process Stats
        const productStats = new Map()

        sales.forEach(sale => {
            let items = sale.items
            if (typeof items === 'string') {
                try { items = JSON.parse(items) } catch { items = [] }
            }
            if (!Array.isArray(items)) items = []

            items.forEach(item => {
                const pid = String(item.productId || item.product_id || item.id)
                const qty = Number(item.quantity) || 1
                const price = Number(item.price) || 0
                // Cost might not be in item, use 0 and fix later
                const cost = Number(item.costPrice) || 0

                if (!productStats.has(pid)) {
                    productStats.set(pid, { soldQty: 0, revenue: 0, cogs: 0 })
                }
                const stat = productStats.get(pid)
                stat.soldQty += qty
                stat.revenue += price * qty
                stat.cogs += cost * qty
            })
        })

        // 4. Build Dataset
        let totalStockValue = 0
        let totalStockCost = 0
        let totalRevenue30d = 0
        let totalCOGS30d = 0
        let totalUnitsSold30d = 0
        let totalUnitsOnHand = 0

        const detailedProducts = products.map(p => {
            const pid = String(p.id)
            const stats = productStats.get(pid) || { soldQty: 0, revenue: 0, cogs: 0 }
            const cost = Number(p.cost_price) || 0
            const price = Number(p.price) || 0
            const stock = Number(p.stock) || 0

            // Fix COGS if missing from sale item
            if (stats.soldQty > 0 && stats.cogs === 0) {
                stats.cogs = stats.soldQty * cost
            }

            totalStockValue += stock * price
            totalStockCost += stock * cost
            totalRevenue30d += stats.revenue
            totalCOGS30d += stats.cogs
            totalUnitsSold30d += stats.soldQty
            totalUnitsOnHand += stock

            // Metrics
            const totalInventoryExposure = stats.soldQty + stock
            const sellThrough = totalInventoryExposure > 0
                ? (stats.soldQty / totalInventoryExposure) * 100
                : 0

            const weeklySalesRate = stats.soldQty / 4
            const weeksOfSupply = weeklySalesRate > 0
                ? stock / weeklySalesRate
                : stock > 0 ? 999 : 0

            const grossMarginMonth = stats.revenue - stats.cogs
            const gmroi = (stock * cost) > 0
                ? (grossMarginMonth * 12) / (stock * cost)
                : 0

            return {
                ...p, // camelCase will be handled by frontend helper or simple map here if needed? 
                // Express sends raw snake_case usually unless mapped.
                // Let's keep snake_case in backend response and map in frontend client?
                // OR map here. Let's map in Frontend `apiClient` response usually, 
                // but these are specific calculations.
                stats: {
                    soldQty30d: stats.soldQty,
                    revenue30d: stats.revenue,
                    cogs30d: stats.cogs,
                    sellThrough,
                    weeksOfSupply,
                    gmroi
                }
            }
        })

        // 5. ABC Analysis
        const sortedByRevenue = [...detailedProducts].sort((a, b) => b.stats.revenue30d - a.stats.revenue30d)
        let accumulatedRevenue = 0

        const productsWithABC = sortedByRevenue.map(p => {
            accumulatedRevenue += p.stats.revenue30d
            const accumulatedPercent = totalRevenue30d > 0 ? (accumulatedRevenue / totalRevenue30d) * 100 : 100

            let abcClass = 'C'
            if (accumulatedPercent <= 80) abcClass = 'A'
            else if (accumulatedPercent <= 95) abcClass = 'B'
            if (p.stats.revenue30d === 0) abcClass = 'C'

            return { ...p, abcClass }
        })

        // 6. Global KPIs
        const globalGrossMargin = totalRevenue30d - totalCOGS30d
        const globalGMROI = totalStockCost > 0 ? (globalGrossMargin * 12) / totalStockCost : 0
        const globalSellThrough = (totalUnitsSold30d + totalUnitsOnHand) > 0
            ? (totalUnitsSold30d / (totalUnitsSold30d + totalUnitsOnHand)) * 100
            : 0

        // 7. Health Score
        let score = 80
        const deadItems = productsWithABC.filter(p => p.stats.soldQty30d === 0 && p.stock > 0).length
        const stockoutsA = productsWithABC.filter(p => p.abcClass === 'A' && p.stock === 0).length

        score -= (deadItems * 0.5)
        score -= (stockoutsA * 5)
        if (globalGMROI > 2) score += 10
        if (globalSellThrough > 40) score += 10
        score = Math.max(0, Math.min(100, score))

        // 8. Action Lists
        const reorderList = productsWithABC
            .filter(p => p.abcClass === 'A' && p.stats.weeksOfSupply < 2)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 10)

        const liquidateList = productsWithABC
            .filter(p => p.stats.sellThrough < 5 && p.stock > 0) // Simplified condition
            .sort((a, b) => b.stock - a.stock)
            .slice(0, 10)

        const topPerformers = productsWithABC
            .filter(p => p.stats.sellThrough > 50 && p.stock > 0)
            .slice(0, 5)

        res.json({
            kpis: {
                gmroi: globalGMROI,
                sellThrough: globalSellThrough,
                healthScore: score,
                totalStockCost,
                totalStockValue,
                totalUnitsOnHand,
                classA_Count: productsWithABC.filter(p => p.abcClass === 'A').length,
                stockouts_A: stockoutsA
            },
            actions: {
                reorder: reorderList,
                liquidate: liquidateList,
                top: topPerformers
            },
            inventory: productsWithABC
        })

    } catch (error) {
        console.error("❌ Erro em Analytics:", error)
        res.status(500).json({ error: error.message })
    }
})

export default router
