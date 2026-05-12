import { Link } from 'react-router-dom'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSiteImagesContext } from '@/contexts/SiteImagesContext'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'

export function HowItWorks() {
    const { images } = useSiteImagesContext()

    // URLs das imagens do banco com proxy/otimização
    const step1Image = images?.step_1_image ? getOptimizedImageUrl(images.step_1_image, 600) : 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80'
    const step2Image = images?.step_2_image ? getOptimizedImageUrl(images.step_2_image, 600) : 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'
    const step3Image = images?.step_3_image ? getOptimizedImageUrl(images.step_3_image, 600) : 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&q=80'
    const step4Image = images?.step_4_image ? getOptimizedImageUrl(images.step_4_image, 600) : 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80'

    return (
        <div className="w-full bg-[#FDFBF7]">
            {/* Timeline */}
            <section className="py-24 relative">
                <div className="container-custom max-w-6xl">
                    {/* Linha vertical central - apenas desktop */}
                    <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-[#C75D3B]/20 -translate-x-1/2" />

                    <div className="space-y-32">
                        {/* Step 1 - Direita */}
                        <motion.div
                            className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="lg:text-right space-y-4 lg:space-y-6">
                                <div className="inline-flex lg:float-right items-center gap-3 px-4 lg:px-5 py-2 bg-[#C75D3B] rounded-full">
                                    <span className="text-white font-bold text-base lg:text-lg">01</span>
                                </div>
                                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#4A3B32] clear-both">
                                    Escolha sua peça
                                </h2>
                                <p className="text-base lg:text-lg text-[#4A3B32]/80 leading-relaxed max-w-md lg:ml-auto">
                                    Navegue pelo catálogo, veja fotos e tamanhos disponíveis e adicione suas favoritas à seleção.
                                </p>
                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                    {['Curadoria exclusiva', 'Filtros intuitivos', 'Compra online'].map((tag) => (
                                        <span key={tag} className="px-3 lg:px-4 py-1.5 lg:py-2 bg-white border border-[#E8C4B0] rounded-full text-xs lg:text-sm text-[#4A3B32]/70">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="relative group">
                                <div className="aspect-square rounded-2xl lg:rounded-3xl overflow-hidden bg-[#E8C4B0]/20 shadow-xl lg:shadow-2xl">
                                    <img
                                        src={step1Image}
                                        alt="Escolha peças no catálogo"
                                        width="600"
                                        height="600"
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                </div>
                                {/* Badge flutuante */}
                                <div className="absolute -top-3 -right-3 lg:-top-4 lg:-right-4 bg-[#C75D3B] px-4 lg:px-6 py-2 lg:py-3 rounded-xl lg:rounded-2xl shadow-lg">
                                    <p className="text-xs lg:text-sm text-white/80">Até</p>
                                    <p className="font-display text-2xl lg:text-4xl text-white">20</p>
                                    <p className="text-xs lg:text-sm text-white/80">peças</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Step 2 - Esquerda */}
                        <motion.div
                            className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            <div className="relative group lg:order-1">
                                <div className="aspect-square rounded-2xl lg:rounded-3xl overflow-hidden bg-[#E8C4B0]/20 shadow-xl lg:shadow-2xl">
                                    <img
                                        src={step2Image}
                                        alt="Receba em casa"
                                        width="600"
                                        height="600"
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                </div>
                                {/* Badge flutuante */}
                                <div className="absolute -bottom-3 -left-3 lg:-bottom-4 lg:-left-4 bg-[#C75D3B] px-4 lg:px-6 py-2 lg:py-3 rounded-xl lg:rounded-2xl shadow-lg">
                                    <p className="text-xs lg:text-sm text-white/80">Escolha</p>
                                    <p className="font-display text-2xl lg:text-4xl text-white">2 jeitos</p>
                                </div>
                            </div>
                            <div className="lg:order-2 space-y-4 lg:space-y-6">
                                <div className="inline-flex items-center gap-3 px-4 lg:px-5 py-2 bg-[#C75D3B] rounded-full">
                                    <span className="text-white font-bold text-base lg:text-lg">02</span>
                                </div>
                                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#4A3B32]">
                                    Decida o formato
                                </h2>
                                <p className="text-base lg:text-lg text-[#4A3B32]/80 leading-relaxed max-w-md">
                                    Finalize como e-commerce para pagar agora e receber por frete, ou escolha a malinha para provar em casa com agendamento.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {['Pagamento online', 'Malinha local', 'Segurança'].map((tag) => (
                                        <span key={tag} className="px-3 lg:px-4 py-1.5 lg:py-2 bg-white border border-[#E8C4B0] rounded-full text-xs lg:text-sm text-[#4A3B32]/70">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Step 3 - Direita */}
                        <motion.div
                            className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            <div className="lg:text-right space-y-4 lg:space-y-6">
                                <div className="inline-flex lg:float-right items-center gap-3 px-4 lg:px-5 py-2 bg-[#C75D3B] rounded-full">
                                    <span className="text-white font-bold text-base lg:text-lg">03</span>
                                </div>
                                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#4A3B32] clear-both">
                                    Receba do seu jeito
                                </h2>
                                <p className="text-base lg:text-lg text-[#4A3B32]/80 leading-relaxed max-w-md lg:ml-auto">
                                    No e-commerce, seu pedido segue para separação e envio. Na malinha, você recebe as peças e tem tempo para provar com calma.
                                </p>
                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                    {['Envio nacional', 'Seu espelho', 'Conforto total'].map((tag) => (
                                        <span key={tag} className="px-3 lg:px-4 py-1.5 lg:py-2 bg-white border border-[#E8C4B0] rounded-full text-xs lg:text-sm text-[#4A3B32]/70">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="relative group">
                                <div className="aspect-square rounded-2xl lg:rounded-3xl overflow-hidden bg-[#E8C4B0]/20 shadow-xl lg:shadow-2xl">
                                    <img
                                        src={step3Image}
                                        alt="Experimente em casa"
                                        width="600"
                                        height="600"
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                </div>
                                {/* Badge flutuante */}
                                <div className="absolute -top-3 -right-3 lg:-top-4 lg:-right-4 bg-[#C75D3B] px-4 lg:px-6 py-2 lg:py-3 rounded-xl lg:rounded-2xl shadow-lg">
                                    <p className="font-display text-2xl lg:text-4xl text-white">24h</p>
                                    <p className="text-xs lg:text-sm text-white/80">para decidir</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Step 4 - Esquerda */}
                        <motion.div
                            className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            <div className="relative group lg:order-1">
                                <div className="aspect-square rounded-2xl lg:rounded-3xl overflow-hidden bg-[#E8C4B0]/20 shadow-xl lg:shadow-2xl">
                                    <img
                                        src={step4Image}
                                        alt="Fique com o que amar"
                                        width="600"
                                        height="600"
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                </div>
                                {/* Badge flutuante */}
                                <div className="absolute -bottom-3 -left-3 lg:-bottom-4 lg:-left-4 bg-[#C75D3B] px-4 lg:px-6 py-2 lg:py-3 rounded-xl lg:rounded-2xl shadow-lg">
                                    <p className="text-xs lg:text-sm text-white/80">Pedido</p>
                                    <p className="font-display text-xl lg:text-3xl text-white">seguro</p>
                                </div>
                            </div>
                            <div className="lg:order-2 space-y-4 lg:space-y-6">
                                <div className="inline-flex items-center gap-3 px-4 lg:px-5 py-2 bg-[#C75D3B] rounded-full">
                                    <span className="text-white font-bold text-base lg:text-lg">04</span>
                                </div>
                                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#4A3B32]">
                                    Acompanhe o pedido
                                </h2>
                                <p className="text-base lg:text-lg text-[#4A3B32]/80 leading-relaxed max-w-md">
                                    Compras online entram no fluxo de pagamento, nota e entrega. Na malinha, você paga apenas pelas peças que decidir ficar.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {['Estoque único', 'Sem burocracia', 'Atendimento próximo'].map((tag) => (
                                        <span key={tag} className="px-3 lg:px-4 py-1.5 lg:py-2 bg-white border border-[#E8C4B0] rounded-full text-xs lg:text-sm text-[#4A3B32]/70">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-24 bg-white">
                <div className="container-custom max-w-4xl">
                    <div className="text-center mb-16">
                        <h2 className="font-display text-5xl md:text-6xl text-[#4A3B32] mb-4">
                            Ainda tem dúvidas?
                        </h2>
                        <p className="text-lg text-[#4A3B32]/60">Respondemos as perguntas mais comuns</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            { q: 'Posso comprar online?', a: 'Sim. No checkout você pode pagar online e receber por frete.' },
                            { q: 'A malinha continua existindo?', a: 'Sim. Ela segue como opção para quem quer provar em casa antes de decidir.' },
                            { q: 'O estoque é o mesmo?', a: 'Sim. A peça vendida online deixa de aparecer disponível para novas malinhas.' },
                            { q: 'Como pago?', a: 'Compra online segue pelo checkout digital. Na malinha, o pagamento acontece após a escolha das peças.' },
                        ].map((faq, i) => (
                            <div key={i} className="bg-[#FDFBF7] p-8 rounded-2xl border border-[#E8C4B0]/50 hover:border-[#C75D3B]/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#C75D3B] flex items-center justify-center">
                                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                    </div>
                                    <div>
                                        <h3 className="font-display text-xl text-[#4A3B32] mb-2">{faq.q}</h3>
                                        <p className="text-[#4A3B32]/70 leading-relaxed">{faq.a}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 bg-[#4A3B32]">
                <div className="container-custom text-center">
                    <h2 className="font-display text-5xl md:text-7xl text-white mb-8">
                        Pronta para começar?
                    </h2>
                    <p className="text-xl text-white/80 max-w-2xl mx-auto mb-12">
                        Escolha suas peças e decida entre comprar online ou receber a malinha.
                    </p>
                    <Link
                        to="/catalogo"
                        className="inline-flex items-center gap-3 px-12 py-5 bg-[#C75D3B] text-white rounded-full font-bold text-lg hover:bg-[#A64D31] transition-all duration-300 shadow-2xl hover:scale-105"
                    >
                        Explorar Catálogo
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>
        </div>
    )
}
