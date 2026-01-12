/**
 * API de Estoque Inteligente
 * Gestão de estoque com BI e rastreabilidade
 */

import { supabase } from '../supabase'
import { toCamelCase } from './helpers'

/**
 * Função para decrementar estoque de produtos quando uma venda é feita
 * @param {Array} items - Items do pedido com productId, quantity, selectedSize, selectedColor
 * @param {Object} productsMap - Mapa de produtos com dados atuais
 */
export async function decrementProductStock(items, productsMap) {
    try {
        console.log('📦 Iniciando decréscimo de estoque para', items.length, 'produtos');

        // Para cada item do pedido
        for (const item of items) {
            const productId = item.productId;
            const quantity = item.quantity || 1;
            const selectedSize = item.selectedSize;
            const selectedColor = item.selectedColor;

            if (!productId) {
                console.warn('⚠️ Item sem productId, pulando decréscimo de estoque');
                continue;
            }

            // Buscar produto atual com variants
            const { data: currentProduct, error: fetchError } = await supabase
                .from('products')
                .select('id, variants, stock')
                .eq('id', productId)
                .single();

            if (fetchError) {
                console.error(`❌ Erro ao buscar produto ${productId}:`, fetchError);
                throw new Error(`Não foi possível atualizar estoque do produto ${productId}`);
            }

            if (!currentProduct) {
                console.warn(`⚠️ Produto ${productId} não encontrado`);
                continue;
            }

            console.log(`📍 Decrementando estoque para produto ${productId}:`);
            console.log(`   - Cor: ${selectedColor}, Tamanho: ${selectedSize}, Quantidade: ${quantity}`);

            // Copiar variants para modificar
            let updatedVariants = JSON.parse(JSON.stringify(currentProduct.variants || []));

            // Se não houver variants, criar estrutura padrão
            if (updatedVariants.length === 0) {
                console.warn(`⚠️ Produto ${productId} sem variantes definidas`);
                continue;
            }

            // Encontrar a variante correta (por cor)
            // ✅ Prioridade: selectedColor. Somente usa color como fallback se selectedColor for omisso.
            const variantIndex = updatedVariants.findIndex(
                v => selectedColor
                    ? v.colorName === selectedColor
                    : v.colorName === currentProduct.color
            );

            if (variantIndex === -1) {
                console.warn(`⚠️ Cor "${selectedColor}" não encontrada no produto ${productId}`);
                console.log('   Cores disponíveis:', updatedVariants.map(v => v.colorName).join(', '));
                continue;
            }

            const variant = updatedVariants[variantIndex];

            // Encontrar o tamanho correto no sizeStock
            const sizeStockIndex = variant.sizeStock?.findIndex(s => s.size === selectedSize);

            if (sizeStockIndex === undefined || sizeStockIndex === -1) {
                console.warn(`⚠️ Tamanho "${selectedSize}" não encontrado na cor "${selectedColor}"`);
                console.log('   Tamanhos disponíveis:', variant.sizeStock?.map(s => s.size).join(', '));
                continue;
            }

            // Verificar se há estoque suficiente
            const currentStockQuantity = variant.sizeStock[sizeStockIndex].quantity || 0;

            if (currentStockQuantity < quantity) {
                console.error(
                    `❌ Estoque insuficiente: ${currentStockQuantity} disponível, ${quantity} solicitado`
                );
                throw new Error(
                    `Estoque insuficiente para ${variant.colorName} - Tamanho ${selectedSize}`
                );
            }

            // Decrementar o estoque
            const oldQty = variant.sizeStock[sizeStockIndex].quantity;
            variant.sizeStock[sizeStockIndex].quantity -= quantity;
            const newQty = variant.sizeStock[sizeStockIndex].quantity;

            console.log(`📉 DECREMENTO: ${selectedColor} - ${selectedSize}: ${oldQty} → ${newQty} unidades`);

            // Calcular novo estoque total
            const newTotalStock = updatedVariants.reduce((total, v) => {
                return total + (v.sizeStock || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
            }, 0);

            console.log(`📊 Estoque total do produto será atualizado para: ${newTotalStock}`);

            // Log detalhado para produto ID 24
            if (productId === 24) {
                console.log('🔍 ATUALIZANDO PRODUTO ID 24 NO BANCO:');
                console.log('   Novo stock total:', newTotalStock);
                // Remover images/urls das variants para logs mais limpos
                const variantsClean = updatedVariants?.map(v => ({
                    colorName: v.colorName,
                    colorHex: v.colorHex,
                    sizeStock: v.sizeStock
                }));
                console.log('   Variants atualizadas:', JSON.stringify(variantsClean, null, 2));
            }

            // Atualizar produto no banco com novos variants e stock
            const updatePayload = {
                variants: updatedVariants,
                stock: newTotalStock,
                updated_at: new Date().toISOString()
            };

            console.log(`💾 Enviando UPDATE para produto ${productId}...`);

            const { data: updateData, error: updateError } = await supabase
                .from('products')
                .update(updatePayload)
                .eq('id', productId)
                .select(); // Retorna o produto atualizado

            if (updateError) {
                console.error(`❌ Erro ao atualizar estoque do produto ${productId}:`, updateError);
                throw new Error(`Falha ao atualizar estoque do produto ${productId}`);
            }

            console.log(`✅ BANCO ATUALIZADO: Produto ${productId} agora tem stock total = ${newTotalStock}`);

            // Registrar movimentação no histórico
            try {
                await supabase.from('stock_movements').insert({
                    product_id: productId,
                    quantity: quantity,
                    movement_type: 'venda',
                    notes: `Venda automática (Item: ${selectedColor}/${selectedSize})`
                });
                console.log(`📝 Movimentação registrada: venda - ${quantity} un.`);
            } catch (movError) {
                console.error('⚠️ Falha ao registrar movimentação de estoque:', movError);
                // Não falhar a operação principal, apenas logar erro
            }

            // Confirmar o que foi salvo no banco
            if (productId === 24 && updateData && updateData.length > 0) {
                console.log('✅ CONFIRMAÇÃO DO BANCO - Produto ID 24:');
                console.log('   Stock salvo:', updateData[0].stock);
                // Remover images/urls das variants para logs mais limpos
                const variantsSaved = updateData[0].variants?.map(v => ({
                    colorName: v.colorName,
                    colorHex: v.colorHex,
                    sizeStock: v.sizeStock
                }));
                console.log('   Variants salvas:', JSON.stringify(variantsSaved, null, 2));
            }
        }

        return true;
    } catch (error) {
        console.error('❌ Erro crítico no decréscimo de estoque:', error);
        throw error;
    }
}

/**
 * Buscar relatório completo de estoque
 */
export async function getStockReport() {
    const { data, error } = await supabase
        .from('stock_report')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Erro ao buscar relatório de estoque:', error)
        // Fallback: buscar direto da tabela products se a view não existir
        return getStockReportFallback()
    }

    return data.map(toCamelCase)
}

