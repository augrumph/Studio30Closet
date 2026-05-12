/**
 * Motor de detecção de fraude — Studio 30 Closet
 *
 * 3 camadas:
 *   1. Hard blocks  → recusa imediata, nunca cria pedido
 *   2. Risk score   → 0-29 libera | 30-59 revisão manual | 60+ bloqueia
 *   3. Evidências   → tudo logado para defesa em disputas
 */

import { pool } from '../db.js'

// ── Domínios de e-mail descartáveis conhecidos ──────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'yopmail.com',
    'sharklasers.com', 'grr.la', 'guerrillamail.info', 'guerrillamail.biz',
    'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org', 'spam4.me',
    'trashmail.com', 'trashmail.at', 'trashmail.io', 'trashmail.me',
    'trashmail.net', 'dispostable.com', 'maildrop.cc', 'tempr.email',
    'discard.email', 'fakeinbox.com', 'mailnesia.com', 'mailforspam.com',
    '10minutemail.com', '10minutemail.net', 'temp-mail.org', 'temp-mail.ru',
    'getairmail.com', 'filzmail.com', 'mfsa.ru', 'emailondeck.com',
    'mailtemp.info', 'throwam.com', 'spamgrap.com', 'mintemail.com',
    'mailnull.com', 'spamgourmet.com', 'spamherePlease.com',
    'fakemailgenerator.com', 'mailexpire.com', 'temporaryemail.net',
])

