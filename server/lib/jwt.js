import crypto from 'crypto'

function base64UrlEncode(value) {
    const input = typeof value === 'string' ? value : JSON.stringify(value)
    return Buffer.from(input).toString('base64url')
}

function base64UrlDecode(value) {
    return Buffer.from(value, 'base64url').toString('utf8')
}

function parseExpiresIn(expiresIn) {
    if (typeof expiresIn === 'number') return expiresIn

    const match = String(expiresIn || '').match(/^(\d+)([smhd])$/)
    if (!match) return 0

    const value = Number(match[1])
    const unit = match[2]
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 }

    return value * multipliers[unit]
}

function signPart(header, payload, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url')
}

export function signJwt(payload, secret, options = {}) {
    if (!secret) throw new Error('JWT secret is required')

    const now = Math.floor(Date.now() / 1000)
    const expiresIn = parseExpiresIn(options.expiresIn)
    const fullPayload = {
        ...payload,
        iat: now,
        ...(expiresIn ? { exp: now + expiresIn } : {})
    }

    const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' })
    const body = base64UrlEncode(fullPayload)
    const signature = signPart(header, body, secret)

    return `${header}.${body}.${signature}`
}

export function verifyJwt(token, secret) {
    if (!secret) throw new Error('JWT secret is required')

    const parts = String(token || '').split('.')
    if (parts.length !== 3) throw new Error('Token inválido')

    const [header, body, signature] = parts
    const expectedSignature = signPart(header, body, secret)
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (
        signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
        throw new Error('Token inválido')
    }

    const decodedHeader = JSON.parse(base64UrlDecode(header))
    if (decodedHeader.alg !== 'HS256') throw new Error('Algoritmo JWT inválido')

    const payload = JSON.parse(base64UrlDecode(body))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) throw new Error('Token expirado')

    return payload
}
