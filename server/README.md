# Studio30 Admin Backend (BFF)

Backend for Frontend (BFF) for Studio30 Admin Dashboard.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3001`

## 📋 Prerequisites

1. Node.js 18+ installed
2. `.env` file in project root with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```
3. SQL functions applied (see OPTIMIZATIONS.md)

## 📚 Documentation

- **[OPTIMIZATIONS.md](./OPTIMIZATIONS.md)** - Complete guide to all performance optimizations
- **[sql/analytics_functions.sql](./sql/analytics_functions.sql)** - Database functions to apply

## 🔧 Features

- ✅ HTTP Compression (gzip/brotli)
- ✅ In-memory caching with configurable TTL
- ✅ Image optimization (WebP conversion, compression)
- ✅ Database-side aggregations
- ✅ Rate limiting & security headers
- ✅ Optimized Supabase connection pooling

## 📊 API Endpoints

| Endpoint | Description | Cache |
|----------|-------------|-------|
| `/api/dashboard/stats` | Financial metrics | 3 min |
| `/api/analytics/summary` | Analytics overview | 5 min |
| `/api/analytics/products/viewed` | Top viewed products | 10 min |
| `/api/stock/kpis` | Stock KPIs | 5 min |
| `/api/stock/ranking` | Sales ranking | 10 min |
| `/api/installments` | Credit/installments list | 2 min |
| `/api/images/optimize` | Image optimization | 1 hour |

Full API documentation in OPTIMIZATIONS.md

## 🎯 Performance Gains

- **70-90%** reduction in response size (compression)
- **80-95%** faster analytics processing (SQL aggregation)
- **90%** smaller images (WebP + compression)
- **50-70%** faster responses with cache

See OPTIMIZATIONS.md for detailed before/after comparisons.

## 🐛 Troubleshooting

### SQL Functions Error
If you get `function does not exist` errors:
1. Open Supabase Dashboard → SQL Editor
2. Run `sql/analytics_functions.sql`
3. Verify functions were created successfully

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

## 📝 Project Structure

```
server/
├── index.js              # Main server entry point
├── supabase.js           # Optimized Supabase client
├── cache.js              # In-memory cache implementation
├── imageOptimizer.js     # Image optimization utilities
├── utils.js              # Helper functions
├── routes/               # API route handlers
│   ├── dashboard.js
│   ├── analytics.js
│   ├── stock.js
│   ├── installments.js
│   ├── images.js
│   └── ...
└── sql/                  # Database scripts
    └── analytics_functions.sql
```

## 🔒 Security

- Helmet for security headers
- Rate limiting (1000 req/15min per IP)
- CORS enabled
- Request size limits

## 🚀 Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Apply SQL functions to production database
3. Configure proper rate limits
4. Set up monitoring/logging
5. Configure CORS for production domain

### Environment Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
PORT=3001  # Optional, defaults to 3001
```

## 📈 Monitoring

Check cache performance:
```bash
curl -i http://localhost:3001/api/dashboard/stats
# Look for X-Cache: HIT or MISS header
```

Check compression:
```bash
curl -i -H "Accept-Encoding: gzip" http://localhost:3001/api/dashboard/stats
# Look for Content-Encoding: gzip header
```

## 🤝 Contributing

When adding new endpoints:
1. Add appropriate cache TTL with `cacheMiddleware(seconds)`
2. Use database aggregation instead of fetching all data
3. Add compression for responses >1KB
4. Document in OPTIMIZATIONS.md

## 📄 License

Private - Studio30 Internal Use
