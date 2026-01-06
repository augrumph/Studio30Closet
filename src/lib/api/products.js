/**
 * API de Produtos
 * CRUD e operações relacionadas a produtos
 */

import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers'

/**
 * Carregar produtos paginados
 * @param {number} page - Número da página
 * @param {number} pageSize - Quantidade por página
 */
export async function getProducts(page = 1, pageSize = 20) {
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    console.log(`📡 Buscando produtos página ${page} (${start}-${end})...`)

    const { data, error, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end)

    if (error) {
        console.error('❌ Erro ao buscar produtos:', error)
        throw error
    }

    console.log(`✅ Produtos carregados: ${data?.length} de ${count} total`)

    const mappedProducts = data.map(product => {
        const camelProduct = toCamelCase(product)
        if (!camelProduct.variants) {
            camelProduct.variants = []
        }
        return camelProduct
    })

    return {
        products: mappedProducts,
        total: count,
        page,
        pageSize
    }
}

/**
 * Carregar todos os produtos (para catálogo)
 */
export async function getAllProducts() {
    const startTime = performance.now()
    console.log('📡 [Catálogo] Carregando todos os produtos...')

    const queryStart = performance.now()
    const { data, error } = await supabase
        .from('products')
        .select('id, name, price, original_price, images, category, is_new, is_featured, sizes, color, variants, stock, description')
        .order('created_at', { ascending: false })

    const queryTime = (performance.now() - queryStart).toFixed(0)

    if (error) {
        console.error('❌ [Catálogo] Erro na query:', error)
        throw error
    }

    console.log(`⏱️  [Catálogo] Query Supabase: ${queryTime}ms (${data?.length} produtos encontrados)`)

    const result = data.map(product => {
        const camel = toCamelCase(product)
        if (!camel.variants) {
            camel.variants = []
        }
        return camel
    })

    const totalTime = (performance.now() - startTime).toFixed(0)
    console.log(`✅ [Catálogo] Total: ${totalTime}ms (${result.length} produtos carregados)`)

    return result
}

/**
 * Buscar produto por ID
 */
export async function getProductById(id) {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return toCamelCase(data)
}

/**
 * Criar novo produto
 */
export async function createProduct(productData) {
    const snakeData = toSnakeCase(productData)
    console.log('Dados sendo enviados:', snakeData)

    const { data, error } = await supabase
        .from('products')
        .insert([snakeData])
        .select()
        .single()

    if (error) {
        console.error('Erro ao criar produto:', error)
        throw error
    }

    return toCamelCase(data)
}

/**
 * Atualizar produto existente
 */
export async function updateProduct(id, productData) {
    console.log('API: Updating product with id:', id)
    const snakeData = toSnakeCase(productData)

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
    }

    const { data, error } = await supabase
        .from('products')
        .update(productRecord)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('API Error updating product:', error)
        throw error
    }
    return toCamelCase(data)
}

/**
 * Deletar produto
 */
export async function deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    return true
}

/**
 * Deletar múltiplos produtos
 */
export async function deleteMultipleProducts(productIds) {
    const { error } = await supabase.from('products').delete().in('id', productIds)
    if (error) throw error
    return true
}
