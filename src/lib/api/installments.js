/**
 * API de Parcelamentos/Crediário
 * Gerenciamento de parcelas e pagamentos de vendas a prazo
 */

import { supabase } from '../supabase'
import { toSnakeCase, toCamelCase } from './helpers'

/**
 * Criar parcelas automaticamente para uma venda com crediário/parcelado
 * @param {number} vendaId - ID da venda (obrigatório)
 * @param {number} numInstallments - Número de parcelas (obrigatório, mín: 1)
 * @param {number} entryPayment - Valor de entrada pago no ato (padrão: 0)
 * @param {string} installmentStartDate - Data de início em YYYY-MM-DD (padrão: hoje)
 * @returns {Promise<{success: boolean, installments?: Array, error?: string}>}
 */
export async function createInstallments(
    vendaId,
    numInstallments,
    entryPayment = 0,
    installmentStartDate = null
) {
    // Validar parâmetros obrigatórios
    if (!vendaId || !numInstallments) {
        console.error('❌ Parâmetros obrigatórios faltando: vendaId e numInstallments');
        return {
            success: false,
            error: 'Parâmetros obrigatórios inválidos'
        };
    }

    // Usar data atual como padrão se não fornecida
    const startDate = installmentStartDate || new Date().toISOString().split('T')[0];

    console.log(`💳 Criando ${numInstallments}x | Venda: #${vendaId} | Entrada: R$ ${entryPayment}`);

    try {
        // ✅ IMPORTANTE: Como a função agora é RETURNS SETOF RECORD,
        // chamamos apenas pelo efeito colateral (criar parcelas no banco)
        // NÃO usamos o retorno 'data'
        const { error } = await supabase.rpc('create_installments', {
            p_venda_id: Number(vendaId), // ✅ BIGINT explícito
            p_num_installments: Number(numInstallments), // ✅ INTEGER explícito
            p_entry_payment: Number(entryPayment || 0), // ✅ DECIMAL explícito
            p_installment_start_date: startDate || null // ✅ DATE ou null
        });

        if (error) {
            console.error(`❌ Erro ao criar parcelas (venda #${vendaId}):`, error.message);
            return {
                success: false,
                error: error.message || 'Erro ao criar parcelas'
            };
        }

        console.log(`✅ ${numInstallments} parcelas criadas com sucesso para venda #${vendaId}`);

        return {
            success: true,
            count: numInstallments
        };
    } catch (err) {
        console.error(`❌ Exceção ao criar parcelas (venda #${vendaId}):`, err.message);
        return {
            success: false,
            error: err.message || 'Erro ao criar parcelas'
        };
    }
}

/**
 * Buscar todas as parcelas de uma venda
 * @param {number} vendaId - ID da venda
 * @returns {Object} { installments, totalValue, paidAmount, remainingAmount }
 */
export async function getInstallmentsByVendaId(vendaId) {
    console.log(`🔍 API: Buscando parcelas da venda ${vendaId}`);

    try {
        // Buscar parcelas
        const { data: installments, error: installmentsError } = await supabase
            .from('installments')
            .select('*')
            .eq('venda_id', vendaId)
            .order('installment_number', { ascending: true });

        if (installmentsError) throw installmentsError;

        // Buscar histórico de pagamentos para cada parcela
        const installmentsWithPayments = await Promise.all(
            installments.map(async (installment) => {
                const { data: payments, error: paymentsError } = await supabase
                    .from('installment_payments')
                    .select('*')
                    .eq('installment_id', installment.id)
                    .order('payment_date', { ascending: true });

                if (paymentsError) {
                    console.warn(`⚠️ Erro ao buscar pagamentos da parcela ${installment.id}:`, paymentsError);
                    return { ...toCamelCase(installment), payments: [] };
                }

                return {
                    ...toCamelCase(installment),
                    payments: payments.map(toCamelCase)
                };
            })
        );

        // Calcular resumo
        const totalValue = installmentsWithPayments.reduce((sum, inst) => sum + inst.originalAmount, 0);
        const paidAmount = installmentsWithPayments.reduce((sum, inst) => sum + inst.paidAmount, 0);
        const remainingAmount = totalValue - paidAmount;

        console.log(`✅ ${installmentsWithPayments.length} parcelas encontradas`);

        return {
            installments: installmentsWithPayments,
            totalValue,
            paidAmount,
            remainingAmount,
            paidPercentage: totalValue > 0 ? Math.round((paidAmount / totalValue) * 100) : 0
        };
    } catch (err) {
        console.error('❌ Erro ao buscar parcelas:', err);
        throw err;
    }
}

