
import { supabase } from '@/lib/supabase'

export async function perguntarIA(pergunta) {
    const { data, error } = await supabase.functions.invoke('openai', {
        body: { question: pergunta }
    })

    if (error) {
        console.error('Supabase Function Error:', error)
        throw new Error("Erro ao consultar a IA")
    }

    return data
}
