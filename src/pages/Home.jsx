import { Link } from 'react-router-dom'
import { ArrowRight, Truck, Star, Shield, Clock, Quote, Instagram, ArrowUpRight } from 'lucide-react'
import { ProductCard } from '@/components/catalog/ProductCard'
import { useAdminStore } from '@/store/admin-store'
import { useEffect } from 'react'

export function Home() {
    const { products, loadProducts } = useAdminStore()

    useEffect(() => {
        loadProducts()
    }, [loadProducts])

    // Filtrar produtos em destaque que tenham o campo isFeatured como true
    const featuredProducts = (products || []).filter(p => p.isFeatured).slice(0, 4)

    // Textura de papel
    const paperTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`

    // Imagens simulando o Feed do Instagram (Substitua por fotos reais dos seus produtos depois se quiser)
    const instagramFeed = [
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80",
        "https://images.unsplash.com/photo-1550614000-4b9519e00707?w=600&q=80"
    ]

    return (
        // BASE: Fundo Creme Claro Global
        <div className="w-full overflow-x-hidden bg-[#FDFBF7] text-[#4A3B32] font-sans selection:bg-[#C75D3B] selection:text-white">

            {/* ================= HERO SECTION ================= */}
            <section className="relative overflow-hidden h-screen flex flex-col">
                <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: paperTexture }} />

                {/* Blob Decorativo Suave */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#E8C4B0]/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/4" />

                {/* Conteúdo Principal Centralizado */}
                <div className="flex-1 flex items-center justify-center -mt-20 md:-mt-16 lg:-mt-20">
                    <div className="container-custom relative z-10 w-full px-4">
                        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 xl:gap-16 items-center">

                            {/* LOGO (Esquerda) */}
                            <div className="flex justify-center lg:justify-end animate-fade-in order-1">
                                <img
                                    src="/marcacompleta.PNG"
                                    alt="Studio 30 Closet"
                                    className="w-72 sm:w-96 md:w-[28rem] lg:w-[32rem] xl:w-[40rem] h-auto object-contain drop-shadow-xl hover:scale-[1.02] transition-transform duration-700"
                                />
                            </div>

                            {/* TEXTO (Direita) */}
                            <div className="text-center lg:text-left space-y-3 md:space-y-4 order-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl text-[#4A3B32] leading-[1.1]">
                                    O provador mais <br />
                                    exclusivo é a <br className="hidden lg:block" />
                                    <span className="text-[#C75D3B] italic font-light">sua casa.</span>
                                </h1>

                                <p className="text-lg md:text-xl lg:text-2xl text-[#4A3B32]/80 leading-relaxed max-w-xl mx-auto lg:mx-0">
                                    Receba nossa curadoria de luxo, experimente sem pressa no seu ambiente e pague apenas pelo que amar.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-2 md:gap-3">
                                    <Link
                                        to="/catalogo"
                                        className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 bg-[#C75D3B] text-white rounded-full font-medium tracking-wide hover:bg-[#A64D31] transition-all duration-300 shadow-lg shadow-[#C75D3B]/20 hover:shadow-[#C75D3B]/40 hover:-translate-y-1 flex items-center justify-center gap-2 text-sm md:text-base"
                                    >
                                        Explorar Coleção
                                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                                    </Link>

                                    <Link
                                        to="/como-funciona"
                                        className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 bg-transparent border border-[#4A3B32]/20 text-[#4A3B32] rounded-full font-medium hover:border-[#4A3B32] transition-all duration-300 flex items-center justify-center text-sm md:text-base"
                                    >
                                        Como Funciona
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= BARRA DE CONFIANÇA ================= */}
                <div className="relative z-10 border-t border-[#4A3B32]/10 bg-[#FDFBF7]/80 backdrop-blur-sm mb-0">
                    <div className="container-custom py-5 md:py-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center">
                            {[
                                { icon: Shield, text: "Pagamento Seguro" },
                                { icon: Truck, text: "Entrega Grátis*" },
                                { icon: Clock, text: "48h para Provar" },
                                { icon: Star, text: "Curadoria Premium" },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5 md:gap-2 group">
                                    <div className="text-[#C75D3B] group-hover:scale-110 transition-transform duration-300">
                                        <item.icon className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <span className="text-[#4A3B32]/80 text-xs md:text-sm font-medium uppercase tracking-wider">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= COMO FUNCIONA ================= */}
            <section className="py-24 bg-white relative">
                <div className="container-custom">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="relative order-2 lg:order-1">
                            <div className="aspect-[4/5] rounded-none md:rounded-[2rem] overflow-hidden">
                                <img
                                    src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2574&auto=format&fit=crop"
                                    alt="Conceito Malinha"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                                />
                            </div>
                            <div className="hidden md:block absolute top-6 -left-6 w-full h-full border-2 border-[#C75D3B]/20 rounded-[2rem] -z-10" />
                        </div>

                        <div className="order-1 lg:order-2 space-y-8">
                            <h2 className="font-display text-4xl md:text-5xl text-[#4A3B32]">
                                A Boutique vai <br />
                                <span className="text-[#C75D3B] italic">até você.</span>
                            </h2>
                            <p className="text-[#4A3B32]/70 text-lg leading-relaxed">
                                Esqueça a iluminação ruim dos provadores e a pressa.
                                Com a Malinha Delivery, sua casa se torna o cenário perfeito para suas escolhas.
                            </p>
                            <div className="space-y-6 pt-4">
                                {[
                                    { title: "1. Personalize", desc: "Escolha até 20 peças no site ou WhatsApp." },
                                    { title: "2. Experimente", desc: "Receba em casa. 48h para provar com calma." },
                                    { title: "3. Decida", desc: "Fique só com o que amar. Buscamos o resto." }
                                ].map((step, idx) => (
                                    <div key={idx} className="flex gap-5 border-b border-[#4A3B32]/5 pb-6 last:border-0">
                                        <span className="text-[#C75D3B] font-display text-3xl font-light">0{idx + 1}</span>
                                        <div>
                                            <h4 className="font-bold text-[#4A3B32] text-lg mb-1 uppercase tracking-wide">{step.title}</h4>
                                            <p className="text-[#4A3B32]/60">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= CURADORIA ================= */}
            <section className="py-24 bg-[#FDFBF7]">
                <div className="container-custom">
                    <div className="text-center mb-16">
                        <span className="text-[#C75D3B] text-xs font-bold uppercase tracking-[0.2em] mb-3 block">New Arrivals</span>
                        <h2 className="font-display text-4xl text-[#4A3B32]">Curadoria da Semana</h2>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {featuredProducts.slice(0, 4).map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                    <div className="mt-16 text-center">
                        <Link to="/catalogo" className="inline-block border-b-2 border-[#C75D3B] text-[#4A3B32] pb-1 hover:text-[#C75D3B] transition-colors font-medium">
                            Ver catálogo completo
                        </Link>
                    </div>
                </div>
            </section>

            {/* ================= LOVE NOTES ================= */}
            <section className="py-24 bg-[#E8C4B0]/10 relative overflow-hidden">
                <Quote className="absolute top-10 left-10 w-32 h-32 text-[#C75D3B] opacity-[0.03] rotate-180" />
                <div className="container-custom relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="font-display text-6xl md:text-7xl text-[#C75D3B] opacity-90 mb-4" style={{ fontFamily: 'serif', fontStyle: 'italic' }}>
                            Love Notes
                        </h2>
                        <p className="text-[#4A3B32]/60 uppercase tracking-widest text-xs font-medium">
                            O que nossas clientes dizem
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { text: "A facilidade de provar em casa mudou tudo! As peças chegaram impecáveis.", author: "Carolina M." },
                            { text: "Qualidade surreal das peças. O tecido, o caimento... sem pressão de vendedor.", author: "Beatriz L." },
                            { text: "Moro longe do centro e a entrega foi super rápida. Devolvi o resto sem burocracia.", author: "Fernanda S." }
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-8 md:p-10 shadow-sm border border-[#4A3B32]/5 text-center flex flex-col items-center">
                                <div className="flex gap-1 mb-6">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-[#C75D3B] text-[#C75D3B]" />)}
                                </div>
                                <p className="text-[#4A3B32]/80 text-lg font-light leading-relaxed mb-8">"{item.text}"</p>
                                <span className="font-display text-[#4A3B32] text-xl border-t border-[#C75D3B]/20 pt-4 w-full block">
                                    {item.author}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ================= INSTAGRAM SECTION (NOVO) ================= */}
            <section className="py-20 bg-white">
                <div className="container-custom">
                    {/* Header do Instagram */}
                    <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-[#FDFBF7] rounded-full text-[#C75D3B]">
                                <Instagram className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-display text-[#4A3B32]">@studio30closet</h3>
                                <p className="text-sm text-[#4A3B32]/60">Siga para inspirações diárias</p>
                            </div>
                        </div>
                        <a
                            href="https://www.instagram.com/studio30closet/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#C75D3B] font-medium hover:text-[#A64D31] flex items-center gap-2 group"
                        >
                            Ver perfil completo
                            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                        </a>
                    </div>

                    {/* Grid Visual do Instagram (2x2 Mobile, 4x1 Desktop) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                        {instagramFeed.map((img, idx) => (
                            <a
                                key={idx}
                                href="https://www.instagram.com/studio30closet/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative aspect-square overflow-hidden cursor-pointer bg-[#FDFBF7]"
                            >
                                <img
                                    src={img}
                                    alt="Instagram Post"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                {/* Overlay ao passar o mouse */}
                                <div className="absolute inset-0 bg-[#4A3B32]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <Instagram className="text-white w-8 h-8" />
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* ================= FINAL CTA (FUNDO CLARO) ================= */}
            <section className="py-24 bg-[#FDFBF7] border-t border-[#4A3B32]/5">
                <div className="container-custom text-center px-4">
                    {/* Elemento decorativo discreto */}
                    <div className="w-16 h-1 bg-[#C75D3B]/20 mx-auto mb-8 rounded-full" />

                    <h2 className="font-display text-4xl md:text-5xl text-[#4A3B32] mb-6">
                        Pronta para montar sua malinha?
                    </h2>
                    <p className="text-[#4A3B32]/70 max-w-xl mx-auto mb-10 text-lg font-light leading-relaxed">
                        Selecione suas peças favoritas e receba em casa. <br className="hidden md:block" /> Simples, seguro e sem compromisso.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <Link
                            to="/catalogo"
                            className="inline-flex items-center justify-center px-12 py-4 bg-[#C75D3B] text-white rounded-full font-bold text-lg hover:bg-[#A64D31] transition-all duration-300 shadow-xl shadow-[#C75D3B]/20 hover:-translate-y-1"
                        >
                            Começar Agora
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}