import express from 'express'
import { verifyJwt } from '../lib/jwt.js'
import { addRealtimeClient } from '../lib/realtime-events.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

router.get('/', (req, res) => {
    const token = req.query.token

    if (!token || typeof token !== 'string') {
        return res.status(401).json({ error: 'Token de autenticação não fornecido' })
    }

    try {
        req.user = verifyJwt(token, JWT_SECRET)
    } catch {
        return res.status(401).json({ error: 'Token inválido ou expirado' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const removeClient = addRealtimeClient(res)
    const keepAlive = setInterval(() => {
        res.write(`event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`)
    }, 25000)

    req.on('close', () => {
        clearInterval(keepAlive)
        removeClient()
    })
})

export default router
