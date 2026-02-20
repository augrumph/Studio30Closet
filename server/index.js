import express from 'express'
import cors from 'cors'
import compression from 'compression'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import path from 'path'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { pool } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Security com configuração de CSP para permitir Supabase, Google Fonts, Google Analytics
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: [
                "'self'",
                "https://t3.storageapi.dev",
                "https://maglev.proxy.rlwy.net",
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com",
                "https://www.google.com",
                "https://googleads.g.doubleclick.net"
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com",
                "https://googleads.g.doubleclick.net",
                "https://www.googleadservices.com"
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "data:",
                "https://fonts.gstatic.com"
            ],
            imgSrc: ["'self'", "data:", "https:", "blob:", "https://www.google.com", "https://googleads.g.doubleclick.net"],
            frameSrc: ["'self'", "https://www.googletagmanager.com"]
        }
    }
}))

// CORS
app.use(cors())

// Compression - reduces response size by 70-90%
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false
        }
        return compression.filter(req, res)
    },
    level: 6 // Balance between speed and compression ratio
}))

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Body parser with limit
app.use(express.json({ limit: '10mb' }))

// Image optimization
import { imageOptimizationMiddleware } from './imageOptimizer.js'
app.use('/api/', imageOptimizationMiddleware({ quality: 80, format: 'webp' }))

// Rotas
import dashboardRouter from './routes/dashboard.js'
import vendasRouter from './routes/vendas.js'
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

app.use('/api/dashboard', dashboardRouter)
app.use('/api/vendas', vendasRouter)
app.use('/api/products', productsRouter)
app.use('/api/malinhas', malinhasRouter)
app.use('/api/customers', customersRouter)
app.use('/api/entregas', entregasRouter)
app.use('/api/suppliers', suppliersRouter)
app.use('/api/purchases', purchasesRouter)
app.use('/api/installments', installmentsRouter)
app.use('/api/expenses', expensesRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/stock', stockRouter)
app.use('/api/images', imagesRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/admin-tools', adminToolsRouter)
app.use('/api/auth', authRouter)
app.use('/api/collections', collectionsRouter)
app.use('/api/materials', materialsRouter)
app.use('/api/payment-fees', paymentFeesRouter)
app.use('/api/settings', settingsRouter)

// Health Check with detailed status
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        const dbStart = Date.now()
        await pool.query('SELECT 1')
        const dbLatency = Date.now() - dbStart

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: {
                status: 'connected',
                latency: `${dbLatency}ms`
            },
            memory: {
                used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
            }
        })
    } catch (error) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        })
    }
})

// ==================== PRODUÇÃO: Servir Frontend Estático ====================
// Em produção, o servidor Express serve tanto a API quanto o frontend buildado
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '..', 'dist')

    // Servir arquivos estáticos (CSS, JS, imagens)
    app.use(express.static(distPath, {
        maxAge: '1y', // Cache de 1 ano para assets com hash
        etag: true,
        lastModified: true
    }))

    // SPA Fallback: Todas as rotas não-API retornam index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'))
    })

    console.log(`📦 Servindo frontend estático de: ${distPath}`)
}

// Handle favicon.ico to prevent 404s
app.get('/favicon.ico', (req, res) => res.status(204).end())

// Simulação de delay para teste de loader (opcional)
// app.use((req, res, next) => setTimeout(next, 500))

// Root route for development (API info)
if (process.env.NODE_ENV !== 'production') {
    app.get('/', (req, res) => {
        res.send('🚀 Studio30 Admin API is running in Development Mode')
    })
}

// ==================== ERROR HANDLING ====================
// 404 handler - must be after all routes
app.use(notFoundHandler)

// Global error handler - must be last middleware
app.use(errorHandler)

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Studio30 Admin BFF rodando em http://localhost:${PORT}`)
    console.log(`📍 Modo: ${process.env.NODE_ENV || 'development'}`)
    console.log(`🛡️  Error Handling: Centralized`)
    console.log(`✅ Async Handler: Available in utils.js`)
    // console.log(`🔌 Network: http://${require('ip').address()}:${PORT}`)
})
