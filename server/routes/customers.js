import express from 'express'
import { pool } from '../db.js'
import { toCamelCase } from '../utils.js'
import { isValidCpf, normalizeCpf } from '../lib/cpf.js'
import { emitRealtimeEvent } from '../lib/realtime-events.js'

const router = express.Router()

/**
 * GET /api/customers
 * Listagem de clientes com métricas (LTV, Última Compra, etc)
 */
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 50,
        search = '',
        segment = 'all'
    } = req.query

    const offset = (page - 1) * pageSize
    const limit = Number(pageSize)

    console.log(`👥 Customers API: Página ${page} [Search: '${search}', Segment: '${segment}']`)

    try {
        // Query com métricas calculadas (LTV, última compra, total de compras)
        let whereConditions = []
        let params = []
        let paramIndex = 1

        if (search) {
            whereConditions.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex})`)
            params.push(`%${search}%`)
            paramIndex++
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''
        const segmentFilterActive = segment && segment !== 'all'
        const segmentUsesParam = segmentFilterActive && !['vip', 'birthdays', 'birthday_today'].includes(segment)
        const segmentParamIndex = params.length + 1
        let segmentClause = ''
        if (segmentFilterActive) {
            if (segment === 'vip') {
                segmentClause = `WHERE lifetime_value > (avg_ltv * 1.5)`
            } else if (segment === 'birthdays') {
                segmentClause = `WHERE birth_date IS NOT NULL AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)`
            } else if (segment === 'birthday_today') {
                segmentClause = `WHERE birth_date IS NOT NULL AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)`
            } else {
                segmentClause = `WHERE segment = $${segmentParamIndex}`
            }
        }

        const cte = `
            WITH customer_metrics AS (
                SELECT
                    c.id,
                    c.name,
                    c.phone,
                    c.email,
                    c.cpf,
                    c.address,
                    c.addresses,
                    c.instagram,
                    c.birth_date,
                    c.created_at,
                    COALESCE(SUM(v.total_value), 0) as lifetime_value,
                    COUNT(v.id) as total_orders,
                    MAX(v.created_at) as last_purchase_date,
                    CASE
                        WHEN COUNT(v.id) = 0 THEN 'inactive'
                        WHEN MAX(v.created_at) < NOW() - INTERVAL '60 days' THEN 'churned'
                        WHEN MAX(v.created_at) < NOW() - INTERVAL '30 days' THEN 'at_risk'
                        ELSE 'active'
                    END as segment
                FROM customers c
                LEFT JOIN vendas v ON v.customer_id = c.id AND v.payment_status != 'cancelled'
                ${whereClause}
                GROUP BY c.id, c.name, c.phone, c.email, c.cpf, c.address, c.addresses, c.instagram, c.birth_date, c.created_at
            )
        `
        const cteWithAvg = `
            ${cte},
            customer_metrics_with_avg AS (
                SELECT *, AVG(lifetime_value) OVER () as avg_ltv
                FROM customer_metrics
            )
        `

        const { rows } = await pool.query(`
            ${cteWithAvg}
            SELECT
                COUNT(*) OVER() as total_count,
                customer_metrics_with_avg.*,
                (lifetime_value > (avg_ltv * 1.5)) as is_vip,
                (
                    birth_date IS NOT NULL
                    AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                ) as is_birthday_this_month,
                (
                    birth_date IS NOT NULL
                    AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
                ) as is_birthday_today
            FROM customer_metrics_with_avg
            ${segmentClause}
            ORDER BY lifetime_value DESC, total_orders DESC, name ASC
            LIMIT $${segmentFilterActive && segmentUsesParam ? segmentParamIndex + 1 : segmentParamIndex} OFFSET $${segmentFilterActive && segmentUsesParam ? segmentParamIndex + 2 : segmentParamIndex + 1}
        `, [...params, ...(segmentUsesParam ? [segment] : []), limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        const { rows: summaryRows } = await pool.query(`
            ${cteWithAvg}
            SELECT
                COUNT(*) FILTER (WHERE segment = 'active')::int as active,
                COUNT(*) FILTER (WHERE segment = 'at_risk')::int as at_risk,
                COUNT(*) FILTER (WHERE segment = 'churned')::int as churned,
                COUNT(*) FILTER (WHERE segment = 'inactive')::int as inactive,
                COUNT(*) FILTER (WHERE lifetime_value > (avg_ltv * 1.5))::int as vip,
                COUNT(*) FILTER (
                    WHERE birth_date IS NOT NULL
                      AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                )::int as birthdays,
                COUNT(*) FILTER (
                    WHERE birth_date IS NOT NULL
                      AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                      AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
                )::int as birthday_today
            FROM customer_metrics_with_avg
        `, params)

        const summaryCounts = summaryRows[0] || {
            active: 0,
            at_risk: 0,
            churned: 0,
            inactive: 0,
            vip: 0,
            birthdays: 0,
            birthday_today: 0
        }

        const customers = rows.map(c => {
            const camelCustomer = toCamelCase(c)
            return {
                ...camelCustomer,
                lifetimeValue: parseFloat(camelCustomer.lifetimeValue) || 0,
                totalOrders: parseInt(camelCustomer.totalOrders) || 0,
                isVip: Boolean(camelCustomer.isVip),
                isBirthdayThisMonth: Boolean(camelCustomer.isBirthdayThisMonth),
                isBirthdayToday: Boolean(camelCustomer.isBirthdayToday)
            }
        })

        res.json({
            customers,
            total,
            page: Number(page),
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            summaryCounts
        })

    } catch (error) {
        console.error("❌ Erro na API de Clientes:", error)
        res.status(500).json({ error: 'Erro ao buscar clientes' })
    }
})

// GET /api/customers/:id - Detalhes do cliente
router.get('/:id', async (req, res) => {
    const { id } = req.params

    try {
        const { rows } = await pool.query(`
            SELECT
                c.*,
                COALESCE(SUM(v.total_value), 0) as lifetime_value,
                COUNT(v.id) as total_orders,
                MAX(v.created_at) as last_purchase_date,
                CASE
                    WHEN COUNT(v.id) = 0 THEN 'inactive'
                    WHEN MAX(v.created_at) < NOW() - INTERVAL '60 days' THEN 'churned'
                    WHEN MAX(v.created_at) < NOW() - INTERVAL '30 days' THEN 'at_risk'
                    ELSE 'active'
                END as segment
            FROM customers c
            LEFT JOIN vendas v ON v.customer_id = c.id AND v.payment_status != 'cancelled'
            WHERE c.id = $1
            GROUP BY c.id
        `, [id])

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' })
        }

        const customer = toCamelCase(rows[0])
        res.json({
            ...customer,
            lifetimeValue: parseFloat(customer.lifetimeValue) || 0,
            totalOrders: parseInt(customer.totalOrders) || 0
        })
    } catch (error) {
        console.error(`❌ Erro ao buscar cliente ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar cliente' })
    }
})

