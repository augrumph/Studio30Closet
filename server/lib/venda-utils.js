import { pool } from '../db.js'

/**
 * Helper: Calcular campos derivados de uma venda com crediário
 */
export async function calculateInstallmentFields(venda) {
    const vendaId = venda.id
    const totalValue = parseFloat(venda.total_value) || 0
    const entryPayment = parseFloat(venda.entry_payment) || 0

    // Buscar todas as parcelas e seus pagamentos
    const { rows: installments } = await pool.query(`
        SELECT
            i.*,
            COALESCE(SUM(ip.payment_amount), 0) as total_paid_via_payments
        FROM installments i
        LEFT JOIN installment_payments ip ON ip.installment_id = i.id
        WHERE i.venda_id = $1
        GROUP BY i.id
        ORDER BY i.installment_number ASC
    `, [vendaId])

    // Calcular totais
    let paidAmount = entryPayment
    let remainingAmount = 0
    let overdueCount = 0
    const today = new Date().toISOString().split('T')[0]

    installments.forEach(inst => {
        const instPaid = parseFloat(inst.total_paid_via_payments) || 0
        const instOriginal = parseFloat(inst.original_amount) || 0
        const instRemaining = Math.max(0, instOriginal - instPaid)

        paidAmount += instPaid
        remainingAmount += instRemaining

        if (inst.due_date < today && instRemaining > 0.01) {
            overdueCount++
        }
    })

    // Se não há parcelas, calcular manualmente
    if (installments.length === 0) {
        remainingAmount = totalValue - entryPayment
        paidAmount = entryPayment
    }

    return {
        dueAmount: Math.max(0, remainingAmount),
        paidAmount: paidAmount,
        overdueCount: overdueCount,
        hasInstallments: installments.length > 0
    }
}

/**
 * Helper: Sincronizar o status de pagamento da venda com base nas suas parcelas
 */
export async function syncVendaPaymentStatus(vendaId, client = pool) {
    console.log(`🔄 Syncing payment status for venda #${vendaId}...`)

    try {
        // 1. Buscar a venda
        const { rows: vendaRows } = await client.query(
            'SELECT id, payment_method FROM vendas WHERE id = $1',
            [vendaId]
        )

        if (vendaRows.length === 0) return

        // 2. Calcular saldo real total de todas as parcelas
        const { rows: installmentRows } = await client.query(`
            SELECT
                SUM(GREATEST(0, i.original_amount - COALESCE((
                    SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                ), 0))) as total_remaining
            FROM installments i
            WHERE i.venda_id = $1
        `, [vendaId])

        const totalRemaining = parseFloat(installmentRows[0].total_remaining) || 0

        // 3. Determinar novo status
        // Se saldo for zero, status é 'paid'. Caso contrário, 'pending'.
        const newStatus = totalRemaining <= 0.01 ? 'paid' : 'pending'

        console.log(`📊 Venda #${vendaId} - Saldo Restante: R$ ${totalRemaining.toFixed(2)} -> Novo Status: ${newStatus}`)

        // 4. Atualizar venda
        await client.query(
            "UPDATE vendas SET payment_status = $1, updated_at = NOW() WHERE id = $2",
            [newStatus, vendaId]
        )
    } catch (error) {
        console.error(`❌ Erro ao sincronizar status da venda #${vendaId}:`, error)
    }
}

/**
 * Helper: Quitar venda totalmente (com transação opcionalmente externa)
 */
export async function payFullVendaLogic(vendaId, paymentMethod = 'dinheiro', client) {
    const isExternalClient = !!client
    const db = client || await pool.connect()

    try {
        if (!isExternalClient) await db.query('BEGIN')

        // 1. Buscar parcelas pendentes
        const { rows: pendingInstallments } = await db.query(`
            SELECT i.id, i.original_amount,
                GREATEST(0, i.original_amount - COALESCE((
                    SELECT SUM(ip.payment_amount) FROM installment_payments ip WHERE ip.installment_id = i.id
                ), 0)) as real_remaining
            FROM installments i
            WHERE i.venda_id = $1 AND i.status != 'paid'
            FOR UPDATE
        `, [vendaId])

        const today = new Date().toISOString().split('T')[0]

        if (pendingInstallments.length > 0) {
            for (const inst of pendingInstallments) {
                const amountToPay = parseFloat(inst.real_remaining) > 0.01
                    ? parseFloat(inst.real_remaining)
                    : 0

                if (amountToPay > 0) {
                    await db.query(`
                        INSERT INTO installment_payments (installment_id, payment_amount, payment_date, payment_method, notes, created_by)
                        VALUES ($1, $2, $3, $4, 'Quitação total da venda', 'admin')
                    `, [inst.id, amountToPay, today, paymentMethod])
                }

                await db.query(`
                    UPDATE installments
                    SET status = 'paid', paid_amount = original_amount, remaining_amount = 0, updated_at = NOW()
                    WHERE id = $1
                `, [inst.id])
            }
        }

        // 2. Atualizar status da venda
        await db.query("UPDATE vendas SET payment_status = 'paid', updated_at = NOW() WHERE id = $1", [vendaId])

        if (!isExternalClient) await db.query('COMMIT')
        return { success: true }
    } catch (error) {
        if (!isExternalClient) {
            await db.query('ROLLBACK')
            db.release()
        }
        throw error
    } finally {
        if (!isExternalClient) db.release()
    }
}
