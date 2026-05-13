console.log('🏁 Starting server/index.js...')
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import path from 'path'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { authenticateToken } from './middleware/auth.js'
import { pool } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.set('trust proxy', 1)

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "https://t3.storageapi.dev", "https://maglev.proxy.rlwy.net", "https://api.emailjs.com", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://www.google.com", "https://www.google.com.br", "https://googleads.g.doubleclick.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://googleads.g.doubleclick.net", "https://www.googleadservices.com", "https://www.instagram.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            workerSrc: ["'self'", "blob:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:", "https://www.google.com", "https://www.google.com.br", "https://googleads.g.doubleclick.net"],
            frameSrc: ["'self'", "https://www.googletagmanager.com", "https://www.instagram.com"]
        }
    }
}))

const allowedOrigins = [process.env.FRONTEND_URL, 'https://studio30closet.com.br', 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean)
const corsMiddleware = cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error(`CORS: Origin not allowed: ${origin}`))
        }
    },
    credentials: true
})
app.use('/api/', corsMiddleware)
app.use(compression())
const limiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 100000, // Limite altíssimo
    skip: (req) => process.env.NODE_ENV !== 'production', // DESATIVA em desenvolvimento
    message: { error: 'Muitas requisições vindas deste IP. Tente novamente mais tarde.' }
})
app.use('/api/', limiter)
app.use(express.json({ limit: '10mb' }))

// Rotas
import dashboardRouter from './routes/dashboard.js'
import vendasRouter from './routes/vendas.js'
import returnsRouter from './routes/returns.js'
import productsRouter from './routes/products.js'
import malinhasRouter from './routes/malinhas.js'
import customersRouter from './routes/customers.js'
import entregasRouter from './routes/entregas.js'
import suppliersRouter from './routes/suppliers.js'
import purchasesRouter from './routes/purchases.js'
import installmentsRouter from './routes/installments.js'
import expensesRouter from './routes/expenses.js'
import analyticsRouter from './routes/analytics.js'
import stockRouter from './routes/stock.js'
import imagesRouter from './routes/images.js'
import ordersRouter from './routes/orders.js'
import adminToolsRouter from './routes/admin-tools.js'
import authRouter from './routes/auth.js'
import collectionsRouter from './routes/collections.js'
import materialsRouter from './routes/materials.js'
import paymentFeesRouter from './routes/payment-fees.js'
import settingsRouter from './routes/settings.js'
import emailRouter from './routes/email.js'
import storeRouter from './routes/store.js'
import webhooksRouter from './routes/webhooks.js'
import integrationsRouter from './routes/integrations.js'
import realtimeRouter from './routes/realtime.js'
import { ensureCommerceSchema } from './lib/commerce-schema.js'

// Public
app.use('/api/auth', authRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/collections', collectionsRouter)
app.use('/api/email', emailRouter)
app.use('/api/products', productsRouter)
app.use('/api/store', storeRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/api/realtime', realtimeRouter)

// Protected Admin
app.use('/api/integrations', authenticateToken, integrationsRouter)
app.use('/api/dashboard', authenticateToken, dashboardRouter)
app.use('/api/vendas', authenticateToken, vendasRouter)
app.use('/api/returns', authenticateToken, returnsRouter)
app.use('/api/malinhas', authenticateToken, malinhasRouter)
app.use('/api/customers', authenticateToken, customersRouter)
app.use('/api/entregas', authenticateToken, entregasRouter)
app.use('/api/suppliers', authenticateToken, suppliersRouter)
app.use('/api/purchases', authenticateToken, purchasesRouter)
app.use('/api/installments', authenticateToken, installmentsRouter)
app.use('/api/expenses', authenticateToken, expensesRouter)
app.use('/api/stock', authenticateToken, stockRouter)
app.use('/api/images', imagesRouter)
app.use('/api/admin-tools', authenticateToken, adminToolsRouter)
app.use('/api/materials', authenticateToken, materialsRouter)
app.use('/api/payment-fees', authenticateToken, paymentFeesRouter)
app.use('/api/settings', authenticateToken, settingsRouter)

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1')
        res.json({ status: 'ok', timestamp: new Date().toISOString() })
    } catch (error) {
        res.status(503).json({ status: 'error', error: error.message })
    }
})

if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '..', 'dist')
    app.use(express.static(distPath))
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

app.use(notFoundHandler)
app.use(errorHandler)

await ensureCommerceSchema()

// Carregar configurações de integração salvas pelo admin no banco
// Sobrescreve valores do .env — permite atualização sem restart
try {
    const { rows: cfgRows } = await pool.query('SELECT key, value FROM integration_settings')
    for (const { key, value } of cfgRows) {
        if (value) process.env[key] = value
    }
    if (cfgRows.length > 0) console.log(`⚙️  ${cfgRows.length} configuração(ões) de integração carregadas do banco`)
} catch (e) {
    console.warn('⚠️  Não foi possível carregar configurações de integração:', e.message)
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Studio30 Admin BFF rodando em http://localhost:${PORT}`)
})
