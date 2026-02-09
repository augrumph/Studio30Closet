import express from 'express'
import cors from 'cors'
import compression from 'compression'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Security com configuração de CSP para permitir Supabase
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: [
                "'self'",
                "https://wvghryqufnjmdfnjypbu.supabase.co",
                "wss://wvghryqufnjmdfnjypbu.supabase.co"
            ],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "data:"]
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

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
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

// Simulação de delay para teste de loader (opcional)
// app.use((req, res, next) => setTimeout(next, 500))

app.listen(PORT, () => {
    console.log(`🚀 Studio30 Admin BFF rodando em http://localhost:${PORT}`)
    console.log(`📍 Modo: ${process.env.NODE_ENV || 'development'}`)
})
