import express from 'express'
import { pool } from '../db.js'

const router = express.Router()

// GET /api/settings - Get all settings as key-value object
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM settings')

        // Convert array of settings to object { key: value }
        const settingsObject = rows.reduce((acc, setting) => {
            acc[setting.setting_key] = setting.value
            return acc
        }, {})

        res.json(settingsObject)
    } catch (error) {
        console.error('❌ Erro ao buscar configurações:', error)
        res.status(500).json({ error: 'Erro ao buscar configurações' })
    }
})

// GET /api/settings/:key - Get specific setting by key
router.get('/:key', async (req, res) => {
    const { key } = req.params

    try {
        const { rows } = await pool.query(
            'SELECT * FROM settings WHERE setting_key = $1',
            [key]
        )

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Configuração não encontrada' })
        }

        res.json({ [key]: rows[0].value })
    } catch (error) {
        console.error(`❌ Erro ao buscar configuração ${key}:`, error)
        res.status(500).json({ error: 'Erro ao buscar configuração' })
    }
})

// PUT /api/settings - Update multiple settings
router.put('/', async (req, res) => {
    const settingsData = req.body

    if (!settingsData || typeof settingsData !== 'object') {
        return res.status(400).json({ error: 'Dados inválidos' })
    }

    try {
        // Update each setting in a transaction
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            for (const [key, value] of Object.entries(settingsData)) {
                await client.query(`
                    INSERT INTO settings (setting_key, value)
                    VALUES ($1, $2)
                    ON CONFLICT (setting_key)
                    DO UPDATE SET value = EXCLUDED.value
                `, [key, JSON.stringify(value)])
            }

            await client.query('COMMIT')
            res.json({ success: true })

        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }

    } catch (error) {
        console.error('❌ Erro ao atualizar configurações:', error)
        res.status(500).json({ error: 'Erro ao atualizar configurações' })
    }
})

// PUT /api/settings/:key - Update specific setting
router.put('/:key', async (req, res) => {
    const { key } = req.params
    const { value } = req.body

    if (value === undefined) {
        return res.status(400).json({ error: 'Value é obrigatório' })
    }

    try {
        const { rows } = await pool.query(`
            INSERT INTO settings (setting_key, value)
            VALUES ($1, $2)
            ON CONFLICT (setting_key)
            DO UPDATE SET value = EXCLUDED.value
            RETURNING *
        `, [key, JSON.stringify(value)])

        res.json({ [key]: rows[0].value })
    } catch (error) {
        console.error(`❌ Erro ao atualizar configuração ${key}:`, error)
        res.status(500).json({ error: 'Erro ao atualizar configuração' })
    }
})

// DELETE /api/settings/:key - Delete specific setting
router.delete('/:key', async (req, res) => {
    const { key } = req.params

    try {
        const { rowCount } = await pool.query(
            'DELETE FROM settings WHERE setting_key = $1',
            [key]
        )

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Configuração não encontrada' })
        }

        res.json({ success: true })
    } catch (error) {
        console.error(`❌ Erro ao deletar configuração ${key}:`, error)
        res.status(500).json({ error: 'Erro ao deletar configuração' })
    }
})

export default router
