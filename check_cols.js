import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wvghryqufnjmdfnjypbu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Z2hyeXF1Zm5qbWRmbmp5cGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDc3NTgsImV4cCI6MjA4MTk4Mzc1OH0.hxxwNFxkc6oB0xR0r9LLP_tg-dY3FlW4hsUBcQ-ELSM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking columns...')
    const { data, error } = await supabase
        .from('dashboard_kpis_period')
        .select('*')
        .limit(1)

    if (error) console.error(error)
    else console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data (empty table)')
}

check()
