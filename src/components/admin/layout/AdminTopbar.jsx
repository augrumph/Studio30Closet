import {
    Menu,
    Search,
    Bell,
    User,
    ChevronDown,
    ShoppingBag,
    Settings,
    LogOut,
    Store,
    ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function AdminTopbar({ onMenuClick, isSidebarOpen }) {
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#4A3B32]/5 h-20 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2.5 rounded-xl hover:bg-[#4A3B32]/5 transition-colors"
                >
                    <Menu className="w-5 h-5 text-[#4A3B32]" />
                </button>

                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#FDF0ED] rounded-lg border border-[#C75D3B]/10">
                    <div className="w-2 h-2 rounded-full bg-[#C75D3B] animate-pulse" />
                    <span className="text-[10px] font-black text-[#C75D3B] uppercase tracking-wider">Modo Admin</span>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <a
                    href="/"
                    target="_blank"
                    className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#4A3B32]/60 hover:text-[#C75D3B] transition-colors"
                >
                    <Store className="w-4 h-4" />
                    Ver Loja
                </a>

                <div className="h-8 w-px bg-[#4A3B32]/10 hidden sm:block" />

                <button className="relative p-2.5 rounded-xl hover:bg-[#4A3B32]/5 transition-colors group">
                    <Bell className="w-5 h-5 text-[#4A3B32]/60 group-hover:text-[#4A3B32]" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[#C75D3B] rounded-full border-2 border-white" />
                </button>

                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-[#4A3B32]/5 transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-[#4A3B32] flex items-center justify-center text-white font-bold shadow-lg shadow-[#4A3B32]/10">
                            A
                        </div>
                        <div className="hidden lg:block text-left">
                            <p className="text-sm font-bold text-[#4A3B32]">Augusto</p>
                            <p className="text-[10px] text-[#4A3B32]/40 font-black uppercase tracking-wider">Proprietário</p>
                        </div>
                        <ChevronDown className={cn(
                            "w-4 h-4 text-gray-400 transition-transform duration-300",
                            isProfileOpen && "rotate-180"
                        )} />
                    </button>

                    <AnimatePresence>
                        {isProfileOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsProfileOpen(false)}
                                    className="fixed inset-0 z-10"
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl shadow-[#4A3B32]/10 border border-[#4A3B32]/5 overflow-hidden z-20 p-2"
                                >
                                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-[#4A3B32] hover:bg-[#FDF0ED] hover:text-[#C75D3B] rounded-xl transition-all">
                                        <Settings className="w-4 h-4" />
                                        Configurações
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                        <LogOut className="w-4 h-4" />
                                        Sair do Painel
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    )
}
