import { pool } from '../db.js'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wvghryqufnjmdfnjypbu.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Z2hyeXF1Zm5qbWRmbmp5cGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDc3NTgsImV4cCI6MjA4MTk4Mzc1OH0.hxxwNFxkc6oB0xR0r9LLP_tg-dY3FlW4hsUBcQ-ELSM'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function restoreProduct(id) {
    console.log(`🔍 Buscando produto ${id} no Supabase...`)
    const { data: sbProduct, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error(`❌ Erro ao buscar no Supabase:`, error.message)
        return
    }

    if (!sbProduct) {
        console.warn(`⚠️ Produto ${id} não encontrado no Supabase.`)
        return
    }

    console.log(`✅ Dados encontrados. Restaurando no Railway...`)

    try {
        const { rowCount } = await pool.query(`
            UPDATE products 
            SET 
                images = $1,
                variants = $2,
                sizes = $3,
                updated_at = NOW()
            WHERE id = $4
        `, [
            sbProduct.images,
            JSON.stringify(sbProduct.variants),
            JSON.stringify(sbProduct.sizes),
            id
        ])

        if (rowCount > 0) {
            console.log(`🎉 Produto ${id} ("${sbProduct.name}") restaurado com sucesso!`)
        } else {
            console.warn(`⚠️ Produto ${id} não encontrado no Railway.`)
        }
    } catch (err) {
        console.error(`❌ Erro ao atualizar Railway:`, err.message)
    }
}

// Executar restauração para o ID 47
const productId = process.argv[2] || 47
restoreProduct(productId).then(() => {
    console.log('🏁 Processo finalizado.')
    process.exit(0)
})
