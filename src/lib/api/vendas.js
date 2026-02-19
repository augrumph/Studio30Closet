/**
 * API de Vendas
 * CRUD e operações relacionadas a vendas
 */

import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers'
import { decrementProductStock } from './stock'

/**
 * Listar vendas paginadas
 */
export async function getVendas(page = 1, limit = 30) {
    console.log(`🔍 API: Getting vendas (page ${page}, limit ${limit})...`)
    const offset = (page - 1) * limit
    const { data, error, count } = await supabase
        .from('vendas')
        .select('id, customer_id, total_value, discount_amount, original_total, payment_method, payment_status, created_at, fee_amount, net_amount, items, entry_payment, is_installment, customers(id, name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (error) {
        console.error('❌ API Error getting vendas:', error)
        throw error
    }

    console.log(`✅ API: Got ${data?.length || 0} vendas (total: ${count})`)

    const camelCasedData = data.map(toCamelCase)

    return {
        vendas: camelCasedData.map(venda => ({
            ...venda,
            customerName: venda.customers ? venda.customers.name : 'Cliente desconhecido',
            items: venda.items || []
        })),
        total: count,
        page,
        limit
    }
}

/**
 * Buscar venda por ID
 */
export async function getVendaById(id) {
    const { data, error } = await supabase
        .from('vendas')
        .select(`
            *,
            customers (id, name),
            items: venda_items (*)
        `)
        .eq('id', id)
        .single()

    if (error) {
        // Fallback: Tentar buscar itens da coluna items se venda_items falhar (compatibilidade)
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('vendas')
            .select(`
                *,
                customers (id, name)
            `)
            .eq('id', id)
            .single()

        if (fallbackError) throw fallbackError

        return {
            ...toCamelCase(fallbackData),
            customerName: fallbackData.customers?.name,
            items: (fallbackData.items || []).map(i => ({
                ...i,
                productId: i.product_id || i.productId,
                costPrice: i.cost_price,
                costPriceAtTime: i.cost_price_at_time
            }))
        }
    }

    // Normalizar dados (similar ao getVendas)
    const camel = toCamelCase(data)
    return {
        ...camel,
        customerName: data.customers ? data.customers.name : 'Cliente desconhecido',
        items: camel.items || [] // Se vier de venda_items, já estaria mapeado, mas nosso padrão atual é JSON items na tabela
    }
}

/**
 * Criar nova venda
 * @param {Object} vendaData - Dados da venda
 * @param {Function} decrementStockFn - Função para decrementar estoque (opcional)
 */
export async function createVenda(vendaData) {
    console.log('API: Creating venda with data:', vendaData)
    const snakeData = toSnakeCase(vendaData)

    const vendaRecord = {
        order_id: snakeData.order_id || null,
        customer_id: snakeData.customer_id,
        total_value: snakeData.total_value,
        discount_amount: snakeData.discount_amount || snakeData.discount_value || 0,
        original_total: snakeData.original_total || 0,
        cost_price: snakeData.cost_price || null,
        items: snakeData.items || [],
        payment_method: snakeData.payment_method,
        payment_status: snakeData.payment_status || (snakeData.payment_method === 'fiado' ? 'pending' : 'paid'),
        card_brand: snakeData.card_brand || null,
        fee_percentage: snakeData.fee_percentage || 0,
        fee_amount: snakeData.fee_amount || 0,
        net_amount: snakeData.net_amount,
        is_installment: snakeData.is_installment || false,
        num_installments: snakeData.num_installments || 1,
        entry_payment: snakeData.entry_payment || 0,
        installment_start_date: snakeData.installment_start_date || null
    }

    const { data, error } = await supabase
        .from('vendas')
        .insert([vendaRecord])
        .select()
        .single()

    if (error) {
        console.error('API Error creating venda:', error)
        throw error
    }
    console.log('API: Created venda:', data)

    // Decrementar estoque para vendas diretas (não de malinha)
    const isFromMalinha = !!vendaRecord.order_id
    if (!isFromMalinha) {
        console.log('📦 Venda direta - iniciando baixa de estoque...')
        try {
            const itemsWithColor = vendaData.items.map(item => ({
                ...item,
                // Garantir que colorSelected ou selectedColor sejam passados como selectedColor para o decrementProductStock
                selectedColor: item.selectedColor || item.colorSelected || item.color || 'Padrão',
                selectedSize: item.selectedSize || item.sizeSelected || item.size || 'Único',
                quantity: item.quantity || 1
            }))

            console.log('📦 Itens para baixa:', JSON.stringify(itemsWithColor.map(i => ({
                id: i.productId,
                color: i.selectedColor,
                size: i.selectedSize,
                qty: i.quantity
            })), null, 2))

            await decrementProductStock(itemsWithColor)
            console.log('✅ Estoque baixado com sucesso!')
        } catch (stockError) {
            console.error('❌ ERRO CRÍTICO ao baixar estoque:', stockError)
            // Não vamos lançar erro para não travar a venda, mas idealmente deveria alertar
        }
    }

    return toCamelCase(data)
}

/**
 * Atualizar venda existente
 */
/**
 * Atualizar venda existente - VIA BACKEND
 */
export async function updateVenda(id, vendaData) {
    console.log('🚀 Sending updateVenda request to backend:', id);

    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/vendas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vendaData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Backend updated venda:', result);
        return result;
    } catch (error) {
        console.error('❌ Backend updateVenda failed:', error);
        throw error;
    }
}

/**
 * Deletar venda
 */
export async function deleteVenda(id) {
    const { error } = await supabase.from('vendas').delete().eq('id', id)
    if (error) throw error
    return true
}
