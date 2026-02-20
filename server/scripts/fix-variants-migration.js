import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const { Pool } = pg

// Configuration
const SUPABASE_URL = 'https://wvghryqufnjmdfnjypbu.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Z2hyeXF1Zm5qbWRmbmp5cGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDc3NTgsImV4cCI6MjA4MTk4Mzc1OH0.hxxwNFxkc6oB0xR0r9LLP_tg-dY3FlW4hsUBcQ-ELSM'
const RAILWAY_CONNECTION_STRING = 'postgresql://postgres:lkFzFRvxtPZHhwtxIKxPlqtLsFLaxtAk@maglev.proxy.rlwy.net:18204/railway'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const railwayPool = new Pool({
    connectionString: RAILWAY_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
    max: 5
})

async function run() {
    const client = await railwayPool.connect()
    try {
        console.log('🚀 Starting variants migration fix...')

        // 1. Fetch products with variants from Supabase
        console.log('📥 Fetching products from Supabase...')
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, variants')
            .not('variants', 'is', null)

        if (error) throw error

        console.log(`✅ Found ${products.length} products to check/update.`)

        let updatedCount = 0
        let errorCount = 0
        let skippedCount = 0

        for (const p of products) {
            // Skip empty variants (unless we want to clear them, but goal is to fix missing ones)
            if (!p.variants || (Array.isArray(p.variants) && p.variants.length === 0)) {
                skippedCount++
                continue
            }

            // Ensure variants is a valid JSON string for JSONB column
            let variantsJson
            try {
                // If it's already an object/array, stringify it
                // If it's a string, ensure it's valid JSON
                variantsJson = typeof p.variants === 'string' ? p.variants : JSON.stringify(p.variants)

                // Validate JSON
                JSON.parse(variantsJson)
            } catch (e) {
                console.error(`❌ Invalid JSON for product ${p.id} (${p.name}):`, e.message)
                errorCount++
                continue
            }

            try {
                const { rowCount } = await client.query(`
                    UPDATE products 
                    SET variants = $1::jsonb, updated_at = NOW()
                    WHERE id = $2
                `, [variantsJson, p.id])

                if (rowCount > 0) {
                    updatedCount++
                    if (updatedCount % 50 === 0) process.stdout.write('.')
                } else {
                    console.warn(`⚠️ Product ${p.id} not found in destination DB.`)
                    skippedCount++
                }
            } catch (dbErr) {
                console.error(`❌ DB Error updating product ${p.id}:`, dbErr.message)
                errorCount++
            }
        }

        console.log('\n\n🏁 Migration Finished!')
        console.log(`✅ Updated: ${updatedCount}`)
        console.log(`⏭️ Skipped (empty/not found): ${skippedCount}`)
        console.log(`❌ Errors: ${errorCount}`)

    } catch (err) {
        console.error('🔥 Fatal Error:', err)
    } finally {
        client.release()
        await railwayPool.end()
    }
}

run()
