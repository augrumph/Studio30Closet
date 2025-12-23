import { Shield, FileText, ShoppingBag, Clock } from 'lucide-react'

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-24 pb-16">
      <div className="container-custom max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#4A3B32]/5 p-8">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-[#C75D3B]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-[#C75D3B]" />
            </div>
            <h1 className="font-display text-3xl font-bold text-[#4A3B32] mb-4">
              Termos de Serviço
            </h1>
            <p className="text-[#4A3B32]/60 text-lg">
              Condições de uso da nossa plataforma Studio30 Closet
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
                <FileText className="w-6 h-6 text-[#C75D3B]" />
                1. Aceitação dos Termos
              </h2>
              <p className="text-[#4A3B32]/70 leading-relaxed">
                Ao acessar e utilizar a plataforma Studio30 Closet, você concorda em cumprir 
                e ficar vinculado a estes Termos de Serviço. Se você não concordar com estes 
                termos, não utilize nossa plataforma.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-[#C75D3B]" />
                2. Utilização da Plataforma
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Uso Pessoal</h3>
                  <p className="text-[#4A3B32]/70">
                    A plataforma é destinada ao uso pessoal e não comercial. Você concorda em 
                    utilizar o serviço de forma responsável e em conformidade com as leis aplicáveis.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Cadastro e Acesso</h3>
                  <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                    <li>Fornecer informações verdadeiras e atualizadas</li>
                    <li>Manter a confidencialidade de suas credenciais</li>
                    <li>Notificar imediatamente sobre uso não autorizado</li>
                    <li>Ter idade mínima de 18 anos ou autorização parental</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-[#4A3B32] mb-3">Proibições</h3>
                  <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                    <li>Utilizar métodos automatizados para acessar a plataforma</li>
                    <li>Interferir no funcionamento normal do serviço</li>
                    <li>Utilizar a plataforma para fins ilegais ou não autorizados</li>
                    <li>Coletar dados de outros usuários de forma inadequada</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#C75D3B]" />
                3. Política de Compras e Malinhas
              </h2>
              <div className="space-y-4">
                <h3 className="font-semibold text-[#4A3B32]">3.1 Processo de Malinha</h3>
                <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                  <li>Você pode selecionar até 20 peças por malinha</li>
                  <li>O prazo para decisão é de 3 dias úteis</li>
                  <li>Produtos devem ser devolvidos nas mesmas condições</li>
                  <li>Produtos danificados não serão aceitos</li>
                </ul>

                <h3 className="font-semibold text-[#4A3B32] mt-6">3.2 Pagamento</h3>
                <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                  <li>Os pagamentos são processados após confirmação da compra</li>
                  <li>Aceitamos PIX, cartão de crédito e débito</li>
                  <li>Parcelamentos sujeitos a taxas conforme política vigente</li>
                  <li>Cancelamentos após envio sujeitos a análise</li>
                </ul>

                <h3 className="font-semibold text-[#4A3B32] mt-6">3.3 Trocas e Devoluções</h3>
                <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                  <li>Trocas podem ser solicitadas em até 7 dias após recebimento</li>
                  <li>Produtos devem estar sem sinais de uso</li>
                  <li>Etiquetas e tags devem estar intactos</li>
                  <li>Frete de troca pode ser cobrado conforme política</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <Shield className="w-6 h-6 text-[#C75D3B]" />
                4. Propriedade Intelectual
              </h2>
              <div className="space-y-4">
                <p className="text-[#4A3B32]/70 leading-relaxed">
                  Todo o conteúdo da plataforma (textos, imagens, marcas, logotipos, designs) 
                  é de propriedade da Studio30 Closet e está protegido por leis de propriedade 
                  intelectual.
                </p>
                <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                  <li>Não é permitido copiar, reproduzir ou distribuir o conteúdo</li>
                  <li>É proibido usar nosso nome ou marca para fins comerciais</li>
                  <li>Qualquer uso não autorizado será legalmente responsabilizado</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <Shield className="w-6 h-6 text-[#C75D3B]" />
                5. Limitação de Responsabilidade
              </h2>
              <div className="space-y-4">
                <p className="text-[#4A3B32]/70 leading-relaxed">
                  A Studio30 Closet não se responsabiliza por:
                </p>
                <ul className="list-disc list-inside text-[#4A3B32]/70 space-y-2 ml-4">
                  <li>Problemas causados por mau uso dos produtos</li>
                  <li>Demoras na entrega por terceiros (correios, transportadoras)</li>
                  <li>Problemas técnicos ou interrupções do serviço</li>
                  <li>Perdas de dados ou prejuízos indiretos</li>
                  <li>Erros de digitação em descrições de produtos</li>
                </ul>
                <p className="text-[#4A3B32]/70 mt-4">
                  Nossa responsabilidade será limitada ao valor da transação envolvida.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="font-display text-2xl font-semibold text-[#4A3B32] mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#C75D3B]" />
                6. Disposições Gerais
              </h2>
              <div className="space-y-4">
                <h3 className="font-semibold text-[#4A3B32]">6.1 Modificações</h3>
                <p className="text-[#4A3B32]/70">
                  Estes Termos podem ser modificados a qualquer momento. As alterações 
                  entrarão em vigor a partir da publicação na plataforma.
                </p>

                <h3 className="font-semibold text-[#4A3B32] mt-6">6.2 Lei Aplicável</h3>
                <p className="text-[#4A3B32]/70">
                  Estes Termos são regidos pelas leis brasileiras, em especial pela 
                  Lei Geral de Proteção de Dados (LGPD) e Código de Defesa do Consumidor.
                </p>

                <h3 className="font-semibold text-[#4A3B32] mt-6">6.3 Foro</h3>
                <p className="text-[#4A3B32]/70">
                  Para dirimir quaisquer dúvidas ou controvérsias, as partes elegem 
                  o Foro da Comarca de São Paulo/SP.
                </p>
              </div>
            </section>

            <section className="border-t border-gray-200 pt-8">
              <h2 className="font-display text-xl font-semibold text-[#4A3B32] mb-4">
                Contato
              </h2>
              <div className="bg-[#FDF0ED] rounded-xl p-6">
                <p className="text-[#4A3B32]/70 mb-4">
                  Para dúvidas sobre estes Termos de Serviço:
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>E-mail:</strong> contato@studio30.com.br</p>
                  <p><strong>Telefone:</strong> (11) 99999-9999</p>
                  <p><strong>Atendimento:</strong> Segunda a Sexta, 9h às 18h</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}