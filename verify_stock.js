
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyStockKPIs() {
    console.log('🔄 Checking Stock KPIs...\n')

    try {
        // 1. HEADLINE KPIS
        const { data: products } = await supabase
            .from('products')
            .select('id, stock, price, cost_price, stock_status')
            .eq('active', true)

        let totalValue = 0
        let totalCost = 0
        let totalItems = 0
        let productsCount = products.length

        products.forEach(p => {
            const stock = p.stock || 0
            totalItems += stock
            totalValue += (p.price || 0) * stock
            totalCost += (p.cost_price || 0) * stock
        })

        console.log('--- HEADLINE KPIS ---')
        console.log(`Valor em Estoque: R$ ${totalValue.toLocaleString('pt-BR')}`)
        console.log(`Produtos: ${productsCount}`)
        console.log(`Peças totais: ${totalItems}`)
        console.log(`Custo Imobilizado: R$ ${totalCost.toLocaleString('pt-BR')}`)
        console.log('---------------------\n')

        // 2. RANKING LOGIC (Exactly as implemented in stock.js)
        // Fetch all non-cancelled sales
        const { data: vendas, error: salesError } = await supabase
            .from('vendas')
            .select('items, total_value, created_at, payment_status')
            .neq('payment_status', 'cancelled')

        if (salesError) throw salesError

        // Fetch products for fallback data
        const { data: allProducts } = await supabase
            .from('products')
            .select('id, name, category, color, sizes, variants, cost_price')

        // Create Product Map
        const productMap = new Map()
        allProducts?.forEach(p => {
            if (p.id) productMap.set(String(p.id), p)
            if (p.name) productMap.set(p.name.toLowerCase().trim(), p)
        })

        const aggregations = {
            byCategory: {},
            byColor: {},
            byProduct: {}
        }

        vendas.forEach(venda => {
            let items = venda.items
            if (typeof items === 'string') {
                try { items = JSON.parse(items) } catch { items = [] }
            }
            if (!Array.isArray(items)) items = []

            items.forEach(item => {
                const qty = item.quantity || 1
                const price = item.price || 0
                const itemNameRef = item.name ? item.name.toLowerCase().trim() : ''
                const itemIdRef = String(item.productId || item.id || '')

                const officialProduct = productMap.get(itemIdRef) || productMap.get(itemNameRef)

                // Cost Fallback Logic
                const cost = item.costPrice !== undefined ? Number(item.costPrice) : Number(officialProduct?.cost_price || 0)
                const margin = price - cost

                // CATEGORY
                let cat = item.category
                if (!cat || cat === 'Sem categoria') {
                    cat = officialProduct?.category || 'Geral'
                }
                const catKey = cat.toLowerCase()
                if (!aggregations.byCategory[catKey]) {
                    aggregations.byCategory[catKey] = { name: cat, qty: 0 }
                }
                aggregations.byCategory[catKey].qty += qty

                // COLOR
                let color = item.selectedColor || item.color
                if (!color || color === 'Sem cor') {
                    if (officialProduct) {
                        const firstVariant = officialProduct.variants?.[0]
                        color = firstVariant?.colorName || officialProduct.color || null
                    }
                }
                if (color) {
                    if (!aggregations.byColor[color]) {
                        aggregations.byColor[color] = { name: color, qty: 0 }
                    }
                    aggregations.byColor[color].qty += qty
                }

                // PRODUCT (PROFIT)
                const productId = item.productId || item.name
                if (!aggregations.byProduct[productId]) {
                    aggregations.byProduct[productId] = {
                        name: item.name,
                        margin: 0
                    }
                }
                aggregations.byProduct[productId].margin += margin * qty
            })
        })

        // SORTING & DISPLAY
        const byCategory = Object.values(aggregations.byCategory).sort((a, b) => b.qty - a.qty).slice(0, 5)
        const byColor = Object.values(aggregations.byColor).sort((a, b) => b.qty - a.qty).slice(0, 5)
        const byProfit = Object.values(aggregations.byProduct).sort((a, b) => b.margin - a.margin).slice(0, 5)

        console.log('--- O QUE ESTÁ VENDENDO BEM? ---')
        console.log('\nTOP CATEGORIAS:')
        byCategory.forEach((c, i) => console.log(`${i + 1}. ${c.name}: ${c.qty} un`))

        console.log('\nTOP CORES:')
        byColor.forEach((c, i) => console.log(`${i + 1}. ${c.name}: ${c.qty} un`))

        console.log('\nMAIS LUCRATIVOS:')
        byProfit.forEach((c, i) => console.log(`${i + 1}. ${c.name}: R$ ${c.margin.toFixed(0)}`))

    } catch (error) {
        console.error('❌ Error verifying stock:', error)
    }
}

verifyStockKPIs()
