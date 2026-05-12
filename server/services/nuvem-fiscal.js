let cachedToken = null

const NUVEM_FISCAL_BASE_URL = process.env.NUVEM_FISCAL_ENV === 'production' 
    ? 'https://api.nuvemfiscal.com.br' 
    : 'https://api.sandbox.nuvemfiscal.com.br'

/**
 * Obtém ou renova o Token de Acesso da Nuvem Fiscal
 */
export async function getNuvemFiscalToken() {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
        return cachedToken.accessToken
    }

    if (!process.env.NUVEM_FISCAL_CLIENT_ID || !process.env.NUVEM_FISCAL_CLIENT_SECRET) {
        throw new Error('Credenciais Nuvem Fiscal não configuradas no .env')
    }

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.NUVEM_FISCAL_CLIENT_ID,
        client_secret: process.env.NUVEM_FISCAL_CLIENT_SECRET,
        scope: process.env.NUVEM_FISCAL_SCOPE || 'empresa nfe'
    })

    const response = await fetch('https://auth.nuvemfiscal.com.br/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    })

    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error(`Erro ao obter token Nuvem Fiscal: ${JSON.stringify(json)}`)
    }

    cachedToken = {
        accessToken: json.access_token,
        expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000
    }

    return cachedToken.accessToken
}

/**
 * Envia um pedido para emissão de NF-e
 */
export async function enqueueNfeForOrder(order) {
    try {
        const token = await getNuvemFiscalToken()
        
        // Formata os itens para o padrão da Nuvem Fiscal / SEFAZ
        const items = order.items.map((item, index) => {
            const product = item.product || {}
            return {
                numero_item: index + 1,
                codigo_produto: String(item.productId),
                descricao: `${product.name || 'Produto'} - ${item.selectedSize}/${item.selectedColor}`,
                ncm: item.ncm || '62044200', // Padrão Vestuário se não preenchido
                cfop: item.cfop || '5102',   // Venda dentro do estado padrão
                unidade_comercial: 'UN',
                quantidade_comercial: item.quantity,
                valor_unitario_comercial: Number(item.unitPrice || 0),
                valor_unitario_tributavel: Number(item.unitPrice || 0),
                unidade_tributavel: 'UN',
                quantidade_tributavel: item.quantity,
                valor_total_bruto: Number(item.totalPrice || 0),
                ind_total: 1, // Indica que valor entra no total da NF
                impostos: {
                    icms: {
                        // Configuração para Simples Nacional (Boutique padrão)
                        crt: 1,
                        orig: 0,
                        csosn: '102' // Simples Nacional - Tributada sem permissão de crédito
                    },
                    pis: { cst: '07' }, // Isento / Operação sem incidência
                    cofins: { cst: '07' }
                }
            }
        })

        const payload = {
            natureza_operacao: 'Venda de mercadoria',
            tipo_operacao: 1, // Saída
            finalidade_emissao: 1, // Normal
            ambiente: process.env.NUVEM_FISCAL_ENV === 'production' ? 1 : 2,
            cliente: {
                cpf_cnpj: order.customer?.cpf?.replace(/\D/g, ''),
                nome: order.customer?.name,
                email: order.customer?.email,
                endereco: {
                    logradouro: order.shipping_address?.street || order.customer?.address?.street,
                    numero: order.shipping_address?.number || order.customer?.address?.number,
                    bairro: order.shipping_address?.district || order.customer?.address?.district,
                    codigo_municipio: order.shipping_address?.city_code || '4106902', // Curitiba padrão
                    nome_municipio: order.shipping_address?.city || order.customer?.address?.city,
                    uf: order.shipping_address?.state || order.customer?.address?.state,
                    cep: order.shipping_address?.zip_code?.replace(/\D/g, '') || order.customer?.address?.zipCode?.replace(/\D/g, '')
                }
            },
            itens: items,
            valor_total_nota: Number(order.totalValue || 0)
        }

        console.log(`🚀 Enviando NF-e para Nuvem Fiscal (Pedido ${order.id})...`)

        const response = await fetch(`${NUVEM_FISCAL_BASE_URL}/nfe`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const json = await response.json()

        if (!response.ok) {
            console.error('❌ Erro Nuvem Fiscal API:', json)
            return {
                status: 'error',
                message: json.error?.message || 'Erro na comunicação com a SEFAZ',
                raw: json
            }
        }

        // Se a nota foi criada (status 'processing' ou 'issued')
        return {
            status: json.status === 'autorizada' ? 'issued' : 'issuing',
            nfeId: json.uuid || json.id,
            accessKey: json.chave,
            message: `NF-e em processamento. Status: ${json.status}`,
            xmlUrl: json.link_xml,
            pdfUrl: json.link_danfe
        }

    } catch (error) {
        console.error('❌ Erro crítico no serviço Nuvem Fiscal:', error.message)
        throw error
    }
}
