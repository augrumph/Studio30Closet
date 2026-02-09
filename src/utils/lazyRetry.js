import { lazy } from 'react'

/**
 * Utilitário para envolver React.lazy com lógica de retry.
 * 
 * Problema: Quando o site é atualizado (deploy), os arquivos (chunks) antigos são removidos do servidor.
 * Se o usuário trocar de página, o React tenta baixar o chunk antigo e falha (ChunkLoadError / Script Error).
 * 
 * Solução: Detectar essa falha e forçar o recarregamento completo da página UMA VEZ.
 */
export const lazyWithRetry = (componentImport) => {
    return lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.sessionStorage.getItem('studio30_page_refreshed') || 'false'
        )

        try {
            const component = await componentImport()

            // Se carregou com sucesso, reseta a flag de refresh
            window.sessionStorage.setItem('studio30_page_refreshed', 'false')

            return component
        } catch (error) {
            // Verifica se é um erro de carregamento de chunk/script
            const isChunkError =
                error?.name === 'ChunkLoadError' ||
                error?.message?.includes('Failed to fetch dynamically imported module') ||
                error?.message?.includes('Loading chunk') ||
                error?.message?.includes('timeout loading data') || // O erro reportado pelo usuário
                error?.message?.includes('Expected a JavaScript-or-Wasm module script') // O erro MIME reportado pelo usuário

            if (isChunkError && !pageHasAlreadyBeenForceRefreshed) {
                // Marcar que tentamos o refresh para evitar loop infinito
                window.sessionStorage.setItem('studio30_page_refreshed', 'true')

                console.warn('🔄 Falha ao carregar componente (chunk desatualizado). Forçando recarregamento...')

                // Força o recarregamento limpando cache (se possível)
                window.location.reload()

                // Retorna uma promessa que nunca resolve para pausar a renderização até o reload
                return new Promise(() => { })
            }

            // Se for outro erro ou já tentamos o refresh, deixa o ErrorBoundary tratar
            throw error
        }
    })
}
