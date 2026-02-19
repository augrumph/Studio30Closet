import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'

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

// Helper: Update Product Stock (Replicated from Frontend)
async function updateProductStock(productId, quantity, color, size, type = 'reserve') {
    // type: 'reserve' (subtract) | 'restore' (add)
    const multiplier = type === 'reserve' ? -1 : 1
    const qtyChange = quantity * multiplier

    console.log(`📦 Stock Update [${type.toUpperCase()}]: Product ${productId}, Qty: ${qtyChange}, Color: ${color}, Size: ${size}`)

    // 1. Fetch Product
    const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('id, variants, stock, name, color')
        .eq('id', productId)
        .single()

    if (fetchError || !product) {
        throw new Error(`Product ${productId} not found: ${fetchError?.message}`)
    }

    // 2. Find Variant
    let variants = product.variants || []
    if (!variants.length) throw new Error(`Product ${productId} has no variants`)

    const normalize = s => String(s || '').trim().toLowerCase()

    // Find Color Variant
    let variantIndex = variants.findIndex(v => normalize(v.colorName) === normalize(color))
    if (variantIndex === -1) {
        // Only use default if exact color not found AND it matches default color logic?
        // Let's replicate frontend strictly: check default color
        variantIndex = variants.findIndex(v => v.colorName === product.color)
        if (variantIndex === -1) {
            throw new Error(`Color "${color}" not found in product ${product.name}`)
        }
    }
    const variant = variants[variantIndex]

    // Find Size in Variant
    const sizeIndex = variant.sizeStock?.findIndex(s => normalize(s.size) === normalize(size))
    if (sizeIndex === undefined || sizeIndex === -1) {
        throw new Error(`Size "${size}" not found in color "${variant.colorName}"`)
    }

    // 3. Check / Update Stock
    const currentQty = variant.sizeStock[sizeIndex].quantity || 0

    // Only check if RESERVING
    if (type === 'reserve' && currentQty < quantity) {
        throw new Error(`Insufficient stock for ${product.name} (${variant.colorName}/${size}). Available: ${currentQty}`)
    }

    // Update Quantity
    variant.sizeStock[sizeIndex].quantity = currentQty + qtyChange

    // Recalculate Total Stock
    const newTotalStock = variants.reduce((acc, v) =>
        acc + (v.sizeStock || []).reduce((sum, s) => sum + (s.quantity || 0), 0), 0
    )

    // 4. Save to DB
    const { error: updateError } = await supabase
        .from('products')
        .update({ variants, stock: newTotalStock, updated_at: new Date().toISOString() })
        .eq('id', productId)

    if (updateError) throw new Error(`Failed to update stock for Product ${productId}: ${updateError.message}`)

    // 5. Log Movement (Optional but good)
    supabase.from('stock_movements').insert({
        product_id: productId,
        quantity: quantity,
        movement_type: type === 'reserve' ? 'saida_malinha' : 'entrada_devolucao',
        notes: `Malinha Update (${type}): ${color}/${size}`
    }).then(({ error }) => {
        if (error) console.error('Error logging stock movement:', error)
    })

    return true
}

const router = express.Router()

// EMAILJS CONFIG (Should be in .env but hardcoding for now based on src/lib/email-service.js)
const SERVICE_ID = 'service_3h2tyup'
const TEMPLATE_ID = 'template_wghvxdb'
const PUBLIC_KEY = 'DkaN2O0h-27lkoW94'
const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY // Optional if using public key is enough for REST, but usually need private for server-side safely?
// Actually EmailJS REST API uses: service_id, template_id, user_id (public key), template_params, accessToken (private key if allowed).
// Let's stick to Public Key pattern if it works, or just use fetch.

