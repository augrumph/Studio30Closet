import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { perguntarIA } from '@/lib/api/ai'

/**
 * Hook otimizado para chat com IA
 * Usa React Query para gerenciar estado de forma eficiente
 */
export function useAIChat() {
    const mutation = useMutation({
        mutationFn: async (question) => {
            return await perguntarIA(question)
        },
        // Não fazer retry automático para economizar tempo/créditos
        retry: false,
        // Configurações de performance
        gcTime: 1000 * 60 * 5, // 5 min antes de garbage collection
    })

    return {
        sendMessage: mutation.mutateAsync,
        isLoading: mutation.isPending,
        error: mutation.error,
        reset: mutation.reset
    }
}

/**
 * Hook para streaming de resposta (quando disponível)
 * Retorna chunks da resposta em tempo real para feedback visual mais rápido
 */
export function useAIStream() {
    const [streamedContent, setStreamedContent] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)

    const startStream = useCallback(async (question, onChunk) => {
        setIsStreaming(true)
        setStreamedContent('')

        try {
            // TODO: Implementar streaming real quando Edge Function suportar
            // Por enquanto, simula streaming com a resposta completa
            const response = await perguntarIA(question)

            // Simula streaming dividindo a resposta em palavras
            // Isso dá feedback visual imediato ao usuário
            const words = response.answer.split(' ')
            for (let i = 0; i < words.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 20)) // 20ms por palavra (mais rápido)
                const chunk = words.slice(0, i + 1).join(' ')
                setStreamedContent(chunk)
                onChunk?.(chunk)
            }

            return response
        } finally {
            setIsStreaming(false)
        }
    }, [])

    return {
        streamedContent,
        isStreaming,
        startStream,
        reset: () => setStreamedContent('')
    }
}
