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

// =====================================================================
// 🧠 STOCK INTELLIGENCE ENDPOINTS
// Enterprise-grade analytics inspired by Zara/Inditex methodology
// =====================================================================

// GET /api/stock/forecast - Velocity, Weeks of Supply, Stockout Prediction
router.get('/forecast', cacheMiddleware(300), async (req, res) => {
    try {
        console.log('🧠 Computing Stock Forecast...')

        // 1. Fetch all active products with supplier info
        const { rows: products } = await pool.query(`
            SELECT p.id, p.name, p.stock, p.price, p.cost_price, p.category, p.images,
                   p.created_at, p.supplier_id, p.brand,
                   s.name as supplier_name
            FROM products p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            WHERE p.active = true
        `)

        // 2. Fetch ALL sales from last 90 days for accurate velocity calculation
        const { rows: sales } = await pool.query(`
            SELECT id, items, created_at
            FROM vendas
            WHERE created_at >= NOW() - INTERVAL '90 days'
            AND payment_status != 'cancelled'
            ORDER BY created_at DESC
        `)

        // 3. Build per-product sales timeline (daily granularity)
        const productSales = new Map() // productId -> { total90d, total30d, total7d, dailySales: Map<dateStr, qty> }

        sales.forEach(sale => {
            let items = sale.items
            if (typeof items === 'string') { try { items = JSON.parse(items) } catch { items = [] } }
            if (!Array.isArray(items)) items = []

            const saleDate = new Date(sale.created_at).toISOString().split('T')[0]
            const daysAgo = Math.ceil((Date.now() - new Date(sale.created_at).getTime()) / (1000 * 60 * 60 * 24))

            items.forEach(item => {
                const pid = String(item.productId || item.product_id || item.id)
                const qty = Number(item.quantity) || 1

                if (!productSales.has(pid)) {
                    productSales.set(pid, { total90d: 0, total30d: 0, total7d: 0, lastSaleDate: null, dailySales: new Map(), revenue90d: 0 })
                }
                const ps = productSales.get(pid)
                ps.total90d += qty
                ps.revenue90d += (Number(item.price) || 0) * qty
                if (daysAgo <= 30) ps.total30d += qty
                if (daysAgo <= 7) ps.total7d += qty

                if (!ps.lastSaleDate || saleDate > ps.lastSaleDate) ps.lastSaleDate = saleDate

                ps.dailySales.set(saleDate, (ps.dailySales.get(saleDate) || 0) + qty)
            })
        })

        // 4. Calculate forecast metrics for each product
        const now = new Date()
        const forecastData = products.map(p => {
            const pid = String(p.id)
            const stats = productSales.get(pid) || { total90d: 0, total30d: 0, total7d: 0, lastSaleDate: null, dailySales: new Map(), revenue90d: 0 }
            const stock = Number(p.stock) || 0
            const cost = Number(p.cost_price) || 0
            const price = Number(p.price) || 0

            // Weighted velocity: recent sales matter more (Zara-style recency bias)
            // 7d weight: 3x, 30d weight: 2x, 90d weight: 1x
            const v7d = stats.total7d / 7
            const v30d = stats.total30d / 30
            const v90d = stats.total90d / 90
            const weightedVelocity = (v7d * 3 + v30d * 2 + v90d * 1) / 6

            // Sell-Through Rate (30d)
            const totalAvailable30d = stats.total30d + stock
            const sellThrough30d = totalAvailable30d > 0 ? (stats.total30d / totalAvailable30d) * 100 : 0

            // Weeks of Supply
            const weeklyRate = weightedVelocity * 7
            const weeksOfSupply = weeklyRate > 0 ? stock / weeklyRate : (stock > 0 ? 999 : 0)

            // Estimated Stockout Date
            let stockoutDate = null
            if (weightedVelocity > 0 && stock > 0) {
                const daysUntilStockout = stock / weightedVelocity
                const stockoutDateObj = new Date(now.getTime() + daysUntilStockout * 24 * 60 * 60 * 1000)
                stockoutDate = stockoutDateObj.toISOString().split('T')[0]
            }

            // Days in Stock (age)
            const daysInStock = Math.floor((now - new Date(p.created_at)) / (1000 * 60 * 60 * 24))

            // Days Since Last Sale
            const daysSinceLastSale = stats.lastSaleDate
                ? Math.floor((now - new Date(stats.lastSaleDate)) / (1000 * 60 * 60 * 24))
                : daysInStock

            // Trend: comparing 7d velocity vs 30d velocity
            const trend = v30d > 0 ? ((v7d - v30d) / v30d) * 100 : (v7d > 0 ? 100 : 0)

            // Urgency Score (0-100): higher = needs restock sooner
            let urgency = 0
            if (stock === 0 && stats.total30d > 0) urgency = 100 // Stockout on selling item
            else if (weeksOfSupply < 1 && stats.total30d > 0) urgency = 90
            else if (weeksOfSupply < 2) urgency = 70
            else if (weeksOfSupply < 4) urgency = 50
            else if (stock <= 2 && stats.total30d > 0) urgency = 60
            else urgency = Math.max(0, 30 - weeksOfSupply)

            // Suggested Reorder Qty (target: 4 weeks of supply)
            const targetWeeks = 4
            const suggestedReorderQty = Math.max(0, Math.ceil((weeklyRate * targetWeeks) - stock))

            // GMROI for this product
            const grossMargin90d = stats.revenue90d - (cost * stats.total90d)
            const avgInventoryCost = stock * cost
            const gmroi = avgInventoryCost > 0 ? (grossMargin90d * 4) / avgInventoryCost : 0 // Annualized from 90d

            return {
                id: p.id,
                name: p.name,
                category: p.category || 'Sem categoria',
                stock,
                price,
                costPrice: cost,
                images: p.images,
                supplierId: p.supplier_id,
                supplierName: p.supplier_name || 'Sem fornecedor',
                brand: p.brand,

                // Velocity metrics
                velocityDay: Math.round(weightedVelocity * 100) / 100,
                velocityWeek: Math.round(weeklyRate * 10) / 10,
                sold7d: stats.total7d,
                sold30d: stats.total30d,
                sold90d: stats.total90d,
                revenue90d: stats.revenue90d,

                // Supply metrics
                weeksOfSupply: Math.round(weeksOfSupply * 10) / 10,
                sellThrough30d: Math.round(sellThrough30d * 10) / 10,
                stockoutDate,
                daysInStock,
                daysSinceLastSale,

                // Decision metrics
                trend: Math.round(trend),
                urgency,
                suggestedReorderQty,
                reorderCost: Math.round(suggestedReorderQty * cost * 100) / 100,
                gmroi: Math.round(gmroi * 100) / 100
            }
        })

        // Sort by urgency (highest first)
        forecastData.sort((a, b) => b.urgency - a.urgency)

        // Summary KPIs
        const urgentItems = forecastData.filter(p => p.urgency >= 70)
        const avgSellThrough = forecastData.length > 0
            ? forecastData.reduce((s, p) => s + p.sellThrough30d, 0) / forecastData.length
            : 0
        const totalReorderCost = urgentItems.reduce((s, p) => s + p.reorderCost, 0)
        const stockoutRisk = forecastData.filter(p => p.stockoutDate && new Date(p.stockoutDate) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)).length
        const avgWeeksOfSupply = forecastData.filter(p => p.stock > 0).length > 0
            ? forecastData.filter(p => p.stock > 0).reduce((s, p) => s + Math.min(p.weeksOfSupply, 52), 0) / forecastData.filter(p => p.stock > 0).length
            : 0

        res.json({
            summary: {
                totalProducts: forecastData.length,
                urgentItems: urgentItems.length,
                stockoutRisk,
                avgSellThrough: Math.round(avgSellThrough * 10) / 10,
                avgWeeksOfSupply: Math.round(avgWeeksOfSupply * 10) / 10,
                totalReorderCost: Math.round(totalReorderCost),
            },
            products: forecastData
        })
    } catch (error) {
        console.error('❌ Erro no Forecast:', error)
        res.status(500).json({ error: 'Erro ao calcular forecast' })
    }
})

