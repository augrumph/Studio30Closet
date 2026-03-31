import express from 'express'
import { pool, getClient } from '../db.js'
import { toCamelCase } from '../utils.js'
import { updateProductStock } from '../stock-utils.js'
import { extractKeyFromUrl, getPresignedUrl, enrichImages } from '../lib/s3.js'
import { sendNewMalinhaNotification } from '../email-service.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Helper: Convert to snake_case
function toSnakeCase(obj) {
    if (typeof obj !== 'object' || obj === null) return obj
    if (Array.isArray(obj)) return obj.map(v => toSnakeCase(v))
    return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        acc[snakeKey] = toSnakeCase(obj[key])
        return acc
    }, {})
}

// GET /api/orders - List Orders (Admin)
router.get('/', authenticateToken, async (req, res) => {
    const {
        page = 1,
        pageSize = 30, // Alterado para 30 padrão (igual frontend original)
        status = 'all',
        searchTerm = req.query.search || '' // Suporte a search ou searchTerm
    } = req.query

    const offset = (page - 1) * pageSize // page params already parsed by express query but better to ensure
    const limit = Number(pageSize)

    try {
        let whereConditions = []
        let params = []
        let paramIndex = 1

        if (status && status !== 'all') {
            whereConditions.push(`o.status = $${paramIndex++}`)
            params.push(status)
        }

        if (searchTerm) {
            whereConditions.push(`(c.name ILIKE $${paramIndex} OR o.id::text ILIKE $${paramIndex})`)
            params.push(`%${searchTerm}%`)
            paramIndex++
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

        const { rows } = await pool.query(`
            SELECT
                COUNT(*) OVER() as total_count,
                o.*,
                c.name as customer_name,
                c.phone as customer_phone,
                c.id as customer_id_joined,
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'phone', c.phone
                ) as customer
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            ${whereClause}
            ORDER BY o.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, limit, offset])

        const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

        const orders = rows.map(row => {
            const camelRow = toCamelCase(row)
            return {
                ...camelRow,
                orderNumber: `#${String(row.id).padStart(6, '0')}`,
                // Garantir estrutura do customer
                customer: camelRow.customer || { name: 'Cliente desconhecido' }
            }
        })

        res.json({
            orders: enrichImages(orders),
            total,
            page: Number(page),
            pageSize: limit,
            totalPages: Math.ceil(total / limit)
        })

    } catch (error) {
        console.error("❌ Erro ao listar orders:", error)
        res.status(500).json({ error: 'Erro ao buscar orders' })
    }
})

