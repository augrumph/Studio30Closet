// API Helper - Funções CRUD para manipular JSONs
// Durante desenvolvimento: usa localStorage como cache
// Em produção: substituir por chamadas fetch para API REST real

const STORAGE_KEYS = {
    products: 'studio30_admin_products',
    orders: 'studio30_admin_orders',
    customers: 'studio30_admin_customers',
    vendas: 'studio30_admin_vendas',
    settings: 'studio30_admin_settings',
    coupons: 'studio30_admin_coupons'
}

// ==================== HELPERS ====================

async function loadData(key, fallbackPath) {
    try {
        // Tentar localStorage primeiro
        const cached = localStorage.getItem(STORAGE_KEYS[key])
        if (cached) {
            return JSON.parse(cached)
        }

        // Se não, buscar JSON
        const response = await fetch(fallbackPath)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
            console.error(`Resposta não é JSON para ${key}:`, await response.text())
            // Retornar estrutura básica para evitar quebra do app
            const defaultData = { nextId: 1 }
            defaultData[key] = []
            return defaultData
        }

        const data = await response.json()

        // Salvar em cache
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data))
        return data
    } catch (error) {
        console.error(`Erro ao carregar ${key}:`, error)
        throw error
    }
}

async function saveData(key, data) {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data))
    // Simular latência de rede
    await new Promise(resolve => setTimeout(resolve, 300))
}

function generateOrderNumber() {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
    return `ORD-${year}${month}${day}-${random}`
}

// ==================== PRODUCTS ====================

export async function getProducts() {
    const data = await loadData('products', '/data/products.json')
    return data.products
}

export async function getProductById(id) {
    const products = await getProducts()
    return products.find(p => p.id === parseInt(id))
}

