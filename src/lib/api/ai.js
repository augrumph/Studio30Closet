/**
 * API de IA — via Express BFF
 * A chamada à Edge Function do Supabase foi substituída pelo endpoint BFF.
 */

import { apiClient } from '../api-client'

export async function perguntarIA(pergunta) {
    return apiClient('/ai/ask', {
        method: 'POST',
        body: { question: pergunta }
    })
}