// ── Definição de sinais e pontuações ────────────────────────────────────────
export const SIGNALS = {
    is_card:                { points: 10, label: 'Pagamento por cartão' },
    first_purchase:         { points: 10, label: 'Primeira compra' },
    order_over_350:         { points: 15, label: 'Pedido > R$ 350' },
    order_over_500:         { points: 30, label: 'Pedido > R$ 500' },
    pending_orders_2:       { points: 25, label: '2+ pedidos pendentes sem pagamento (últimas 2h)' },
    pending_orders_5:       { points: 999, label: '5+ pedidos pendentes — possível card testing (BLOCK)' },
    different_recipient:    { points: 15, label: 'Destinatário diferente do comprador' },
    invalid_phone:          { points: 20, label: 'Telefone inválido ou muito curto' },
    suspicious_email:       { points: 10, label: 'E-mail descartável ou temporário' },
    same_address_multi_cpf: { points: 35, label: 'Mesmo endereço com 3+ CPFs diferentes' },
    previous_dispute:       { points: 50, label: 'CPF com disputa/chargeback anterior' },
    velocity_email:         { points: 30, label: 'E-mail com 3+ pedidos nas últimas 24h' },
    velocity_cpf:           { points: 30, label: 'CPF com 3+ pedidos nas últimas 24h' },
    known_blocked:          { points: 999, label: 'Entidade na lista de bloqueio (BLOCK)' },
    previous_return_fraud:  { points: 40, label: 'CPF com histórico de devolução fraudulenta' },
    wardrobing:             { points: 30, label: 'CPF com devoluções repetidas' },
    promo_abuse:            { points: 25, label: 'Mesmo CPF/endereço com múltiplos cupons' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function isValidBrazilianPhone(phone) {
    const d = phone.replace(/\D/g, '')
    return d.length === 10 || d.length === 11
}

export function isDisposableEmail(email) {
    const domain = email.split('@')[1]?.toLowerCase()
    return domain ? DISPOSABLE_DOMAINS.has(domain) : false
}

function namesDiffer(a, b) {
    if (!a || !b) return false
    const first = s => s.trim().split(/\s+/)[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    return first(a) !== first(b)
}

// ── Motor principal ──────────────────────────────────────────────────────────

/**
 * Calcula o risco de uma tentativa de checkout.
 *
 * @returns {{ score, action: 'allow'|'review'|'block', signals: {}, reasons: string[] }}
 */
export async function calculateFraudRisk({ customer, address, totalValue, paymentMethod = 'card' }) {
    const fired = {}
    let score = 0

    const cpf   = (customer.cpf   || '').replace(/\D/g, '')
    const email  = (customer.email || '').toLowerCase().trim()
    const phone  = (customer.phone || '')
    const recipient = address?.recipientName?.trim() || ''
    const buyer     = customer.name?.trim() || ''

    const add = (key) => {
        if (SIGNALS[key]) { fired[key] = SIGNALS[key]; score += SIGNALS[key].points }
    }

    // 1. Método de pagamento
    if (paymentMethod === 'card') add('is_card')

    // 2. Primeira compra para este CPF
    try {
        if (cpf) {
            const { rows } = await pool.query(
                `SELECT COUNT(*) AS cnt FROM orders
                 WHERE regexp_replace(COALESCE(customer_snapshot->>'cpf',''),'\\D','','g') = $1
                   AND status <> 'cancelled'`,
                [cpf]
            )
            if (Number(rows[0].cnt) === 0) add('first_purchase')
        }
    } catch { /* não fatal */ }

    // 3. Valor do pedido
    if (totalValue > 500) add('order_over_500')
    else if (totalValue > 350) add('order_over_350')

    // 4. Card testing — pedidos pendentes sem pagamento nas últimas 2h (mesmo e-mail ou CPF)
    try {
        if (email || cpf) {
            const { rows } = await pool.query(
                `SELECT COUNT(*) AS cnt FROM orders
                 WHERE (
                   (customer_snapshot->>'email' = $1 AND $1 <> '')
                   OR (regexp_replace(COALESCE(customer_snapshot->>'cpf',''),'\\D','','g') = $2 AND $2 <> '')
                 )
                 AND payment_status = 'pending'
                 AND created_at > NOW() - INTERVAL '2 hours'`,
                [email, cpf]
            )
            const n = Number(rows[0].cnt)
            if (n >= 5) add('pending_orders_5')
            else if (n >= 2) add('pending_orders_2')
        }
    } catch { /* não fatal */ }

    // 5. Destinatário diferente do comprador
    if (paymentMethod === 'card' && namesDiffer(buyer, recipient)) add('different_recipient')

    // 6. Telefone inválido
    if (phone && !isValidBrazilianPhone(phone)) add('invalid_phone')

    // 7. E-mail descartável
    if (email && isDisposableEmail(email)) add('suspicious_email')

    // 8. Mesmo endereço com múltiplos CPFs
    try {
        if (address?.zipCode && address?.number) {
            const zip = address.zipCode.replace(/\D/g, '')
            const { rows } = await pool.query(
                `SELECT COUNT(DISTINCT regexp_replace(COALESCE(customer_snapshot->>'cpf',''),'\\D','','g')) AS cnt
                 FROM orders
                 WHERE shipping_address->>'zipCode' = $1
                   AND shipping_address->>'number' = $2
                   AND status <> 'cancelled'`,
                [zip, address.number]
            )
            if (Number(rows[0].cnt) >= 3) add('same_address_multi_cpf')
        }
    } catch { /* não fatal */ }

    // 9. Histórico de disputa/chargeback
    try {
        if (cpf) {
            const { rows } = await pool.query(
                `SELECT COUNT(*) AS cnt FROM orders
                 WHERE regexp_replace(COALESCE(customer_snapshot->>'cpf',''),'\\D','','g') = $1
                   AND payment_status IN ('chargeback', 'disputed')`,
                [cpf]
            )
            if (Number(rows[0].cnt) > 0) add('previous_dispute')
        }
    } catch { /* não fatal */ }

    // 10. Velocity e-mail (24h)
    try {
        if (email) {
            const { rows } = await pool.query(
                `SELECT COUNT(*) AS cnt FROM orders
                 WHERE customer_snapshot->>'email' = $1
                   AND created_at > NOW() - INTERVAL '24 hours'`,
                [email]
            )
            if (Number(rows[0].cnt) >= 3) add('velocity_email')
        }
    } catch { /* não fatal */ }

    // 11. Velocity CPF (24h)
    try {
        if (cpf) {
            const { rows } = await pool.query(
                `SELECT COUNT(*) AS cnt FROM orders
                 WHERE regexp_replace(COALESCE(customer_snapshot->>'cpf',''),'\\D','','g') = $1
                   AND created_at > NOW() - INTERVAL '24 hours'`,
                [cpf]
            )
            if (Number(rows[0].cnt) >= 3) add('velocity_cpf')
        }
    } catch { /* não fatal */ }

    // 12. Entidade bloqueada (CPF, e-mail ou telefone)
    try {
        const { rows } = await pool.query(
            `SELECT entity_type, entity_value, reason FROM blocked_entities
             WHERE (entity_type = 'cpf'   AND entity_value = $1 AND $1 <> '')
                OR (entity_type = 'email' AND entity_value = $2 AND $2 <> '')
                OR (entity_type = 'phone' AND entity_value = $3 AND $3 <> '')
             LIMIT 1`,
            [cpf, email, phone.replace(/\D/g, '')]
        )
        if (rows.length > 0) {
            fired.known_blocked = { ...SIGNALS.known_blocked, detail: rows[0] }
            score += SIGNALS.known_blocked.points
        }
    } catch { /* não fatal */ }

    // 13. Devolução fraudulenta prévia
    try {
        if (cpf) {
            const { rows } = await pool.query(
                `SELECT COUNT(*) AS cnt FROM orders
                 WHERE regexp_replace(COALESCE(customer_snapshot->>'cpf',''),'\\D','','g') = $1
                   AND return_status = 'rejected'`,
                [cpf]
            )
            if (Number(rows[0].cnt) > 0) add('previous_return_fraud')
        }
    } catch { /* não fatal */ }

    // 14. Wardrobing — devoluções repetidas
    try {
        if (cpf) {
            const { rows } = await pool.query(
                `SELECT COUNT(*) AS cnt FROM orders
                 WHERE regexp_replace(COALESCE(customer_snapshot->>'cpf',''),'\\D','','g') = $1
                   AND return_status IN ('approved_refund', 'rejected')`,
                [cpf]
            )
            if (Number(rows[0].cnt) >= 2) add('wardrobing')
        }
    } catch { /* não fatal */ }

    // ── Classificação ────────────────────────────────────────────────────────
    const action = score >= 60 ? 'block' : score >= 30 ? 'review' : 'allow'

    return {
        score,
        action,
        signals: fired,
        reasons: Object.values(fired).map(s => s.label),
    }
}

// ── Persistência ─────────────────────────────────────────────────────────────

export async function saveFraudAssessment(client, { orderId, customerCpf, customerEmail, score, action, signals }) {
    try {
        await client.query(
            `INSERT INTO fraud_risk_log (order_id, customer_cpf, customer_email, risk_score, risk_action, signals)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [orderId, customerCpf, customerEmail, score, action, JSON.stringify(signals)]
        )
        await client.query(
            `UPDATE orders SET fraud_score = $1, fraud_action = $2, fraud_signals = $3 WHERE id = $4`,
            [score, action, JSON.stringify(signals), orderId]
        )
    } catch (err) {
        console.error('[FraudEngine] Erro ao salvar assessment:', err.message)
    }
}

export async function blockEntity({ entityType, entityValue, reason, blockedBy = 'manual' }) {
    const value = entityType === 'phone'
        ? entityValue.replace(/\D/g, '')
        : entityType === 'cpf'
            ? entityValue.replace(/\D/g, '')
            : entityValue.toLowerCase().trim()

    await pool.query(
        `INSERT INTO blocked_entities (entity_type, entity_value, reason, blocked_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (entity_type, entity_value) DO UPDATE
         SET reason = $3, blocked_by = $4, blocked_at = NOW()`,
        [entityType, value, reason, blockedBy]
    )
}

export async function unblockEntity(id) {
    const { rows } = await pool.query(
        'DELETE FROM blocked_entities WHERE id = $1 RETURNING *',
        [id]
    )
    return rows[0]
}

export async function sendFraudAlert({ order, score, reasons }) {
    if (!process.env.RESEND_API_KEY) return
    const { sendTransactionalEmail } = await import('../services/resend.js')
    const snapshot = order.customer_snapshot || {}

    await sendTransactionalEmail({
        to: 'augusto.rudolph@gmail.com',
        subject: `⚠️ Pedido ${order.order_number} em revisão de fraude — Score ${score}`,
        idempotencyKey: `fraud-review-${order.id}`,
        html: `
        <h2>Pedido em revisão</h2>
        <p><strong>Pedido:</strong> ${order.order_number} (#${order.id})</p>
        <p><strong>Cliente:</strong> ${snapshot.name} — ${snapshot.email} — ${snapshot.phone}</p>
        <p><strong>Score de risco:</strong> ${score}/100</p>
        <p><strong>Sinais disparados:</strong></p>
        <ul>${reasons.map(r => `<li>${r}</li>`).join('')}</ul>
        <p>Acesse o admin para aprovar ou bloquear o envio.</p>
        <a href="${process.env.FRONTEND_URL || 'https://studio30closet.com.br'}/admin/pedidos-online">
            Ver pedido no admin →
        </a>
        `
    }).catch(err => console.error('[FraudEngine] Falha no alerta:', err.message))
}
