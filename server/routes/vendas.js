import express from 'express'
import { supabase } from '../supabase.js'
import { toCamelCase } from '../utils.js'

const router = express.Router()

// Listagem de Vendas com Paginação e Filtros
router.get('/', async (req, res) => {
    const {
        page = 1,
        pageSize = 20,
        search = '',
        status = 'all',
        startDate,
        endDate
    } = req.query

    const from = (page - 1) * pageSize
    const to = from + Number(pageSize) - 1

    console.log(`📦 Vendas API: Buscando página ${page} [Tamanho: ${pageSize}]`)

    try {
        let query = supabase
            .from('vendas')
            .select(`
                *,
                customers(id, name)
            `, { count: 'exact' }) // Pegar o total real para paginação no front
            .order('created_at', { ascending: false })
            .range(from, to)

        // Filtros
        if (status !== 'all') {
            query = query.eq('payment_status', status)
        }

        if (startDate) {
            query = query.gte('created_at', startDate)
        }

        if (endDate) {
            query = query.lte('created_at', endDate)
        }

        if (search) {
            // No Supabase, para filtrar via join table e manter o tipo Venda,
            // podemos usar a sintaxe de filtro em colunas relacionadas
            query = query.or(`customer_name.ilike.%${search}%,customers.name.ilike.%${search}%`)
        }

        const { data, count, error } = await query

        if (error) throw error

        // Normalização para o Frontend usando toCamelCase
        const items = data.map(v => {
            const camelData = toCamelCase(v)
            // Adiciona o nome do cliente do relacionamento
            camelData.customerName = v.customers?.name || camelData.customerName
            return camelData
        })

        res.json({
            items,
            total: count,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(count / pageSize)
        })

    } catch (err) {
        console.error('❌ Erro na API de Vendas:', err)
        res.status(500).json({ error: 'Erro ao buscar vendas' })
    }
})

// Deletar venda
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('vendas').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('API Error deleting venda:', error);
        res.status(500).json({ error: error.message });
    }
});

// Atualizar venda (MISSING ROUTE ADDED)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const vendaData = req.body;
    console.log(`📦 PUT /api/vendas/${id} - Updating sale`, vendaData);

    try {
        // Convert camelCase to snake_case for DB
        const snakeData = toSnakeCase(vendaData); // Ensure toSnakeCase is imported or available helper is used

        // Prepare record to update
        // We carefully construct the object to avoid undefined values overriding existing ones if not intended, 
        // but typically a PUT replaces or updates provided fields.

        // Helper to check if value is valid for update
        const isValid = (val) => val !== undefined;

        const vendaRecord = {};
        if (isValid(snakeData.customer_id)) vendaRecord.customer_id = snakeData.customer_id;
        if (isValid(snakeData.total_value)) vendaRecord.total_value = snakeData.total_value;
        if (isValid(snakeData.discount_amount)) vendaRecord.discount_amount = snakeData.discount_amount;
        if (isValid(snakeData.original_total)) vendaRecord.original_total = snakeData.original_total;
        if (isValid(snakeData.payment_method)) vendaRecord.payment_method = snakeData.payment_method;
        if (isValid(snakeData.payment_status)) vendaRecord.payment_status = snakeData.payment_status;
        if (isValid(snakeData.card_brand)) vendaRecord.card_brand = snakeData.card_brand;
        if (isValid(snakeData.fee_percentage)) vendaRecord.fee_percentage = snakeData.fee_percentage;
        if (isValid(snakeData.fee_amount)) vendaRecord.fee_amount = snakeData.fee_amount;
        if (isValid(snakeData.net_amount)) vendaRecord.net_amount = snakeData.net_amount;
        if (isValid(snakeData.is_installment)) vendaRecord.is_installment = snakeData.is_installment;
        if (isValid(snakeData.num_installments)) vendaRecord.num_installments = snakeData.num_installments;
        if (isValid(snakeData.entry_payment)) vendaRecord.entry_payment = snakeData.entry_payment;
        if (isValid(snakeData.installment_start_date)) vendaRecord.installment_start_date = snakeData.installment_start_date;
        if (isValid(snakeData.items)) vendaRecord.items = snakeData.items;

        const { data, error } = await supabase
            .from('vendas')
            .update(vendaRecord)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Sale updated:', data);
        res.json(toCamelCase(data)); // Ensure toCamelCase is available
    } catch (error) {
        console.error('❌ API Error updating venda:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router