// GET /api/stock/purchase-plan - Supplier-grouped Purchase Suggestions
router.get('/purchase-plan', cacheMiddleware(300), async (req, res) => {
    try {
        console.log('🛒 Computing Purchase Plan...')

        // Reuse forecast data internally
        const forecastRes = await new Promise((resolve) => {
            const mockRes = {
                json: (data) => resolve(data),
                status: () => mockRes
            }
            // We'll just call the logic inline instead
            resolve(null)
        })

        // Fetch forecast data directly
        const { rows: products } = await pool.query(`
            SELECT p.id, p.name, p.stock, p.price, p.cost_price, p.category, p.images,
                   p.created_at, p.supplier_id, p.brand,
                   s.name as supplier_name, s.phone as supplier_phone,
                   s.email as supplier_email, s.city as supplier_city
            FROM products p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            WHERE p.active = true AND p.stock IS NOT NULL
        `)

        const { rows: sales } = await pool.query(`
            SELECT items, created_at FROM vendas
            WHERE created_at >= NOW() - INTERVAL '30 days'
            AND payment_status != 'cancelled'
        `)

        // Build velocity map
        const velocityMap = new Map()
        sales.forEach(sale => {
            let items = sale.items
            if (typeof items === 'string') { try { items = JSON.parse(items) } catch { items = [] } }
            if (!Array.isArray(items)) items = []

            items.forEach(item => {
                const pid = String(item.productId || item.product_id || item.id)
                const qty = Number(item.quantity) || 1
                velocityMap.set(pid, (velocityMap.get(pid) || 0) + qty)
            })
        })

        // Group by supplier
        const supplierGroups = new Map()

        products.forEach(p => {
            const pid = String(p.id)
            const sold30d = velocityMap.get(pid) || 0
            const stock = Number(p.stock) || 0
            const cost = Number(p.cost_price) || 0
            const weeklyRate = sold30d / 4.33

            // Only include products that need reordering
            const weeksOfSupply = weeklyRate > 0 ? stock / weeklyRate : 999
            const suggestedQty = Math.max(0, Math.ceil((weeklyRate * 4) - stock)) // Target: 4 weeks

            if (suggestedQty <= 0) return // Skip products that don't need reorder

            const supplierId = p.supplier_id || 'no-supplier'
            const supplierKey = String(supplierId)

            if (!supplierGroups.has(supplierKey)) {
                supplierGroups.set(supplierKey, {
                    supplierId: p.supplier_id,
                    supplierName: p.supplier_name || 'Sem Fornecedor',
                    supplierPhone: p.supplier_phone,
                    supplierEmail: p.supplier_email,
                    supplierCity: p.supplier_city,
                    items: [],
                    totalCost: 0,
                    totalPieces: 0
                })
            }

            const group = supplierGroups.get(supplierKey)
            group.items.push({
                id: p.id,
                name: p.name,
                category: p.category,
                currentStock: stock,
                sold30d,
                weeklyRate: Math.round(weeklyRate * 10) / 10,
                weeksOfSupply: Math.round(weeksOfSupply * 10) / 10,
                suggestedQty,
                unitCost: cost,
                totalCost: Math.round(suggestedQty * cost * 100) / 100,
                images: p.images
            })
            group.totalCost += suggestedQty * cost
            group.totalPieces += suggestedQty
        })

        // Sort suppliers by totalCost descending
        const suppliers = Array.from(supplierGroups.values())
            .map(s => ({ ...s, totalCost: Math.round(s.totalCost * 100) / 100 }))
            .sort((a, b) => b.totalCost - a.totalCost)

        // Sort items within each supplier by urgency (lowest weeksOfSupply first)
        suppliers.forEach(s => {
            s.items.sort((a, b) => a.weeksOfSupply - b.weeksOfSupply)
        })

        const grandTotalCost = suppliers.reduce((s, g) => s + g.totalCost, 0)
        const grandTotalPieces = suppliers.reduce((s, g) => s + g.totalPieces, 0)

        res.json({
            summary: {
                totalSuppliers: suppliers.length,
                totalProducts: suppliers.reduce((s, g) => s + g.items.length, 0),
                grandTotalCost: Math.round(grandTotalCost * 100) / 100,
                grandTotalPieces
            },
            suppliers
        })
    } catch (error) {
        console.error('❌ Erro no Purchase Plan:', error)
        res.status(500).json({ error: 'Erro ao gerar plano de compras' })
    }
})

