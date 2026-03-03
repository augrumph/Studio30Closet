
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

import crypto from 'crypto'

const router = express.Router()

// JWT Secret: uses env var if available, otherwise derives a stable secret from a fixed seed.
// This ensures the server always starts without requiring manual env configuration.
const JWT_SECRET = process.env.JWT_SECRET
    || crypto.createHash('sha256').update('studio30-admin-jwt-secret-2024').digest('hex')


// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body

    try {
        // 1. Buscar usuário
        const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [email])
        const user = rows[0]

        if (!user) {
            return res.status(401).json({ error: 'Email ou senha inválidos' })
        }

        // 2. Verificar senha (suporta hash bcrypt e texto plano durante migração)
        const isPlainMatch = user.password === password;
        const isHashMatch = await bcrypt.compare(password, user.password).catch(() => false);

        if (!isPlainMatch && !isHashMatch) {
            return res.status(401).json({ error: 'Email ou senha inválidos' })
        }

        // 3. Gerar Token
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
