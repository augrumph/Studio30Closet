import { pool } from '../db.js'

async function run() {
    try {
        console.log('Searching for "Blusa Anastácia"...')
        const { rows } = await pool.query(`
            SELECT id, name, color, sizes, variants 
            FROM products 
            WHERE name ILIKE '%Anastácia%'
        `)

        console.log(`Found ${rows.length} products.`)
        rows.forEach(p => {
            console.log('--- Product ---')
            console.log('ID:', p.id)
            console.log('Name:', p.name)
            console.log('Color (col):', p.color)
            console.log('Sizes (col):', p.sizes)
            console.log('Variants (col type inferred):', typeof p.variants)
            console.log('Variants (value):', JSON.stringify(p.variants, null, 2))
        })
    } catch (err) {
        console.error('Error:', err)
    } finally {
        await pool.end()
    }
}

run()
