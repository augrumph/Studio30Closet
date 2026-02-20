import { pool } from '../db.js'

async function run() {
    try {
        console.log("Searching for products with variants...")
        const { rows } = await pool.query(`
            SELECT id, name, variants 
            FROM products 
            WHERE variants::text != '[]' AND variants IS NOT NULL
            LIMIT 3
        `)

        console.log(`Found ${rows.length} products with variants.`)
        rows.forEach(p => {
            console.log('--- Product ---')
            console.log('ID:', p.id)
            console.log('Name:', p.name)
            console.log('Variants:', JSON.stringify(p.variants, null, 2))
        })
    } catch (err) {
        console.error('Error:', err)
    } finally {
        await pool.end()
    }
}

run()
