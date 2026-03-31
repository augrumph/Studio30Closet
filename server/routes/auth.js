
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { pool } from '../db.js'

import crypto from 'crypto'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET

// Rate limiting agressivo para login: 10 tentativas por 15 min por IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
})

// Login
router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body

    try {
        // 1. Buscar usuário
        const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [email])
        const user = rows[0]

        if (!user) {
            return res.status(401).json({ error: 'Email ou senha inválidos' })
        }

        // 2. Verificar senha — suporta bcrypt e texto plano (migração automática)
        const isHashMatch = await bcrypt.compare(password, user.password).catch(() => false)
        const isPlainMatch = !isHashMatch && user.password === password

        if (!isHashMatch && !isPlainMatch) {
            return res.status(401).json({ error: 'Email ou senha inválidos' })
        }

        // 3. Migração automática: se estava em texto plano, salvar como bcrypt
        if (isPlainMatch) {
            const hashed = await bcrypt.hash(password, 12)
            await pool.query('UPDATE admins SET password = $1 WHERE id = $2', [hashed, user.id])
            console.log(`🔐 Senha do admin ${user.id} migrada para bcrypt automaticamente.`)
        }

        // 4. Gerar Token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            JWT_SECRET,
            { expiresIn: '7d' } // Token válido por 7 dias para simplificar
        )

        // 4. Retornar dados (sem senha)
        delete user.password

        res.json({
            token,
            user
        })

    } catch (err) {
        console.error('❌ Erro no login:', err)
        res.status(500).json({ error: 'Erro no servidor ao fazer login' })
    }
})

// Verificar Token (endpoint auxiliar para o frontend validar sessão na carga inicial)
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' })

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        // Opcional: Buscar dados atualizados do banco
        const { rows } = await pool.query('SELECT id, username as email, name FROM admins WHERE id = $1', [decoded.id])

        if (rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' })

        res.json({ user: rows[0], valid: true })
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' })
    }
})

export default router
