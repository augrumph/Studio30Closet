import express from 'express'
import { sendNewMalinhaNotification } from '../email-service.js'

const router = express.Router()

/**
 * POST /api/email/malinha
 * Envia notificação de nova malinha para o admin
 */
router.post('/malinha', async (req, res) => {
    const { customerName, customerEmail, itemsCount, orderId } = req.body

    if (!customerName) {
        return res.status(400).json({ success: false, error: 'customerName é obrigatório' })
    }

    try {
        const result = await sendNewMalinhaNotification({
            customerName,
            customerEmail: customerEmail || '(não informado)',
            itemsCount: itemsCount || 0,
            orderId: orderId || 'N/A'
        })

        if (result.success) {
            console.log(`✅ Email de malinha enviado para admin (pedido #${orderId})`)
            res.json({ success: true, messageId: result.messageId })
        } else {
            console.error('❌ Falha ao enviar email:', result.error)
            // Retorna 200 mesmo com falha — não queremos bloquear o checkout por email
            res.json({ success: false, error: result.error })
        }
    } catch (error) {
        console.error('❌ Erro na rota de email:', error)
        res.json({ success: false, error: error.message })
    }
})

export default router