/**
 * Fallback caso a view não exista ainda
 */
async function getStockReportFallback() {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, price, cost_price, stock, stock_status, trip_count, created_at, last_status_change, category, brand, color, sizes, images, variants, active')
        .eq('active', true)
        .order('created_at', { ascending: false })

    if (error) throw error

    // Calcular métricas manualmente
    return data.map(product => {
        const costPrice = product.cost_price || 0
        const price = product.price || 0
        const createdAt = new Date(product.created_at)
        const now = new Date()
        const daysInStock = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))
        const marginValue = price - costPrice
        const marginPercent = price > 0 ? ((marginValue / price) * 100).toFixed(2) : 0
        const markup = costPrice > 0 ? (price / costPrice).toFixed(2) : 0
        const stockStatus = product.stock_status || 'disponivel'
        const tripCount = product.trip_count || 0

        let ageStatus = 'normal'
        if (daysInStock > 90 && stockStatus !== 'vendido') ageStatus = 'critico'
        else if (daysInStock > 60 && stockStatus !== 'vendido') ageStatus = 'alerta'
        else if (daysInStock < 30) ageStatus = 'novo'

        return {
            id: product.id,
            name: product.name,
            images: product.images,
            category: product.category,
            brand: product.brand,
            color: product.color,
            sizes: product.sizes,
            variants: product.variants,
            costPrice,
            price,
            stock: product.stock || 0,
            stockStatus,
            tripCount,
            createdAt: product.created_at,
            lastStatusChange: product.last_status_change,
            marginValue,
            marginPercent: parseFloat(marginPercent),
            markup: parseFloat(markup),
            daysInStock,
            ageStatus,
            needsReview: tripCount >= 5 || daysInStock >= 90
        }
    })
}

