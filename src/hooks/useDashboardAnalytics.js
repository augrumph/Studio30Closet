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

    // Top trends (Category, Size, Product) + Advanced Supplier Analytics
    const topTrends = useMemo(() => {
        const counts = {
            category: {},
            size: {},
            product: {}
        }

        // Supplier analytics with profit tracking
        const supplierStats = {}

        vendas.forEach(v => {
            const items = Array.isArray(v.items) ? v.items : (typeof v.items === 'string' ? JSON.parse(v.items || '[]') : [])
            items.forEach(item => {
                const qty = item.quantity || 1

                // Real Join: Lookup product in master list to get accurate Category and Supplier
                const masterProduct = products.find(p => Number(p.id) === Number(item.productId))

                // Category (Priority: Master List -> Sale Item -> Default)
                const cat = masterProduct?.category || item.category || 'Geral'
                counts.category[cat] = (counts.category[cat] || 0) + qty

                // Size
                const size = item.selectedSize || 'U'
                counts.size[size] = (counts.size[size] || 0) + qty

                // Product
                const prod = item.name || 'Produto'
                counts.product[prod] = (counts.product[prod] || 0) + qty

                // Advanced Supplier Analytics
                const supplierId = masterProduct?.supplierId || masterProduct?.supplier_id
                const masterSupplier = suppliers.find(s => Number(s.id) === Number(supplierId))
                const supplierName = masterSupplier?.name || 'N/A'

                if (supplierName !== 'N/A') {
                    if (!supplierStats[supplierName]) {
                        supplierStats[supplierName] = {
                            revenue: 0,
                            profit: 0,
                            volume: 0
                        }
                    }

                    const salePrice = item.price || 0
                    const cost = masterProduct?.cost || 0
                    const revenue = salePrice * qty
                    const profit = (salePrice - cost) * qty

                    supplierStats[supplierName].revenue += revenue
                    supplierStats[supplierName].profit += profit
                    supplierStats[supplierName].volume += qty
                }
            })
        })

        const getTop = (obj) => {
            const entries = Object.entries(obj).filter(([name]) => name !== 'N/A' && name !== 'Geral')
            if (entries.length === 0) {
                const allEntries = Object.entries(obj)
                if (allEntries.length === 0) return 'N/A'
                return allEntries.sort((a, b) => b[1] - a[1])[0][0]
            }
            return entries.sort((a, b) => b[1] - a[1])[0][0]
        }

        // Calculate supplier rankings
        const supplierEntries = Object.entries(supplierStats)

        // Most profitable supplier (by absolute profit)
        const mostProfitableSupplier = supplierEntries.length > 0
            ? supplierEntries.sort((a, b) => b[1].profit - a[1].profit)[0][0]
            : 'N/A'

        // Supplier with most volume (by quantity sold)
        const mostVolumeSupplier = supplierEntries.length > 0
            ? [...supplierEntries].sort((a, b) => b[1].volume - a[1].volume)[0][0]
            : 'N/A'

        // Best supplier by composite score
        let bestSupplierByScore = 'N/A'
        let bestScore = 0

        if (supplierEntries.length > 0) {
            // Find max values for normalization
            const maxRevenue = Math.max(...supplierEntries.map(([_, stats]) => stats.revenue), 1)
            const maxProfit = Math.max(...supplierEntries.map(([_, stats]) => stats.profit), 1)
            const maxVolume = Math.max(...supplierEntries.map(([_, stats]) => stats.volume), 1)

            // Calculate composite score for each supplier
            supplierEntries.forEach(([name, stats]) => {
                const revenueNorm = stats.revenue / maxRevenue
                const profitNorm = stats.profit / maxProfit
                const volumeNorm = stats.volume / maxVolume

                // Composite Score Formula: 40% Revenue + 40% Profit + 20% Volume
                const score = (0.40 * revenueNorm) + (0.40 * profitNorm) + (0.20 * volumeNorm)

                if (score > bestScore) {
                    bestScore = score
                    bestSupplierByScore = name
                }
            })
        }

        return {
            category: getTop(counts.category),
            size: getTop(counts.size),
            product: getTop(counts.product),
            supplierMostProfitable: mostProfitableSupplier,
            supplierMostVolume: mostVolumeSupplier,
            supplierBestScore: bestSupplierByScore,
            bestSupplierScoreValue: bestScore // For potential display
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
