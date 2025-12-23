/**
 * Utility function to convert database/Supabase errors to user-friendly messages
 * @param {Error} error - The raw error object from Supabase
 * @returns {string} - User-friendly error message
 */
export function formatUserFriendlyError(error) {
  // If error is already a user-friendly message, return it
  if (typeof error === 'string') {
    return error;
  }

  // Handle Supabase-specific error codes and messages
  if (error && error.message) {
    const errorMessage = error.message.toLowerCase();
    
    // Handle unique constraint violations
    if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
      if (errorMessage.includes('cpf') || errorMessage.includes('customers_cpf_key')) {
        return 'CPF já cadastrado. Por favor, verifique e tente novamente.';
      }
      if (errorMessage.includes('cnpj') || errorMessage.includes('suppliers_cnpj_key')) {
        return 'CNPJ já cadastrado. Por favor, verifique e tente novamente.';
      }
      if (errorMessage.includes('phone') || errorMessage.includes('customers_phone_key')) {
        return 'Telefone já cadastrado. Por favor, verifique e tente novamente.';
      }
      if (errorMessage.includes('email') || errorMessage.includes('customers_email_key')) {
        return 'E-mail já cadastrado. Por favor, verifique e tente novamente.';
      }
      if (errorMessage.includes('code') || errorMessage.includes('coupons_code_key')) {
        return 'Código de cupom já existe. Por favor, escolha outro código.';
      }
      if (errorMessage.includes('setting_key') || errorMessage.includes('settings_setting_key_key')) {
        return 'Configuração já existe. Por favor, verifique e tente novamente.';
      }
      return 'Este registro já existe no sistema. Por favor, verifique os dados e tente novamente.';
    }
    
    // Handle check constraint violations
    if (errorMessage.includes('check') || errorMessage.includes('constraint')) {
      if (errorMessage.includes('quantity') || errorMessage.includes('gt 0')) {
        return 'A quantidade deve ser maior que zero.';
      }
      if (errorMessage.includes('price') || errorMessage.includes('numeric')) {
        return 'O preço informado é inválido. Por favor, verifique e tente novamente.';
      }
      return 'Os dados informados não atendem aos requisitos. Por favor, verifique e tente novamente.';
    }
    
    // Handle foreign key constraint violations
    if (errorMessage.includes('foreign') || errorMessage.includes('fk_') || errorMessage.includes('reference')) {
      return 'Referência inválida. O registro relacionado não existe ou foi excluído.';
    }
    
    // Handle not null constraint violations
    if (errorMessage.includes('not null') || errorMessage.includes('violates not-null')) {
      return 'Campos obrigatórios não foram preenchidos. Por favor, verifique todos os campos obrigatórios.';
    }
    
    // Handle other specific database errors
    if (errorMessage.includes('out of range') || errorMessage.includes('overflow')) {
      return 'O valor informado está fora do intervalo permitido. Por favor, verifique e tente novamente.';
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
      return 'Você não tem permissão para realizar esta operação.';
    }
    
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return 'Erro de conexão com o servidor. Por favor, verifique sua conexão e tente novamente.';
    }
    
    // Generic fallback messages based on error structure
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique violation
          return 'Este registro já existe no sistema. Por favor, verifique os dados e tente novamente.';
        case '23503': // Foreign key violation
          return 'Referência inválida. O registro relacionado não existe ou foi excluído.';
        case '23514': // Check violation
          return 'Os dados informados não atendem aos requisitos. Por favor, verifique e tente novamente.';
        case '23502': // Not null violation
          return 'Campos obrigatórios não foram preenchidos. Por favor, verifique todos os campos obrigatórios.';
        case '42501': // Insufficient privilege
          return 'Você não tem permissão para realizar esta operação.';
        case '42601': // Syntax error
          return 'Erro na estrutura da solicitação. Entre em contato com o suporte.';
        default:
          return `Erro no sistema: ${error.message}. Por favor, tente novamente ou entre em contato com o suporte.`;
      }
    }
  }
  
  // Return a generic message if no specific case is matched
  return 'Ocorreu um erro ao processar sua solicitação. Por favor, verifique os dados e tente novamente.';
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