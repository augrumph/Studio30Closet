/**
 * API de IA — via Express BFF
 * A chamada à Edge Function do Supabase foi substituída pelo endpoint BFF.
 */

export async function perguntarIA(pergunta) {
    const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: pergunta })
    })

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(err.error || 'Erro ao consultar a IA')
    }

    return response.json()
}
