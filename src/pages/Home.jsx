import { Link } from 'react-router-dom'
import { ArrowRight, Truck, Star, Shield, Clock, Quote, Instagram, ArrowUpRight } from 'lucide-react'
import { ProductCard } from '@/components/catalog/ProductCard'
import { useAdminStore } from '@/store/admin-store'
import { useEffect, useRef, useLayoutEffect } from 'react'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/Carousel'
import { Particles } from '@/components/magicui/particles'
import { FadeText } from '@/components/magicui/animated-text'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { motion } from 'framer-motion'

export function Home() {
    const { products, loadProducts } = useAdminStore()

    useEffect(() => {
        loadProducts()
    }, [loadProducts])

    // Process Instagram embeds after component updates
    useEffect(() => {
        const processInstagramEmbeds = () => {
            if (window.instgrm && window.instgrm.Embeds) {
                window.instgrm.Embeds.process();
            }
        };

        // Process immediately if script is already loaded
        if (window.instgrm) {
            processInstagramEmbeds();
        } else {
            // If script is not loaded yet, wait a bit and try again
            const timer = setTimeout(() => {
                if (window.instgrm) {
                    window.instgrm.Embeds.process();
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Filtrar produtos em destaque que tenham o campo isFeatured como true
    const featuredProducts = (products || []).filter(p => p.isFeatured).slice(0, 4)

    // Textura de papel
        const paperTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`
    
        return (
            // BASE: Fundo Creme Claro Global
            <div className="w-full overflow-x-hidden bg-[#FDFBF7] text-[#4A3B32] font-sans selection:bg-[#C75D3B] selection:text-white">
    
                {/* ================= HERO SECTION ================= */}
                <section className="relative overflow-hidden h-screen flex flex-col">
                    <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: paperTexture }} />

                    {/* Particles Background */}
                    <Particles
                        className="absolute inset-0 z-0"
                        quantity={60}
                        staticity={30}
                        color="#C75D3B"
                        ease={50}
                    />

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
                                        alt="Studio 30 Closet - Logo Completa"
                                        width="640"
                                        height="360"
                                        fetchPriority="high"
                                        className="w-72 sm:w-96 md:w-[28rem] lg:w-[32rem] xl:w-[40rem] h-auto object-contain drop-shadow-xl hover:scale-[1.02] transition-transform duration-700"
                                    />
                                </div>
    
                                {/* TEXTO (Direita) */}
                                <div className="text-center lg:text-left space-y-3 md:space-y-4 order-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                    <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl text-[#4A3B32] leading-[1.1]">
                                        <FadeText text="O provador mais" direction="up" className="inline-block" />
                                        <br />
                                        <FadeText text="exclusivo é a" direction="up" className="inline-block" framerProps={{ transition: { delay: 0.1 } }} />
                                        <br className="hidden lg:block" />
                                        <span className="text-[#C75D3B] italic font-light">
                                            <FadeText text="sua casa." direction="up" className="inline-block" framerProps={{ transition: { delay: 0.2 } }} />
                                        </span>
                                    </h1>
    
                                    <p className="text-lg md:text-xl lg:text-2xl text-[#4A3B32]/90 leading-relaxed max-w-xl mx-auto lg:mx-0">
                                        Receba nossa curadoria de luxo, experimente sem pressa no seu ambiente e pague apenas pelo que amar.
                                    </p>
    
                                    <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-2 md:gap-3">
                                        <Link to="/catalogo" className="w-full sm:w-auto">
                                            <ShimmerButton
                                                className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 rounded-full font-medium tracking-wide flex items-center justify-center gap-2 text-sm md:text-base shadow-lg"
                                                shimmerColor="#ffffff"
                                                shimmerSize="0.15em"
                                                borderRadius="9999px"
                                                shimmerDuration="2s"
                                                background="linear-gradient(135deg, #C75D3B 0%, #A64D31 100%)"
                                            >
                                                Explorar Coleção
                                                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                                            </ShimmerButton>
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
                                <p className="text-[#4A3B32]/90 text-lg leading-relaxed">
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
    _                                        <div>
                                                <h4 className="font-bold text-[#4A3B32] text-lg mb-1 uppercase tracking-wide">{step.title}</h4>
                                                <p className="text-[#4A3B32]/90">{step.desc}</p>
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
    
                {/* ================= LOVE NOTES - REDESIGN PREMIUM ================= */}
                <section className="py-32 bg-gradient-to-b from-[#FDFBF7] via-[#FFF9F7] to-[#FDFBF7] relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#C75D3B 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                    <Quote className="absolute top-10 right-10 w-40 h-40 text-[#C75D3B] opacity-[0.04] animate-float-subtle" />
                    <Quote className="absolute bottom-20 left-10 w-32 h-32 text-[#C75D3B] opacity-[0.03] rotate-180 animate-float" />

                    <div className="container-custom relative z-10">
                        {/* Header with Animation */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-20"
                        >
                            <motion.div
                                initial={{ scale: 0.9 }}
                                whileInView={{ scale: 1 }}
                                viewport={{ once: true }}
                                className="inline-block mb-6"
                            >
                                <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-lg border border-[#C75D3B]/10">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C75D3B] to-[#E8C4B0] border-2 border-white" />
                                        ))}
                                    </div>
                                    <span className="text-sm font-bold text-[#4A3B32]">500+ clientes felizes</span>
                                </div>
                            </motion.div>

                            <h2 className="font-display text-5xl md:text-7xl lg:text-8xl text-[#4A3B32] mb-4 relative inline-block">
                                <span className="text-[#C75D3B] italic font-light">Love</span> Notes
                                <motion.div
                                    className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C75D3B]/30 to-transparent"
                                    initial={{ scaleX: 0 }}
                                    whileInView={{ scaleX: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.3, duration: 0.8 }}
                                />
                            </h2>
                            <p className="text-[#4A3B32]/70 text-lg mt-6">
                                Histórias reais de quem experimentou a diferença
                            </p>
                        </motion.div>

                        {/* Testimonials Bento Grid */}
                        <div className="grid md:grid-cols-2 lxg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                            {[
                                {
                                    text: "A facilidade de provar em casa mudou tudo! As peças chegaram impecáveis e o acabamento é de uma qualidade incrível.",
                                    author: "Carolina M.",
                                    location: "São Paulo, SP",
                                    color: "from-[#FFF9F7] to-[#FDF0ED]",
                                    delay: 0
                                },
                                {
                                    text: "Qualidade surreal das peças. O tecido, o caimento... tudo perfeito. Sem pressão de vendedor, no meu tempo.",
                                    author: "Beatriz L.",
                                    location: "Rio de Janeiro, RJ",
                                    color: "from-[#FDFBF7] to-[#FFF9F7]",
                                    delay: 0.1
                                },
                                {
                                    text: "Moro longe do centro e a entrega foi super rápida. Devolvi o que não serviu sem burocracia nenhuma. Adorei!",
                                    author: "Fernanda S.",
                                    location: "Campinas, SP",
                                    color: "from-[#FDF0ED] to-[#FDFBF7]",
                                    delay: 0.2
                                }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: item.delay, duration: 0.5 }}
                                    whileHover={{ y: -8, transition: { duration: 0.3 } }}
                                    className="group relative"
                                >
                                    <div className={`bg-gradient-to-br ${item.color} p-8 rounded-3xl shadow-xl border border-[#4A3B32]/5 h-full flex flex-col relative overflow-hidden transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-[#C75D3B]/10`}>
                                        {/* Decorative Quote */}
                                        <Quote className="absolute -top-2 -left-2 w-16 h-16 text-[#C75D3B] opacity-10" />

                                        {/* Stars */}
                                        <div className="flex gap-1 mb-6 relative z-10">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <motion.div
                                                    key={s}
                                                    initial={{ scale: 0, rotate: -180 }}
                                                    whileInView={{ scale: 1, rotate: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: 0.3 + (s * 0.05), type: "spring" }}
                                                >
                                                    <Star className="w-5 h-5 fill-[#C75D3B] text-[#C75D3B]" />
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Text */}
                                        <p className="text-[#4A3B32] text-lg leading-relaxed mb-8 flex-1 relative z-10">
                                            "{item.text}"
                                        </p>

                                        {/* Author */}
                                        <div className="flex items-center gap-4 pt-6 border-t border-[#C75D3B]/10 relative z-10">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C75D3B] to-[#E8C4B0] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                                {item.author.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-display text-[#4A3B32] font-bold text-lg">
                                                    {item.author}
                                                </p>
                                                <p className="text-sm text-[#4A3B32]/60">
                                                    {item.location}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Hover Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#C75D3B]/0 to-[#C75D3B]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Bottom Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                            className="mt-20 text-center"
                        >
                            <div className="inline-flex items-center gap-8 bg-white px-8 py-6 rounded-2xl shadow-lg border border-[#C75D3B]/10">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-[#C75D3B] mb-1">4.9/5</div>
                                    <div className="text-sm text-[#4A3B32]/60">Avaliação média</div>
                                </div>
                                <div className="w-px h-12 bg-[#C75D3B]/10" />
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-[#C75D3B] mb-1">98%</div>
                                    <div className="text-sm text-[#4A3B32]/60">Recompram</div>
                                </div>
                                <div className="w-px h-12 bg-[#C75D3B]/10" />
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-[#C75D3B] mb-1">500+</div>
                                    <div className="text-sm text-[#4A3B32]/60">Clientes felizes</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>
    
                {/* ================= INSTAGRAM SECTION - REDESIGN PREMIUM ================= */}
                <section className="py-32 bg-white relative overflow-hidden">
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FDFBF7] via-white to-[#FFF9F7]" />

                    {/* Animated Blobs */}
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 90, 0],
                        }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#C75D3B]/5 to-[#E8C4B0]/5 rounded-full blur-3xl"
                    />

                    <div className="container-custom relative z-10">
                        {/* Header Premium */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            {/* Instagram Icon Badge */}
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                whileInView={{ scale: 1, rotate: 0 }}
                                viewport={{ once: true }}
                                transition={{ type: "spring", stiffness: 200 }}
                                className="inline-block mb-8"
                            >
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#C75D3B] to-[#E8C4B0] blur-xl opacity-50 rounded-full" />
                                    <div className="relative p-6 bg-gradient-to-br from-[#C75D3B] to-[#E8C4B0] rounded-3xl shadow-2xl">
                                        <Instagram className="w-12 h-12 text-white" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Title */}
                            <h2 className="font-display text-5xl md:text-7xl text-[#4A3B32] mb-4">
                                Siga nosso
                                <span className="text-[#C75D3B] italic font-light"> estilo</span>
                            </h2>

                            {/* Subtitle */}
                            <p className="text-xl text-[#4A3B32]/70 mb-8 max-w-2xl mx-auto">
                                Inspire-se com looks, dicas de estilo e novidades exclusivas diretamente do nosso Instagram
                            </p>

                            {/* Instagram Handle with Stats */}
                            <div className="inline-flex flex-col md:flex-row items-center gap-6 bg-white px-8 py-6 rounded-2xl shadow-xl border border-[#C75D3B]/10">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C75D3B] to-[#E8C4B0] flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                        S30
                                    </div>
                                    <div className="text-left">
                                        <div className="text-2xl font-bold text-[#4A3B32]">@studio30closet</div>
                                        <div className="text-sm text-[#4A3B32]/60">Inspiração diária de moda</div>
                                    </div>
                                </div>

                                <div className="hidden md:block w-px h-12 bg-[#C75D3B]/10" />

                                <div className="flex gap-8">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[#C75D3B]">1.2k</div>
                                        <div className="text-xs text-[#4A3B32]/60">Posts</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[#C75D3B]">15k+</div>
                                        <div className="text-xs text-[#4A3B32]/60">Seguidores</div>
                                    </div>
                                </div>
                            </div>

                            {/* Follow Button */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="mt-8"
                            >
                                <a
                                    href="https://www.instagram.com/studio30closet/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                >
                                    <ShimmerButton
                                        className="px-8 py-4 rounded-full font-bold text-lg shadow-2xl"
                                        shimmerColor="#ffffff"
                                        shimmerSize="0.15em"
                                        borderRadius="9999px"
                                        shimmerDuration="2.5s"
                                        background="linear-gradient(135deg, #C75D3B 0%, #E8C4B0 50%, #C75D3B 100%)"
                                    >
                                        <Instagram className="w-5 h-5 inline-block mr-2" />
                                        Seguir Agora
                                    </ShimmerButton>
                                </a>
                            </motion.div>
                        </motion.div>

                        {/* Instagram Posts Grid with Polaroid Effect */}
                        <div className="max-w-6xl mx-auto px-4">
                            {/* Mobile Carousel */}
                            <div className="md:hidden mb-8">
                                <Carousel
                                    opts={{
                                        align: "center",
                                        loop: true
                                    }}
                                    className="w-full"
                                >
                                    <CarouselContent>
                                        {[
                                            "https://www.instagram.com/p/DSiWPWoEext/?utm_source=ig_embed&amp;utm_campaign=loading",
                                            "https://www.instagram.com/p/DSaVwuKgENY/?utm_source=ig_embed&amp;utm_campaign=loading",
                                            "https://www.instagram.com/p/DSdRL9oETly/?utm_source=ig_embed&amp;utm_campaign=loading"
                                        ].map((url, i) => (
                                            <CarouselItem key={i}>
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    whileInView={{ opacity: 1, scale: 1 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="p-2"
                                                >
                                                    <div className="bg-white p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 border-2 border-white">
                                                        <div className="instagram-embed-wrapper">
                                                            <blockquote
                                                                className="instagram-media"
                                                                data-instgrm-permalink={url}
                                                                data-instgrm-version="14"
                                                            ></blockquote>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    <CarouselPrevious className="left-2 bg-white shadow-lg border-2 border-[#C75D3B]/20" />
                                    <CarouselNext className="right-2 bg-white shadow-lg border-2 border-[#C75D3B]/20" />
                                </Carousel>
                            </div>

                            {/* Desktop Grid - Polaroid Style */}
                            <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {[
                                    { url: "https://www.instagram.com/p/DSiWPWoEext/?utm_source=ig_embed&amp;utm_campaign=loading", rotate: -2 },
                                    { url: "https://www.instagram.com/p/DSaVwuKgENY/?utm_source=ig_embed&amp;utm_campaign=loading", rotate: 1 },
                                    { url: "https://www.instagram.com/p/DSdRL9oETly/?utm_source=ig_embed&amp;utm_campaign=loading", rotate: -1 }
                                ].map((post, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 30, rotate: 0 }}
                                        whileInView={{ opacity: 1, y: 0, rotate: post.rotate }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.15, type: "spring" }}
                                        whileHover={{
                                            scale: 1.05,
                                            rotate: 0,
                                            zIndex: 10,
                                            transition: { duration: 0.3 }
                                        }}
                                        className="flex justify-center"
                                    >
                                        <div className="bg-white p-6 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 border-4 border-white relative group">
                                            {/* Polaroid Effect */}
                                            <div className="absolute -inset-1 bg-gradient-to-br from-[#C75D3B]/20 to-[#E8C4B0]/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                            <div className="relative instagram-embed-wrapper">
                                                <blockquote
                                                    className="instagram-media"
                                                    data-instgrm-permalink={post.url}
                                                    data-instgrm-version="14"
                                                ></blockquote>
                                            </div>

                                            {/* Decorative Tape Effect */}
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-8 bg-[#E8C4B0]/30 backdrop-blur-sm rotate-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom CTA */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 }}
                            className="text-center mt-16"
                        >
                            <p className="text-[#4A3B32]/60 mb-4">
                                Junte-se à nossa comunidade de estilo
                            </p>
                            <a
                                href="https://www.instagram.com/studio30closet/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-[#C75D3B] font-bold hover:text-[#A64D31] transition-colors group"
                            >
                                Ver todos os posts
                                <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                            </a>
                        </motion.div>
                    </div>
                </section>
    
                {/* ================= FINAL CTA (FUNDO CLARO) ================= */}
                < section className="py-24 bg-[#FDFBF7] border-t border-[#4A3B32]/5" >
                    <div className="container-custom text-center px-4">
                        {/* Elemento decorativo discreto */}
                        <div className="w-16 h-1 bg-[#C75D3B]/20 mx-auto mb-8 rounded-full" />
    
                        <h2 className="font-display text-4xl md:text-5xl text-[#4A3B32] mb-6">
                            Pronta para montar sua malinha?
                        </h2>
                        <p className="text-[#4A3B32]/90 max-w-xl mx-auto mb-10 text-lg font-light leading-relaxed">
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
                </section >
            </div >
        )
    }    
