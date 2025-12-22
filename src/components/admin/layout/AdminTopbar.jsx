import { useAuthStore } from '@/store/auth-store'
import { User, LogOut, Menu } from 'lucide-react'
import { motion } from 'framer-motion'

export function AdminTopbar({ onMenuClick }) {
    const { user, logout } = useAuthStore()

    return (
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-30">
            <div className="flex items-center justify-between gap-4">
                {/* Mobile Menu Button + Title */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
                    >
                        <Menu className="w-6 h-6 text-[#4A3B32]" />
                    </button>

                    <div className="hidden sm:block">
                        <h1 className="text-lg md:text-xl font-display font-semibold text-[#4A3B32]">
                            Studio 30 Closet
                        </h1>
                        <p className="text-xs md:text-sm text-[#4A3B32]/60">
                            Painel de gerenciamento
                        </p>
                    </div>

                    {/* Mobile Logo */}
                    <div className="sm:hidden">
                        <img src="/logomarca.PNG" alt="Studio 30" className="h-8 object-contain" />
                    </div>
                </div>

                {/* User Actions */}
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Desktop User Info */}
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#FDF0ED] rounded-xl">
                        <div className="w-8 h-8 bg-[#C75D3B] rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-[#4A3B32]">{user?.name || 'Admin'}</p>
                            <p className="text-xs text-[#4A3B32]/60">{user?.username}</p>
                        </div>
                    </div>

                    {/* Mobile User Avatar */}
                    <div className="md:hidden w-10 h-10 bg-[#C75D3B] rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>

                    {/* Logout Button */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={logout}
                        className="p-2 md:p-2.5 text-[#4A3B32]/60 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Sair"
                    >
                        <LogOut className="w-5 h-5" />
                    </motion.button>
                </div>
            </div>
        </header>
    )
}
