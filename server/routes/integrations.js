/**
 * /api/integrations — gestão de integrações via painel admin
 *
 * GET  /status      — testa conexão real com cada serviço
 * GET  /config      — lê config atual (tokens mascarados)
 * PATCH /config     — salva config no banco + aplica em process.env imediatamente
 * POST /test/:svc   — testa serviço específico (melhor-envio | abacate-pay | resend | nuvem-fiscal)
 */

import express from 'express'
import { pool } from '../db.js'
import { getNuvemFiscalToken } from '../services/nuvem-fiscal.js'

const router = express.Router()

// Chaves que o admin pode configurar
const ALLOWED = new Set([
    'MELHOR_ENVIO_TOKEN', 'MELHOR_ENVIO_ENV', 'MELHOR_ENVIO_USER_AGENT',
    'STORE_ORIGIN_ZIP_CODE', 'STORE_NAME', 'STORE_PHONE', 'STORE_EMAIL',
    'STORE_DOCUMENT', 'STORE_ADDRESS', 'STORE_ADDRESS_NUMBER',
    'STORE_DISTRICT', 'STORE_CITY', 'STORE_STATE',
    'ABACATE_PAY_TOKEN', 'ABACATE_PAY_PRODUCT_ID', 'ABACATE_WEBHOOK_SECRET',
    'RESEND_API_KEY', 'RESEND_FROM_EMAIL',
    'NUVEM_FISCAL_CLIENT_ID', 'NUVEM_FISCAL_CLIENT_SECRET',
    'NUVEM_FISCAL_COMPANY_CNPJ', 'NUVEM_FISCAL_ENV', 'NUVEM_FISCAL_SCOPE',
    'FRONTEND_URL', 'INTERNAL_JOB_TOKEN',
])

// Chaves sensíveis — mascaradas no GET
const SENSITIVE = new Set([
    'MELHOR_ENVIO_TOKEN', 'ABACATE_PAY_TOKEN', 'ABACATE_WEBHOOK_SECRET',
    'RESEND_API_KEY', 'NUVEM_FISCAL_CLIENT_SECRET', 'INTERNAL_JOB_TOKEN',
])

function mask(val) {
    if (!val) return ''
    if (val.length <= 8) return '•'.repeat(8)
    return val.slice(0, 5) + '•'.repeat(Math.min(val.length - 9, 24)) + val.slice(-4)
}

function getEnv(key) {
    return process.env[key] || ''
}

// ── GET /status — ping real em cada integração ─────────────────────────────

router.get('/status', async (req, res) => {
    const results = {}

    // Melhor Envio
    try {
        const token = getEnv('MELHOR_ENVIO_TOKEN')
        if (!token) throw new Error('Token não configurado')
        const env = getEnv('MELHOR_ENVIO_ENV') || 'sandbox'
        const base = env === 'production' ? 'https://www.melhorenvio.com.br' : 'https://sandbox.melhorenvio.com.br'
        const r = await fetch(`${base}/api/v2/me`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': getEnv('MELHOR_ENVIO_USER_AGENT') || 'Studio30' }
        })
        if (r.ok) {
            const data = await r.json()
            results.melhorEnvio = { status: 'connected', message: `Conectado — ${data.email || data.name || 'conta ativa'}`, env }
        } else {
            results.melhorEnvio = { status: 'error', message: `HTTP ${r.status} — token inválido ou expirado`, env }
        }
    } catch (e) {
        results.melhorEnvio = { status: 'error', message: e.message, env: getEnv('MELHOR_ENVIO_ENV') || 'sandbox' }
    }

    // Abacate Pay
    try {
        const token = getEnv('ABACATE_PAY_TOKEN')
        if (!token) throw new Error('Token não configurado')
        const r = await fetch('https://api.abacatepay.com/v2/customer/list', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        })
        if (r.ok) {
            const productId = getEnv('ABACATE_PAY_PRODUCT_ID')
            results.abacatePay = {
                status: 'connected',
                message: productId ? `Conectado — produto ${productId.slice(0, 12)}…` : 'Conectado — PRODUCT_ID ainda não configurado',
                env: 'production'
            }
        } else {
            results.abacatePay = { status: 'error', message: `HTTP ${r.status} — verifique o token`, env: 'production' }
        }
    } catch (e) {
        results.abacatePay = { status: 'error', message: e.message, env: 'production' }
    }

    // Resend
    try {
        const key = getEnv('RESEND_API_KEY')
        if (!key) throw new Error('API Key não configurada')
        const r = await fetch('https://api.resend.com/api-keys', {
            headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }
        })
        if (r.ok) {
            results.resend = { status: 'connected', message: 'Conectado — pronto para enviar e-mails', env: 'production' }
        } else {
            results.resend = { status: 'error', message: `HTTP ${r.status} — API Key inválida`, env: 'production' }
        }
    } catch (e) {
        results.resend = { status: 'error', message: e.message, env: 'production' }
    }

    // Nuvem Fiscal
    const nfEnv = getEnv('NUVEM_FISCAL_ENV') || 'sandbox'
    try {
        if (!getEnv('NUVEM_FISCAL_CLIENT_ID') || !getEnv('NUVEM_FISCAL_CLIENT_SECRET')) {
            throw new Error('Client ID ou Secret não configurados')
        }
        await getNuvemFiscalToken()
        const cnpj = getEnv('NUVEM_FISCAL_COMPANY_CNPJ')
        results.nuvemFiscal = {
            status: 'connected',
            message: `Conectado — CNPJ ${cnpj ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : 'não configurado'}`,
            env: nfEnv
        }
    } catch (e) {
        results.nuvemFiscal = { status: 'error', message: e.message, env: nfEnv }
    }

    res.json(results)
})

