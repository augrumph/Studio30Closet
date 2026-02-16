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

        // Lite columns: Exclui colunas pesadas com Base64 (variants, description) se não for busca full
        // images é incluído porque são URLs (não pesado) e necessário para exibição
        const selectColumns = isFull
            ? '*'
            : 'id, name, price, original_price, cost_price, category, stock, active, collection_ids, created_at, supplier_id, images'

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

        res.json({
            items: toCamelCase(data),
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
router.get('/metrics/sell-through', async (req, res) => {
    console.log('📊 Calculando Sell-Through Rate...')

    try {
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        // 1. VENDAS DO PERÍODO (Faturamento Bruto em preço de venda)
        const { data: vendas, error: vError } = await supabase
            .from('vendas')
            .select('total_value, payment_status')
            .gte('created_at', firstDayOfMonth)
            .lte('created_at', lastDayOfMonth)

        if (vError) throw vError

        const vendasTotais = (vendas || [])
            .filter(v => ['paid', 'pending'].includes(v.payment_status?.toLowerCase()))
            .reduce((sum, v) => sum + (v.total_value || 0), 0)

        // 2. ESTOQUE ATUAL (Valor de venda)
        const { data: products, error: pError } = await supabase
            .from('products')
            .select('price, stock, active')

        if (pError) throw pError

        const estoqueAtual = (products || [])
            .filter(p => p.active && p.stock > 0)
            .reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0)

        // 3. COMPRAS DO MÊS (Entradas - Valor em preço de venda)
        // Assume que compras têm markup médio de 2x (ou pode buscar o markup real de cada produto)
        const { data: purchases, error: purError } = await supabase
            .from('purchases')
            .select('value')
            .gte('date', firstDayOfMonth)
            .lte('date', lastDayOfMonth)

        if (purError) throw purError

        // Convertendo custo de compra para preço de venda (usando markup médio de 2x)
        // Em produção, você deveria buscar o markup real de cada compra
        const entradasMes = (purchases || []).reduce((sum, p) => sum + ((p.value || 0) * 2), 0)

        // 4. ESTOQUE INICIAL = Estoque Atual - Entradas + Vendas
        const estoqueInicial = estoqueAtual - entradasMes + vendasTotais

        // 5. FÓRMULA PERFEITA DO SELL-THROUGH
        const base = estoqueInicial + entradasMes
        const sellThroughRate = base > 0 ? (vendasTotais / base) * 100 : 0

        // 6. ANÁLISE QUALITATIVA
        let status = 'excellent'
        let message = 'Excelente! Meta atingida.'

        if (sellThroughRate < 20) {
            status = 'critical'
            message = 'Crítico! Estoque parado.'
        } else if (sellThroughRate < 30) {
            status = 'warning'
            message = 'Atenção! Abaixo da meta.'
        } else if (sellThroughRate <= 40) {
            status = 'good'
            message = 'Bom! Dentro da meta.'
        } else if (sellThroughRate > 60) {
            status = 'warning'
            message = 'Atenção! Risco de ruptura.'
        }

        res.json({
            sellThroughRate: Number(sellThroughRate.toFixed(1)),
            vendasTotais,
            estoqueInicial,
            entradasMes,
            base,
            status,
            message,
            periodo: {
                inicio: firstDayOfMonth,
                fim: lastDayOfMonth
            },
            metaIdeal: {
                min: 30,
                max: 40
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
