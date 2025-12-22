import { Link } from 'react-router-dom'
import { ArrowRight, Heart, Sparkles, TrendingUp, Users2 } from 'lucide-react'

export function About() {
    return (
        <div className="w-full bg-[#FDFBF7]">
            {/* Hero Split Screen */}
            <section className="relative min-h-screen grid lg:grid-cols-2">
                {/* Imagens lado esquerdo */}
                <div className="relative bg-[#E8C4B0]/30 flex items-center justify-center p-8 lg:p-16">
                    <div className="relative max-w-md w-full">
                        {/* Grid de fotos */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                                    <img
                                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80"
                                        alt="Thais"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            <div className="pt-8 space-y-4">
                                <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                                    <img
                                        src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80"
                                        alt="Augusto"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Badge flutuante */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#C75D3B] px-8 py-4 rounded-full shadow-2xl">
                            <p className="font-display text-2xl text-white">Fundadores</p>
                        </div>
                    </div>
                </div>

                {/* Texto lado direito */}
                <div className="flex items-center p-8 lg:p-16 bg-white">
                    <div className="max-w-xl space-y-8">
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#C75D3B]/10 rounded-full">
                            <Heart className="w-4 h-4 text-[#C75D3B]" />
                            <span className="text-[#C75D3B] text-sm font-medium uppercase tracking-wider">Nossa História</span>
                        </div>

                        <h1 className="font-display text-6xl md:text-7xl text-[#4A3B32]">
                            Somos <span className="text-[#C75D3B]">Augusto</span> & <span className="text-[#C75D3B]">Thais</span>
                        </h1>

                        <div className="space-y-6 text-lg text-[#4A3B32]/80 leading-relaxed">
                            <p>
                                Um casal apaixonado por moda e pela missão de transformar a forma como as pessoas compram roupas.
                            </p>
                            <p>
                                Cansados dos provadores apertados, filas e vendedores insistentes, pensamos: <strong className="text-[#C75D3B]">"e se a boutique fosse até a cliente?"</strong>
                            </p>
                            <p>
                                Assim nasceu a <strong className="text-[#4A3B32]">Studio 30 Closet</strong> – onde você experimenta moda de luxo no conforto da sua casa.
                            </p>
                        </div>

                        <div className="pt-4">
                            <Link
                                to="/catalogo"
                                className="inline-flex items-center gap-2 text-[#C75D3B] font-medium hover:gap-4 transition-all"
                            >
                                Ver coleção
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Valores */}
            <section className="py-24 bg-white">
                <div className="container-custom">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="font-display text-5xl md:text-6xl text-[#4A3B32] mb-6">
                            O que nos move
                        </h2>
                        <p className="text-xl text-[#4A3B32]/70">
                            Três pilares que guiam cada decisão que tomamos
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {[
                            {
                                icon: Sparkles,
                                title: 'Curadoria Exclusiva',
                                desc: 'Selecionamos cada peça pensando em qualidade, corte perfeito e atemporalidade. Nada de fast fashion.',
                            },
                            {
                                icon: Heart,
                                title: 'Atendimento Humano',
                                desc: 'Por trás de cada malinha existe uma pessoa real que se importa com sua experiência.',
                            },
                            {
                                icon: Users2,
                                title: 'Moda Para Todas',
                                desc: 'Acreditamos que toda mulher merece se sentir linda, confiante e poderosa.',
                            }
                        ].map((value, i) => (
                            <div key={i} className="group">
                                <div className="relative bg-[#FDFBF7] p-10 rounded-3xl border border-[#E8C4B0]/50 hover:border-[#C75D3B]/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                                    {/* Ícone */}
                                    <div className="inline-flex w-16 h-16 rounded-2xl bg-[#C75D3B] items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                        <value.icon className="w-8 h-8 text-white" strokeWidth={2} />
                                    </div>

                                    <h3 className="font-display text-2xl text-[#4A3B32] mb-4">
                                        {value.title}
                                    </h3>
                                    <p className="text-[#4A3B32]/70 leading-relaxed">
                                        {value.desc}
                                    </p>

                                    {/* Decoração de canto */}
                                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#C75D3B]/20 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Números */}
            <section className="py-24 bg-[#FDFBF7]">
                <div className="container-custom">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="font-display text-5xl md:text-6xl text-[#4A3B32] mb-6">
                            Números que <span className="text-[#C75D3B]">Contam Nossa História</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
                        {[
                            { number: '500+', label: 'Clientes Felizes', sublabel: 'e crescendo todo dia' },
                            { number: '1.000+', label: 'Malinhas Enviadas', sublabel: 'com amor e cuidado' },
                            { number: '98%', label: 'Satisfação', sublabel: 'avaliações 5 estrelas' }
                        ].map((stat, i) => (
                            <div key={i} className="text-center group">
                                <div className="bg-white rounded-3xl p-10 border-2 border-[#E8C4B0]/50 hover:border-[#C75D3B]/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#C75D3B] mb-6 group-hover:scale-110 transition-transform">
                                        <TrendingUp className="w-10 h-10 text-white" strokeWidth={2} />
                                    </div>
                                    <p className="font-display text-6xl text-[#C75D3B] mb-3 tabular-nums">
                                        {stat.number}
                                    </p>
                                    <p className="text-xl text-[#4A3B32] font-medium mb-2">
                                        {stat.label}
                                    </p>
                                    <p className="text-sm text-[#4A3B32]/60">
                                        {stat.sublabel}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Quote */}
            <section className="py-32 bg-[#4A3B32]">
                <div className="container-custom">
                    <div className="max-w-4xl mx-auto text-center space-y-12">
                        {/* Aspas decorativas */}
                        <div className="inline-flex w-20 h-20 rounded-full bg-[#C75D3B] items-center justify-center">
                            <span className="text-white text-5xl font-serif">"</span>
                        </div>

                        <blockquote className="text-4xl md:text-5xl text-white font-display leading-tight">
                            Acreditamos que moda de luxo deve ser acessível, pessoal e — acima de tudo — uma experiência prazerosa.
                        </blockquote>

                        <div className="space-y-3">
                            <p className="text-[#E8C4B0] font-medium text-lg">
                                Augusto & Thais
                            </p>
                            <p className="text-white/60 text-sm uppercase tracking-widest">
                                Fundadores da Studio 30 Closet
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 bg-white">
                <div className="container-custom text-center">
                    <div className="max-w-3xl mx-auto space-y-12">
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#C75D3B]/10 rounded-full">
                            <Sparkles className="w-4 h-4 text-[#C75D3B]" />
                            <span className="text-[#C75D3B] text-sm font-medium uppercase tracking-wider">Junte-se a Nós</span>
                        </div>

                        <h2 className="font-display text-6xl md:text-7xl text-[#4A3B32]">
                            Faça parte dessa <span className="text-[#C75D3B]">história</span>
                        </h2>

                        <p className="text-xl text-[#4A3B32]/70 leading-relaxed">
                            Monte sua primeira malinha e descubra por que centenas de mulheres já se apaixonaram pela nossa forma de fazer moda.
                        </p>

                        <div className="pt-4">
                            <Link
                                to="/catalogo"
                                className="inline-flex items-center gap-3 px-12 py-5 bg-[#C75D3B] text-white rounded-full font-bold text-lg hover:bg-[#A64D31] transition-all duration-300 shadow-2xl hover:scale-105"
                            >
                                Montar Minha Malinha
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
