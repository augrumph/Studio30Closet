import { Link } from 'react-router-dom'
import { ArrowRight, Truck, Star, Shield, Clock, Quote, Instagram, ArrowUpRight } from 'lucide-react'
import { ProductCard, ProductModal, SkeletonCard } from '@/components/catalog'
import { useAdminStore } from '@/store/admin-store'
import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/Carousel'
import { Particles } from '@/components/magicui/particles'
import { FadeText } from '@/components/magicui/animated-text'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { motion } from 'framer-motion'
import { usePrefetchProducts } from '@/hooks/usePrefetchProducts'

export function Home() {
    const { products, loadProducts, productsLoading } = useAdminStore()
    const [selectedProduct, setSelectedProduct] = useState(null)

    // Prefetch produtos em background assim que a homepage monta
    usePrefetchProducts()

    useEffect(() => {
        // Se não tem produtos em memória, carregar (fallback)
        if (products.length === 0) {
            loadProducts()
        }
    }, [products.length, loadProducts])

    // Process Instagram embeds with better error handling
    useEffect(() => {
        // ✅ OTIMIZAÇÃO: Remover triple setTimeout (causava delays e memory leaks)
        // Apenas processar uma vez quando o script carrega
        const processInstagramEmbeds = () => {
            try {
                if (window.instgrm && window.instgrm.Embeds) {
                    window.instgrm.Embeds.process();
                }
            } catch (error) {
                console.log('Instagram embed processing...');
            }
        };

        // Se script já está carregado, processar imediatamente
        if (window.instgrm && window.instgrm.Embeds) {
            processInstagramEmbeds();
            return;
        }

        // Caso contrário, carregar script
        if (!document.getElementById('instagram-embed-script')) {
            const script = document.createElement('script');
            script.id = 'instagram-embed-script';
            script.src = "https://www.instagram.com/embed.js";
            script.async = true;
            script.onload = processInstagramEmbeds;
            document.body.appendChild(script);

            // Cleanup: remover listener se componente desmontar durante carregamento
            return () => {
                script.removeEventListener('load', processInstagramEmbeds);
            };
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
            <section className="relative overflow-hidden min-h-screen md:h-screen flex flex-col">
                <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: paperTexture }} />

                {/* Particles Background - Mobile optimized */}
                <Particles
                    className="absolute inset-0 z-0"
                    quantity={typeof window !== 'undefined' && window.innerWidth < 640 ? 20 : 40}
                    staticity={30}
                    color="#C75D3B"
                    ease={50}
                />

                {/* Blob Decorativo - Smaller on mobile */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] bg-[#E8C4B0]/10 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/4" />

                {/* Conteúdo Principal Centralizado */}
                <div className="flex-1 flex items-center justify-center pt-8 md:pt-0 md:-mt-16 lg:-mt-20">
                    <div className="container-custom relative z-10 w-full px-4 md:px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-10 xl:gap-16 items-center">

                            {/* LOGO (Esquerda) */}
                            <div className="flex justify-center lg:justify-end animate-fade-in order-1 mb-4 md:mb-0">
                                <img
                                    src="/marcacompleta.PNG"
                                    alt="Studio 30 Closet - Logo Completa"
                                    width="640"
                                    height="360"
                                    fetchPriority="high"
                                    className="w-56 sm:w-72 md:w-[26rem] lg:w-[32rem] xl:w-[40rem] h-auto object-contain drop-shadow-xl hover:scale-[1.02] transition-transform duration-700"
                                />
                            </div>

                            {/* TEXTO (Direita) */}
                            <div className="text-center lg:text-left space-y-2.5 md:space-y-4 order-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-[#4A3B32] leading-tight md:leading-[1.1] break-words">
                                    <FadeText text="O provador mais exclusivo é a " direction="up" className="inline-block" />
                                    <span className="text-[#C75D3B] italic font-light inline-block">
                                        <FadeText text="sua casa." direction="up" className="inline-block" framerProps={{ transition: { delay: 0.1 } }} />
                                    </span>
                                </h1>

                                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#4A3B32]/90 leading-relaxed max-w-xl mx-auto lg:mx-0 px-2 md:px-0">
                                    Receba nossa curadoria personalizada, experimente sem pressa no seu ambiente e pague apenas pelo que amar.
                                </p>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center lg:items-start justify-center lg:justify-start gap-3 mt-4 md:mt-6">
                                    <Link to="/catalogo" className="w-full sm:w-auto">
                                        <ShimmerButton
                                            className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 md:py-4 rounded-full font-medium tracking-wide flex items-center justify-center gap-2 text-sm md:text-base shadow-lg"
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
                                        className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 md:py-4 bg-transparent border border-[#4A3B32]/20 text-[#4A3B32] rounded-full font-medium hover:border-[#4A3B32] transition-all duration-300 flex items-center justify-center text-sm md:text-base"
                                    >
                                        Como Funciona
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= BARRA DE CONFIANÇA (DESKTOP ONLY) ================= */}
                <div className="hidden md:block relative z-10 border-t border-[#4A3B32]/10 bg-[#FDFBF7]/80 backdrop-blur-sm mb-0">
                    <div className="container-custom py-4 md:py-5 lg:py-6 px-4 md:px-6">
                        <div className="grid grid-cols-4 gap-3 lg:gap-4 text-center">
                            {[
                                { icon: Shield, text: "Pagamento Seguro" },
                                { icon: Truck, text: "Entrega Grátis*" },
                                { icon: Clock, text: "48h para Provar" },
                                { icon: Star, text: "Curadoria Premium" },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 md:gap-1.5 lg:gap-2 group">
                                    <div className="text-[#C75D3B] group-hover:scale-110 transition-transform duration-300">
                                        <item.icon className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                                    </div>
                                    <span className="text-[#4A3B32]/80 text-[10px] md:text-xs lg:text-sm font-medium uppercase tracking-wider leading-tight">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= COMO FUNCIONA ================= */}
            <section className="py-16 md:py-24 bg-white relative">
                <div className="container-custom px-4 md:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
                        <div className="relative order-2 lg:order-1">
                            <div className="aspect-[4/5] rounded-xl md:rounded-[2rem] overflow-hidden shadow-lg md:shadow-xl">
                                <img
                                    src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1000&auto=format&fit=crop"
                                    alt="Conceito Malinha"
                                    loading="lazy"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                                />
                            </div>
                            <div className="hidden md:block absolute top-6 -left-6 w-full h-full border-2 border-[#C75D3B]/20 rounded-[2rem] -z-10" />
                        </div>

                        <div className="order-1 lg:order-2 space-y-6 md:space-y-8">
                            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-[#4A3B32] leading-tight">
                                A Boutique vai <br className="hidden sm:block" />
                                <span className="text-[#C75D3B] italic">até você.</span>
                            </h2>
                            <p className="text-[#4A3B32]/90 text-base sm:text-lg md:text-lg leading-relaxed">
                                Esqueça a iluminação ruim dos provadores e a pressa. Com a Malinha Delivery, sua casa se torna o cenário perfeito para suas escolhas.
                            </p>
                            <div className="space-y-4 md:space-y-6 pt-2 md:pt-4">
                                {[
                                    { title: "1. Personalize", desc: "Escolha até 20 peças no site ou WhatsApp." },
                                    { title: "2. Experimente", desc: "Receba em casa. 24h para provar com calma." },
                                    { title: "3. Decida", desc: "Fique só com o que amar. Buscamos o resto." }
                                ].map((step, idx) => (
                                    <div key={idx} className="flex gap-3 md:gap-5 border-b border-[#4A3B32]/5 pb-4 md:pb-6 last:border-0">
                                        <span className="text-[#C75D3B] font-display text-2xl md:text-3xl font-light flex-shrink-0">0{idx + 1}</span>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-[#4A3B32] text-base md:text-lg mb-1 uppercase tracking-wide">{step.title}</h4>
                                            <p className="text-[#4A3B32]/90 text-sm md:text-base">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= CURADORIA ================= */}
            <section className="py-16 md:py-24 bg-[#FDFBF7]">
                <div className="container-custom px-4 md:px-6">
                    <div className="text-center mb-12 md:mb-16">
                        <span className="text-[#C75D3B] text-xs font-bold uppercase tracking-[0.2em] mb-2 md:mb-3 block">New Arrivals</span>
                        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-[#4A3B32]">Destaques da Semana</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                        {productsLoading || products.length === 0 ? (
                            // Skeleton loading enquanto carrega
                            Array.from({ length: 4 }).map((_, idx) => (
                                <SkeletonCard key={`skeleton-${idx}`} />
                            ))
                        ) : (
                            featuredProducts.slice(0, 4).map((product) => (
                                <ProductCard key={product.id} product={product} onQuickView={setSelectedProduct} />
                            ))
                        )}
                    </div>
                    <div className="mt-12 md:mt-16 text-center">
                        <Link to="/catalogo" className="inline-block border-b-2 border-[#C75D3B] text-[#4A3B32] pb-1 hover:text-[#C75D3B] transition-colors font-medium text-sm md:text-base">
                            Ver catálogo completo
                        </Link>
                    </div>
                </div>
            </section>

            {/* ================= LOVE NOTES - REDESIGN PREMIUM ================= */}
            <section className="py-16 md:py-32 bg-gradient-to-b from-[#FDFBF7] via-[#FFF9F7] to-[#FDFBF7] relative overflow-hidden">
                {/* Decorative Elements - Hidden on mobile for performance */}
                <div className="hidden sm:block absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#C75D3B 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                <Quote className="hidden lg:block absolute top-10 right-10 w-40 h-40 text-[#C75D3B] opacity-[0.04] animate-float-subtle" />
                <Quote className="hidden lg:block absolute bottom-20 left-10 w-32 h-32 text-[#C75D3B] opacity-[0.03] rotate-180 animate-float" />

                <div className="container-custom relative z-10 px-4 md:px-6">
                    {/* Header with Animation */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-12 md:mb-20"
                    >
                        <h2 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-[#4A3B32] mb-3 md:mb-4 relative inline-block leading-tight">
                            <span className="text-[#C75D3B] italic font-light">Love</span> <br className="sm:hidden" />Notes
                            <motion.div
                                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C75D3B]/30 to-transparent"
                                initial={{ scaleX: 0 }}
                                whileInView={{ scaleX: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                            />
                        </h2>
                        <p className="text-[#4A3B32]/70 text-sm sm:text-lg mt-4 md:mt-6 px-2">
                            Histórias reais de quem experimentou a diferença
                        </p>
                    </motion.div>

                    {/* Testimonials Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
                        {[
                            {
                                text: "Nunca tinha visto esse tipo de serviço, adorei a praticidade",
                                author: "Emilly",
                                location: "Mandirituba, PR",
                                color: "from-[#FFF9F7] to-[#FDF0ED]",
                                delay: 0
                            },
                            {
                                text: "Amei as peças e o atendimento.",
                                author: "Larissa",
                                location: "Agudos do Sul, PR",
                                color: "from-[#FDFBF7] to-[#FFF9F7]",
                                delay: 0.1
                            },
                            {
                                text: "Preços acessíveis e gostei de poder provar tudo com calma e com as roupas que eu já tenho",
                                author: "Maria Helena",
                                location: "Curitiba, PR",
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
                                <div className={`bg-gradient-to-br ${item.color} p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl border border-[#4A3B32]/5 h-full flex flex-col relative overflow-hidden transition-shadow duration-300 group-hover:shadow-xl md:group-hover:shadow-2xl group-hover:shadow-[#C75D3B]/10`}>
                                    {/* Decorative Quote */}
                                    <Quote className="hidden sm:block absolute -top-2 -left-2 w-12 sm:w-16 h-12 sm:h-16 text-[#C75D3B] opacity-10" />

                                    {/* Stars */}
                                    <div className="flex gap-1 mb-3 sm:mb-4 md:mb-6 relative z-10">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <motion.div
                                                key={s}
                                                initial={{ scale: 0, rotate: -180 }}
                                                whileInView={{ scale: 1, rotate: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.3 + (s * 0.05), type: "spring" }}
                                            >
                                                <Star className="w-4 sm:w-5 h-4 sm:h-5 fill-[#C75D3B] text-[#C75D3B]" />
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Text */}
                                    <p className="text-[#4A3B32] text-sm sm:text-base md:text-lg leading-relaxed mb-4 sm:mb-6 md:mb-8 flex-1 relative z-10">
                                        "{item.text}"
                                    </p>

                                    {/* Author */}
                                    <div className="flex items-center gap-3 sm:gap-4 pt-3 sm:pt-4 md:pt-6 border-t border-[#C75D3B]/10 relative z-10">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#C75D3B] to-[#E8C4B0] flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-lg flex-shrink-0">
                                            {item.author.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-display text-[#4A3B32] font-bold text-sm sm:text-base md:text-lg truncate">
                                                {item.author}
                                            </p>
                                            <p className="text-xs sm:text-sm text-[#4A3B32]/60 truncate">
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

                </div>
            </section>

            {/* ================= INSTAGRAM SECTION - REDESIGN PREMIUM ================= */}
            <section className="py-16 md:py-32 bg-white relative overflow-hidden">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#FDFBF7] via-white to-[#FFF9F7]" />

                {/* Animated Blobs - Hidden on mobile */}
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
                    className="hidden lg:block absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#C75D3B]/5 to-[#E8C4B0]/5 rounded-full blur-3xl"
                />

                <div className="container-custom relative z-10 px-4 md:px-6">
                    {/* Header Premium */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12 md:mb-16"
                    >
                        {/* Instagram Icon Badge */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            whileInView={{ scale: 1, rotate: 0 }}
                            viewport={{ once: true }}
                            transition={{ type: "spring", stiffness: 200 }}
                            className="inline-block mb-4 md:mb-8"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#C75D3B] to-[#E8C4B0] blur-xl opacity-50 rounded-full" />
                                <div className="relative p-4 md:p-6 bg-gradient-to-br from-[#C75D3B] to-[#E8C4B0] rounded-2xl md:rounded-3xl shadow-2xl">
                                    <Instagram className="w-8 md:w-12 h-8 md:h-12 text-white" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Title */}
                        <h2 className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-[#4A3B32] mb-3 md:mb-4 leading-tight">
                            Siga nosso<br className="sm:hidden" />
                            <span className="text-[#C75D3B] italic font-light"> estilo</span>
                        </h2>

                        {/* Subtitle */}
                        <p className="text-sm sm:text-lg md:text-xl text-[#4A3B32]/70 mb-6 md:mb-8 max-w-2xl mx-auto px-2">
                            Inspire-se com looks, dicas de estilo e novidades exclusivas diretamente do nosso Instagram
                        </p>


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
                        {/* Mobile: Cards clicáveis direto para Instagram */}
                        <div className="md:hidden space-y-4 mb-8">
                            {[
                                {
                                    url: "https://www.instagram.com/p/DSiWPWoEext/",
                                    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=400&fit=crop",
                                    caption: "✨ Nova coleção"
                                },
                                {
                                    url: "https://www.instagram.com/p/DSaVwuKgENY/",
                                    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop",
                                    caption: "💕 Looks do dia"
                                },
                                {
                                    url: "https://www.instagram.com/p/DSdRL9oETly/",
                                    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=400&fit=crop",
                                    caption: "🛍️ Peças favoritas"
                                }
                            ].map((post, i) => (
                                <motion.a
                                    key={i}
                                    href={post.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-lg border border-gray-100 active:scale-[0.98] transition-transform"
                                >
                                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                        <img
                                            src={post.image}
                                            alt={post.caption}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-[#4A3B32] text-sm mb-1">@studio30closet</p>
                                        <p className="text-[#4A3B32]/70 text-sm truncate">{post.caption}</p>
                                    </div>
                                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#C75D3B] to-[#E8C4B0] rounded-full flex items-center justify-center">
                                        <Instagram className="w-4 h-4 text-white" />
                                    </div>
                                </motion.a>
                            ))}

                            {/* CTA para Instagram */}
                            <a
                                href="https://www.instagram.com/studio30closet/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full p-4 text-center bg-gradient-to-r from-[#C75D3B] to-[#E8C4B0] text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
                            >
                                <Instagram className="w-5 h-5 inline-block mr-2" />
                                Ver mais no Instagram
                            </a>
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
            <section className="py-16 md:py-24 bg-[#FDFBF7] border-t border-[#4A3B32]/5">
                <div className="container-custom text-center px-4 md:px-6">
                    {/* Elemento decorativo discreto */}
                    <div className="w-12 md:w-16 h-1 bg-[#C75D3B]/20 mx-auto mb-6 md:mb-8 rounded-full" />

                    <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[#4A3B32] mb-4 md:mb-6 leading-tight">
                        Pronta para montar sua malinha?
                    </h2>
                    <p className="text-[#4A3B32]/90 max-w-xl mx-auto mb-8 md:mb-10 text-sm sm:text-base md:text-lg font-light leading-relaxed px-2">
                        Selecione suas peças favoritas e receba em casa.<br className="hidden md:block" /> Simples, seguro e sem compromisso.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
                        <Link
                            to="/catalogo"
                            className="inline-flex items-center justify-center px-8 sm:px-10 md:px-12 py-3 md:py-4 bg-[#C75D3B] text-white rounded-full font-bold text-base md:text-lg hover:bg-[#A64D31] transition-all duration-300 shadow-lg md:shadow-xl shadow-[#C75D3B]/20 hover:-translate-y-1 active:scale-95"
                        >
                            Começar Agora
                        </Link>
                    </div>
                </div>
            </section>

            {/* Product Modal */}
            <ProductModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
            />
        </div >
    )
}