export async function createProduct(productData) {
    const data = await loadData('products', '/data/products.json')

    const newProduct = {
        ...productData,
        id: data.nextId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    data.products.unshift(newProduct)
    data.nextId++

    await saveData('products', data)
    return newProduct
}

export async function updateProduct(id, productData) {
    const data = await loadData('products', '/data/products.json')
    const index = data.products.findIndex(p => p.id === parseInt(id))

    if (index === -1) throw new Error('Produto não encontrado')

    data.products[index] = {
        ...data.products[index],
        ...productData,
        id: parseInt(id),
        updatedAt: new Date().toISOString()
    }

    await saveData('products', data)
    return data.products[index]
}

export async function deleteProduct(id) {
    const data = await loadData('products', '/data/products.json')
    const index = data.products.findIndex(p => p.id === parseInt(id))

    if (index === -1) throw new Error('Produto não encontrado')

    data.products.splice(index, 1)
    await saveData('products', data)
    return true
}

export async function deleteMultipleProducts(productIds) {
    const data = await loadData('products', '/data/products.json')
    
    const idsToDelete = productIds.map(id => parseInt(id, 10));
    data.products = data.products.filter(p => !idsToDelete.includes(p.id))
    
    await saveData('products', data)
    return true
}

// ==================== ORDERS ====================

export async function getOrders() {
    const data = await loadData('orders', '/data/orders.json')
    return data.orders
}

export async function getOrderById(id) {
    const orders = await getOrders()
    return orders.find(o => o.id === parseInt(id))
}

async function getOrCreateCustomerId(customerData) {
    const data = await loadData('customers', '/data/customers.json')

    // Busca por telefone para evitar duplicidade (removendo caracteres não numéricos)
    const cleanPhone = customerData.phone.replace(/\D/g, '')
    const index = data.customers.findIndex(c =>
        c.phone.replace(/\D/g, '') === cleanPhone
    )

    if (index !== -1) {
        // Atualiza endereço se necessário e data do último pedido
        data.customers[index] = {
            ...data.customers[index],
            address: customerData.address || data.customers[index].address,
            complement: customerData.complement || data.customers[index].complement,
            lastOrderAt: new Date().toISOString()
        }
        await saveData('customers', data)
        return data.customers[index].id
    }

    // Se não existir, cria um novo
    return await createCustomer(customerData)
}

export async function createOrder(orderData) {
    const data = await loadData('orders', '/data/orders.json')

    const customerId = await getOrCreateCustomerId(orderData.customer)

    // Buscar produtos para garantir o costPrice correto (não confiar no front público)
    const productsData = await loadData('products', '/data/products.json')
    const products = productsData.products || []

    const newOrder = {
        id: data.nextId,
        orderNumber: generateOrderNumber(),
        status: orderData.status || 'pending',
        customer: {
            ...orderData.customer,
            id: customerId
        },
        items: orderData.items.map(item => {
            const product = products.find(p => p.id === (item.productId || item.id))
            return {
                productId: item.productId || item.id,
                productName: item.productName || item.name,
                selectedSize: item.selectedSize,
                price: item.price,
                costPrice: product ? product.costPrice : 0,
                image: item.image || item.images?.[0]
            }
        }),
        totalValue: orderData.totalValue,
        itemsCount: orderData.itemsCount,
        deliveryDate: orderData.deliveryDate || null,
        pickupDate: orderData.pickupDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [{
            status: orderData.status || 'pending',
            timestamp: new Date().toISOString()
        }]
    }

    data.orders.unshift(newOrder)
    data.nextId++

    await saveData('orders', data)

    // Atualizar dados do cliente
    await updateCustomerOrders(customerId, newOrder.id, newOrder.totalValue)

    // Baixa de estoque para malinhas pendentes
    if (newOrder.status === 'pending') {
        await updateStock(newOrder.items.map(item => ({ productId: item.productId, quantity: 1 })), 'decrease')
    }

    return newOrder
}

export async function updateOrder(id, orderData) {
    const data = await loadData('orders', '/data/orders.json')
    const index = data.orders.findIndex(o => o.id === parseInt(id))

    if (index === -1) throw new Error('Malinha não encontrada')

    const currentOrder = data.orders[index]
    const newStatus = orderData.status || currentOrder.status

    // Lógica de ajuste de estoque para malinhas PENDENTES
    if (currentOrder.status === 'pending' && orderData.items) {
        const currentItems = currentOrder.items || []
        const newItems = orderData.items || []

        // Contar IDs para facilitar a comparação
        const currentItemIds = currentItems.map(item => item.productId)
        const newItemIds = newItems.map(item => item.productId)

        const addedItems = newItems
            .filter(item => !currentItemIds.includes(item.productId))
            .map(item => ({ productId: item.productId, quantity: 1 }))

        const removedItems = currentItems
            .filter(item => !newItemIds.includes(item.productId))
            .map(item => ({ productId: item.productId, quantity: 1 }))

        if (addedItems.length > 0) {
            await updateStock(addedItems, 'decrease')
        }
        if (removedItems.length > 0) {
            await updateStock(removedItems, 'increase')
        }
    }


    // Se status mudou, adiciona ao histórico
    const statusHistory = [...(currentOrder.statusHistory || [])]
    if (newStatus !== currentOrder.status) {
        statusHistory.push({
            status: newStatus,
            timestamp: new Date().toISOString()
        })
    }

    data.orders[index] = {
        ...currentOrder,
        ...orderData,
        id: parseInt(id), // Garantir ID numérico
        status: newStatus,
        statusHistory,
        updatedAt: new Date().toISOString(),
        customer: {
            ...orderData.customer,
            id: orderData.customer?.id || currentOrder.customer.id
        },
        items: orderData.items ? orderData.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            selectedSize: item.selectedSize,
            price: item.price,
            image: item.image
        })) : currentOrder.items
    }

    await saveData('orders', data)
    return data.orders[index]
}

