import { supabase } from './supabase'

// ==================== HELPER FUNCTIONS ====================

// Converter camelCase para snake_case
function toSnakeCase(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => toSnakeCase(item));
    }

    const snakeObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeObj[snakeKey] = typeof value === 'object' && !Array.isArray(value) && value !== null
            ? toSnakeCase(value)
            : value;
    }
    return snakeObj;
}

// Converter snake_case para camelCase
function toCamelCase(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => toCamelCase(item));
    }

    const camelObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        camelObj[camelKey] = typeof value === 'object' && !Array.isArray(value) && value !== null
            ? toCamelCase(value)
            : value;
    }
    return camelObj;
}

// ==================== PRODUCTS ====================

export async function getProducts() {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function getProductById(id) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createProduct(productData) {
    const snakeData = toSnakeCase(productData);

    // Log para debug
    console.log('Dados sendo enviados:', snakeData);

    const { data, error } = await supabase
        .from('products')
        .insert([snakeData])
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar produto:', error);
        throw error;
    }

    return toCamelCase(data);
}

export async function updateProduct(id, productData) {
    console.log('API: Updating product with id:', id, 'and data:', productData);
    const snakeData = toSnakeCase(productData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const productRecord = {
        name: snakeData.name,
        price: snakeData.price,
        cost_price: snakeData.costPrice || snakeData.cost_price,
        description: snakeData.description,
        stock: snakeData.stock,
        sizes: snakeData.sizes,
        images: snakeData.images,
        category: snakeData.category,
        is_featured: snakeData.isFeatured || snakeData.is_featured,
        active: snakeData.active,
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        color: snakeData.color,
        variants: snakeData.variants,
        is_new: snakeData.isNew || snakeData.is_new,
        original_price: snakeData.originalPrice || snakeData.original_price
    };

    console.log('API: Prepared record for update:', productRecord);

    const { data, error } = await supabase
        .from('products')
        .update(productRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating product:', error);
        throw error;
    }
    console.log('API: Updated product:', data);
    return toCamelCase(data);
}

export async function deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
}

export async function deleteMultipleProducts(productIds) {
    const { error } = await supabase.from('products').delete().in('id', productIds);
    if (error) throw error;
    return true;
}

// ==================== CUSTOMERS ====================

export async function getCustomers() {
    console.log('API: Getting customers...');
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('API Error getting customers:', error);
        throw error;
    }
    console.log('API: Got customers:', data);
    return data.map(toCamelCase);
}

