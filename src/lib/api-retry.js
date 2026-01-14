import logger from '@/utils/logger';

/**
 * Executa uma função com retry automático em caso de falha
 * 
 * @param {Function} fn - Função assíncrona a ser executada
 * @param {number} retries - Número de tentativas (padrão: 3)
 * @param {number} delay - Delay entre tentativas em ms (padrão: 1000)
 * @param {Function} onRetry - Callback executado a cada retry (opcional)
 * @returns {Promise<any>} Resultado da função
 * 
 * @example
 * const products = await fetchWithRetry(
 *   () => getProducts(),
 *   3,
 *   1000
 * )
 */
export async function fetchWithRetry(
    fn,
    retries = 3,
    delay = 1000,
    onRetry = null
) {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await fn();

            // Se teve retry mas agora funcionou, logar sucesso
            if (attempt > 1) {
                logger.success(`✅ Sucesso após ${attempt} tentativas`);
            }

            return result;
        } catch (error) {
            lastError = error;

            // Se é a última tentativa, não tenta novamente
            if (attempt === retries) {
                logger.error(`❌ Falhou após ${retries} tentativas:`, error.message);
                throw error;
            }

            // Calcular delay exponencial: 1s, 2s, 4s, etc.
            const waitTime = delay * Math.pow(2, attempt - 1);

            logger.warn(
                `⚠️ Tentativa ${attempt}/${retries} falhou. ` +
                `Tentando novamente em ${waitTime}ms...`
            );

            // Callback opcional para notificar sobre retry
            if (onRetry) {
                onRetry(attempt, retries, error);
            }

            // Aguardar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    // Nunca deve chegar aqui, mas por segurança
    throw lastError;
}

/**
 * Wrapper específico para requisições fetch com retry
 * 
 * @param {string} url - URL para fazer fetch
 * @param {object} options - Opções do fetch
 * @param {number} retries - Número de tentativas
 * @returns {Promise<Response>} Response do fetch
 * 
 * @example
 * const response = await fetchUrlWithRetry('/api/products', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * })
 */
export async function fetchUrlWithRetry(url, options = {}, retries = 3) {
    return fetchWithRetry(
        () => fetch(url, options).then(res => {
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res;
        }),
        retries,
        1000
    );
}

/**
 * Verifica se um erro é recuperável (vale a pena tentar novamente)
 * 
 * @param {Error} error - Erro a ser verificado
 * @returns {boolean} True se o erro é recuperável
 */
export function isRecoverableError(error) {
    const recoverableMessages = [
        'network',
        'timeout',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'fetch failed',
        '5', // Erros 5xx do servidor
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toString() || '';

    return recoverableMessages.some(msg =>
        errorMessage.includes(msg) || errorCode.includes(msg)
    );
}

export default fetchWithRetry;