// GET /api/orders/:id - Get Order Details (Admin)
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params

    try {
        // Query to get order + items + customer + products details for items
        const { rows } = await pool.query(`
            SELECT
                o.*,
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'phone', c.phone,
                    'email', c.email,
                    'cpf', c.cpf,
                    'address', c.address
                ) as customer,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', oi.id,
                            'orderId', oi.order_id,
                            'productId', oi.product_id,
                            'quantity', oi.quantity,
                            'selectedSize', oi.size_selected,
                            'selectedColor', oi.color_selected,
                            'priceAtTime', oi.price_at_time,
                            'price', oi.price_at_time, -- alias legacy
                            'productName', p.name,
                            'images', p.images,
                            'stock', p.stock
                        )
                    )
                    FROM order_items oi
                    LEFT JOIN products p ON p.id = oi.product_id
                    WHERE oi.order_id = o.id
                ) as items
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            WHERE o.id = $1
        `, [id])

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Order não encontrada' })
        }

        const order = toCamelCase(rows[0])

        res.json(enrichImages(order))

    } catch (error) {
        console.error(`❌ Erro ao buscar order ${id}:`, error)
        res.status(500).json({ error: 'Erro ao buscar order' })
    }
})
router.post('/', authenticateToken, async (req, res) => {
    console.log('📦 POST /api/orders - Creating Order & Sending Email')
    const orderData = req.body

    const client = await getClient()

    try {
        await client.query('BEGIN')

        const { customer, items, ...orderFields } = orderData
        let customerId = orderFields.customerId

        // 1. Handle Customer
        if (!customerId && customer) {
            const cpf = customer.cpf?.replace(/\D/g, '')
            if (cpf) {
                const { rows: existing } = await client.query(
                    'SELECT id FROM customers WHERE cpf = $1',
                    [cpf]
                )
                if (existing.length > 0) customerId = existing[0].id
            }

            if (!customerId) {
                const { rows: newCust } = await client.query(
                    `INSERT INTO customers (name, cpf, phone, email, addresses)
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [
                        customer.name,
                        cpf || null,
                        customer.phone || null,
                        customer.email || null,
                        customer.addresses ? JSON.stringify(customer.addresses) : '[]'
                    ]
                )
                customerId = newCust[0].id
            }
        }

        if (!customerId) throw new Error('Customer ID required')

        // 2. Insert Order
        const { rows: newOrder } = await client.query(
            `INSERT INTO orders (customer_id, status, total_value, delivery_date, pickup_date)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [
                customerId,
                orderFields.status || 'pending',
                orderFields.totalValue || 0,
                orderFields.deliveryDate || null,
                orderFields.pickupDate || null
            ]
        )

        // 3. Insert Items
        if (items && items.length) {
            for (const item of items) {
                if (!item.productId) throw new Error('Item sem productId')
                if (!item.quantity || item.quantity <= 0) throw new Error('Quantidade de item deve ser maior que zero')
                await client.query(
                    `INSERT INTO order_items (order_id, product_id, quantity, size_selected, color_selected, price_at_time)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        newOrder[0].id,
                        item.productId,
                        item.quantity,
                        item.selectedSize || null,
                        item.selectedColor || null,
                        item.price || 0
                    ]
                )

                // Reserve stock for each item (com fallbacks para cor e tamanho)
                await updateProductStock(
                    client,
                    item.productId,
                    item.quantity,
                    item.selectedColor || 'Padrão',
                    item.selectedSize || 'Único',
                    'reserve'
                )
            }
        }

        await client.query('COMMIT')

        // 🎉 Dispara o EmailJS de forma invisível via Backend (SÍNCRONO)
        // Usamos background / promises sem 'await' para que o painel do admin receba o erro se der,
        // mas o cliente recebe a resposta da ordem antes mesmo do email terminar de enviar.
        sendNewMalinhaNotification({
            customerName: customer.name || 'Cliente',
            customerEmail: customer.email || '',
            itemsCount: items ? items.length : 0,
            orderId: newOrder[0].id,
            items: items || [],
            totalValue: orderFields.totalValue || 0
        }).catch(e => console.error("Falha no email em background:", e))

        res.json({ success: true, order: toCamelCase(newOrder[0]) })

    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Create Order Error:', error)
        res.status(500).json({ error: error.message })
    } finally {
        client.release()
    }
})

// PUT /api/orders/:id - Update Order with Transaction (Admin)
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    const orderData = req.body
    console.log(`📦 PUT /api/orders/${id} - Updating Order Transactionally`)

    const client = await getClient()

    try {
        await client.query('BEGIN')

        // 1. Fetch Current Order Items
        const { rows: currentOrderRows } = await client.query(
            `SELECT
                o.status,
                json_agg(
                    json_build_object(
                        'product_id', oi.product_id,
                        'quantity', oi.quantity,
                        'size_selected', oi.size_selected,
                        'color_selected', oi.color_selected
                    )
                ) FILTER (WHERE oi.id IS NOT NULL) as order_items
             FROM orders o
             LEFT JOIN order_items oi ON oi.order_id = o.id
             WHERE o.id = $1
             GROUP BY o.id, o.status`,
            [id]
        )

        if (currentOrderRows.length === 0) throw new Error('Order not found')

        const currentOrder = currentOrderRows[0]

        // 2. Restore stock from old items
        const statusesThatHoldStock = ['pending', 'active', 'shipped']
        const isHoldingStock = statusesThatHoldStock.includes(currentOrder.status)

        // CRITICAL FIX: Se order está sendo convertida em venda (convertedToSale = true),
        // NÃO restaurar o estoque aqui. A venda já gerenciou o estoque corretamente:
        // - Venda decrementou os items que o cliente ficou
        // - Items devolvidos precisam ser restaurados explicitamente via returnedItems
        const isConvertingToSale = orderData.convertedToSale === true
        const shouldRestoreAllItems = isHoldingStock && !isConvertingToSale && currentOrder.order_items?.length

        if (shouldRestoreAllItems) {
            console.log(`🔓 Restoring stock for ${currentOrder.order_items.length} old items...`)
            for (const item of currentOrder.order_items) {
                if (item.size_selected) {
                    await updateProductStock(
                        client,
                        item.product_id,
                        item.quantity,
                        item.color_selected || 'Padrão',
                        item.size_selected,
                        'restore'
                    )
                }
            }
        }

        // Se está convertendo para venda E foram fornecidos returnedItems explicitamente,
        // restaurar apenas os items devolvidos
        if (isConvertingToSale && orderData.returnedItems && Array.isArray(orderData.returnedItems)) {
            console.log(`🔙 Restoring stock for ${orderData.returnedItems.length} returned items...`)
            for (const item of orderData.returnedItems) {
                if (item.selectedSize) {
                    await updateProductStock(
                        client,
                        item.productId,
                        item.quantity,
                        item.selectedColor || 'Padrão',
                        item.selectedSize,
                        'restore'
                    )
                }
            }
        }

        // 3. Update Order Details
        const { items, customer, ...fieldsToUpdate } = orderData
        const snakeFields = toSnakeCase(fieldsToUpdate)

        const updateParts = []
        const updateValues = []
        let paramIndex = 1

        const validFields = ['status', 'total_value', 'delivery_date', 'pickup_date', 'customer_id', 'converted_to_sale', 'payment_status']

        validFields.forEach(field => {
            if (snakeFields[field] !== undefined) {
                updateParts.push(`${field} = $${paramIndex}`)
                updateValues.push(snakeFields[field])
                paramIndex++
            }
        })

        if (updateParts.length > 0) {
            // FIXED: Always update updated_at when modifying order
            updateParts.push(`updated_at = NOW()`)
            updateValues.push(id)
            await client.query(
                `UPDATE orders SET ${updateParts.join(', ')} WHERE id = $${paramIndex}`,
                updateValues
            )
        }

        // 4. Replace Items
        if (items && Array.isArray(items)) {
            console.log(`🔄 Replacing items with ${items.length} new items...`)

            // Delete old items
            await client.query('DELETE FROM order_items WHERE order_id = $1', [id])

            // Insert new items
            if (items.length > 0) {
                for (const item of items) {
                    await client.query(
                        `INSERT INTO order_items (order_id, product_id, quantity, size_selected, color_selected, price_at_time)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            id,
                            item.productId,
                            item.quantity,
                            item.selectedSize || null,
                            item.selectedColor || null,
                            item.price || 0
                        ]
                    )
                }
            }

            // 5. Reserve Stock for New Items
            const newStatus = snakeFields.status || currentOrder.status
            const willHoldStock = statusesThatHoldStock.includes(newStatus)

            if (willHoldStock && items.length > 0) {
                console.log(`🔒 Reserving stock for ${items.length} new items...`)
                for (const item of items) {
                    if (item.selectedSize) {
                        await updateProductStock(
                            client,
                            item.productId,
                            item.quantity,
                            item.selectedColor || 'Padrão',
                            item.selectedSize,
                            'reserve'
                        )
                    }
                }
            }
        }

        await client.query('COMMIT')

        // Fetch updated order
        const { rows: finalOrder } = await client.query('SELECT * FROM orders WHERE id = $1', [id])

        console.log('✅ Order updated successfully')
        res.json(toCamelCase(finalOrder[0]))

    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Update Order Error:', error)
        res.status(500).json({ error: error.message })
    } finally {
        client.release()
    }
})