export async function getCustomerById(id) {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createCustomer(customerData) {
    console.log('API: Creating customer with data:', customerData);
    const snakeData = toSnakeCase(customerData);
    console.log('API: Converted to snake_case:', snakeData);
    const { data, error } = await supabase.from('customers').insert([snakeData]).select().single();
    if (error) {
        console.error('API Error creating customer:', error);
        throw error;
    }
    console.log('API: Created customer:', data);
    return toCamelCase(data);
}

export async function updateCustomer(id, customerData) {
    console.log('API: Updating customer with id:', id, 'and data:', customerData);
    const snakeData = toSnakeCase(customerData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const customerRecord = {
        name: snakeData.name,
        phone: snakeData.phone,
        email: snakeData.email || null,
        cpf: snakeData.cpf || null,
        address: snakeData.address || null,
        complement: snakeData.complement || null,
        instagram: snakeData.instagram || null,
        addresses: snakeData.addresses || []
    };

    console.log('API: Prepared record for update:', customerRecord);

    const { data, error } = await supabase
        .from('customers')
        .update(customerRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating customer:', error);
        throw error;
    }
    console.log('API: Updated customer:', data);
    return toCamelCase(data);
}

export async function deleteCustomer(id) {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== ORDERS ====================

export async function getOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('*, customers ( * ), order_items (count)')
        .order('created_at', { ascending: false });
    if (error) throw error;

    const camelCasedData = data.map(toCamelCase);

    return camelCasedData.map(order => ({
        ...order,
        orderNumber: `#${String(order.id).padStart(6, '0')}`,
        itemsCount: order.orderItems && order.orderItems.length > 0 ? order.orderItems[0].count : 0,
    }));
}

export async function getOrderById(id) {
    const { data, error } = await supabase
        .from('orders')
        .select('*, customers ( * ), order_items ( * )')
        .eq('id', id)
        .single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createOrder(orderData) {
    const { customer, items, ...restOfOrderData } = orderData;

    const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customer.phone)
        .single();

    let customerId;
    if (customerError && customerError.code !== 'PGRST116') {
        throw customerError;
    }

    if (customerData) {
        customerId = customerData.id;
    } else {
        const { data: newCustomer, error: newCustomerError } = await supabase
            .from('customers')
            .insert([customer])
            .select('id')
            .single();
        if (newCustomerError) throw newCustomerError;
        customerId = newCustomer.id;
    }

    // Mapear explicitamente os campos para a tabela 'orders'
    const orderRecord = {
        customer_id: customerId,
        status: restOfOrderData.status || 'pending',
        total_value: restOfOrderData.totalValue !== undefined
            ? restOfOrderData.totalValue
            : items.reduce((sum, item) => sum + (item.price || 0), 0),
        delivery_date: restOfOrderData.deliveryDate || null,
        pickup_date: restOfOrderData.pickupDate || null,
        converted_to_sale: restOfOrderData.convertedToSale !== undefined ? restOfOrderData.convertedToSale : false,
    };

    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([orderRecord])
        .select()
        .single();
    if (orderError) throw orderError;

    const orderItems = items.map(item => ({
        order_id: newOrder.id,
        product_id: item.productId,
        quantity: item.quantity,
        price_at_time: item.price,
        size_selected: item.selectedSize
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    return { ...newOrder, customers: customer, order_items: orderItems };
}

export async function updateOrder(id, orderData) {
    console.log('API: Updating order with id:', id, 'and data:', orderData);

    // Criar objeto com campos explícitos em snake_case para evitar problemas
    const orderRecord = {};

    // Mapear apenas campos que são colunas reais da tabela orders
    if (orderData.customerId !== undefined) orderRecord.customer_id = orderData.customerId;
    if (orderData.customer_id !== undefined) orderRecord.customer_id = orderData.customer_id;
    if (orderData.status !== undefined) orderRecord.status = orderData.status;
    if (orderData.totalValue !== undefined) orderRecord.total_value = orderData.totalValue;
    if (orderData.total_value !== undefined) orderRecord.total_value = orderData.total_value;
    if (orderData.deliveryDate !== undefined) orderRecord.delivery_date = orderData.deliveryDate;
    if (orderData.delivery_date !== undefined) orderRecord.delivery_date = orderData.delivery_date;
    if (orderData.pickupDate !== undefined) orderRecord.pickup_date = orderData.pickupDate;
    if (orderData.pickup_date !== undefined) orderRecord.pickup_date = orderData.pickup_date;
    if (orderData.convertedToSale !== undefined) orderRecord.converted_to_sale = orderData.convertedToSale;
    if (orderData.converted_to_sale !== undefined) orderRecord.converted_to_sale = orderData.converted_to_sale;

    console.log('API: Prepared record for update (only DB fields):', orderRecord);

    const { data, error } = await supabase
        .from('orders')
        .update(orderRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating order:', error);
        throw error;
    }
    console.log('API: Updated order:', data);
    return toCamelCase(data);
}

export async function deleteOrder(id) {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    return true;
}

export async function updateOrderStatus(id, newStatus) {
    const { data, error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id).select().single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function updateOrderSchedule(id, scheduleData) {
    console.log('API: Updating order schedule with id:', id, 'and data:', scheduleData);
    const snakeData = toSnakeCase(scheduleData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const scheduleRecord = {
        delivery_date: snakeData.deliveryDate || snakeData.delivery_date,
        pickup_date: snakeData.pickupDate || snakeData.pickup_date
    };

    console.log('API: Prepared record for update:', scheduleRecord);

    const { data, error } = await supabase
        .from('orders')
        .update(scheduleRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating order schedule:', error);
        throw error;
    }
    console.log('API: Updated order schedule:', data);
    return toCamelCase(data);
}

// ==================== VENDAS ====================

export async function getVendas() {
    const { data, error } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function createVenda(vendaData) {
    console.log('API: Creating venda with data:', vendaData);
    const snakeData = toSnakeCase(vendaData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const vendaRecord = {
        order_id: snakeData.order_id || null,
        customer_id: snakeData.customer_id,
        total_value: snakeData.total_value,
        cost_price: snakeData.cost_price || null,
        items: snakeData.items || [],
        payment_method: snakeData.payment_method,
        card_brand: snakeData.card_brand || null,
        fee_percentage: snakeData.fee_percentage || 0,
        fee_amount: snakeData.fee_amount || 0,
        net_amount: snakeData.net_amount
    };

    console.log('API: Prepared record for insert:', vendaRecord);

    const { data, error } = await supabase
        .from('vendas')
        .insert([vendaRecord])
        .select()
        .single();

    if (error) {
        console.error('API Error creating venda:', error);
        throw error;
    }
    console.log('API: Created venda:', data);
    return toCamelCase(data);
}

export async function updateVenda(id, vendaData) {
    console.log('API: Updating venda with id:', id, 'and data:', vendaData);
    const snakeData = toSnakeCase(vendaData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const vendaRecord = {
        order_id: snakeData.order_id || null,
        customer_id: snakeData.customer_id,
        total_value: snakeData.total_value,
        cost_price: snakeData.cost_price || null,
        items: snakeData.items || [],
        payment_method: snakeData.payment_method,
        card_brand: snakeData.card_brand || null,
        fee_percentage: snakeData.fee_percentage || 0,
        fee_amount: snakeData.fee_amount || 0,
        net_amount: snakeData.net_amount
    };

    console.log('API: Prepared record for update:', vendaRecord);

    const { data, error } = await supabase
        .from('vendas')
        .update(vendaRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating venda:', error);
        throw error;
    }
    console.log('API: Updated venda:', data);
    return toCamelCase(data);
}

export async function deleteVenda(id) {
    const { error } = await supabase.from('vendas').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== SETTINGS ====================

export async function getSettings() {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    // convert array of objects to a single object
    return data.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.value;
        return acc;
    }, {});
}

export async function updateSettings(settingsData) {
    const updates = Object.keys(settingsData).map(key =>
        supabase.from('settings').update({ value: settingsData[key] }).eq('setting_key', key)
    );
    const results = await Promise.all(updates);
    results.forEach(result => {
        if (result.error) throw result.error;
    });
    return true;
}


// ==================== COUPONS ====================

export async function getCoupons() {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function createCoupon(couponData) {
    console.log('API: Creating coupon with data:', couponData);
    const snakeData = toSnakeCase(couponData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const couponRecord = {
        code: snakeData.code,
        type: snakeData.type,
        value: snakeData.value,
        min_purchase: snakeData.min_purchase || null,
        expiry_date: snakeData.expiry_date || null,
        is_active: snakeData.is_active !== undefined ? snakeData.is_active : true,
        description: snakeData.description || null
    };

    console.log('API: Prepared record for insert:', couponRecord);

    const { data, error } = await supabase
        .from('coupons')
        .insert([couponRecord])
        .select()
        .single();

    if (error) {
        console.error('API Error creating coupon:', error);
        throw error;
    }
    console.log('API: Created coupon:', data);
    return toCamelCase(data);
}

export async function updateCoupon(id, couponData) {
    console.log('API: Updating coupon with id:', id, 'and data:', couponData);
    const snakeData = toSnakeCase(couponData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const couponRecord = {
        code: snakeData.code,
        type: snakeData.type,
        value: snakeData.value,
        min_purchase: snakeData.min_purchase || null,
        expiry_date: snakeData.expiry_date || null,
        is_active: snakeData.is_active !== undefined ? snakeData.is_active : true,
        description: snakeData.description || null
    };

    console.log('API: Prepared record for update:', couponRecord);

    const { data, error } = await supabase
        .from('coupons')
        .update(couponRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating coupon:', error);
        throw error;
    }
    console.log('API: Updated coupon:', data);
    return toCamelCase(data);
}

export async function deleteCoupon(id) {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) throw error;
    return true;
}


// ==================== SUPPLIERS ====================

export async function getSuppliers() {
    console.log('API: Getting suppliers...');
    const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('API Error getting suppliers:', error);
        throw error;
    }
    console.log('API: Got suppliers:', data);
    return data.map(toCamelCase);
}

export async function getSupplierById(id) {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createSupplier(supplierData) {
    console.log('API: Creating supplier with data:', supplierData);
    const snakeData = toSnakeCase(supplierData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const supplierRecord = {
        name: snakeData.name,
        cnpj: snakeData.cnpj || null,
        phone: snakeData.phone || null,
        email: snakeData.email || null,
        address: snakeData.address || null,
        city: snakeData.city || null,
        state: snakeData.state || null,
        zip_code: snakeData.zip_code || null,
        contact_person: snakeData.contact_person || null,
        notes: snakeData.notes || null
    };

    console.log('API: Prepared record for insert:', supplierRecord);

    const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierRecord])
        .select()
        .single();

    if (error) {
        console.error('API Error creating supplier:', error);
        throw error;
    }
    console.log('API: Created supplier:', data);
    return toCamelCase(data);
}

export async function updateSupplier(id, supplierData) {
    console.log('API: Updating supplier with id:', id, 'and data:', supplierData);
    const snakeData = toSnakeCase(supplierData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const supplierRecord = {
        name: snakeData.name,
        cnpj: snakeData.cnpj || null,
        phone: snakeData.phone || null,
        email: snakeData.email || null,
        address: snakeData.address || null,
        city: snakeData.city || null,
        state: snakeData.state || null,
        zip_code: snakeData.zip_code || null,
        contact_person: snakeData.contact_person || null,
        notes: snakeData.notes || null
    };

    console.log('API: Prepared record for update:', supplierRecord);

    const { data, error } = await supabase
        .from('suppliers')
        .update(supplierRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating supplier:', error);
        throw error;
    }
    console.log('API: Updated supplier:', data);
    return toCamelCase(data);
}

export async function deleteSupplier(id) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    return true;
}


// ==================== PURCHASES ====================

export async function getPurchases() {
    const { data, error } = await supabase.from('purchases').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function getPurchaseById(id) {
    const { data, error } = await supabase.from('purchases').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createPurchase(purchaseData) {
    console.log('API: Creating purchase with data:', purchaseData);
    const snakeData = toSnakeCase(purchaseData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const purchaseRecord = {
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        payment_method: snakeData.paymentMethod || snakeData.payment_method,
        value: snakeData.value,
        date: snakeData.date,
        pieces: snakeData.pieces || null,
        parcelas: snakeData.parcelas || null,
        notes: snakeData.notes || null
    };

    console.log('API: Prepared record for insert:', purchaseRecord);

    const { data, error } = await supabase
        .from('purchases')
        .insert([purchaseRecord])
        .select()
        .single();

    if (error) {
        console.error('API Error creating purchase:', error);
        throw error;
    }
    console.log('API: Created purchase:', data);
    return toCamelCase(data);
}

export async function updatePurchase(id, purchaseData) {
    console.log('API: Updating purchase with id:', id, 'and data:', purchaseData);
    const snakeData = toSnakeCase(purchaseData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const purchaseRecord = {
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        payment_method: snakeData.paymentMethod || snakeData.payment_method,
        value: snakeData.value,
        date: snakeData.date,
        pieces: snakeData.pieces || null,
        parcelas: snakeData.parcelas || null,
        notes: snakeData.notes || null
    };

    console.log('API: Prepared record for update:', purchaseRecord);

    const { data, error } = await supabase
        .from('purchases')
        .update(purchaseRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating purchase:', error);
        throw error;
    }
    console.log('API: Updated purchase:', data);
    return toCamelCase(data);
}

export async function deletePurchase(id) {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) throw error;
    return true;
}


// ==================== FIXED EXPENSES ====================

export async function getFixedExpenses() {
    const { data, error } = await supabase.from('fixed_expenses').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function getFixedExpenseById(id) {
    const { data, error } = await supabase.from('fixed_expenses').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createFixedExpense(expenseData) {
    const snakeData = toSnakeCase(expenseData);
    const { data, error } = await supabase.from('fixed_expenses').insert([snakeData]).select().single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function updateFixedExpense(id, expenseData) {
    console.log('API: Updating fixed expense with id:', id, 'and data:', expenseData);
    const snakeData = toSnakeCase(expenseData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const expenseRecord = {
        name: snakeData.name,
        value: snakeData.value,
        category: snakeData.category,
        recurrence: snakeData.recurrence,
        due_day: snakeData.dueDay || snakeData.due_day,
        paid: snakeData.paid,
        notes: snakeData.notes
    };

    console.log('API: Prepared record for update:', expenseRecord);

    const { data, error } = await supabase
        .from('fixed_expenses')
        .update(expenseRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating fixed expense:', error);
        throw error;
    }
    console.log('API: Updated fixed expense:', data);
    return toCamelCase(data);
}

export async function deleteFixedExpense(id) {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (error) throw error;
    return true;
}


// ==================== MATERIALS STOCK ====================

export async function getMaterialsStock() {
    const { data, error } = await supabase.from('materials_stock').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function getMaterialById(id) {
    const { data, error } = await supabase.from('materials_stock').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createMaterial(materialData) {
    const snakeData = toSnakeCase(materialData);
    const { data, error } = await supabase.from('materials_stock').insert([snakeData]).select().single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function updateMaterial(id, materialData) {
    console.log('API: Updating material with id:', id, 'and data:', materialData);
    const snakeData = toSnakeCase(materialData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const materialRecord = {
        name: snakeData.name,
        description: snakeData.description,
        quantity: snakeData.quantity,
        unit_cost: snakeData.unitCost || snakeData.unit_cost,
        category: snakeData.category,
        supplier_id: snakeData.supplierId || snakeData.supplier_id,
        min_stock_level: snakeData.minStockLevel || snakeData.min_stock_level
    };

    console.log('API: Prepared record for update:', materialRecord);

    const { data, error } = await supabase
        .from('materials_stock')
        .update(materialRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating material:', error);
        throw error;
    }
    console.log('API: Updated material:', data);
    return toCamelCase(data);
}

export async function deleteMaterial(id) {
    const { error } = await supabase.from('materials_stock').delete().eq('id', id);
    if (error) throw error;
    return true;
}


// ==================== CUSTOMER PREFERENCES ====================

export async function getCustomerPreferences(customerId) {
    const { data, error } = await supabase
        .from('customer_preferences')
        .select('*')
        .eq('customer_id', customerId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
    }

    return data ? toCamelCase(data) : null;
}

export async function updateCustomerPreferences(customerId, preferencesData) {
    const snakeData = toSnakeCase(preferencesData);

    // Primeiro, tentar atualizar o registro existente
    const { data, error } = await supabase
        .from('customer_preferences')
        .upsert([{ customer_id: customerId, ...snakeData }], { onConflict: 'customer_id' })
        .select()
        .single();

    if (error) throw error;
    return toCamelCase(data);
}

// ==================== PAYMENT FEES ====================

export async function getPaymentFees() {
    const { data, error } = await supabase.from('payment_fees').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCamelCase);
}

export async function getPaymentFeeById(id) {
    const { data, error } = await supabase.from('payment_fees').select('*').eq('id', id).single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function createPaymentFee(feeData) {
    const snakeData = toSnakeCase(feeData);
    const { data, error } = await supabase.from('payment_fees').insert([snakeData]).select().single();
    if (error) throw error;
    return toCamelCase(data);
}

export async function updatePaymentFee(id, feeData) {
    console.log('API: Updating payment fee with id:', id, 'and data:', feeData);
    const snakeData = toSnakeCase(feeData);
    console.log('API: Converted to snake_case:', snakeData);

    // Criar objeto com campos explícitos para evitar problemas
    const feeRecord = {
        payment_method: snakeData.paymentMethod || snakeData.payment_method,
        card_brand: snakeData.cardBrand || snakeData.card_brand,
        fee_percentage: snakeData.feePercentage || snakeData.fee_percentage,
        fee_fixed: snakeData.feeFixed || snakeData.fee_fixed,
        description: snakeData.description,
        is_active: snakeData.isActive || snakeData.is_active
    };

    console.log('API: Prepared record for update:', feeRecord);

    const { data, error } = await supabase
        .from('payment_fees')
        .update(feeRecord)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('API Error updating payment fee:', error);
        throw error;
    }
    console.log('API: Updated payment fee:', data);
    return toCamelCase(data);
}

export async function deletePaymentFee(id) {
    const { error } = await supabase.from('payment_fees').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// Delete all payment fees
export async function deleteAllPaymentFees() {
    const { error } = await supabase.from('payment_fees').delete().neq('id', 0);
    if (error) throw error;
    return true;
}

// Buscar taxa específica por método e bandeira
export async function getPaymentFee(paymentMethod, cardBrand = null) {
    let query = supabase.from('payment_fees').select('*').eq('payment_method', paymentMethod);

    if (cardBrand) {
        query = query.eq('card_brand', cardBrand);
    } else {
        query = query.is('card_brand', null);
    }

    const { data, error } = await query.single();
    if (error) return null;
    return toCamelCase(data);
}
