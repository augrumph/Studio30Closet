/**
 * Sistema de mensagens de erro amigáveis ao usuário.
 * Mapeia erros técnicos (backend, rede, banco) para mensagens claras em Português.
 *
 * COMO FUNCIONA:
 * O apiClient já extrai message/error do body da resposta e joga em Error.message.
 * Então aqui basta verificar o conteúdo da mensagem do erro para saber o problema.
 */

// ─────────────────────────────────────────────────────────
// Mapa de mensagens específicas por domínio de operação
// (o backend manda strings conhecidas — mapeamos aqui)
// ─────────────────────────────────────────────────────────

const BACKEND_ERROR_MAP = [
  // ── AUTENTICAÇÃO ──────────────────────────────────────
  {
    match: ['email ou senha inválidos', 'invalid credentials', 'wrong password', 'incorrect password'],
    message: 'E-mail ou senha incorretos. Verifique e tente novamente.'
  },
  {
    match: ['usuário não encontrado', 'user not found', 'admin not found'],
    message: 'Usuário não encontrado. Verifique o e-mail digitado.'
  },
  {
    match: ['token inválido ou expirado', 'invalid token', 'jwt expired', 'token expired', 'jwt malformed'],
    message: 'Sua sessão expirou. Faça login novamente.'
  },
  {
    match: ['não autorizado', 'unauthorized', 'forbidden', 'sem permissão'],
    message: 'Você não tem permissão para realizar esta ação.'
  },

  // ── ESTOQUE ───────────────────────────────────────────
  {
    match: ['estoque insuficiente', 'insufficient stock', 'sem estoque', 'out of stock', 'quantidade insuficiente'],
    message: 'Estoque insuficiente para um ou mais produtos. Verifique as quantidades disponíveis.'
  },
  {
    match: ['produto sem estoque', 'produto não está disponível', 'product unavailable'],
    message: 'Este produto está sem estoque no momento.'
  },
  {
    match: ['variante não encontrada', 'variant not found', 'cor ou tamanho não disponível', 'tamanho não disponível'],
    message: 'A variante selecionada (cor/tamanho) não está disponível. Escolha outra opção.'
  },

  // ── PRODUTOS ──────────────────────────────────────────
  {
    match: ['produto não encontrado', 'product not found'],
    message: 'Produto não encontrado. Pode ter sido removido do sistema.'
  },
  {
    match: ['nome do produto já existe', 'product name already exists', 'produto já cadastrado'],
    message: 'Já existe um produto com este nome. Use um nome diferente.'
  },
  {
    match: ['imagem inválida', 'invalid image', 'formato de imagem', 'image too large', 'imagem muito grande'],
    message: 'Imagem inválida ou muito grande. Use JPG/PNG com no máximo 10MB.'
  },
  {
    match: ['erro ao fazer upload', 'upload failed', 'falha no upload', 's3 error'],
    message: 'Erro ao enviar imagem. Verifique sua conexão e tente novamente.'
  },

  // ── CLIENTES ──────────────────────────────────────────
  {
    match: ['cliente não encontrado', 'customer not found'],
    message: 'Cliente não encontrado. Pode ter sido removido do sistema.'
  },
  {
    match: ['telefone já cadastrado', 'phone already exists', 'customers_phone_key'],
    message: 'Este número de telefone já está cadastrado para outro cliente.'
  },
  {
    match: ['email já cadastrado', 'email already exists', 'customers_email_key'],
    message: 'Este e-mail já está sendo usado por outro cliente.'
  },
  {
    match: ['cpf já cadastrado', 'cpf already exists', 'customers_cpf_key'],
    message: 'Este CPF já está cadastrado no sistema.'
  },
  {
    match: ['cpf inválido', 'invalid cpf'],
    message: 'CPF inválido. Verifique os números digitados.'
  },

  // ── VENDAS ────────────────────────────────────────────
  {
    match: ['venda não encontrada', 'sale not found', 'venda não existe'],
    message: 'Venda não encontrada. Pode ter sido removida do sistema.'
  },
  {
    match: ['cliente obrigatório', 'customer required', 'selecione um cliente'],
    message: 'Selecione um cliente antes de registrar a venda.'
  },
  {
    match: ['sem itens', 'no items', 'adicione pelo menos um produto', 'carrinho vazio'],
    message: 'Adicione pelo menos um produto à venda antes de salvar.'
  },
  {
    match: ['data de vencimento obrigatória', 'installment date required'],
    message: 'Informe a data de vencimento da primeira parcela.'
  },
  {
    match: ['valor inválido', 'invalid amount', 'valor zero', 'valor negativo'],
    message: 'Valor da venda inválido. Verifique os preços e quantidades.'
  },

  // ── PARCELAS / PAGAMENTOS ─────────────────────────────
  {
    match: ['parcela não encontrada', 'installment not found'],
    message: 'Parcela não encontrada.'
  },
  {
    match: ['pagamento já registrado', 'payment already registered', 'parcela já paga'],
    message: 'Esta parcela já foi paga anteriormente.'
  },
  {
    match: ['valor do pagamento inválido', 'invalid payment amount'],
    message: 'Valor do pagamento inválido. Verifique o valor informado.'
  },
  {
    match: ['método de pagamento inválido', 'invalid payment method'],
    message: 'Método de pagamento inválido. Selecione uma opção válida.'
  },

  // ── DESPESAS FIXAS ────────────────────────────────────
  {
    match: ['despesa não encontrada', 'expense not found'],
    message: 'Despesa não encontrada.'
  },
  {
    match: ['nome e value são obrigatórios', 'name and value required'],
    message: 'Preencha o nome e o valor da despesa.'
  },

  // ── COMPRAS ───────────────────────────────────────────
  {
    match: ['compra não encontrada', 'purchase not found'],
    message: 'Compra não encontrada.'
  },
  {
    match: ['value e date são obrigatórios', 'value and date required'],
    message: 'Preencha o valor e a data da compra.'
  },

  // ── FORNECEDORES ──────────────────────────────────────
  {
    match: ['fornecedor não encontrado', 'supplier not found'],
    message: 'Fornecedor não encontrado.'
  },
  {
    match: ['cnpj já cadastrado', 'cnpj already exists', 'suppliers_cnpj_key'],
    message: 'Este CNPJ já está cadastrado para outro fornecedor.'
  },

  // ── MALINHAS / ENTREGAS ───────────────────────────────
  {
    match: ['malinha não encontrada', 'malinha not found', 'entrega não encontrada'],
    message: 'Malinha/entrega não encontrada.'
  },
  {
    match: ['já devolvida', 'already returned', 'já finalizada'],
    message: 'Esta malinha já foi finalizada ou devolvida.'
  },

  // ── CUPONS ────────────────────────────────────────────
  {
    match: ['cupom inválido', 'invalid coupon', 'cupom não encontrado', 'coupon not found'],
    message: 'Cupom inválido ou não encontrado. Verifique o código digitado.'
  },
  {
    match: ['cupom expirado', 'coupon expired'],
    message: 'Este cupom já expirou.'
  },
  {
    match: ['cupom já utilizado', 'coupon already used'],
    message: 'Este cupom já foi utilizado.'
  },
  {
    match: ['código de cupom já existe', 'coupons_code_key', 'coupon code already exists'],
    message: 'Já existe um cupom com este código. Use um código diferente.'
  },

  // ── BANCO DE DADOS (genérico) ─────────────────────────
  {
    match: ['duplicate key', '23505', 'unique constraint', 'já existe', 'already exists'],
    message: 'Este registro já existe no sistema. Verifique os dados e tente novamente.'
  },
  {
    match: ['foreign key', '23503', 'registros vinculados', 'referenced by'],
    message: 'Não é possível excluir: existem registros vinculados a este item.'
  },
  {
    match: ['not-null', 'null value', '23502', 'campo obrigatório'],
    message: 'Preencha todos os campos obrigatórios antes de salvar.'
  },
  {
    match: ['campo não encontrado', '42703', 'column does not exist'],
    message: 'Erro interno: campo de dados não encontrado. Contate o suporte.'
  },

  // ── REDE / SERVIDOR ───────────────────────────────────
  {
    match: ['failed to fetch', 'network error', 'networkerror', 'erro ao conectar'],
    message: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
  },
  {
    match: ['timeout', 'etimedout', 'timed out', 'request timeout'],
    message: 'O servidor demorou para responder. Tente novamente em instantes.'
  },
  {
    match: ['server error', 'erro interno', 'internal server error', '500'],
    message: 'Erro interno no servidor. Tente novamente. Se o problema persistir, contate o suporte.'
  },
  {
    match: ['service unavailable', 'servidor indisponível', '503'],
    message: 'Servidor temporariamente indisponível. Tente novamente em alguns instantes.'
  },
  {
    match: ['not found', '404', 'não encontrado'],
    message: 'O item solicitado não foi encontrado no servidor.'
  },
  {
    match: ['bad request', '400', 'dados inválidos'],
    message: 'Dados inválidos. Verifique os campos preenchidos e tente novamente.'
  },
  {
    match: ['too many requests', '429', 'muitas tentativas', 'rate limit'],
    message: 'Muitas tentativas em pouco tempo. Aguarde um momento e tente novamente.'
  },
]

