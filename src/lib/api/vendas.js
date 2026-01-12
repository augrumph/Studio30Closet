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
        .select('id, customer_id, total_value, payment_method, payment_status, created_at, fee_amount, net_amount, items, entry_payment, is_installment, customers(id, name)', { count: 'exact' })
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
        console.log('📦 Venda direta - decrementando estoque...')
        try {
            const itemsWithColor = vendaData.items.map(item => ({
                ...item,
                selectedColor: item.selectedColor || item.color || 'Padrão'
            }))
            await decrementProductStock(itemsWithColor)
            console.log('✅ Estoque decrementado com sucesso')
        } catch (stockError) {
            console.error('❌ ERRO ao decrementar estoque:', stockError)
        }
    }

    return toCamelCase(data)
}

/**
 * Atualizar venda existente
 */
export async function updateVenda(id, vendaData) {
    console.log('API: Updating venda with id:', id)
    const snakeData = toSnakeCase(vendaData)

    const vendaRecord = {
        order_id: snakeData.order_id || null,
        customer_id: snakeData.customer_id,
        total_value: snakeData.total_value,
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
        .update(vendaRecord)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('API Error updating venda:', error)
        throw error
    }
    return toCamelCase(data)
}

/**
 * Deletar venda
 */
export async function deleteVenda(id) {
    const { error } = await supabase.from('vendas').delete().eq('id', id)
    if (error) throw error
    return true
}