/**
 * Buscar métricas resumidas do estoque
 */
export async function getStockMetrics() {
    // Buscar TODOS os produtos (não filtrar por active) para bater com ProductsList
    const { data: products, error } = await supabase
        .from('products')
        .select('id, price, cost_price, stock, stock_status, trip_count, created_at, active')

    if (error) {
        console.error('Erro ao buscar métricas de estoque:', error)
        throw error
    }

    const now = new Date()

    const metrics = {
        totalProducts: products.length,
        totalCostValue: 0,
        totalSaleValue: 0,
        inStock: 0,
        inMalinha: 0,
        sold: 0,
        quarantine: 0,
        criticalAge: 0,
        alertAge: 0,
        newProducts: 0,
        needsReview: 0,
        totalPieces: 0
    }

    products.forEach(p => {
        const stock = p.stock || 0
        const costPrice = p.cost_price || 0
        const price = p.price || 0
        const status = p.stock_status || 'disponivel'
        const tripCount = p.trip_count || 0
        const createdAt = new Date(p.created_at)
        const daysInStock = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))

        // Cálculo de valores: custo * quantidade e preço * quantidade
        metrics.totalPieces += stock
        metrics.totalCostValue += costPrice * stock
        metrics.totalSaleValue += price * stock

        // Status
        if (status === 'disponivel') metrics.inStock++
        else if (status === 'em_malinha') metrics.inMalinha++
        else if (status === 'vendido') metrics.sold++
        else if (status === 'quarentena') metrics.quarantine++

        // Idade (apenas produtos disponíveis e ativos)
        if (p.active && daysInStock > 90 && stock > 0 && status === 'disponivel') {
            metrics.criticalAge++
        } else if (p.active && daysInStock > 60 && stock > 0 && status === 'disponivel') {
            metrics.alertAge++
        } else if (p.active && daysInStock < 30) {
            metrics.newProducts++
        }

        // Produtos que precisam análise (5+ viagens ou 90+ dias, apenas ativos)
        if (p.active && (tripCount >= 5 || daysInStock >= 90)) {
            metrics.needsReview++
        }
    })

    return metrics
}

/**
 * Buscar ranking de vendas por categoria
 */
export async function getSalesRankingByCategory(startDate, endDate) {
    // 1. Buscar vendas
    let query = supabase
        .from('vendas')
        .select('items, total_value, created_at')
        .eq('payment_status', 'paid')

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data: vendas, error } = await query

    if (error) throw error

    // 2. Buscar TODOS os produtos para "consertar" dados históricos sem categoria
    // Isso resolve o problema de vendas antigas que não salvaram a categoria no JSON
    const { data: products } = await supabase
        .from('products')
        .select('id, name, category, color, sizes')

    // Mapa de Recuperação: ID/Nome -> Categoria
    // Normalizamos para lowerCase para maximizar matches
    const productMap = new Map()
    products?.forEach(p => {
        if (p.id) productMap.set(String(p.id), p)
        if (p.name) productMap.set(p.name.toLowerCase().trim(), p)
    })

    // Agregar por categoria, cor, tamanho, marca
    const aggregations = {
        byCategory: {},
        byColor: {},
        bySize: {},
        byBrand: {},
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
            const margin = price - (item.costPrice || 0)
            const itemNameRef = item.name ? item.name.toLowerCase().trim() : ''
            const itemIdRef = String(item.productId || item.id || '')

            // Tentar recuperar dados do produto oficial se faltar no item da venda
            const officialProduct = productMap.get(itemIdRef) || productMap.get(itemNameRef)

            // Por categoria (Recuperação inteligente)
            let cat = item.category
            if (!cat || cat === 'Sem categoria') {
                cat = officialProduct?.category || 'Geral'
            }

            if (!aggregations.byCategory[cat]) {
                aggregations.byCategory[cat] = { name: cat, qty: 0, revenue: 0, margin: 0 }
            }
            aggregations.byCategory[cat].qty += qty
            aggregations.byCategory[cat].revenue += price * qty
            aggregations.byCategory[cat].margin += margin * qty

            // Por cor
            let color = item.selectedColor || item.color
            if ((!color || color === 'Sem cor') && officialProduct) {
                // Tenta pegar a primeira cor se não tiver
                // Isso é menos preciso que a categoria, mas ajuda
                // Idealmente o histórico deveria ter salvo, mas...
                // Deixamos como está se não acharmos fácil
            }
            color = color || 'Sem cor'

            if (!aggregations.byColor[color]) {
                aggregations.byColor[color] = { name: color, qty: 0, revenue: 0, margin: 0 }
            }
            aggregations.byColor[color].qty += qty
            aggregations.byColor[color].revenue += price * qty
            aggregations.byColor[color].margin += margin * qty

            // Por tamanho
            const size = item.selectedSize || 'Sem tamanho'
            if (!aggregations.bySize[size]) {
                aggregations.bySize[size] = { name: size, qty: 0, revenue: 0, margin: 0 }
            }
            aggregations.bySize[size].qty += qty
            aggregations.bySize[size].revenue += price * qty
            aggregations.bySize[size].margin += margin * qty

            // Por produto
            const productId = item.productId || item.name
            if (!aggregations.byProduct[productId]) {
                aggregations.byProduct[productId] = {
                    id: item.productId,
                    name: item.name,
                    image: item.image,
                    qty: 0,
                    revenue: 0,
                    margin: 0
                }
            }
            aggregations.byProduct[productId].qty += qty
            aggregations.byProduct[productId].revenue += price * qty
            aggregations.byProduct[productId].margin += margin * qty
        })
    })

    // Converter para arrays e ordenar
    return {
        byCategory: Object.values(aggregations.byCategory).sort((a, b) => b.qty - a.qty),
        byColor: Object.values(aggregations.byColor).sort((a, b) => b.qty - a.qty),
        bySize: Object.values(aggregations.bySize).sort((a, b) => b.qty - a.qty),
        byProduct: Object.values(aggregations.byProduct).sort((a, b) => b.qty - a.qty),
        byProfit: Object.values(aggregations.byProduct).sort((a, b) => b.margin - a.margin)
    }
}