// ─────────────────────────────────────────────────────────
// Função principal — usada em todos os componentes do app
// ─────────────────────────────────────────────────────────

/**
 * Converte erros técnicos em mensagens amigáveis para o usuário.
 * @param {Error|object|string} error - O erro bruto
 * @returns {string} - Mensagem clara em português, pronta para exibir em toast
 */
export function formatUserFriendlyError(error) {
  if (!error) return 'Ocorreu um erro inesperado. Tente novamente.'

  // Se for uma string simples, tentar mapear antes de retornar
  const rawMessage = typeof error === 'string'
    ? error
    : (error.message || error.error || error.detail || '')

  const lowerMessage = rawMessage.toLowerCase()

  // Percorrer o mapa de erros e retornar o primeiro match
  for (const { match, message } of BACKEND_ERROR_MAP) {
    if (match.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
      return message
    }
  }

  // Se a mensagem do erro for curta e legível, exibir ela diretamente
  // (isso cobre casos onde o backend já manda mensagem em português)
  if (rawMessage && rawMessage.length > 0 && rawMessage.length < 120) {
    // Capitalizar primeira letra se necessário
    return rawMessage.charAt(0).toUpperCase() + rawMessage.slice(1)
  }

  return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.'
}

/**
 * Wrapper para chamadas de API com tratamento automático de erro.
 * @param {Function} apiCall - Função assíncrona a ser executada
 * @param {string} operation - Descrição da operação para log
 */
export async function handleApiCall(apiCall, operation = 'operação') {
  try {
    const result = await apiCall()
    return { success: true, data: result }
  } catch (error) {
    const userFriendlyMessage = formatUserFriendlyError(error)
    console.error(`Erro na ${operation}:`, error)
    return { success: false, error: userFriendlyMessage }
  }
}