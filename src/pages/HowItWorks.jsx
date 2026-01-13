import { Link } from 'react-router-dom'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSiteImagesContext } from '@/contexts/SiteImagesContext'

export function HowItWorks() {
    const { images } = useSiteImagesContext()

    // URLs das imagens do banco ou fallback
    const step1Image = images?.step_1_image || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80'
    const step2Image = images?.step_2_image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'
    const step3Image = images?.step_3_image || 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&q=80'
    const step4Image = images?.step_4_image || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80'

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
                                    Monte sua Malinha
                                </h2>
                                <p className="text-base lg:text-lg text-[#4A3B32]/80 leading-relaxed max-w-md lg:ml-auto">
                                    Navegue pelo catálogo e escolha até 20 peças. Use filtros inteligentes para encontrar exatamente o que combina com você.
                                </p>
                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                    {['Curadoria exclusiva', 'Filtros intuitivos', 'Preview detalhado'].map((tag) => (
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
                                        alt="Monte sua malinha"
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
                                    <p className="text-xs lg:text-sm text-white/80">Entrega em</p>
                                    <p className="font-display text-2xl lg:text-4xl text-white">24h</p>
                                </div>
                            </div>
                            <div className="lg:order-2 space-y-4 lg:space-y-6">
                                <div className="inline-flex items-center gap-3 px-4 lg:px-5 py-2 bg-[#C75D3B] rounded-full">
                                    <span className="text-white font-bold text-base lg:text-lg">02</span>
                                </div>
                                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#4A3B32]">
                                    Receba com Carinho
                                </h2>
                                <p className="text-base lg:text-lg text-[#4A3B32]/80 leading-relaxed max-w-md">
                                    Sua malinha chega embalada com todo cuidado e com nosso cheirinho especial. Agende o melhor horário para você.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {['Entrega grátis', 'Conforto', 'Segurança'].map((tag) => (
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
                                    Experimente em Casa
                                </h2>
                                <p className="text-base lg:text-lg text-[#4A3B32]/80 leading-relaxed max-w-md lg:ml-auto">
                                    24 horas para provar tudo com calma. Combine com seu guarda-roupa, escolha a melhor iluminação, e fique somente com o que amar.
                                </p>
                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                    {['Sem pressa', 'Seu espelho', 'Conforto total'].map((tag) => (
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
                                    <p className="text-xs lg:text-sm text-white/80">Pague só</p>
                                    <p className="font-display text-xl lg:text-3xl text-white">o que ficar</p>
                                </div>
                            </div>
                            <div className="lg:order-2 space-y-4 lg:space-y-6">
                                <div className="inline-flex items-center gap-3 px-4 lg:px-5 py-2 bg-[#C75D3B] rounded-full">
                                    <span className="text-white font-bold text-base lg:text-lg">04</span>
                                </div>
                                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#4A3B32]">
                                    Devolva o Resto
                                </h2>
                                <p className="text-base lg:text-lg text-[#4A3B32]/80 leading-relaxed max-w-md">
                                    Ficou com as peças que ama? Perfeito! O resto nós buscamos sem custo. Você paga apenas pelo que decidir ficar.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {['Devolução grátis', 'Sem burocracia', 'Coleta rápida'].map((tag) => (
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
                            { q: 'É realmente grátis?', a: 'Sim! Entrega e coleta são 100% gratuitas com agendamento prévio.' },
                            { q: 'Quanto tempo tenho?', a: 'Você tem 24 horas para experimentar todas as peças com calma em casa.' },
                            { q: 'E se não quiser ficar com nada?', a: 'Sem problemas! Cobramos apenas a taxa de coleta.' },
                            { q: 'Como pago?', a: 'Aceitamos PIX, cartão de crédito, débito e dinheiro.' },
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
                        Monte sua malinha agora e receba em casa. Simples assim.
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