export async function updateOrderStatus(id, newStatus) {
    const data = await loadData('orders', '/data/orders.json')
    const index = data.orders.findIndex(o => o.id === parseInt(id))

    if (index === -1) throw new Error('Malinha não encontrada')

    const order = data.orders[index]
    const oldStatus = order.status

    // Se o status não mudou, não faz nada
    if (oldStatus === newStatus) return order;

    const stockItems = order.items.map(item => ({
        productId: item.productId,
        quantity: 1
    }));

    // Lógica de ESTORNO de estoque
    // 1. Se uma malinha PENDENTE for CANCELADA, devolve o estoque que foi reservado.
    if (oldStatus === 'pending' && newStatus === 'cancelled') {
        await updateStock(stockItems, 'increase');
    }
    // 2. Se uma malinha ENVIADA for CANCELADA ou voltar a ser PENDENTE, devolve o estoque.
    // (No nosso fluxo novo, o estoque já foi baixado no pending, então não há dupla baixa)
    else if (oldStatus === 'shipped' && (newStatus === 'cancelled' || newStatus === 'pending')) {
        // Esta lógica pode precisar de revisão dependendo do fluxo exato,
        // mas por segurança, vamos garantir que o estoque seja devolvido se sair de 'shipped'.
        // No fluxo atual, onde 'pending' já baixa o estoque, uma transição 'shipped' -> 'pending'
        // não deveria fazer nada, mas 'shipped' -> 'cancelled' sim.
        // Vamos unificar: se sai de 'shipped' para um estado não final, devolve.
        await updateStock(stockItems, 'increase');
    }

    // Lógica de BAIXA de estoque
    // 1. Se uma malinha estava PENDENTE e virou ENVIADA, o estoque JÁ FOI BAIXADO. Nenhuma ação.
    // 2. Se uma malinha foi criada e já vai direto para ENVIADA (não passa por pending no form),
    // a função createOrder não teria baixado. Mas o form sempre cria como 'pending' primeiro.
    // A única transição que precisa de baixa é de um estado que não baixa estoque (ex: 'completed' revertido) para 'shipped',
    // o que é um caso de borda raro. A lógica atual focada em `pending` é mais segura.

    order.status = newStatus
    order.updatedAt = new Date().toISOString()

    if (!order.statusHistory) order.statusHistory = []
    order.statusHistory.push({
        status: newStatus,
        timestamp: new Date().toISOString()
    })

    await saveData('orders', data)
    return order
}

export async function finalizeMalinhaAsSale(id, keptItemsIndexes, vendaData) {
    const data = await loadData('orders', '/data/orders.json')
    const index = data.orders.findIndex(o => o.id === parseInt(id))
    if (index === -1) throw new Error('Malinha não encontrada')

    const order = data.orders[index]

    // 1. Identificar itens devolvidos e estornar o estoque.
    // O estoque de todos os itens da malinha já foi baixado quando ela estava 'pending'.
    const returnedItems = order.items
        .filter((_, idx) => !keptItemsIndexes.includes(idx))
        .map(item => ({ productId: item.productId, quantity: 1 }))

    if (returnedItems.length > 0) {
        await updateStock(returnedItems, 'increase')
    }

    // 2. Cria a venda. A função createVenda foi modificada para NÃO baixar o estoque
    // se a venda vier de uma 'malinha', evitando dupla baixa.
    const newVenda = await createVenda({
        ...vendaData,
        malinhaId: order.id,
        source: 'malinha'
    })

    // 3. Marca a malinha como concluída
    order.status = 'completed'
    order.updatedAt = new Date().toISOString()

    // Salvar quais itens ficaram para histórico da malinha
    order.items = order.items.map((item, idx) => ({
        ...item,
        isKept: keptItemsIndexes.includes(idx)
    }))

    if (!order.statusHistory) order.statusHistory = []
    order.statusHistory.push({
        status: 'completed',
        timestamp: new Date().toISOString(),
        details: `Venda gerada (${keptItemsIndexes.length} itens)`
    })

    await saveData('orders', data)

    return { order, venda: newVenda }
}

