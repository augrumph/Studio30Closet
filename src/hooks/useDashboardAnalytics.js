import { useMemo } from 'react'

/**
 * Hook para calcular dados de analytics semanais e mensais
 * 
 * @param {Array} vendas - Array de vendas
 * @returns {Object} Dados de trend analytics
 */
export function useDashboardAnalytics(vendas, products = [], suppliers = []) {
    // ... (weeklyData, monthlyData, accumulatedData, topProducts, topCustomers remain the same)
    const weeklyData = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - i)
            return d.toISOString().split('T')[0]
        }).reverse()

        return last7Days.map(date => {
            const daySales = vendas.filter(v => v.createdAt?.startsWith(date))
                .reduce((acc, v) => acc + (v.totalValue || 0), 0)
            return { date, value: daySales }
        })
    }, [vendas])

    const maxWeeklyValue = Math.max(...weeklyData.map(d => d.value), 100)

    const monthlyData = useMemo(() => {
        const weeks = []
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date()
            weekStart.setDate(weekStart.getDate() - (i * 7 + 6))
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 6)

            const weekSales = vendas.filter(v => {
                const vDate = new Date(v.createdAt?.split('T')[0])
                return vDate >= weekStart && vDate <= weekEnd
            }).reduce((acc, v) => acc + (v.totalValue || 0), 0)

            weeks.push({
                label: `Sem ${4 - i}`,
                value: weekSales,
                startDate: weekStart.toISOString().split('T')[0],
                endDate: weekEnd.toISOString().split('T')[0]
            })
        }
        return weeks
    }, [vendas])

    const maxMonthlyValue = Math.max(...monthlyData.map(d => d.value), 100)

    const accumulatedData = useMemo(() => {
        const sortedVendas = [...vendas].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        let accumulated = 0

        return sortedVendas.map(v => {
            accumulated += (v.totalValue || 0)
            return {
                date: v.createdAt?.split('T')[0],
                value: accumulated,
                saleDate: new Date(v.createdAt)
            }
        })
    }, [vendas])

    const maxAccumulatedValue = Math.max(...accumulatedData.map(d => d.value), 100)

    const topProducts = useMemo(() => {
        const productSales = {}
        vendas.forEach(v => {
            v.items?.forEach(item => {
                const id = item.productId
                if (!productSales[id]) {
                    productSales[id] = {
                        name: item.name,
                        quantity: 0,
                        revenue: 0,
                        productId: id,
                        image: item.images?.[0] || item.image || item.variant?.images?.[0] || null
                    }
                }
                productSales[id].quantity += (item.quantity || 1)
                productSales[id].revenue += (item.price * (item.quantity || 1))
            })
        })

        return Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 4)
    }, [vendas])

    const topCustomers = useMemo(() => {
        const customerStats = {}
        vendas.forEach(v => {
            const name = v.customerName
            if (!name) return

            if (!customerStats[name]) {
                customerStats[name] = {
                    name: name,
                    revenue: 0,
                    frequency: 0,
                    lastPurchase: v.createdAt
                }
            }
            customerStats[name].revenue += (v.totalValue || 0)
            customerStats[name].frequency += 1
            customerStats[name].lastPurchase = new Date(v.createdAt) > new Date(customerStats[name].lastPurchase)
                ? v.createdAt
                : customerStats[name].lastPurchase
        })

        return Object.values(customerStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
    }, [vendas])

    // Top trends (Category, Size, Supplier, Product)
    const topTrends = useMemo(() => {
        const counts = {
            category: {},
            size: {},
            supplier: {},
            product: {}
        }

        vendas.forEach(v => {
            const items = Array.isArray(v.items) ? v.items : (typeof v.items === 'string' ? JSON.parse(v.items || '[]') : [])
            items.forEach(item => {
                const qty = item.quantity || 1

                // Real Join: Lookup product in master list to get accurate Category and Supplier
                // Using Number() to ensure type safety between string IDs and number IDs
                const masterProduct = products.find(p => Number(p.id) === Number(item.productId))

                // Category (Priority: Master List -> Sale Item -> Default)
                const cat = masterProduct?.category || item.category || 'Geral'
                counts.category[cat] = (counts.category[cat] || 0) + qty

                // Supplier (Priority: Master List -> Sale Item -> N/A)
                const supplierId = masterProduct?.supplierId || masterProduct?.supplier_id
                const masterSupplier = suppliers.find(s => Number(s.id) === Number(supplierId))
                const supplierName = masterSupplier?.name || 'N/A'
                counts.supplier[supplierName] = (counts.supplier[supplierName] || 0) + qty

                // Size
                const size = item.selectedSize || 'U'
                counts.size[size] = (counts.size[size] || 0) + qty

                // Product
                const prod = item.name || 'Produto'
                counts.product[prod] = (counts.product[prod] || 0) + qty
            })
        })

        const getTop = (obj) => {
            const entries = Object.entries(obj).filter(([name]) => name !== 'N/A' && name !== 'Geral')
            if (entries.length === 0) {
                // Se tudo for Geral/NA, tenta pegar mesmo assim se existir
                const allEntries = Object.entries(obj)
                if (allEntries.length === 0) return 'N/A'
                return allEntries.sort((a, b) => b[1] - a[1])[0][0]
            }
            return entries.sort((a, b) => b[1] - a[1])[0][0]
        }

        return {
            category: getTop(counts.category),
            size: getTop(counts.size),
            supplier: getTop(counts.supplier),
            product: getTop(counts.product)
        }
    }, [vendas, products, suppliers])

    return {
        weeklyData,
        maxWeeklyValue,
        monthlyData,
        maxMonthlyValue,
        accumulatedData,
        maxAccumulatedValue,
        topProducts,
        topCustomers,
        topTrends
    }
}
