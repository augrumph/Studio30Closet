// Utilidades para preparar dados para gráficos (Recharts)

/**
 * Prepara dados de vendas para gráfico de linha (últimos 30 dias)
 * @param {Array} orders - Array de pedidos
 * @returns {Array} - Dados formatados para Recharts LineChart
 */
export function prepareSalesData(orders) {
    const today = new Date()
    const last30Days = []

    // Gerar array dos últimos 30 dias
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        last30Days.push({
            date: dateStr,
            label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            value: 0,
            orders: 0
        })
    }

    // Contar vendas por dia
    orders.forEach(order => {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0]
        const dayData = last30Days.find(d => d.date === orderDate)

        if (dayData) {
            dayData.value += order.totalValue
            dayData.orders++
        }
    })

    return last30Days
}

/**
 * Prepara dados de status de pedidos para gráfico de pizza
 * @param {Array} orders - Array de pedidos
 * @returns {Array} - Dados formatados para Recharts PieChart
 */
export function prepareStatusData(orders) {
    const statusCount = {
        pending: { label: 'Pendente', count: 0, color: '#F59E0B' },
        confirmed: { label: 'Confirmado', count: 0, color: '#3B82F6' },
        delivered: { label: 'Entregue', count: 0, color: '#10B981' },
        cancelled: { label: 'Cancelado', count: 0, color: '#EF4444' }
    }

    orders.forEach(order => {
        if (statusCount[order.status]) {
            statusCount[order.status].count++
        }
    })

    return Object.entries(statusCount).map(([key, data]) => ({
        name: data.label,
        value: data.count,
        color: data.color
    }))
}

/**
 * Prepara dados de categorias mais vendidas para gráfico de barras
 * @param {Array} orders - Array de pedidos
 * @param {Array} products - Array de produtos
 * @returns {Array} - Dados formatados para Recharts BarChart
 */
export function prepareCategoryData(orders, products) {
    const categoryCounts = {
        vestidos: { label: 'Vestidos', count: 0, value: 0 },
        blusas: { label: 'Blusas', count: 0, value: 0 },
        calcas: { label: 'Calças', count: 0, value: 0 },
        saias: { label: 'Saias', count: 0, value: 0 },
        conjuntos: { label: 'Conjuntos', count: 0, value: 0 },
        blazers: { label: 'Blazers', count: 0, value: 0 }
    }

    orders.forEach(order => {
        order.items.forEach(item => {
            const product = products.find(p => p.id === item.productId)
            if (product && categoryCounts[product.category]) {
                categoryCounts[product.category].count++
                categoryCounts[product.category].value += item.price
            }
        })
    })

    return Object.values(categoryCounts).map(cat => ({
        name: cat.label,
        vendas: cat.count,
        valor: cat.value
    }))
}

/**
 * Calcula estatísticas gerais do dashboard
 * @param {Array} orders - Array de pedidos
 * @param {Array} products - Array de produtos
 * @param {Array} customers - Array de clientes
 * @returns {Object} - Objeto com estatísticas
 */
export function calculateDashboardStats(orders, products, customers) {
    const today = new Date()
    const thisMonth = today.getMonth()
    const thisYear = today.getFullYear()

    // Filtrar pedidos deste mês
    const ordersThisMonth = orders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear
    })

    // Mês anterior
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
    const ordersLastMonth = orders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear
    })

    // Calcular totais
    const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + o.totalValue, 0)
    const revenueLastMonth = ordersLastMonth.reduce((sum, o) => sum + o.totalValue, 0)

    // Calcular variações percentuais
    const orderChange = ordersLastMonth.length > 0
        ? ((ordersThisMonth.length - ordersLastMonth.length) / ordersLastMonth.length) * 100
        : 0

    const revenueChange = revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : 0

    // Produtos mais vendidos
    const productSales = {}
    orders.forEach(order => {
        order.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = {
                    id: item.productId,
                    name: item.productName,
                    count: 0,
                    revenue: 0
                }
            }
            productSales[item.productId].count++
            productSales[item.productId].revenue += item.price
        })
    })

    const topProducts = Object.values(productSales)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

    // Clientes novos este mês
    const newCustomersThisMonth = customers.filter(customer => {
        const createdDate = new Date(customer.createdAt)
        return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear
    })

    // Status de pedidos
    const statusCounts = {
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length
    }

    // Produtos ativos (com estoque > 0)
    const activeProducts = products.filter(p => p.stock > 0).length

    return {
        // Totais
        ordersThisMonth: ordersThisMonth.length,
        revenueThisMonth,
        activeProducts,
        totalCustomers: customers.length,

        // Variações
        orderChange: Math.round(orderChange),
        revenueChange: Math.round(revenueChange),
        newCustomersCount: newCustomersThisMonth.length,

        // Rankings
        topProducts,

        // Status
        statusCounts,

        // Ticket médio
        averageTicket: orders.length > 0
            ? orders.reduce((sum, o) => sum + o.totalValue, 0) / orders.length
            : 0
    }
}

/**
 * Formata número como moeda BRL
 * @param {number} value - Valor numérico
 * @returns {string} - Valor formatado
 */
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value)
}

/**
 * Formata percentual
 * @param {number} value - Valor numérico
 * @param {boolean} showSign - Mostrar sinal + ou -
 * @returns {string} - Percentual formatado
 */
export function formatPercentage(value, showSign = true) {
    const sign = showSign && value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
}
