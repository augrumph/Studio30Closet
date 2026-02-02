
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Utility to emulate 'toCamelCase'
const toCamelCase = (o) => {
    if (!o) return o;
    const newO = {};
    for (const k in o) {
        const newK = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newO[newK] = o[k];
    }
    return newO;
}

/**
 * REPLICATED LOGIC FROM stock.js getAdvancedStockMetrics
 * We replicate it here to test it in isolation in Node.js
 */
async function verifyAdvancedMetrics() {
    console.log('🔄 Calculating Advanced KPIs (Replicated Logic)...\n')

    try {
        // 1. Fetch Products
        const { data: products } = await supabase
            .from('products')
            .select('id, name, stock, price, cost_price, created_at, category')
            .eq('active', true)

        console.log(`📦 Fetched ${products.length} active products`)

        // 2. Fetch Sales (30d)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: sales } = await supabase
            .from('vendas')
            .select('items, total_value, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .neq('payment_status', 'cancelled')

        console.log(`💰 Fetched ${sales.length} sales in last 30 days`)

        // 3. Process Sales
        const productStats = new Map()

        sales?.forEach(sale => {
            let items = sale.items
            if (typeof items === 'string') {
                try { items = JSON.parse(items) } catch { items = [] }
            }
            if (!Array.isArray(items)) items = []

            items.forEach(item => {
                const pid = String(item.productId || item.id)
                const qty = item.quantity || 1
                const price = item.price || 0
                const cost = item.costPrice || 0

                if (!productStats.has(pid)) {
                    productStats.set(pid, { soldQty: 0, revenue: 0, cogs: 0 })
                }
                const stat = productStats.get(pid)
                stat.soldQty += qty
                stat.revenue += price * qty
                stat.cogs += cost * qty
            })
        })

        // 4. Calculate Unified Data
        let totalStockCost = 0
        let totalRevenue30d = 0
        const detailedProducts = products.map(p => {
            const pid = String(p.id)
            const stats = productStats.get(pid) || { soldQty: 0, revenue: 0, cogs: 0 }

            // Fix COGS if missing in stats
            if (stats.soldQty > 0 && stats.cogs === 0) {
                stats.cogs = stats.soldQty * (p.cost_price || 0)
            }

            const stock = p.stock || 0
            const cost = p.cost_price || 0

            // Accumulators
            totalStockCost += stock * cost
            totalRevenue30d += stats.revenue

            // KPIs
            const totalInventoryExposure = stats.soldQty + stock
            const sellThrough = totalInventoryExposure > 0 ? (stats.soldQty / totalInventoryExposure) * 100 : 0

            const weeklySalesRate = stats.soldQty / 4
            const weeksOfSupply = weeklySalesRate > 0 ? stock / weeklySalesRate : (stock > 0 ? 999 : 0)

            return {
                ...p,
                stats: {
                    soldQty30d: stats.soldQty,
                    revenue30d: stats.revenue,
                    cogs30d: stats.cogs,
                    sellThrough,
                    weeksOfSupply
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

        // REPORT
        console.log('\n--- KPI RESULTS ---')
        console.log('Class A Items:', productsWithABC.filter(p => p.abcClass === 'A').length)
        console.log('Class C Items:', productsWithABC.filter(p => p.abcClass === 'C').length)

        console.log('\n--- TOP 3 SELLERS (Velocity) ---')
        productsWithABC
            .sort((a, b) => b.stats.sellThrough - a.stats.sellThrough)
            .slice(0, 3)
            .forEach(p => console.log(`${p.name}: ${p.stats.sellThrough.toFixed(1)}%`))

        console.log('\n--- ACTION: REORDER RECOMMENDED (< 2 weeks supply) ---')
        productsWithABC
            .filter(p => p.abcClass === 'A' && p.stats.weeksOfSupply < 2)
            .forEach(p => console.log(`[URGENT] ${p.name}: ${p.stats.weeksOfSupply.toFixed(1)} weeks left (Stock: ${p.stock})`))

    } catch (error) {
        console.error('❌ Verification failed:', error)
    }
}

verifyAdvancedMetrics()