// POST /api/customers - Criar cliente
router.post('/', async (req, res) => {
    const { name, phone, email, cpf, address, complement, instagram, addresses } = req.body
    const normalizedCpf = cpf ? normalizeCpf(cpf) : null
    const birthDate = req.body.birthDate || req.body.birth_date || null

    if (normalizedCpf && !isValidCpf(normalizedCpf)) {
        return res.status(400).json({ error: 'CPF inválido' })
    }

    try {
        const { rows } = await pool.query(`
            INSERT INTO customers (name, phone, email, cpf, address, complement, instagram, addresses, birth_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [name, phone || null, email || null, normalizedCpf, address || null, complement || null, instagram || null,
            addresses ? JSON.stringify(addresses) : '[]', birthDate || null])

        emitRealtimeEvent('customers.created', { id: rows[0].id })
        res.status(201).json(toCamelCase(rows[0]))
    } catch (error) {
        console.error('❌ Erro ao criar cliente:', error)
        res.status(500).json({ error: 'Erro ao criar cliente' })
    }
})

// PUT /api/customers/:id - Atualizar cliente
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const { name, phone, email, cpf, address, complement, instagram, addresses } = req.body
    const normalizedCpf = cpf ? normalizeCpf(cpf) : null
    const birthDate = req.body.birthDate || req.body.birth_date || null

    if (normalizedCpf && !isValidCpf(normalizedCpf)) {
        return res.status(400).json({ error: 'CPF inválido' })
    }

    try {
        const { rows } = await pool.query(`
            UPDATE customers SET
                name = COALESCE($1, name),
                phone = COALESCE($2, phone),
                email = $3,
                cpf = $4,
                address = $5,
                complement = $6,
                instagram = $7,
                addresses = COALESCE($8, addresses),
                birth_date = $9,
                updated_at = NOW()
            WHERE id = $10
            RETURNING *
        `, [
            name || null,
            phone || null,
            email !== undefined ? email : null,
            cpf !== undefined ? normalizedCpf : null,
            address !== undefined ? address : null,
            complement !== undefined ? complement : null,
            instagram !== undefined ? instagram : null,
            addresses ? JSON.stringify(addresses) : null,
            birthDate !== undefined ? birthDate : null,
            id
        ])

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' })
        }

        emitRealtimeEvent('customers.updated', { id: Number(id) })
        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar cliente ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar cliente' })
    }
})

// DELETE /api/customers/:id - Deletar cliente
router.delete('/:id', async (req, res) => {
    const { id } = req.params

    try {
        const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1', [id])

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' })
        }

        emitRealtimeEvent('customers.deleted', { id: Number(id) })
        res.json({ message: 'Cliente deletado com sucesso' })
    } catch (error) {
        console.error(`❌ Erro ao deletar cliente ${id}:`, error)
        res.status(500).json({ error: 'Erro ao deletar cliente' })
    }
})

// GET /api/customers/:id/vendas - Histórico de compras do cliente
router.get('/:id/vendas', async (req, res) => {
    const { id } = req.params

    try {
        const { rows } = await pool.query(`
            SELECT
                v.id, v.total_value, v.cost_price, v.payment_method, v.payment_status,
                v.items, v.created_at, v.discount_amount, v.original_total,
                v.is_installment, v.num_installments, v.entry_payment
            FROM vendas v
            WHERE v.customer_id = $1
            ORDER BY v.created_at DESC
        `, [id])

        const vendas = rows.map(row => {
            const camel = toCamelCase(row)
            return {
                ...camel,
                totalValue: parseFloat(camel.totalValue) || 0,
                costPrice: parseFloat(camel.costPrice) || 0,
                discountAmount: parseFloat(camel.discountAmount) || 0,
                items: typeof camel.items === 'string' ? JSON.parse(camel.items || '[]') : (camel.items || [])
            }
        })

        res.json(vendas)
    } catch (error) {
        console.error(`❌ Erro ao buscar vendas do cliente ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar histórico de compras' })
    }
})

// GET /api/customers/:id/preferences - Preferências do cliente
router.get('/:id/preferences', async (req, res) => {
    const { id } = req.params

    try {
        const { rows } = await pool.query('SELECT * FROM customer_preferences WHERE customer_id = $1', [id])

        if (rows.length === 0) {
            // Retorna null ou objeto vazio, conforme frontend espera (null no código original)
            return res.json(null)
        }

        emitRealtimeEvent('customers.preferences.updated', { id: Number(id) })
        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao buscar preferências do cliente ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar preferências' })
    }
})

// PUT /api/customers/:id/preferences - Atualizar preferências
router.put('/:id/preferences', async (req, res) => {
    const { id } = req.params
    const preferences = req.body

    try {
        // Upsert logic
        const { rows } = await pool.query(`
            INSERT INTO customer_preferences (customer_id, preferred_payment_method, notes, size_shirt, size_pants, size_shoe, style_preferences)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (customer_id) 
            DO UPDATE SET
                preferred_payment_method = EXCLUDED.preferred_payment_method,
                notes = EXCLUDED.notes,
                size_shirt = EXCLUDED.size_shirt,
                size_pants = EXCLUDED.size_pants,
                size_shoe = EXCLUDED.size_shoe,
                style_preferences = EXCLUDED.style_preferences
            RETURNING *
        `, [
            id,
            preferences.preferredPaymentMethod || preferences.preferred_payment_method,
            preferences.notes,
            preferences.sizeShirt || preferences.size_shirt,
            preferences.sizePants || preferences.size_pants,
            preferences.sizeShoe || preferences.size_shoe,
            preferences.stylePreferences || preferences.style_preferences
        ])

        res.json(toCamelCase(rows[0]))
    } catch (error) {
        console.error(`❌ Erro ao atualizar preferências do cliente ${id}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar preferências' })
    }
})

export default router
