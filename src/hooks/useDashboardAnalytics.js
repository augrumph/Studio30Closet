import { useMemo } from 'react'

/**
 * Hook para calcular dados de analytics semanais e mensais
 * 
 * @param {Array} vendas - Array de vendas
 * @returns {Object} Dados de trend analytics
 */
export function useDashboardAnalytics(vendas) {
    // Dados dos últimos 7 dias
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

    // Dados mensais (últimas 4 semanas)
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

    // Dados acumulados
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

    // Top produtos
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

    // Top clientes
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

    return {
        weeklyData,
        maxWeeklyValue,
        monthlyData,
        maxMonthlyValue,
        accumulatedData,
        maxAccumulatedValue,
        topProducts,
        topCustomers
    }
}