/**
 * Buscar produtos parados (cemitério)
 */
export async function getDeadStock(minDays = 60) {
    const { data, error } = await supabase
        .from('products')
        // select key columns including cost metrics
        .select('id, name, price, cost_price, stock, created_at, category, images')
        .eq('active', true)
        .gt('stock', 0) // Changed from .neq('stock_status', 'vendido') to .gt('stock', 0)
        .order('created_at', { ascending: true })

    if (error) throw error

    const now = new Date()
    const deadStock = data
        .map(p => {
            const createdAt = new Date(p.created_at)
            const daysInStock = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))
            return { ...toCamelCase(p), daysInStock }
        })
        .filter(p => p.daysInStock >= minDays)
        .sort((a, b) => b.daysInStock - a.daysInStock)

    const totalCostParado = deadStock.reduce((sum, p) => sum + ((p.costPrice || (p.price * 0.5)) * (p.stock || 1)), 0)

    return {
        products: deadStock,
        totalCost: totalCostParado,
        count: deadStock.length
    }
}

/**
 * Gerar lista de auditoria (contagem cíclica)
 */
export async function generateAuditList(count = 15) {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, images, category, brand, stock, stock_status, variants')
        .eq('active', true)

    if (error) throw error

    // Embaralhar e pegar N aleatórios
    const shuffled = data.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, count)

    return selected.map(p => ({
        ...toCamelCase(p),
        checkedQty: null,
        checkedAt: null,
        discrepancy: null
    }))
}

/**
 * Atualizar status do estoque de um produto
 */
export async function updateStockStatus(productId, newStatus, notes = '') {
    // Buscar status atual
    const { data: current } = await supabase
        .from('products')
        .select('stock_status')
        .eq('id', productId)
        .single()

    const fromStatus = current?.stock_status || 'disponivel'

    // Atualizar produto
    const { error: updateError } = await supabase
        .from('products')
        .update({
            stock_status: newStatus,
            last_status_change: new Date().toISOString()
        })
        .eq('id', productId)

    if (updateError) throw updateError

    // Registrar movimentação
    let movementType = 'ajuste'
    const movementNotes = `Status alterado de ${fromStatus} para ${newStatus}`

    // Mapear status para tipos de movimento compatíveis com a view
    if (newStatus === 'em_malinha') movementType = 'saida_malinha'
    else if (fromStatus === 'em_malinha' && newStatus === 'disponivel') movementType = 'retorno_malinha'

    // Inserir registro com schema padrão (quantity, type)
    await supabase.from('stock_movements').insert({
        product_id: productId,
        quantity: 0, // Ajuste de status não altera quantidade física necessariamente, mas registra evento
        movement_type: movementType,
        notes: movementNotes
    })

    return { success: true }
}

