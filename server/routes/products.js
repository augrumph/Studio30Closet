import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// Listagem de Produtos com Paginação e Busca
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        search = '',
        category = 'all',
        active = 'all'
    } = req.query

    const from = (page - 1) * pageSize
    const to = from + Number(pageSize) - 1

    console.log(`🔍 Products API: Página ${page} [Search: "${search}"]`)

    try {
        const isFull = req.query.full === 'true'

        // Lite columns: Exclui colunas pesadas com Base64 (variants, description, images)
        // No modo lite, NÃO carregamos images (Base64) para velocidade máxima
        const selectColumns = isFull
            ? '*'
            : 'id, name, price, original_price, cost_price, category, stock, active, collection_ids, created_at, supplier_id'

        let query = supabase
            .from('products')
            .select(selectColumns, { count: 'exact' })

        // Aplicar filtros primeiro (mais eficiente)
        if (category !== 'all') {
            query = query.eq('category', category)
        }

        if (active !== 'all') {
            query = query.eq('active', active === 'true')
        }

        // Busca otimizada: suporta busca por nome, ID e categoria
        if (search) {
            const searchLower = search.toLowerCase().trim()
            // Se for número, busca por ID também
            if (!isNaN(searchLower)) {
                query = query.or(`name.ilike.%${searchLower}%,id.eq.${searchLower},category.ilike.%${searchLower}%`)
            } else {
                // Busca por nome e categoria
                query = query.or(`name.ilike.%${searchLower}%,category.ilike.%${searchLower}%`)
            }
        }

        // Ordenação e paginação por último
        query = query
            .order('name', { ascending: true })
            .range(from, to)

        const { data, count, error } = await query

        if (error) throw error

        // No modo lite, adicionar placeholder para imagens (evita Base64)
        const items = isFull
            ? toCamelCase(data)
            : toCamelCase(data).map(item => ({
                ...item,
                images: ['/placeholder-product.jpg'] // Placeholder rápido
            }))

        res.json({
            items,
            total: count,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(count / pageSize)
        })

    } catch (err) {
        console.error('❌ Erro na API de Produtos:', err)
        res.status(500).json({ error: 'Erro ao buscar produtos' })
    }
})

// Sell-Through Rate (STR) - Capacidade de Venda
// FÓRMULA AJUSTADA: Meta de Venda = Faturamento Estimado Total × 30%
router.get('/metrics/sell-through', async (req, res) => {
    console.log('📊 Calculando Sell-Through Rate (Fórmula Ajustada)...')

    try {
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        // 1. FATURAMENTO ESTIMADO TOTAL (Valor de venda do estoque TOTAL)
        const { data: products, error: pError } = await supabase
            .from('products')
            .select('price, stock, active')

        if (pError) throw pError

        const faturamentoEstimadoTotal = (products || [])
            .filter(p => p.active)
            .reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0)

        // 2. VENDAS DO MÊS (Faturamento Real)
        const { data: vendas, error: vError } = await supabase
            .from('vendas')
            .select('total_value, payment_status')
            .gte('created_at', firstDayOfMonth)
            .lte('created_at', lastDayOfMonth)

        if (vError) throw vError

        const vendasMes = (vendas || [])
            .filter(v => ['paid', 'pending'].includes(v.payment_status?.toLowerCase()))
            .reduce((sum, v) => sum + (v.total_value || 0), 0)

        // 3. META DE VENDA = 30% do Faturamento Estimado Total
        const metaVenda = faturamentoEstimadoTotal * 0.30

        // 4. CAPACIDADE DE VENDA (% da Meta Atingida)
        const sellThroughRate = metaVenda > 0 ? (vendasMes / metaVenda) * 100 : 0

        // 5. ANÁLISE QUALITATIVA
        let status = 'excellent'
        let message = 'Meta atingida! Parabéns!'

        if (sellThroughRate < 50) {
            status = 'critical'
            message = 'Crítico! Muito abaixo da meta.'
        } else if (sellThroughRate < 80) {
            status = 'warning'
            message = 'Atenção! Abaixo da meta.'
        } else if (sellThroughRate < 100) {
            status = 'good'
            message = 'Bom! Quase lá!'
        } else if (sellThroughRate >= 120) {
            status = 'excellent'
            message = 'Excelente! Superou a meta! 🎉'
        }

        // 6. FALTA PARA META
        const faltaParaMeta = Math.max(0, metaVenda - vendasMes)

        res.json({
            sellThroughRate: Number(sellThroughRate.toFixed(1)),
            vendasMes,
            faturamentoEstimadoTotal,
            metaVenda,
            faltaParaMeta,
            status,
            message,
            periodo: {
                inicio: firstDayOfMonth,
                fim: lastDayOfMonth
            }
        })

    } catch (err) {
        console.error('❌ Erro ao calcular STR:', err)
        res.status(500).json({ error: 'Erro ao calcular Sell-Through Rate' })
    }
})

// Detalhes do Produto
router.get('/:id', async (req, res) => {
    const { id } = req.params
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        res.json(toCamelCase(data))
    } catch (err) {
        console.error(`❌ Erro ao buscar produto ${id}:`, err)
        res.status(500).json({ error: 'Erro ao buscar produto' })
    }
})

export default router
