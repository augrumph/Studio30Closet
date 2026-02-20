import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://wvghryqufnjmdfnjypbu.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Z2hyeXF1Zm5qbWRmbmp5cGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDc3NTgsImV4cCI6MjA4MTk4Mzc1OH0.hxxwNFxkc6oB0xR0r9LLP_tg-dY3FlW4hsUBcQ-ELSM'
)

async function run() {
    try {
        console.log('Searching Supabase for "Blusa Anastácia"...')
        const { data, error } = await supabase
            .from('products')
            .select('id, name, variants')
            .ilike('name', '%Anastácia%')

        if (error) throw error

        console.log(`Found ${data.length} products in Supabase.`)
        data.forEach(p => {
            console.log('--- Product ---')
            console.log('ID:', p.id)
            console.log('Name:', p.name)
            console.log('Variants length:', p.variants ? p.variants.length : 0)
            console.log('Variants:', JSON.stringify(p.variants, null, 2))
        })

    } catch (err) {
        console.error('Error:', err)
    }
}

run()