/**
 * Registrar um pagamento de parcela
 * @param {number} installmentId - ID da parcela
 * @param {number} paymentAmount - Valor do pagamento
 * @param {string} paymentDate - Data do pagamento (YYYY-MM-DD)
 * @param {string} paymentMethod - Método (pix, dinheiro, cartao, etc)
 * @param {string} notes - Observações opcionais
 * @param {string} createdBy - Username do admin que registrou
 * @returns {boolean} Sucesso
 */
export async function registerInstallmentPayment(
    installmentId,
    paymentAmount,
    paymentDate,
    paymentMethod = 'dinheiro',
    notes = null,
    createdBy = 'admin'
) {
    console.log(`💳 API: Registrando pagamento de R$ ${paymentAmount} na parcela ${installmentId}`);

    console.log(`💳 API: Registrando pagamento de R$ ${paymentAmount} na parcela ${installmentId}`);

    try {
        // ✅ CORREÇÃO: Usar INSERT direto pois existe Trigger no banco que atualiza a parcela.
        // O RPC estava duplicando o valor (somando 2x).
        const { data, error } = await supabase
            .from('installment_payments')
            .insert([{
                installment_id: installmentId,
                payment_amount: paymentAmount,
                payment_date: paymentDate,
                payment_method: paymentMethod,
                notes: notes,
                created_by: createdBy
            }])
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao registrar pagamento:', error);
            throw error;
        }

        console.log('✅ Pagamento registrado com sucesso');

        // Buscar dados atualizados da parcela (para retornar ao frontend)
        const { data: updatedInstallment, error: fetchError } = await supabase
            .from('installments')
            .select('*')
            .eq('id', installmentId)
            .single();

        if (fetchError) throw fetchError;

        return toCamelCase(updatedInstallment);
    } catch (err) {
        console.error('❌ Exceção ao registrar pagamento:', err);
        throw err;
    }
}

/**
 * Editar um pagamento existente
 * @param {number} paymentId - ID do pagamento (em installment_payments)
 * @param {number} newAmount - Novo valor
 * @param {string} newDate - Nova data
 * @param {string} newMethod - Novo método
 * @param {string} newNotes - Novas observações
 * @returns {Object} Pagamento atualizado
 */
