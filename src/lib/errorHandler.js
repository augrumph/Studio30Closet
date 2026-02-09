/**
 * Utility function to convert database/Supabase errors to user-friendly messages
 * @param {Error|object} error - The raw error object
 * @returns {string} - User-friendly error message in Portuguese
 */
export function formatUserFriendlyError(error) {
  if (!error) return 'Ocorreu um erro inesperado. Tente novamente.';

  // If error is already a user-friendly message, return it
  if (typeof error === 'string') return error;

  const errorMessage = (error.message || '').toLowerCase();
  const errorCode = error.code || '';

  // 1. Erros de Rede e Conexão
  if (errorMessage.includes('network') || errorMessage.includes('failed to fetch')) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
    return 'O servidor demorou muito para responder. Tente novamente em instantes.';
  }

  // 2. Erros de Banco de Dados (PostgreSQL / Supabase)
  if (errorCode === '23505' || errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
    if (errorMessage.includes('customers_phone_key') || errorMessage.includes('phone')) {
      return 'Este telefone já está cadastrado para outro cliente.';
    }
    if (errorMessage.includes('customers_email_key') || errorMessage.includes('email')) {
      return 'Este e-mail já está sendo usado por outro cliente.';
    }
    if (errorMessage.includes('customers_cpf_key') || errorMessage.includes('cpf')) {
      return 'Este CPF já está cadastrado no sistema.';
    }
    if (errorMessage.includes('suppliers_cnpj_key') || errorMessage.includes('cnpj')) {
      return 'Este CNPJ já está cadastrado para outro fornecedor.';
    }
    if (errorMessage.includes('coupons_code_key') || errorMessage.includes('code')) {
      return 'Este código de cupom já existe.';
    }
    return 'Este registro já existe no sistema.';
  }

  if (errorCode === '23503' || errorMessage.includes('foreign key') || errorMessage.includes('reference')) {
    return 'Não é possível realizar esta ação pois existem registros vinculados.';
  }

  if (errorCode === '23502' || errorMessage.includes('not-null') || errorMessage.includes('null value')) {
    return 'Preencha todos os campos obrigatórios.';
  }

  // 3. Erros de Permissão e Autenticação
  if (errorCode === '42501' || errorMessage.includes('permission') || errorMessage.includes('forbidden') || errorMessage.includes('unauthorized')) {
    return 'Você não tem permissão para realizar esta ação ou sua sessão expirou.';
  }

  // 4. Erros do Supabase (PostgREST)
  const SUPABASE_MESSAGES = {
    'PGRST116': 'Nenhum registro encontrado.',
    'PGRST301': 'Sessão expirada. Faça login novamente.',
    '42P01': 'Tabela não encontrada no banco de dados.',
    '42703': 'Dados inválidos ou campo não encontrado.'
  };

  if (SUPABASE_MESSAGES[errorCode]) {
    return SUPABASE_MESSAGES[errorCode];
  }

  // 5. Erros HTTP Genéricos
  if (errorMessage.includes('http')) {
    const statusMatch = errorMessage.match(/http (\d+)/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      const httpMessages = {
        400: 'Dados inválidos. Verifique os campos preenchidos.',
        401: 'Sessão expirada. Faça login novamente.',
        404: 'Registro não encontrado no servidor.',
        429: 'Muitas tentativas. Aguarde um momento.',
        500: 'Erro interno no servidor. Tente novamente em instantes.',
        503: 'Servidor temporariamente indisponível.'
      };
      if (httpMessages[status]) return httpMessages[status];
    }
  }

  // 6. Mensagens curtas em inglês (Fallback de tradução)
  if (errorMessage === 'failed to fetch') return 'Erro ao conectar-se ao servidor.';

  // 7. Fallback final
  return error.message && error.message.length < 100
    ? error.message
    : 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
}

/**
 * Wrapper function to handle API calls with user-friendly error handling
 * @param {Function} apiCall - The API function to call
 * @param {string} operation - Description of the operation for logging
 * @returns {Promise} - Promise that resolves with the result or rejects with a user-friendly error
 */
export async function handleApiCall(apiCall, operation = 'operação') {
  try {
    const result = await apiCall();
    return { success: true, data: result };
  } catch (error) {
    const userFriendlyMessage = formatUserFriendlyError(error);
    console.error(`Erro na ${operation}:`, error);
    return { success: false, error: userFriendlyMessage };
  }
}