export async function updateOrderSchedule(id, scheduleData) {
    const data = await loadData('orders', '/data/orders.json')
    const index = data.orders.findIndex(o => o.id === parseInt(id))

    if (index === -1) throw new Error('Pedido não encontrado')

    data.orders[index] = {
        ...data.orders[index],
        ...scheduleData,
        updatedAt: new Date().toISOString()
    }

    await saveData('orders', data)
    return data.orders[index]
}

export async function deleteOrder(id) {
    const data = await loadData('orders', '/data/orders.json')
    const index = data.orders.findIndex(o => o.id === parseInt(id))

    if (index === -1) throw new Error('Pedido não encontrado')

    data.orders.splice(index, 1)
    await saveData('orders', data)
    return true
}

// ==================== VENDAS ====================

export async function getVendas() {
    const data = await loadData('vendas', '/data/vendas.json')
    return data.vendas
}

export async function createVenda(vendaData) {
    const data = await loadData('vendas', '/data/vendas.json')

    // Se não tiver data real no arquivo, inicializa estrutura
    if (!data.vendas) data.vendas = []
    if (!data.nextId) data.nextId = 1

    const newVenda = {
        ...vendaData,
        id: data.nextId,
        costPrice: vendaData.costPrice || 0, // Custo total da venda
        totalValue: vendaData.totalValue, // Valor faturado
        createdAt: new Date().toISOString()
    }

    data.vendas.unshift(newVenda)
    data.nextId++

    // Baixa de estoque apenas se não for uma venda originada de uma malinha
    // (o estoque da malinha já foi baixado no estado 'pending' ou 'shipped')
    if (vendaData.source !== 'malinha' && vendaData.items && vendaData.items.length > 0) {
        await updateStock(vendaData.items, 'decrease')
    }

    // Atualiza estatísticas do cliente se houver ID
    if (vendaData.customerId) {
        await updateCustomerSalesStats(vendaData.customerId, vendaData.totalValue)
    }

    return newVenda
}

async function updateStock(items, type) {
    const data = await loadData('products', '/data/products.json')

    items.forEach(item => {
        const productIndex = data.products.findIndex(p => p.id === parseInt(item.productId))
        if (productIndex !== -1) {
            const currentStock = data.products[productIndex].stock || 0
            const quantity = item.quantity || 1

            if (type === 'decrease') {
                data.products[productIndex].stock = Math.max(0, currentStock - quantity)
            } else {
                data.products[productIndex].stock = currentStock + quantity
            }
        }
    })

    await saveData('products', data)
}

async function updateCustomerSalesStats(customerId, amount) {
    const data = await loadData('customers', '/data/customers.json')
    const index = data.customers.findIndex(c => c.id === parseInt(customerId))
    if (index === -1) return

    const customer = data.customers[index]
    if (!customer.vendas) customer.vendas = []
    customer.totalSpent = (customer.totalSpent || 0) + amount

    await saveData('customers', data)
}

export async function updateVenda(id, vendaData) {
    const data = await loadData('vendas', '/data/vendas.json')
    const index = data.vendas.findIndex(v => v.id === parseInt(id))

    if (index === -1) throw new Error('Venda não encontrada')

    const oldVenda = data.vendas[index]

    // Se os itens mudaram, precisamos ajustar o estoque
    // 1. Devolve o estoque antigo
    if (oldVenda.items && oldVenda.items.length > 0) {
        await updateStock(oldVenda.items, 'increase')
    }
    // 2. Tira o estoque novo
    if (vendaData.items && vendaData.items.length > 0) {
        await updateStock(vendaData.items, 'decrease')
    }

    data.vendas[index] = {
        ...data.vendas[index],
        ...vendaData,
        updatedAt: new Date().toISOString()
    }

    await saveData('vendas', data)
    return data.vendas[index]
}