// GET /api/stock/inventory-analysis - ABC, GMROI, Margin, Aging Analysis
router.get('/inventory-analysis', cacheMiddleware(600), async (req, res) => {
    try {
        const { category, abcClass } = req.query
        console.log('📊 Computing Inventory Analysis...')

        // 1. Fetch all active products
        const { rows: products } = await pool.query(`
            SELECT p.id, p.name, p.stock, p.price, p.cost_price, p.category, p.images,
                   p.created_at, p.supplier_id, p.brand,
                   s.name as supplier_name
            FROM products p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            WHERE p.active = true
        `)

        // 2. Fetch sales for last 90 days
        const { rows: sales } = await pool.query(`
            SELECT items, created_at, total_value FROM vendas
            WHERE created_at >= NOW() - INTERVAL '90 days'
            AND payment_status != 'cancelled'
        `)

        // 3. Compute per-product metrics
        const productMetrics = new Map()
        let totalRevenue90d = 0

        sales.forEach(sale => {
            let items = sale.items
            if (typeof items === 'string') { try { items = JSON.parse(items) } catch { items = [] } }
            if (!Array.isArray(items)) items = []

            items.forEach(item => {
                const pid = String(item.productId || item.product_id || item.id)
                const qty = Number(item.quantity) || 1
                const price = Number(item.price) || 0
                const revenue = price * qty

                if (!productMetrics.has(pid)) {
                    productMetrics.set(pid, { soldQty: 0, revenue: 0 })
                }
                const m = productMetrics.get(pid)
                m.soldQty += qty
                m.revenue += revenue
                totalRevenue90d += revenue
            })
        })

        // 4. Build analysis dataset
        let analysisData = products.map(p => {
            const pid = String(p.id)
            const metrics = productMetrics.get(pid) || { soldQty: 0, revenue: 0 }
            const stock = Number(p.stock) || 0
            const cost = Number(p.cost_price) || 0
            const price = Number(p.price) || 0
            const daysInStock = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))

            // Margin
            const margin = price > 0 ? ((price - cost) / price) * 100 : 0
            const grossProfit90d = metrics.revenue - (cost * metrics.soldQty)

            // GMROI (annualized from 90 days)
            const avgInventoryCost = stock * cost
            const gmroi = avgInventoryCost > 0 ? (grossProfit90d * 4) / avgInventoryCost : 0

            // Sell-Through
            const totalExposure = metrics.soldQty + stock
            const sellThrough = totalExposure > 0 ? (metrics.soldQty / totalExposure) * 100 : 0

            // Stock Value
            const stockValueCost = stock * cost
            const stockValueRetail = stock * price

            // Weekly velocity
            const weeklyVelocity = metrics.soldQty / 13 // 90 days ≈ 13 weeks

            // Aging bucket
            let agingBucket = 'fresh' // < 30 days
            if (daysInStock > 180) agingBucket = 'critical'
            else if (daysInStock > 90) agingBucket = 'aging'
            else if (daysInStock > 60) agingBucket = 'watch'
            else if (daysInStock > 30) agingBucket = 'normal'

            return {
                id: p.id,
                name: p.name,
                category: p.category || 'Sem categoria',
                brand: p.brand,
                stock,
                price,
                costPrice: cost,
                images: p.images,
                supplierName: p.supplier_name || 'Sem fornecedor',

                // Performance
                soldQty90d: metrics.soldQty,
                revenue90d: Math.round(metrics.revenue),
                grossProfit90d: Math.round(grossProfit90d),
                margin: Math.round(margin * 10) / 10,
                gmroi: Math.round(gmroi * 100) / 100,
                sellThrough: Math.round(sellThrough * 10) / 10,

                // Inventory
                stockValueCost: Math.round(stockValueCost),
                stockValueRetail: Math.round(stockValueRetail),
                daysInStock,
                agingBucket,
                weeklyVelocity: Math.round(weeklyVelocity * 10) / 10,

                // Will be set after ABC classification
                abcClass: 'C',
                revenueShare: 0
            }
        })

        // 5. ABC Classification (by revenue contribution)
        analysisData.sort((a, b) => b.revenue90d - a.revenue90d)
        let accRevenue = 0
        analysisData.forEach(p => {
            accRevenue += p.revenue90d
            const accPct = totalRevenue90d > 0 ? (accRevenue / totalRevenue90d) * 100 : 100
            p.revenueShare = totalRevenue90d > 0 ? Math.round((p.revenue90d / totalRevenue90d) * 1000) / 10 : 0

            if (p.revenue90d === 0) p.abcClass = 'C'
            else if (accPct <= 80) p.abcClass = 'A'
            else if (accPct <= 95) p.abcClass = 'B'
            else p.abcClass = 'C'
        })

        // 6. Apply filters
        if (category) {
            analysisData = analysisData.filter(p => p.category.toLowerCase() === category.toLowerCase())
        }
        if (abcClass) {
            analysisData = analysisData.filter(p => p.abcClass === abcClass.toUpperCase())
        }

        // 7. Compute Summary KPIs
        const classA = analysisData.filter(p => p.abcClass === 'A')
        const classB = analysisData.filter(p => p.abcClass === 'B')
        const classC = analysisData.filter(p => p.abcClass === 'C')

        // Aging distribution
        const agingDistribution = {
            fresh: analysisData.filter(p => p.agingBucket === 'fresh').length,
            normal: analysisData.filter(p => p.agingBucket === 'normal').length,
            watch: analysisData.filter(p => p.agingBucket === 'watch').length,
            aging: analysisData.filter(p => p.agingBucket === 'aging').length,
            critical: analysisData.filter(p => p.agingBucket === 'critical').length,
        }

        // Category breakdown
        const categoryBreakdown = new Map()
        analysisData.forEach(p => {
            if (!categoryBreakdown.has(p.category)) {
                categoryBreakdown.set(p.category, { category: p.category, products: 0, stock: 0, revenue: 0, costValue: 0 })
            }
            const c = categoryBreakdown.get(p.category)
            c.products++
            c.stock += p.stock
            c.revenue += p.revenue90d
            c.costValue += p.stockValueCost
        })

        const totalStockCost = analysisData.reduce((s, p) => s + p.stockValueCost, 0)
        const totalStockRetail = analysisData.reduce((s, p) => s + p.stockValueRetail, 0)
        const avgGmroi = analysisData.filter(p => p.gmroi > 0).length > 0
            ? analysisData.filter(p => p.gmroi > 0).reduce((s, p) => s + p.gmroi, 0) / analysisData.filter(p => p.gmroi > 0).length
            : 0

        res.json({
            summary: {
                totalProducts: analysisData.length,
                totalStockCost: Math.round(totalStockCost),
                totalStockRetail: Math.round(totalStockRetail),
                totalRevenue90d: Math.round(totalRevenue90d),
                avgGmroi: Math.round(avgGmroi * 100) / 100,
                abc: {
                    a: { count: classA.length, revenue: Math.round(classA.reduce((s, p) => s + p.revenue90d, 0)), stockCost: Math.round(classA.reduce((s, p) => s + p.stockValueCost, 0)) },
                    b: { count: classB.length, revenue: Math.round(classB.reduce((s, p) => s + p.revenue90d, 0)), stockCost: Math.round(classB.reduce((s, p) => s + p.stockValueCost, 0)) },
                    c: { count: classC.length, revenue: Math.round(classC.reduce((s, p) => s + p.revenue90d, 0)), stockCost: Math.round(classC.reduce((s, p) => s + p.stockValueCost, 0)) },
                },
                agingDistribution,
                categoryBreakdown: Array.from(categoryBreakdown.values()).sort((a, b) => b.revenue - a.revenue)
            },
            products: analysisData
        })
    } catch (error) {
        console.error('❌ Erro na Inventory Analysis:', error)
        res.status(500).json({ error: 'Erro ao calcular análise de inventário' })
    }
})

export default router
