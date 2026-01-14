/**
 * Logger Customizado - Studio30
 * 
 * Sistema de logging que:
 * - Exibe logs apenas em desenvolvimento
 * - Formata mensagens com timestamps e cores
 * - Pode ser estendido para enviar erros para serviço externo em produção
 */

const isDev = import.meta.env.DEV;

// Cores para console (apenas dev)
const colors = {
    info: '#3b82f6',    // Azul
    warn: '#f59e0b',    // Amarelo
    error: '#ef4444',   // Vermelho
    debug: '#8b5cf6',   // Roxo
    success: '#10b981'  // Verde
};

/**
 * Formata timestamp para exibição
 */
function getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });
}

/**
 * Logger principal
 */
export const logger = {
    /**
     * Log de informação geral
     */
    info: (...args) => {
        if (isDev) {
            console.log(
                `%c[INFO ${getTimestamp()}]`,
                `color: ${colors.info}; font-weight: bold`,
                ...args
            );
        }
    },

    /**
     * Log de aviso
     */
    warn: (...args) => {
        if (isDev) {
            console.warn(
                `%c[WARN ${getTimestamp()}]`,
                `color: ${colors.warn}; font-weight: bold`,
                ...args
            );
        }
    },

    /**
     * Log de erro
     */
    error: (...args) => {
        if (isDev) {
            console.error(
                `%c[ERROR ${getTimestamp()}]`,
                `color: ${colors.error}; font-weight: bold`,
                ...args
            );
        } else {
            // Em produção, você pode enviar para um serviço de monitoramento
            // Exemplo: Sentry, LogRocket, etc.
            // sendToErrorTracking(args);
        }
    },

    /**
     * Log de debug (detalhado)
     */
    debug: (...args) => {
        if (isDev) {
            console.log(
                `%c[DEBUG ${getTimestamp()}]`,
                `color: ${colors.debug}; font-weight: bold`,
                ...args
            );
        }
    },

    /**
     * Log de sucesso
     */
    success: (...args) => {
        if (isDev) {
            console.log(
                `%c[SUCCESS ${getTimestamp()}]`,
                `color: ${colors.success}; font-weight: bold`,
                ...args
            );
        }
    },

    /**
     * Agrupa logs relacionados
     */
    group: (label, callback) => {
        if (isDev) {
            console.group(`%c${label}`, `color: ${colors.info}; font-weight: bold`);
            callback();
            console.groupEnd();
        }
    },

    /**
     * Mede tempo de execução
     */
    time: (label) => {
        if (isDev) {
            console.time(label);
        }
    },

    timeEnd: (label) => {
        if (isDev) {
            console.timeEnd(label);
        }
    },

    /**
     * Exibe tabela (útil para arrays de objetos)
     */
    table: (data) => {
        if (isDev) {
            console.table(data);
        }
    }
};

/**
 * Helper para logar chamadas de API
 */
export const apiLogger = {
    request: (method, url, data) => {
        logger.group(`🌐 API Request: ${method} ${url}`, () => {
            if (data) logger.debug('Payload:', data);
        });
    },

    response: (method, url, data) => {
        logger.group(`✅ API Response: ${method} ${url}`, () => {
            logger.debug('Data:', data);
        });
    },

    error: (method, url, error) => {
        logger.group(`❌ API Error: ${method} ${url}`, () => {
            logger.error('Error:', error);
        });
    }
};

/**
 * Helper para logar ações do Zustand
 */
export const storeLogger = (storeName) => ({
    action: (actionName, payload) => {
        logger.debug(`🏪 [${storeName}] ${actionName}`, payload);
    },

    stateChange: (before, after) => {
        if (isDev) {
            console.group(`🏪 [${storeName}] State Change`);
            console.log('Before:', before);
            console.log('After:', after);
            console.groupEnd();
        }
    }
});

export default logger;
