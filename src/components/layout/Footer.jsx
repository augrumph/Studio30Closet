import { Link } from 'react-router-dom'
import { Instagram, MessageCircle, Mail, MapPin } from 'lucide-react'

export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-[#FDFBF7] relative overflow-hidden">
            {/* Accent line at top */}
            <div className="w-full h-px bg-[#E8C4B0]" />

            {/* Main Footer */}
            <div className="container-custom py-20 sm:py-24 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-16">
                    {/* Brand Section */}
                    <div className="lg:col-span-1">
                        <div className="flex flex-col gap-6">
                            <Link to="/" className="flex items-center group">
                                <img
                                    src="/logomarca.PNG"
                                    alt="Logo Studio 30"
                                    className="h-16 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="ml-3 flex flex-col">
                                    <span className="font-display text-xl font-bold text-[#C75D3B] tracking-wider">
                                        STUDIO 30
                                    </span>
                                    <span className="text-[10px] text-[#4A3B32]/60 tracking-[0.2em] uppercase font-medium">
                                        Closet
                                    </span>
                                </div>
                            </Link>

                            {/* Social Icons */}
                            <div className="flex items-center gap-4 pt-2">
                                <a
                                    href="https://instagram.com/studio30closet"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-full bg-white border border-[#E8C4B0] hover:bg-[#C75D3B] hover:border-[#C75D3B] transition-all duration-500 hover:scale-110 group"
                                >
                                    <Instagram className="w-5 h-5 text-[#C75D3B] group-hover:text-white transition-colors duration-500" />
                                </a>
                                <a
                                    href="https://wa.me/5511999999999"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-full bg-white border border-[#E8C4B0] hover:bg-[#C75D3B] hover:border-[#C75D3B] transition-all duration-500 hover:scale-110 group"
                                >
                                    <MessageCircle className="w-5 h-5 text-[#C75D3B] group-hover:text-white transition-colors duration-500" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-display text-xl font-bold text-[#C75D3B] mb-6 relative inline-block">
                            Navegação
                            <span className="absolute -bottom-2 left-0 w-12 h-0.5 bg-[#C75D3B]" />
                        </h4>
                        <ul className="space-y-3">
                            {[
                                { name: 'Início', href: '/' },
                                { name: 'Catálogo', href: '/catalogo' },
                                { name: 'Como Funciona', href: '/como-funciona' },
                                { name: 'Sobre Nós', href: '/sobre' },
                                { name: 'Política de Privacidade', href: '/politica-de-privacidade' },
                                { name: 'Termos de Serviço', href: '/termos-de-servico' },
                            ].map((link) => (
                                <li key={link.href}>
                                    <Link
                                        to={link.href}
                                        className="text-[#4A3B32]/70 hover:text-[#C75D3B] transition-all duration-300 text-base group inline-flex items-center gap-2"
                                        style={{ letterSpacing: '0.02em' }}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#C75D3B]/40 group-hover:bg-[#C75D3B] transition-colors duration-300" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Categories */}
                    <div>
                        <h4 className="font-display text-xl font-bold text-[#C75D3B] mb-6 relative inline-block">
                            Categorias
                            <span className="absolute -bottom-2 left-0 w-12 h-0.5 bg-[#C75D3B]" />
                        </h4>
                        <ul className="space-y-3">
                            {['Vestidos', 'Blusas', 'Calças', 'Saias', 'Conjuntos', 'Blazers'].map(
                                (category) => (
                                    <li key={category}>
                                        <Link
                                            to={`/catalogo?categoria=${category.toLowerCase()}`}
                                            className="text-[#4A3B32]/70 hover:text-[#C75D3B] transition-all duration-300 text-base group inline-flex items-center gap-2"
                                            style={{ letterSpacing: '0.02em' }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#C75D3B]/40 group-hover:bg-[#C75D3B] transition-colors duration-300" />
                                            {category}
                                        </Link>
                                    </li>
                                )
                            )}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-display text-xl font-bold text-[#C75D3B] mb-6 relative inline-block">
                            Contato
                            <span className="absolute -bottom-2 left-0 w-12 h-0.5 bg-[#C75D3B]" />
                        </h4>
                        <ul className="space-y-4">
                            <li>
                                <a
                                    href="https://wa.me/5511999999999"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-[#4A3B32]/70 hover:text-[#C75D3B] transition-all duration-300 text-base group"
                                >
                                    <div className="p-2 rounded-full bg-white border border-[#E8C4B0] group-hover:bg-[#C75D3B]/10 group-hover:border-[#C75D3B] transition-all duration-300">
                                        <MessageCircle className="w-4 h-4 text-[#C75D3B]" />
                                    </div>
                                    <span style={{ letterSpacing: '0.01em' }}>(11) 99999-9999</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href="mailto:contato@studio30closet.com.br"
                                    className="flex items-center gap-3 text-[#4A3B32]/70 hover:text-[#C75D3B] transition-all duration-300 text-base group"
                                >
                                    <div className="p-2 rounded-full bg-white border border-[#E8C4B0] group-hover:bg-[#C75D3B]/10 group-hover:border-[#C75D3B] transition-all duration-300">
                                        <Mail className="w-4 h-4 text-[#C75D3B]" />
                                    </div>
                                    <span className="text-sm" style={{ letterSpacing: '0.01em' }}>contato@studio30closet.com.br</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://instagram.com/studio30closet"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-[#4A3B32]/70 hover:text-[#C75D3B] transition-all duration-300 text-base group"
                                >
                                    <div className="p-2 rounded-full bg-white border border-[#E8C4B0] group-hover:bg-[#C75D3B]/10 group-hover:border-[#C75D3B] transition-all duration-300">
                                        <Instagram className="w-4 h-4 text-[#C75D3B]" />
                                    </div>
                                    <span style={{ letterSpacing: '0.01em' }}>@studio30closet</span>
                                </a>
                            </li>
                            <li className="flex items-start gap-3 text-[#4A3B32]/70 text-base">
                                <div className="p-2 rounded-full bg-white border border-[#E8C4B0]">
                                    <MapPin className="w-4 h-4 text-[#C75D3B]" />
                                </div>
                                <span style={{ letterSpacing: '0.01em' }}>São Paulo, SP</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Accent line separator */}
            <div className="w-full h-px bg-[#E8C4B0]" />

            {/* Bottom Bar */}
            <div className="relative z-10">
                <div className="container-custom py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                        <p className="text-[#4A3B32]/50 text-sm" style={{ letterSpacing: '0.02em' }}>
                            © {currentYear} Studio 30 Closet
                        </p>
                        <span className="hidden sm:inline text-[#4A3B32]/30">•</span>
                        <p className="text-[#4A3B32]/50 text-sm" style={{ letterSpacing: '0.02em' }}>
                            Todos os direitos reservados
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-[#4A3B32]/40 text-xs tracking-wider uppercase">Siga-nos</span>
                        <div className="flex items-center gap-3">
                            <a
                                href="https://instagram.com/studio30closet"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-full bg-white border border-[#E8C4B0] hover:bg-[#C75D3B] hover:border-[#C75D3B] transition-all duration-500 hover:scale-110 group"
                            >
                                <Instagram className="w-4 h-4 text-[#C75D3B] group-hover:text-white transition-colors duration-500" />
                            </a>
                            <a
                                href="https://wa.me/5511999999999"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-full bg-white border border-[#E8C4B0] hover:bg-[#C75D3B] hover:border-[#C75D3B] transition-all duration-500 hover:scale-110 group"
                            >
                                <MessageCircle className="w-4 h-4 text-[#C75D3B] group-hover:text-white transition-colors duration-500" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