export async function deleteVenda(id) {
    const data = await loadData('vendas', '/data/vendas.json')
    const index = data.vendas.findIndex(v => v.id === parseInt(id))

    if (index === -1) throw new Error('Venda não encontrada')

    const venda = data.vendas[index]

    // Estorno de estoque ao excluir venda
    if (venda.items && venda.items.length > 0) {
        await updateStock(venda.items, 'increase')
    }

    data.vendas.splice(index, 1)
    await saveData('vendas', data)
    return true
}

// ==================== CUSTOMERS ====================

export async function getCustomers() {
    const data = await loadData('customers', '/data/customers.json')
    return data.customers
}

export async function getCustomerById(id) {
    const customers = await getCustomers()
    return customers.find(c => c.id === parseInt(id))
}

async function updateCustomerOrders(customerId, orderId, orderValue) {
    const data = await loadData('customers', '/data/customers.json')
    const index = data.customers.findIndex(c => c.id === parseInt(customerId))

    if (index === -1) return

    const customer = data.customers[index]
    customer.orders.push(orderId)
    customer.totalOrders++
    customer.totalSpent += orderValue
    customer.lastOrderAt = new Date().toISOString()

    await saveData('customers', data)
}

export async function updateCustomer(id, customerData) {
    const data = await loadData('customers', '/data/customers.json')
    const index = data.customers.findIndex(c => c.id === parseInt(id))

    if (index === -1) throw new Error('Cliente não encontrado')

    data.customers[index] = {
        ...data.customers[index],
        ...customerData
    }

    await saveData('customers', data)
    return data.customers[index]
}

export async function createCustomer(customerData) {
    const data = await loadData('customers', '/data/customers.json')

    const newCustomer = {
        ...customerData,
        id: data.nextId,
        orders: [],
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
        lastOrderAt: null
    }

    data.customers.push(newCustomer)
    data.nextId++

    await saveData('customers', data)
    return newCustomer
}

export async function deleteCustomer(id) {
    const data = await loadData('customers', '/data/customers.json')
    const index = data.customers.findIndex(c => c.id === parseInt(id))

    if (index === -1) throw new Error('Cliente não encontrado')

    data.customers.splice(index, 1)
    await saveData('customers', data)
    return true
}

// ==================== SETTINGS ====================

export async function getSettings() {
    return await loadData('settings', '/data/settings.json')
}

export async function updateSettings(settingsData) {
    await saveData('settings', updated)
    return updated
}

// ==================== COUPONS ====================

export async function getCoupons() {
    const data = await loadData('coupons', '/data/coupons.json')
    return data.coupons || []
}

export async function createCoupon(couponData) {
    const data = await loadData('coupons', '/data/coupons.json')

    if (!data.coupons) data.coupons = []
    if (!data.nextId) data.nextId = 1

    const newCoupon = {
        ...couponData,
        id: data.nextId,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        isActive: true
    }

    data.coupons.unshift(newCoupon)
    data.nextId++

    await saveData('coupons', data)
    return newCoupon
}

export async function updateCoupon(id, couponData) {
    const data = await loadData('coupons', '/data/coupons.json')
    const index = data.coupons.findIndex(c => c.id === parseInt(id))

    if (index === -1) throw new Error('Cupom não encontrado')

    data.coupons[index] = {
        ...data.coupons[index],
        ...couponData,
        updatedAt: new Date().toISOString()
    }

    await saveData('coupons', data)
    return data.coupons[index]
}

export async function deleteCoupon(id) {
    const data = await loadData('coupons', '/data/coupons.json')
    const index = data.coupons.findIndex(c => c.id === parseInt(id))

    if (index === -1) throw new Error('Cupom não encontrado')

    data.coupons.splice(index, 1)
    await saveData('coupons', data)
    return true
}

// ==================== CLEAR CACHE ====================

export function clearCache() {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
    })
}