// DELETE /api/orders/:id - Delete Order (Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    console.log(`📦 DELETE /api/orders/${id} - Deleting Order`)

    const client = await getClient()

    try {
        await client.query('BEGIN')

        // 1. Fetch Order to check stock
        const { rows: orderRows } = await client.query(
            `SELECT
                o.status,
                json_agg(
                    json_build_object(
                        'product_id', oi.product_id,
                        'quantity', oi.quantity,
                        'size_selected', oi.size_selected,
                        'color_selected', oi.color_selected
                    )
                ) FILTER (WHERE oi.id IS NOT NULL) as order_items
             FROM orders o
             LEFT JOIN order_items oi ON oi.order_id = o.id
             WHERE o.id = $1
             GROUP BY o.id, o.status`,
            [id]
        )

        if (orderRows.length === 0) {
            await client.query('ROLLBACK')
            return res.status(404).json({ error: 'Order not found' })
        }

        const order = orderRows[0]
        const statusesThatHoldStock = ['pending', 'active', 'shipped']
        const isHoldingStock = statusesThatHoldStock.includes(order.status)

        // 2. Restore Stock if needed
        if (isHoldingStock && order.order_items && order.order_items.length > 0) {
            console.log(`🔓 Restoring stock for deleted order ${id}...`)
            for (const item of order.order_items) {
                if (item.size_selected) {
                    await updateProductStock(
                        client,
                        item.product_id,
                        item.quantity,
                        item.color_selected || 'Padrão',
                        item.size_selected,
                        'restore'
                    )
                }
            }
        }

        // 3. Delete Items
        await client.query('DELETE FROM order_items WHERE order_id = $1', [id])

        // 4. Delete Order
        await client.query('DELETE FROM orders WHERE id = $1', [id])

        await client.query('COMMIT')
        console.log(`✅ Order ${id} deleted successfully`)
        res.json({ success: true })

    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Delete Order Error:', error)
        res.status(500).json({ error: error.message })
    } finally {
        client.release()
    }
})

export default router