/**
 * Buscar histórico de movimentações de um produto
 */
export async function getProductMovements(productId) {
    const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

    if (error) {
        // Tabela pode não existir ainda
        console.warn('Tabela stock_movements não existe:', error)
        return []
    }

    return data.map(toCamelCase)
}

/**
 * Atualizar marca de um produto
 */
export async function updateProductBrand(productId, brand) {
    const { error } = await supabase
        .from('products')
        .update({ brand })
        .eq('id', productId)

    if (error) throw error
    return { success: true }
}

/**
 * Buscar todas as marcas cadastradas
 */
export async function getAllBrands() {
    const { data, error } = await supabase
        .from('products')
        .select('brand')
        .not('brand', 'is', null)

    if (error) throw error

    const brands = [...new Set(data.map(p => p.brand).filter(Boolean))]
    return brands.sort()
}

/**
 * Buscar todas as categorias
 */
export async function getAllCategories() {
    const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)

    if (error) throw error

    const categories = [...new Set(data.map(p => p.category).filter(Boolean))]
    return categories.sort()
}

// ==============================================================================
// NOVAS FUNÇÕES OTIMIZADAS PARA O CENTRO DE DECISÃO (PERFORMANCE)
// ==============================================================================

/**
 * Buscar apenas os KPIs essenciais para o Header do Dashboard
 * Leve e rápido.
 */
export async function getStockHeadlineKPIs() {
    const { data, error } = await supabase
        .from('products')
        .select('id, stock, price, cost_price, stock_status')
        .eq('active', true)

    if (error) {
        console.error('❌ Erro ao buscar KPIs de estoque:', error)
        throw error
    }

    let totalValue = 0
    let totalCost = 0
    let totalItems = 0
    let productsCount = data.length
    let lowStockCount = 0

    data.forEach(p => {
        const stock = p.stock || 0
        totalItems += stock
        totalValue += (p.price || 0) * stock
        totalCost += (p.cost_price || 0) * stock
        if (stock <= 2) lowStockCount++
        // Se quiséssemos ser super precisos com variants, precisaríamos de join,
        // mas para headline rápido, usar stock da tabela products é aceitável.
    })

    return {
        totalValue,
        totalCost,
        totalItems,
        productsCount,
        lowStockCount
    }
}

/**
 * Buscar produtos com estoque baixo (Alerta de Reposição)
 * @param {number} limit limit
 */
export async function getLowStockAlerts(limit = 10) {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, stock, images, category, suppliers(name)')
        .eq('active', true)
        .lte('stock', 2) // Hardcoded 2 for simple low stock logic
        .order('stock', { ascending: true })
        .limit(limit)

    if (error) {
        console.error('❌ Erro ao buscar alertas de estoque baixo:', error)
        throw error
    }

    return toCamelCase(data)
}

/**
 * Buscar resumo de estoque morto (Dead Stock) sem carregar tudo
 * Usa created_at como proxy para "velho" se last_sale não existir,
 * ou idealmente usaria uma coluna 'last_sale_date'.
 * Assumindo created_at para simplificar se não houver registro de venda.
 */
export async function getDeadStockSummary() {
    // Data de corte: 90 dias atrás
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)
    const cutoffStr = cutoffDate.toISOString()

    // Produtos criados antes de 90 dias e que ainda tem estoque > 0
    // (Lógica simples: velho e encalhado)
    const { data, error } = await supabase
        .from('products')
        .select('id, name, stock, cost_price, created_at, images')
        .eq('active', true)
        .gt('stock', 0)
        .lt('created_at', cutoffStr)
        .order('created_at', { ascending: true })
        .limit(20)

    if (error) {
        console.error('❌ Erro ao buscar dead stock:', error)
        throw error
    }

    const totalDeadValue = data.reduce((acc, p) => acc + ((p.cost_price || 0) * (p.stock || 0)), 0)

    return {
        count: data.length, // Atenção: isso é só count do limit. Para count total precisaria de count: 'exact'
        totalValue: totalDeadValue,
        items: toCamelCase(data)
    }
}