export async function updateInstallmentPayment(
    paymentId,
    newAmount,
    newDate,
    newMethod,
    newNotes
) {
    console.log(`✏️ API: Atualizando pagamento ${paymentId}`);

    try {
        // Buscar pagamento antigo para calcular diferença
        const { data: oldPayment, error: fetchError } = await supabase
            .from('installment_payments')
            .select('payment_amount, installment_id')
            .eq('id', paymentId)
            .single();

        if (fetchError) throw fetchError;

        const amountDifference = newAmount - oldPayment.payment_amount;

        // Atualizar pagamento
        const { data: updatedPayment, error: updateError } = await supabase
            .from('installment_payments')
            .update({
                payment_amount: newAmount,
                payment_date: newDate,
                payment_method: newMethod,
                notes: newNotes,
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Atualizar parcela com a diferença
        const { data: updatedInstallment, error: installmentError } = await supabase
            .from('installments')
            .select('*')
            .eq('id', oldPayment.installment_id)
            .single();

        if (installmentError) throw installmentError;

        const newPaidAmount = Math.max(0, updatedInstallment.paid_amount + amountDifference);

        const { error: updateInstallmentError } = await supabase
            .from('installments')
            .update({
                paid_amount: newPaidAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', oldPayment.installment_id);

        if (updateInstallmentError) throw updateInstallmentError;

        console.log('✅ Pagamento atualizado com sucesso');

        return {
            ...toCamelCase(updatedPayment),
            installmentId: oldPayment.installment_id
        };
    } catch (err) {
        console.error('❌ Erro ao atualizar pagamento:', err);
        throw err;
    }
}

/**
 * Deletar um pagamento
 * @param {number} paymentId - ID do pagamento
 * @returns {boolean} Sucesso
 */
export async function deleteInstallmentPayment(paymentId) {
    console.log(`🗑️ API: Deletando pagamento ${paymentId}`);

    try {
        // Buscar pagamento para recuperar dados da parcela
        const { data: payment, error: fetchError } = await supabase
            .from('installment_payments')
            .select('payment_amount, installment_id')
            .eq('id', paymentId)
            .single();

        if (fetchError) throw fetchError;

        // Deletar pagamento
        const { error: deleteError } = await supabase
            .from('installment_payments')
            .delete()
            .eq('id', paymentId);

        if (deleteError) throw deleteError;

        // Atualizar parcela (reduzir paid_amount)
        const { error: updateError } = await supabase
            .from('installments')
            .select('paid_amount')
            .eq('id', payment.installment_id)
            .single()
            .then(async ({ data: installment }) => {
                const newPaidAmount = Math.max(0, installment.paid_amount - payment.payment_amount);
                return await supabase
                    .from('installments')
                    .update({ paid_amount: newPaidAmount })
                    .eq('id', payment.installment_id);
            });

        console.log('✅ Pagamento deletado com sucesso');
        return true;
    } catch (err) {
        console.error('❌ Erro ao deletar pagamento:', err);
        throw err;
    }
}

/**
 * Obter resumo de uma venda com crediário
 * @param {number} vendaId - ID da venda
 * @returns {Object} Resumo: total, entrada, pago, pendente, atrasado
 */
export async function getInstallmentSummary(vendaId) {
    console.log(`📊 API: Obtendo resumo de crediário da venda ${vendaId}`);

    try {
        const { data, error } = await supabase.rpc('get_installment_summary', {
            p_venda_id: vendaId
        });

        if (error) {
            console.error('❌ Erro ao buscar resumo:', error);
            throw error;
        }

        const summary = data[0];
        console.log('✅ Resumo obtido:', summary);

        return {
            totalValue: parseFloat(summary.total_value),
            entryPayment: parseFloat(summary.entry_payment),
            remainingValue: parseFloat(summary.remaining_value),
            numInstallments: summary.num_installments,
            paidInstallments: summary.paid_installments,
            pendingInstallments: summary.pending_installments,
            overdueAmount: parseFloat(summary.overdue_amount || 0),
            lastPaymentDate: summary.last_payment_date,
            paidPercentage: summary.total_value > 0
                ? Math.round(((summary.total_value - summary.remaining_value) / summary.total_value) * 100)
                : 0
        };
    } catch (err) {
        console.error('❌ Erro ao obter resumo:', err);
        throw err;
    }
}

/**
 * Listar todas as vendas com crediário em aberto
 * @param {number} page - Página (padrão 1)
 * @param {number} limit - Itens por página (padrão 30)
 * @returns {Object} { vendas, total }
 */
export async function getOpenInstallmentSales(page = 1, limit = 30) {
    console.log(`📋 API: Buscando vendas com crediário em aberto (página ${page})`);

    try {
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('vendas')
            .select('id, customer_id, total_value, entry_payment, num_installments, is_installment, payment_method, payment_status, created_at, customers(id, name, phone)', { count: 'estimated' })
            // ✅ CORREÇÃO: Crediário = fiado (simples) OU fiado_parcelado
            // Inclui TODAS as vendas no fiado, parceladas ou não
            .in('payment_method', ['fiado', 'fiado_parcelado'])
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        const vendasComResumo = await Promise.all(data.map(async (venda) => {
            let summary = null;
            try {
                summary = await getInstallmentSummary(venda.id);
            } catch (e) {
                console.warn(`⚠️ Erro ao buscar resumo da venda #${venda.id}:`, e);
            }

            const camelVenda = toCamelCase(venda);

            // ✅ Cálculo de saldo residual manual como fallback
            const totalVenda = camelVenda.totalValue || 0;
            const entrada = camelVenda.entryPayment || 0;

            const hasInstallments = summary && !isNaN(summary.totalValue) && summary.totalValue > 0;

            // ✅ IMPORTANTE: Se for crediário, não confiamos cegamente no camelVenda.paymentStatus === 'paid'
            // pois algumas vendas antigas ou com erro de status podem estar como 'paid' mas ainda terem saldo.
            // O critério real de "paga" para o crediário é ter saldo residual zero.
            const dueAmount = hasInstallments
                ? summary.remainingValue
                : Math.max(0, totalVenda - entrada);

            return {
                ...camelVenda,
                customerName: venda.customers?.name || 'Cliente desconhecido',
                customers: venda.customers ? toCamelCase(venda.customers) : null,
                dueAmount: dueAmount,
                paidAmount: hasInstallments
                    ? (summary.totalValue - summary.remainingValue)
                    : entrada,
                overdueCount: hasInstallments ? (summary.overdueAmount > 0 ? 1 : 0) : 0,
                summary: summary || {
                    totalValue: totalVenda,
                    entryPayment: entrada,
                    remainingValue: dueAmount,
                    numInstallments: camelVenda.numInstallments || 1,
                    paidInstallments: (dueAmount === 0) ? 1 : 0,
                    pendingInstallments: (dueAmount > 0) ? 1 : 0,
                    overdueAmount: 0
                }
            };
        }));

        console.log(`✅ ${vendasComResumo.length} vendas com crediário encontradas`);

        return {
            vendas: vendasComResumo,
            total: count,
            page,
            limit
        };
    } catch (err) {
        console.error('❌ Erro ao buscar vendas com crediário:', err);
        throw err;
    }
}

/**
 * Buscar vencimentos de crediário do dia e da semana
 * @returns {Object} { today: [], thisWeek: [], overdueCount, totalDueToday, totalDueThisWeek }
 */
export async function getUpcomingInstallments() {
    console.log('📅 API: Buscando vencimentos de crediário...');

    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Calcular fim da semana (próximo domingo)
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
        const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

        // 1. Buscar parcelas reais no banco
        const { data: realInstallments, error } = await supabase
            .from('installments')
            .select(`
                id, venda_id, installment_number, due_date, original_amount, paid_amount, remaining_amount, status,
                vendas!inner(id, total_value, entry_payment, payment_method, payment_status, created_at, customer_id, customers(id, name, phone))
            `)
            .in('status', ['pending', 'overdue'])
            .gte('due_date', todayStr)
            .lte('due_date', endOfWeekStr)
            .order('due_date', { ascending: true });

        if (error) throw error;

        // 2. Buscar vendas no crediário que podem não ter parcelas (legadas ou 1x)
        const { data: salesData, error: salesError } = await supabase
            .from('vendas')
            .select('id, total_value, entry_payment, payment_method, payment_status, created_at, customer_id, customers(id, name, phone)')
            .in('payment_method', ['fiado', 'fiado_parcelado'])
            .neq('payment_status', 'paid') // Simplificação inicial
            .order('created_at', { ascending: true });

        if (salesError) throw salesError;

        // 3. Cruzar dados para encontrar vendas sem parcelas reais
        const salesWithRealInstallments = new Set(realInstallments.map(i => i.venda_id));

        // Também precisamos saber se a venda tem QUALQUER parcela, mesmo fora do range de datas
        const { data: allInstIds } = await supabase.from('installments').select('venda_id').in('venda_id', salesData.map(s => s.id));
        const salesWithAnyInstallments = new Set(allInstIds?.map(i => i.venda_id) || []);

        const virtualInstallments = salesData
            .filter(s => !salesWithAnyInstallments.has(s.id))
            .map(s => {
                const total = s.total_value || 0;
                const entry = s.entry_payment || 0;
                const balance = total - entry;

                if (balance <= 0) return null;

                // Trata como vencido/vencendo na data da venda (simplificação)
                const dueDate = s.created_at.split('T')[0];
                const isDueTodayOrBefore = dueDate <= todayStr;
                const isWithinWeek = dueDate <= endOfWeekStr;

                if (!isWithinWeek) return null;

                return {
                    id: `v-${s.id}`, // Virtual ID
                    vendaId: s.id,
                    installmentNumber: 1,
                    dueDate: dueDate,
                    originalAmount: total,
                    paidAmount: entry,
                    remainingAmount: balance,
                    status: dueDate < todayStr ? 'overdue' : 'pending',
                    customerName: s.customers?.name || 'Cliente desconhecido',
                    customerPhone: s.customers?.phone || null,
                    totalValue: total,
                    isVirtual: true
                };
            })
            .filter(Boolean);

        // 4. Combinar e processar
        const allInstallments = [
            ...realInstallments.map(inst => ({
                id: inst.id,
                vendaId: inst.venda_id,
                installmentNumber: inst.installment_number,
                dueDate: inst.due_date,
                originalAmount: inst.original_amount,
                paidAmount: inst.paid_amount,
                remainingAmount: inst.remaining_amount,
                status: inst.status,
                customerName: inst.vendas?.customers?.name || 'Cliente desconhecido',
                customerPhone: inst.vendas?.customers?.phone || null,
                totalValue: inst.vendas?.total_value || 0
            })),
            ...virtualInstallments
        ];

        // Separar vencimentos de hoje e da semana
        const todayInstallments = allInstallments.filter(i => i.dueDate === todayStr);
        const weekInstallments = allInstallments.filter(i => i.dueDate !== todayStr);

        // Buscar quantidade de atrasados (Real + Virtual)
        const { count: realOverdueCount } = await supabase
            .from('installments')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'overdue');

        const virtualOverdueCount = virtualInstallments.filter(i => i.status === 'overdue').length;

        const totalDueToday = todayInstallments.reduce((sum, i) => sum + (i.remainingAmount || 0), 0);
        const totalDueThisWeek = weekInstallments.reduce((sum, i) => sum + (i.remainingAmount || 0), 0);

        console.log(`✅ Vencimentos: ${todayInstallments.length} hoje, ${weekInstallments.length} na semana, ${(realOverdueCount || 0) + virtualOverdueCount} atrasados`);

        return {
            today: todayInstallments,
            thisWeek: weekInstallments,
            overdueCount: (realOverdueCount || 0) + virtualOverdueCount,
            totalDueToday,
            totalDueThisWeek
        };
    } catch (err) {
        console.error('❌ Erro ao buscar vencimentos:', err);
        return { today: [], thisWeek: [], overdueCount: 0, totalDueToday: 0, totalDueThisWeek: 0 };
    }
}