// ── GET /config — configurações atuais (tokens mascarados) ─────────────────

router.get('/config', (req, res) => {
    const config = {}
    for (const key of ALLOWED) {
        const val = getEnv(key)
        config[key] = SENSITIVE.has(key) ? mask(val) : val
    }
    // Indicar quais campos têm valor (mesmo que mascarado)
    config._hasValues = {}
    for (const key of SENSITIVE) {
        config._hasValues[key] = !!getEnv(key)
    }
    res.json(config)
})

// ── PATCH /config — salvar no banco + process.env imediato ─────────────────

router.patch('/config', async (req, res) => {
    const updates = req.body || {}
    const saved = []
    const skipped = []

    for (const [key, value] of Object.entries(updates)) {
        if (!ALLOWED.has(key)) { skipped.push(key); continue }
        // String vazia = não alterar
        if (value === '' || value === null || value === undefined) { skipped.push(key); continue }

        await pool.query(
            `INSERT INTO integration_settings (key, value, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [key, String(value)]
        )
        // Aplicar imediatamente sem restart
        process.env[key] = String(value)
        saved.push(key)
    }

    console.log(`⚙️  Configurações atualizadas pelo admin: ${saved.join(', ')}`)
    res.json({ success: true, saved, skipped })
})

// ── POST /test/:svc — testar serviço específico ────────────────────────────

router.post('/test/:svc', async (req, res) => {
    const { svc } = req.params

    try {
        if (svc === 'melhor-envio') {
            const token = getEnv('MELHOR_ENVIO_TOKEN')
            if (!token) return res.status(400).json({ ok: false, message: 'Token não configurado' })
            const env = getEnv('MELHOR_ENVIO_ENV') || 'sandbox'
            const base = env === 'production' ? 'https://www.melhorenvio.com.br' : 'https://sandbox.melhorenvio.com.br'
            const r = await fetch(`${base}/api/v2/me`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': getEnv('MELHOR_ENVIO_USER_AGENT') || 'Studio30' }
            })
            if (!r.ok) return res.json({ ok: false, message: `HTTP ${r.status}` })
            const data = await r.json()
            return res.json({ ok: true, message: `Conectado como ${data.email || data.name || 'usuário'}`, detail: { env, email: data.email } })
        }

        if (svc === 'abacate-pay') {
            const token = getEnv('ABACATE_PAY_TOKEN')
            if (!token) return res.status(400).json({ ok: false, message: 'Token não configurado' })
            const r = await fetch('https://api.abacatepay.com/v2/billing-product/list', {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            })
            const data = await r.json().catch(() => ({}))
            if (r.ok && data.success !== false) {
                const products = Array.isArray(data.data) ? data.data : []
                const productId = getEnv('ABACATE_PAY_PRODUCT_ID')
                return res.json({
                    ok: true,
                    message: `Conectado — ${products.length} produto(s) no catálogo`,
                    detail: { products: products.map(p => ({ id: p.id, name: p.name })), productId }
                })
            }
            // Try customer list as fallback
            const r2 = await fetch('https://api.abacatepay.com/v2/customer/list', {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            })
            if (r2.ok) return res.json({ ok: true, message: 'API conectada', detail: { productId: getEnv('ABACATE_PAY_PRODUCT_ID') } })
            return res.json({ ok: false, message: `HTTP ${r.status} — token inválido` })
        }

        if (svc === 'resend') {
            const key = getEnv('RESEND_API_KEY')
            if (!key) return res.status(400).json({ ok: false, message: 'API Key não configurada' })
            const r = await fetch('https://api.resend.com/api-keys', {
                headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }
            })
            if (!r.ok) return res.json({ ok: false, message: `HTTP ${r.status} — key inválida` })
            const data = await r.json()
            const keys = data.data || []
            return res.json({ ok: true, message: `${keys.length} API key(s) ativas`, detail: { from: getEnv('RESEND_FROM_EMAIL') } })
        }

        if (svc === 'nuvem-fiscal') {
            if (!getEnv('NUVEM_FISCAL_CLIENT_ID') || !getEnv('NUVEM_FISCAL_CLIENT_SECRET')) {
                return res.status(400).json({ ok: false, message: 'Client ID ou Secret não configurados' })
            }
            await getNuvemFiscalToken()
            return res.json({
                ok: true,
                message: 'OAuth token obtido com sucesso',
                detail: { env: getEnv('NUVEM_FISCAL_ENV'), cnpj: getEnv('NUVEM_FISCAL_COMPANY_CNPJ') }
            })
        }

        res.status(400).json({ ok: false, message: `Serviço desconhecido: ${svc}` })
    } catch (e) {
        res.json({ ok: false, message: e.message })
    }
})

export default router
