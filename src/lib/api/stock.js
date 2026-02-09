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
 * Buscar ranking de vendas por categoria (Via Backend BFF)
 */
export async function getSalesRankingByCategory(startDate, endDate, period = 'all') {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await fetch(`/api/stock/ranking?${params.toString()}`)
    if (!response.ok) throw new Error('Falha ao buscar ranking de vendas')
    return response.json()
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

// ==============================================================================
// NOVAS FUNÇÕES OTIMIZADAS PARA O CENTRO DE DECISÃO (PERFORMANCE)
// ==============================================================================

/**
 * Buscar apenas os KPIs essenciais para o Header do Dashboard
 * Leve e rápido. (Via Backend BFF)
 */
export async function getStockHeadlineKPIs() {
    const response = await fetch('/api/stock/kpis')
    if (!response.ok) throw new Error('Falha ao buscar KPIs de estoque')
    return response.json()
}

/**
 * Buscar produtos com estoque baixo (Alerta de Reposição)
 * @param {number} limit limit
 */
export async function getLowStockAlerts(limit = 10) {
    const response = await fetch(`/api/stock/low?limit=${limit}`)
    if (!response.ok) throw new Error('Falha ao buscar alertas de estoque')
    return response.json()
}

/**
 * Buscar resumo de estoque morto (Dead Stock) sem carregar tudo
 * Usa created_at como proxy para "velho" se last_sale não existir,
 * ou idealmente usaria uma coluna 'last_sale_date'.
 * Assumindo created_at para simplificar se não houver registro de venda.
 */
export async function getDeadStockSummary() {
    const response = await fetch('/api/stock/dead')
    if (!response.ok) throw new Error('Falha ao buscar dead stock')
    return response.json()
}

/**
 * 📊 MACHINE LEARNING / ADVANCED ANALYTICS (NOVA API)
 * Calcula KPIs profissionais de varejo: GMROI, Sell-Through, ABC, Inventory Health.
 */
export async function getAdvancedStockMetrics() {
    try {
        console.log('🔄 Calculando KPIs avançados de estoque (GMROI, Sell-Through, ABC)...')

        // 1. Buscar Estoque Atual (Snapshot)
        const { data: products } = await supabase
            .from('products')
            .select('id, name, stock, price, cost_price, created_at, category, images, suppliers(name)')
            .eq('active', true)

        // 2. Buscar Vendas dos Últimos 30 dias (para Velocity)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: sales } = await supabase
            .from('vendas')
            .select('items, total_value, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .neq('payment_status', 'cancelled')

        // MAPEAR VENDAS POR PRODUTO
        // productStats = map { productId: { soldQty, revenue, cogs } }
        const productStats = new Map()

        sales?.forEach(sale => {
            let items = sale.items
            if (typeof items === 'string') {
                try { items = JSON.parse(items) } catch { items = [] }
            }
            if (!Array.isArray(items)) items = []

            items.forEach(item => {
                const pid = String(item.productId || item.id)
                const qty = item.quantity || 1
                const price = item.price || 0
                // Tenta achar custo no item, se não, usa 0 (será corrigido com produto oficial depois)
                const cost = item.costPrice || 0

                if (!productStats.has(pid)) {
                    productStats.set(pid, { soldQty: 0, revenue: 0, cogs: 0 })
                }
                const stat = productStats.get(pid)
                stat.soldQty += qty
                stat.revenue += price * qty
                stat.cogs += cost * qty // Custo provisório
            })
        })

        // CONSTRUIR DATASET UNIFICADO
        let totalStockValue = 0 // PV
        let totalStockCost = 0 // CMV Inventariado
        let totalRevenue30d = 0
        let totalCOGS30d = 0
        let totalUnitsSold30d = 0
        let totalUnitsOnHand = 0

        const detailedProducts = products.map(p => {
            const pid = String(p.id)
            const stats = productStats.get(pid) || { soldQty: 0, revenue: 0, cogs: 0 }

            // Corrigir COGS se estava zerado na venda (usar custo atual do produto)
            if (stats.soldQty > 0 && stats.cogs === 0) {
                stats.cogs = stats.soldQty * (p.cost_price || 0)
            }

            const stock = p.stock || 0
            const cost = p.cost_price || 0
            const price = p.price || 0
            const margin = price - cost

            // Acumuladores Globais
            totalStockValue += stock * price
            totalStockCost += stock * cost
            totalRevenue30d += stats.revenue
            totalCOGS30d += stats.cogs
            totalUnitsSold30d += stats.soldQty
            totalUnitsOnHand += stock

            // --- CÁLCULO DE KPIS INDIVIDUAIS ---

            // 1. Sell-Through Rate (Velocity) %
            // = (Vendido / (Vendido + Estoque)) * 100
            const totalInventoryExposure = stats.soldQty + stock
            const sellThrough = totalInventoryExposure > 0
                ? (stats.soldQty / totalInventoryExposure) * 100
                : 0

            // 2. Weeks of Supply (Cobertura)
            // = Estoque Atual / (Venda Semanal Média)
            const weeklySalesRate = stats.soldQty / 4 // Média simples 30 dias / 4 semanas
            const weeksOfSupply = weeklySalesRate > 0
                ? stock / weeklySalesRate
                : stock > 0 ? 999 : 0 // 999 = infinito (encalhado), 0 = sem estoque

            // 3. GMROI Projectado (Anualizado simplificado)
            // = (Margem Bruta Mensal * 12) / Custo Estoque Médio
            // Usando custo atual como proxy do médio
            const grossMarginMonth = stats.revenue - stats.cogs
            const gmroi = (stock * cost) > 0
                ? (grossMarginMonth * 12) / (stock * cost)
                : 0

            return {
                ...toCamelCase(p),
                stats: {
                    soldQty30d: stats.soldQty,
                    revenue30d: stats.revenue,
                    cogs30d: stats.cogs,
                    sellThrough,
                    weeksOfSupply,
                    gmroi
                }
            }
        })

        // --- CÁLCULO DA CURVA ABC (CLASSIFICAÇÃO) ---
        // Classificar por Receita Gerada (Revenue Contribution)
        const sortedByRevenue = [...detailedProducts].sort((a, b) => b.stats.revenue30d - a.stats.revenue30d)

        let accumulatedRevenue = 0
        const productsWithABC = sortedByRevenue.map(p => {
            accumulatedRevenue += p.stats.revenue30d
            const accumulatedPercent = totalRevenue30d > 0 ? (accumulatedRevenue / totalRevenue30d) * 100 : 100

            let abcClass = 'C'
            if (accumulatedPercent <= 80) abcClass = 'A' // Top 80% faturamento
            else if (accumulatedPercent <= 95) abcClass = 'B' // Próximos 15%

            // Ajuste manual: Se vendeu 0, é automaticamente C ou Dead Stock
            if (p.stats.revenue30d === 0) abcClass = 'C'

            return { ...p, abcClass }
        })

        // --- CÁLCULO DOS KPIS ELITE (HEADER) ---

        // 1. GMROI GLOBAL
        const globalGrossMargin = totalRevenue30d - totalCOGS30d
        const globalGMROI = totalStockCost > 0
            ? (globalGrossMargin * 12) / totalStockCost
            : 0

        // 2. SELL-THROUGH GLOBAL
        const globalSellThrough = (totalUnitsSold30d + totalUnitsOnHand) > 0
            ? (totalUnitsSold30d / (totalUnitsSold30d + totalUnitsOnHand)) * 100
            : 0

        // 3. INVENTORY HEALTH SCORE (0-100)
        // Base 100
        // - Penalidade por Dead Stock (> 60 dias sem venda e estoque > 0)
        // - Penalidade por Stockout (ABC A com estoque 0)
        // - Bônus por GMROI > 2
        let score = 80 // Start baseline

        const deadItems = productsWithABC.filter(p => p.stats.soldQty30d === 0 && p.stock > 0).length
        const stockoutsA = productsWithABC.filter(p => p.abcClass === 'A' && p.stock === 0).length

        score -= (deadItems * 0.5) // P perde 0.5 ponto por item parado
        score -= (stockoutsA * 5) // Perde 5 pontos por produto A em falta (CRÍTICO)
        if (globalGMROI > 2) score += 10
        if (globalSellThrough > 40) score += 10

        // Clamp 0-100
        score = Math.max(0, Math.min(100, score))


        // --- DADOS PARA OS COMPONENTES VISUAIS ---

        // 1. Matriz de Risco (Scatter Plot Data)
        // Eixo X: Weeks of Supply, Eixo Y: Sell-Through

        // 2. Action Lists
        const reorderList = productsWithABC
            .filter(p => p.abcClass === 'A' && p.stats.weeksOfSupply < 2) // Curva A acabando em < 2 semanas
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 10)

        const liquidateList = productsWithABC
            .filter(p => p.stats.sellThrough < 5 && p.stock > 0 && p.daysInStock > 60) // Não vende e tá velho
            .sort((a, b) => b.stock - a.stock)
            .slice(0, 10)

        const topPerformers = productsWithABC
            .filter(p => p.stats.sellThrough > 50 && p.stock > 0)
            .slice(0, 5)

        return {
            kpis: {
                gmroi: globalGMROI,
                sellThrough: globalSellThrough,
                healthScore: score,
                totalStockCost,
                totalStockValue,
                totalUnitsOnHand,
                classA_Count: productsWithABC.filter(p => p.abcClass === 'A').length,
                stockouts_A: stockoutsA
            },
            actions: {
                reorder: reorderList,
                liquidate: liquidateList,
                top: topPerformers
            },
            inventory: productsWithABC // Full list for charts/table
        }

    } catch (error) {
        console.error('❌ Erro no cálculo avançado de estoque:', error)
        throw error
    }
}
