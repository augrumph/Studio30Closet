
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
    console.error('\n❌❌❌ SEGURANÇA: JWT_SECRET não definido nas variáveis de ambiente!')
    console.error('   Defina JWT_SECRET no seu .env para proteger o painel admin.\n')
    // Em produção use: process.exit(1)
}

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body

    try {
        // 1. Buscar usuário
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
        const user = rows[0]

        if (!user) {
            return res.status(401).json({ error: 'Email ou senha inválidos' })
        }

        // 2. Verificar senha
        const validPassword = await bcrypt.compare(password, user.password_hash)
        if (!validPassword) {
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
        delete user.password_hash

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
        const { rows } = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [decoded.id])

        if (rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' })

        res.json({ user: rows[0], valid: true })
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' })
    }
})

export default router