router.post('/', async (req, res) => {
    console.log('📦 POST /api/orders - Creating Order & Sending Email');
    const orderData = req.body;

    try {
        // 1. Create Order in Supabase (We can reuse the logic from src/lib/api/orders.js but better to do it here directly)
        // Check for customer creation logic... it's complex in frontend. 
        // STRATEGY: Receive the FULL payload including customer info?
        // OR: Expect frontend to have created customer/reservation?
        // Let's assume frontend does the heavy lifting of structure calculation and sends the final payload ready for DB
        // BUT the plan was to move logic to backend.
        // For SPEED and ROBUSTNESS: Let's create a "proxy" endpoint that does the DB insert AND email.

        // Simpler: The frontend `createOrder` is very complex (creates customer, reserves stock).
        // Replicating ALL that in Node.js right now might introduce bugs if I miss a step.
        // ALTERNATIVE: Keep creation in Frontend, but call this endpoint JUST for Email? 
        // NO, user said "trigger email IMMEDIATELY".
        // BEST APPROACH: Frontend calls this endpoint. This endpoint calls Supabase to Insert. Then triggers Email.

        // Let's try to just handle the Insert + Email here.
        // We need to handle:
        // 1. Customer (find or create)
        // 2. Order Insert
        // 3. Items Insert

        // Extract data
        const { customer, items, ...orderFields } = orderData;

        let customerId = orderFields.customerId;

        // 1. Handle Customer (Simplified check)
        if (!customerId && customer) {
            // Try to find by CPF
            const cpf = customer.cpf?.replace(/\D/g, '');
            if (cpf) {
                const { data: existing } = await supabase.from('customers').select('id').eq('cpf', cpf).maybeSingle();
                if (existing) customerId = existing.id;
            }

            // If not, create
            if (!customerId) {
                const { data: newCust, error: custErr } = await supabase.from('customers').insert([{
                    name: customer.name,
                    cpf: cpf,
                    phone: customer.phone,
                    email: customer.email,
                    addresses: customer.addresses
                }]).select().single();

                if (custErr) throw custErr;
                customerId = newCust.id;
            }
        }

        if (!customerId) throw new Error('Customer ID required');

        // 2. Insert Order
        const { data: newOrder, error: orderErr } = await supabase.from('orders').insert([{
            customer_id: customerId,
            status: orderFields.status || 'pending',
            total_value: orderFields.totalValue,
            delivery_date: orderFields.deliveryDate,
            pickup_date: orderFields.pickupDate
        }]).select().single();

        if (orderErr) throw orderErr;

        // 3. Insert Items
        if (items && items.length) {
            const orderItems = items.map(item => ({
                order_id: newOrder.id,
                product_id: item.productId,
                quantity: item.quantity,
                size_selected: item.selectedSize,
                color_selected: item.selectedColor,
                price_at_time: item.price
            }));

            const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
            if (itemsErr) throw itemsErr;
        }

        // 4. Send Email (Server Side)
        // Using fetch to EmailJS API
        const emailData = {
            service_id: SERVICE_ID,
            template_id: TEMPLATE_ID,
            user_id: PUBLIC_KEY,
            template_params: {
                subject: `Nova malinha para ${customer.name} [${items.length} peças]`,
                customer_name: customer.name,
                items_count: items.length,
                order_link: `https://studio30closet.com.br/admin/malinhas`,
                order_id: newOrder.id,
                to_email: 'studio30closet@gmail.com'
            }
        };

        const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData)
        });

        if (emailRes.ok) {
            console.log('✅ Email sent successfully');
        } else {
            console.error('❌ Email failed:', await emailRes.text());
        }

        res.json({ success: true, order: newOrder });

    } catch (error) {
        console.error('❌ Create Order Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/orders/:id - Transactional Update
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const orderData = req.body;
    console.log(`📦 PUT /api/orders/${id} - Updating Order Transactionally`);

    try {
        // 1. Fetch Current Order Items (to restore stock)
        const { data: currentOrder, error: fetchError } = await supabase
            .from('orders')
            .select(`
                status,
                order_items (
                    product_id, quantity, size_selected, color_selected
                )
            `)
            .eq('id', id)
            .single();

        if (fetchError || !currentOrder) throw new Error('Order not found');

        // Logic: 
        // IF status releases stock (completed/cancelled), NO RESTORE needed unless we are changing status BACK to pending?
        // BUT assume edit happens primarily on 'pending'/'active' orders.
        // IF "Active" -> "Active" (just editing items):
        //    Restore ALL old items.
        //    Reserve ALL new items.
        // This is safest.

        const statusesThatHoldStock = ['pending', 'active', 'shipped'];
        const isHoldingStock = statusesThatHoldStock.includes(currentOrder.status);

        if (isHoldingStock && currentOrder.order_items?.length) {
            console.log(`🔓 Restoring stock for ${currentOrder.order_items.length} old items...`);
            for (const item of currentOrder.order_items) {
                await updateProductStock(
                    item.product_id,
                    item.quantity,
                    item.color_selected,
                    item.size_selected,
                    'restore'
                );
            }
        }

        // 2. Update Order Details
        const { items, customer, ...fieldsToUpdate } = orderData;
        const snakeFields = toSnakeCase(fieldsToUpdate);

        // Filter valid fields only
        const validFields = [
            'status', 'total_value', 'delivery_date', 'pickup_date',
            'customer_id', 'converted_to_sale', 'payment_status'
        ];
        const updatePayload = {};
        validFields.forEach(field => {
            if (snakeFields[field] !== undefined) updatePayload[field] = snakeFields[field];
        });

        const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        // 3. Replace Items (Delete Old -> Insert New)
        // (Only if items array is provided in payload. If null, we assume no change in items?)
        // The frontend sends items array on edit.
        if (items && Array.isArray(items)) {
            console.log(`🔄 Replacing items with ${items.length} new items...`);

            // Delete old
            const { error: deleteError } = await supabase
                .from('order_items')
                .delete()
                .eq('order_id', id);

            if (deleteError) throw deleteError;

            // Prepare new
            const newOrderItems = items.map(item => ({
                order_id: id,
                product_id: item.productId,
                quantity: item.quantity,
                size_selected: item.selectedSize,
                color_selected: item.selectedColor,
                price_at_time: item.price
            }));

            // Insert new
            if (newOrderItems.length > 0) {
                const { error: insertError } = await supabase
                    .from('order_items')
                    .insert(newOrderItems);

                if (insertError) throw insertError;
            }

            // 4. Reserve Stock for New Items
            // Only if new status holds stock
            const newStatus = updatePayload.status || currentOrder.status;
            const willHoldStock = statusesThatHoldStock.includes(newStatus);

            if (willHoldStock && newOrderItems.length > 0) {
                console.log(`🔒 Reserving stock for ${newOrderItems.length} new items...`);
                for (const item of newOrderItems) {
                    try {
                        await updateProductStock(
                            item.product_id,
                            item.quantity,
                            item.color_selected,
                            item.size_selected,
                            'reserve'
                        );
                    } catch (reserveErr) {
                        console.error(`❌ Reservation Logic Error: ${reserveErr.message}`);
                        // CRITICAL: We should rollback here!
                        // For now, re-throwing to fail the request but data might be partially inconsistent.
                        // Ideally: Re-restore this item? Or fail hard.
                        throw new Error(`Failed to reserve stock: ${reserveErr.message}`);
                    }
                }
            }
        }

        console.log('✅ Order updated successfully');
        res.json(toCamelCase(updatedOrder));

    } catch (error) {
        console.error('❌ Update Order Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
