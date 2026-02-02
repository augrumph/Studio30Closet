import { Shield, FileText, Users, CreditCard, Clock } from 'lucide-react'

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-24 pb-16">
      <div className="container-custom max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#4A3B32]/5 p-8">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-[#C75D3B]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-[#C75D3B]" />
            </div>
            <h1 className="font-display text-3xl font-bold text-[#4A3B32] mb-4">
              Política de Privacidade
            </h1>
            <p className="text-[#4A3B32]/60 text-lg">
              Como coletamos, usamos e protegemos seus dados pessoais
            </p>
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-[#4A3B32]/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Última atualização: 23 de dezembro de 2025
              </div>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <Shield className="w-6 h-6 text-[#C75D3B]" />
                1. Introdução
              </h2>
              <p className="text-[#4A3B32]/70 leading-relaxed">
                A Studio30 Closet respeita a privacidade de seus clientes e está comprometida com a proteção
                dos dados pessoais coletados. Esta Política de Privacidade explica como coletamos, usamos,
                armazenamos e protegemos suas informações de acordo com a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#C75D3B]" />
                2. Quais Dados Coletamos
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Dados de Identificação</h3>
                  <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                    <li>Nome completo</li>
                    <li>Telefone/WhatsApp</li>
                    <li>Endereço de e-mail</li>
                    <li>CPF (opcional)</li>
                    <li>Endereço de entrega completo</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Dados de Compra e Entrega</h3>
                  <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                    <li>Itens selecionados para malinha</li>
                    <li>Preferências de tamanho</li>
                    <li>Histórico de compras</li>
                    <li>Informações de entrega</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Dados de Navegação</h3>
                  <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                    <li>Páginas visitadas</li>
                    <li>Tempo de permanência</li>
                    <li>Dispositivo utilizado</li>
                    <li>Localização (opcional)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-[#C75D3B]" />
                3. Finalidades do Tratamento
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Necessários</h3>
                  <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2">
                    <li>Realizar pedidos e entregas</li>
                    <li>Processar pagamentos</li>
                    <li>Comunicação sobre pedidos</li>
                    <li>Funcionamento do site</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Opcionais</h3>
                  <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2">
                    <li>Melhorar sua experiência</li>
                    <li>Recomendações personalizadas</li>
                    <li>Análise de uso e preferências</li>
                    <li>Campanhas de marketing</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-[#C75D3B]" />
                4. Segurança dos Dados
              </h2>
              <div className="space-y-4">
                <p className="text-[#4A3B32]/70 leading-relaxed">
                  Utilizamos medidas de segurança técnicas, administrativas e físicas para proteger seus dados
                  contra acesso não autorizado, alteração, divulgação ou destruição.
                </p>
                <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                  <li>Criptografia de dados em trânsito e em repouso</li>
                  <li>Servidores seguros com certificados SSL</li>
                  <li>Controle de acesso baseado em funções</li>
                  <li>Backups regulares e protegidos</li>
                  <li>Monitoramento constante de atividades</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <Shield className="w-6 h-6 text-[#C75D3B]" />
                5. Seus Direitos (LGPD)
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[#FDF0ED] rounded-xl p-6">
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Direitos Garantidos</h3>
                  <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2">
                    <li>Confirmação da existência de tratamento</li>
                    <li>Acesso aos dados</li>
                    <li>Correção de dados incompletos</li>
                    <li>Anonimização, bloqueio ou eliminação</li>
                    <li>Portabilidade dos dados</li>
                    <li>Eliminação dos dados tratados</li>
                  </ul>
                </div>
                <div className="bg-[#FDF0ED] rounded-xl p-6">
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Como Exercer</h3>
                  <p className="text-[#4A3B32]/70 text-sm mb-3">
                    Para exercer seus direitos, entre em contato conosco:
                  </p>
                  <p className="text-[#4A3B32]/70 text-sm">
                    E-mail: contato@studio30closet.com.br<br />
                    Telefone: (41) 99686-3879
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#C75D3B]" />
                6. Compartilhamento de Dados
              </h2>
              <div className="space-y-4">
                <p className="text-[#4A3B32]/70 leading-relaxed">
                  Não vendemos, comercializamos ou alugamos seus dados pessoais a terceiros.
                  Podemos compartilhar informações com:
                </p>
                <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                  <li>Parceiros logísticos para entrega</li>
                  <li>Instituições financeiras para pagamento</li>
                  <li>Provedores de serviços (com obrigações de confidencialidade)</li>
                  <li>Autoridades, quando exigido por lei</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6 text-[#C75D3B]" />
                7. Armazenamento e Retenção
              </h2>
              <div className="space-y-4">
                <p className="text-[#4A3B32]/70 leading-relaxed">
                  Seus dados são armazenados em servidores seguros e são retidos apenas pelo tempo necessário
                  para cumprir as finalidades para as quais foram coletados, respeitando prazos legais.
                </p>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Prazos de Retenção</h3>
                  <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                    <li>Dados de cadastro: 5 anos após inatividade</li>
                    <li>Dados de compra: 10 anos (obrigação legal)</li>
                    <li>Dados de navegação: 1 ano</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <Shield className="w-6 h-6 text-[#C75D3B]" />
                8. Alterações na Política
              </h2>
              <p className="text-[#4A3B32]/70 leading-relaxed">
                Esta Política de Privacidade pode ser atualizada periodicamente.
                As alterações entrarão em vigor a partir da publicação na plataforma.
                Manteremos você informado sobre mudanças significativas.
              </p>
            </section>

            <section className="border-t border-gray-200 pt-8">
              <h2 className="font-display text-xl font-semibold text-[#4A3B32] mb-4">
                Contato
              </h2>
              <div className="bg-[#FDF0ED] rounded-xl p-6">
                <p className="text-[#4A3B32]/70 mb-4">
                  Para dúvidas sobre esta Política de Privacidade ou para exercer seus direitos:
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>E-mail:</strong> contato@studio30closet.com.br</p>
                  <p><strong>Telefone:</strong> (41) 99686-3879</p>
                  <p><strong>Responsável:</strong> Encarregado de Proteção de Dados</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}