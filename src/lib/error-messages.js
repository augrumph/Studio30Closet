import logger from '@/utils/logger';

/**
 * Mapeia códigos de erro do Supabase para mensagens amigáveis
 */
const SUPABASE_ERROR_MESSAGES = {
    'PGRST116': 'Nenhum registro encontrado',
    'PGRST301': 'Você não tem permissão para esta ação',
    '23505': 'Este registro já existe',
    '23503': 'Não é possível excluir: existem registros relacionados',
    '42P01': 'Tabela não encontrada no banco de dados',
    '42703': 'Campo não encontrado',
};

/**
 * Retorna mensagem de erro amigável baseada no erro recebido
 * 
 * @param {Error|object} error - Erro a ser processado
 * @returns {string} Mensagem amigável para o usuário
 */
export function getErrorMessage(error) {
    if (!error) return 'Erro desconhecido';

    // Logar erro completo em dev
    logger.error('Processing error:', error);

    const errorMessage = error.message || '';
    const errorCode = error.code || '';

    // 1. Erros de rede
    if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        return 'Sem conexão com a internet. Verifique sua conexão e tente novamente.';
    }

    // 2. Timeout
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        return 'Tempo esgotado. O servidor está demorando para responder. Tente novamente.';
    }

    // 3. Erros do Supabase (código específico)
    if (errorCode && SUPABASE_ERROR_MESSAGES[errorCode]) {
        return SUPABASE_ERROR_MESSAGES[errorCode];
    }

    // 4. Erros HTTP
    if (errorMessage.includes('HTTP')) {
        const statusMatch = errorMessage.match(/HTTP (\d+)/);
        if (statusMatch) {
            const status = parseInt(statusMatch[1]);
            return getHttpErrorMessage(status);
        }
    }

    // 5. Erros de validação
    if (errorMessage.includes('required') || errorMessage.includes('obrigatório')) {
        return 'Preencha todos os campos obrigatórios';
    }

    // 6. Erros de autenticação
    if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
        return 'Sessão expirada. Faça login novamente.';
    }

    // 7. Erro genérico com mensagem do servidor
    if (errorMessage && errorMessage.length < 200) {
        return errorMessage;
    }

    // 8. Fallback
    return 'Erro inesperado. Tente novamente ou entre em contato com o suporte.';
}

/**
 * Retorna mensagem baseada no código HTTP
 */
function getHttpErrorMessage(status) {
    const messages = {
        400: 'Requisição inválida. Verifique os dados enviados.',
        401: 'Não autorizado. Faça login novamente.',
        403: 'Você não tem permissão para esta ação.',
        404: 'Recurso não encontrado.',
        409: 'Conflito: este registro já existe.',
        422: 'Dados inválidos. Verifique os campos.',
        429: 'Muitas requisições. Aguarde um momento e tente novamente.',
        500: 'Erro no servidor. Tente novamente em alguns instantes.',
        502: 'Servidor indisponível. Tente novamente.',
        503: 'Serviço temporariamente indisponível.',
    };

    return messages[status] || `Erro ${status}. Tente novamente.`;
}

/**
 * Formata erro para exibição em toast/notificação
 * 
 * @param {Error|object} error - Erro a ser formatado
 * @param {string} context - Contexto da operação (ex: "ao salvar produto")
 * @returns {string} Mensagem formatada
 */
export function formatErrorForToast(error, context = '') {
    const message = getErrorMessage(error);
    return context ? `Erro ${context}: ${message}` : message;
}

/**
 * Verifica se o erro é crítico (deve ser reportado)
 */
export function isCriticalError(error) {
    const criticalPatterns = [
        'database',
        'server error',
        '500',
        '502',
        '503',
        'ECONNREFUSED',
    ];

    const errorStr = JSON.stringify(error).toLowerCase();
    return criticalPatterns.some(pattern => errorStr.includes(pattern));
}

/**
 * Extrai informações úteis do erro para logging
 */
export function extractErrorInfo(error) {
    return {
        message: error.message || 'Unknown error',
        code: error.code || null,
        status: error.status || null,
        stack: error.stack || null,
        timestamp: new Date().toISOString(),
    };
}

export default getErrorMessage;
