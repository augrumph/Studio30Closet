/**
 * ============================================================================
 * CustomersList - REDESIGNED FROM SCRATCH
 * ============================================================================
 *
 * Focado 100% nas necessidades do LOJISTA:
 * - Cards visuais limpos e profissionais
 * - Ações rápidas (WhatsApp, Histórico)
 * - Filtros inteligentes
 * - Métricas acionáveis
 * - Paleta de cores harmonizada com o Dashboard
 * - Hierarquia visual perfeita
 */

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Plus, Search, MessageCircle, ShoppingBag, TrendingUp,
    Star, AlertCircle, Phone, Mail, ExternalLink,
    Users, Award, Cake
} from 'lucide-react'
import { useAdminCustomers, useAdminCustomersMutations } from '@/hooks/useAdminCustomers'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { CustomersListSkeleton } from '@/components/admin/PageSkeleton'

export function CustomersList() {
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(searchInput, 400)
    const [currentPage, setCurrentPage] = useState(1)



    useEffect(() => {
        setSearch(debouncedSearch)
    }, [debouncedSearch])
    const [activeFilter, setActiveFilter] = useState('all')
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    // ============================================================================
    // React Query: Fetch customers
    // ============================================================================
    const {
        customers,
        total,
        totalPages,
        isLoading,
        isError,
        error
    } = useAdminCustomers(currentPage, 50, search || '', activeFilter === 'all' ? 'all' : activeFilter)

    const { deleteCustomer } = useAdminCustomersMutations()

    const totalCustomers = total

    // ============================================================================
    // Derived Metrics
    // ============================================================================
    const currentMonth = new Date().getMonth() + 1
    const currentDay = new Date().getDate()

    const metrics = useMemo(() => {
        const vipCustomers = customers.filter(c => {
            const avgLTV = customers.reduce((sum, cust) => sum + (cust.totalSpent || 0), 0) / customers.length
            return (c.totalSpent || 0) > avgLTV * 1.5
        })

        const birthdayCustomers = customers.filter(c => {
            if (!c.birthDate) return false
            const [_, month] = c.birthDate.split('-').map(Number)
            return month === currentMonth
        })

        const birthdayToday = customers.filter(c => {
            if (!c.birthDate) return false
            const [_, month, day] = c.birthDate.split('-').map(Number)
            return month === currentMonth && day === currentDay
        })

        const atRiskCustomers = customers.filter(c => c.segment === 'at_risk')

        return {
            total: totalCustomers,
            vip: vipCustomers.length,
            birthdays: birthdayCustomers.length,
            birthdayToday: birthdayToday.length,
            atRisk: atRiskCustomers.length,
        }
    }, [customers, totalCustomers, currentMonth, currentDay])

    // ============================================================================
    // Helpers
    // ============================================================================
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const getDaysSinceLastPurchase = (lastOrderAt) => {
        if (!lastOrderAt) return null
        const days = Math.floor((Date.now() - new Date(lastOrderAt)) / (1000 * 60 * 60 * 24))
        return days
    }

    const isBirthdayToday = (birthDate) => {
        if (!birthDate) return false
        const [_, month, day] = birthDate.split('-').map(Number)
        return month === currentMonth && day === currentDay
    }

    const isBirthdayThisMonth = (birthDate) => {
        if (!birthDate) return false
        const [_, month] = birthDate.split('-').map(Number)
        return month === currentMonth
    }

    const isVIP = (customer) => {
        const avgLTV = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / customers.length
        return (customer.totalSpent || 0) > avgLTV * 1.5
    }

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const openWhatsApp = (phone, name) => {
        const cleanPhone = phone.replace(/\D/g, '')
        const message = `Olá ${name}! Tudo bem?`
        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    // ============================================================================
    // Filter Tabs
    // ============================================================================
    const filters = [
        { id: 'all', label: 'Todos', icon: Users, count: metrics.total },
        { id: 'active', label: 'Ativos', icon: TrendingUp, count: customers.filter(c => c.segment === 'active').length },
        { id: 'vip', label: 'VIP', icon: Award, count: metrics.vip },
        { id: 'birthdays', label: 'Aniversariantes', icon: Cake, count: metrics.birthdays },
        { id: 'at_risk', label: 'Em Risco', icon: AlertCircle, count: metrics.atRisk },
    ]

    // ============================================================================
    // Filtered Customers
    // ============================================================================
    const filteredCustomers = useMemo(() => {
        let filtered = customers

        if (activeFilter === 'vip') {
            filtered = filtered.filter(c => isVIP(c))
        } else if (activeFilter === 'birthdays') {
            filtered = filtered.filter(c => isBirthdayThisMonth(c.birthDate))
        } else if (activeFilter !== 'all') {
            filtered = filtered.filter(c => c.segment === activeFilter)
        }

        return filtered
    }, [customers, activeFilter])

    // ============================================================================
    // Loading State
    // ============================================================================
    const handleDeleteCustomer = async () => {
        if (!selectedCustomer) return
        try {
            await deleteCustomer(selectedCustomer.id)
            toast.success('Cliente removido')
            setSelectedCustomer(null)
        } catch (error) {
            toast.error('Erro ao remover cliente')
        }
    }

    if (isLoading && !customers) {
        return <CustomersListSkeleton />
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-red-500 font-bold mb-2">Erro ao carregar clientes</p>
                <p className="text-sm text-gray-400">{error?.message}</p>
            </div>
        )
    }

    // ============================================================================
    // Render
    // ============================================================================
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
            {/* ========== HEADER ========== */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
            >
                <div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-[#4A3B32]">
                        Meus Clientes
                    </h1>
                    <p className="text-sm md:text-base text-[#4A3B32]/60 mt-1">Gerencie sua base de clientes</p>
                </div>
                <Link to="/admin/customers/new">
                    <ShimmerButton
                        className="shadow-lg h-12 px-6"
                        background="linear-gradient(135deg, #C75D3B 0%, #A64D31 100%)"
                    >
                        <Plus className="mr-2 h-5 w-5" />
                        Novo Cliente
                    </ShimmerButton>
                </Link>
            </motion.div>

            {/* ========== METRICS CARDS ========== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Total de Clientes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-[#4A3B32] to-[#5A4B42] h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <Users className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">{metrics.total}</span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Total de Clientes</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Clientes VIP */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-amber-500 to-amber-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <Award className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">{metrics.vip}</span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Clientes VIP</p>
                            <p className="text-xs text-white/70 mt-1">Top gastadores</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Aniversariantes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-[#C75D3B] to-[#A64D31] h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <Cake className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">{metrics.birthdays}</span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Aniversariantes</p>
                            {metrics.birthdayToday > 0 ? (
                                <p className="text-xs text-white/90 mt-1 font-bold">🎉 {metrics.birthdayToday} hoje!</p>
                            ) : (
                                <p className="text-xs text-white/70 mt-1">Este mês</p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Em Risco */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-orange-500 to-orange-600 h-full">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-white/80" />
                                <span className="text-2xl md:text-3xl font-bold text-white">{metrics.atRisk}</span>
                            </div>
                            <p className="text-sm md:text-base text-white/90 font-medium">Em Risco</p>
                            <p className="text-xs text-white/70 mt-1">Sem comprar há 30+ dias</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* ========== SEARCH & FILTERS ========== */}
            <Card className="shadow-lg border-none">
                <CardContent className="p-4 md:p-6 space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, telefone, email, Instagram..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setSearch(searchInput)
                                }
                            }}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl md:rounded-2xl focus:border-[#C75D3B] focus:bg-white transition-all outline-none text-sm"
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {filters.map((filter) => {
                            const Icon = filter.icon
                            const isActive = activeFilter === filter.id
                            return (
                                <button
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex-shrink-0",
                                        isActive
                                            ? "bg-[#C75D3B] text-white shadow-lg"
                                            : "bg-gray-100 text-[#4A3B32] hover:bg-gray-200"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{filter.label}</span>
                                    <span className="sm:hidden">{filter.label.slice(0, 3)}</span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center",
                                        isActive ? "bg-white/20 text-white" : "bg-white text-[#4A3B32]"
                                    )}>
                                        {filter.count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* ========== CUSTOMERS GRID ========== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                    {filteredCustomers.map((customer, index) => {
                        const daysSinceLastPurchase = getDaysSinceLastPurchase(customer.lastOrderAt)
                        const isBdayToday = isBirthdayToday(customer.birthDate)
                        const isBdayMonth = isBirthdayThisMonth(customer.birthDate)
                        const vip = isVIP(customer)

                        return (
                            <motion.div
                                key={customer.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ delay: index * 0.02 }}
                            >
                                <Card className="border border-gray-100 hover:shadow-lg transition-all h-full bg-white rounded-2xl">
                                    <CardContent className="p-6 pt-6 flex flex-col h-full">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A3B32] to-[#5A4B42] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                    {getInitials(customer.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-[#4A3B32] text-base mb-0.5 truncate">
                                                        {customer.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        {customer.instagram && (
                                                            <span className="text-xs text-gray-400 truncate">@{customer.instagram}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                                {vip && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                                                        <Star className="w-3 h-3 fill-amber-500" />
                                                        VIP
                                                    </span>
                                                )}
                                                {isBdayToday && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 text-[10px] font-bold border border-pink-200 animate-pulse">
                                                        <Cake className="w-3 h-3" />
                                                        Hoje!
                                                    </span>
                                                )}
                                                {!isBdayToday && isBdayMonth && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-200">
                                                        <Cake className="w-3 h-3" />
                                                        Niver
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="mb-5">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                                                customer.segment === 'active' && "bg-green-50 text-green-700 border border-green-200",
                                                customer.segment === 'at_risk' && "bg-orange-50 text-orange-700 border border-orange-200",
                                                customer.segment === 'churned' && "bg-red-50 text-red-700 border border-red-200",
                                                customer.segment === 'inactive' && "bg-gray-50 text-gray-700 border border-gray-200"
                                            )}>
                                                <span className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    customer.segment === 'active' && "bg-green-500",
                                                    customer.segment === 'at_risk' && "bg-orange-500",
                                                    customer.segment === 'churned' && "bg-red-500",
                                                    customer.segment === 'inactive' && "bg-gray-400"
                                                )}></span>
                                                {customer.segment === 'active' && 'Ativo'}
                                                {customer.segment === 'at_risk' && 'Em Risco'}
                                                {customer.segment === 'churned' && 'Inativo'}
                                                {customer.segment === 'inactive' && 'Sem Compras'}
                                            </span>
                                        </div>

                                        {/* Divider */}
                                        <div className="border-t border-gray-100 my-5"></div>

                                        {/* Metrics */}
                                        <div className="space-y-3 mb-5 flex-grow">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Total Gasto</span>
                                                <span className="text-lg font-bold text-green-600">
                                                    {formatCurrency(customer.totalSpent || 0)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Total de Pedidos</span>
                                                <span className="text-base font-bold text-[#4A3B32]">
                                                    {customer.totalOrders || 0}
                                                </span>
                                            </div>
                                            {daysSinceLastPurchase !== null && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Última Compra</span>
                                                    <span className={cn(
                                                        "text-sm font-semibold",
                                                        daysSinceLastPurchase > 60 ? "text-red-600" :
                                                            daysSinceLastPurchase > 30 ? "text-orange-600" :
                                                                "text-green-600"
                                                    )}>
                                                        há {daysSinceLastPurchase} dias
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Divider */}
                                        <div className="border-t border-gray-100 my-5"></div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-3 gap-2 mt-auto">
                                            {customer.phone && (
                                                <button
                                                    onClick={() => openWhatsApp(customer.phone, customer.name)}
                                                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors group/btn"
                                                >
                                                    <MessageCircle className="w-5 h-5 text-green-600 group-hover/btn:scale-110 transition-transform" />
                                                    <span className="text-[10px] text-gray-600 font-medium">WhatsApp</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedCustomer(customer)
                                                    setIsDetailOpen(true)
                                                }}
                                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors group/btn"
                                            >
                                                <ShoppingBag className="w-5 h-5 text-[#C75D3B] group-hover/btn:scale-110 transition-transform" />
                                                <span className="text-[10px] text-gray-600 font-medium">Histórico</span>
                                            </button>
                                            <Link
                                                to={`/admin/customers/${customer.id}`}
                                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors group/btn"
                                            >
                                                <ExternalLink className="w-5 h-5 text-blue-600 group-hover/btn:scale-110 transition-transform" />
                                                <span className="text-[10px] text-gray-600 font-medium">Detalhes</span>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-8 pb-8">
                    <nav className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Anterior
                        </button>
                        <span className="text-sm font-medium text-gray-600 px-2">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Próxima
                        </button>
                    </nav>
                </div>
            )}

            {/* Empty State */}
            {filteredCustomers.length === 0 && (
                <Card className="shadow-lg">
                    <CardContent className="p-12 text-center">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-[#4A3B32] mb-2">Nenhum cliente encontrado</h3>
                        <p className="text-gray-500 mb-6">
                            {search ? `Nenhum resultado para "${search}"` : 'Adicione seu primeiro cliente'}
                        </p>
                        {!search && (
                            <Link to="/admin/customers/new">
                                <ShimmerButton background="linear-gradient(135deg, #C75D3B 0%, #A64D31 100%)">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Novo Cliente
                                </ShimmerButton>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ========== CUSTOMER DETAIL MODAL ========== */}
            <AnimatePresence>
                {isDetailOpen && selectedCustomer && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDetailOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
                        />

                        {/* Modal Container - Centralizado */}
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="w-full max-w-lg pointer-events-auto"
                            >
                                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                                    {/* Header com gradiente */}
                                    <div className="relative bg-gradient-to-br from-[#4A3B32] via-[#5A4B42] to-[#4A3B32] p-6 md:p-8 text-white">
                                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#C75D3B]/30 via-[#C75D3B]/10 to-transparent pointer-events-none" />
                                        <button
                                            onClick={() => setIsDetailOpen(false)}
                                            className="absolute top-3 right-3 md:top-4 md:right-4 p-2 rounded-xl hover:bg-white/10 transition-colors z-10"
                                        >
                                            <ExternalLink className="w-5 h-5 rotate-180" />
                                        </button>

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 md:gap-4">
                                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-lg md:text-xl border border-white/20 flex-shrink-0">
                                                    {getInitials(selectedCustomer.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h2 className="text-xl md:text-2xl font-display font-bold mb-1 truncate">
                                                        {selectedCustomer.name}
                                                    </h2>
                                                    {selectedCustomer.instagram && (
                                                        <p className="text-white/70 text-sm truncate">@{selectedCustomer.instagram}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 md:p-8 space-y-6">
                                        {/* Métricas em Grid */}
                                        <div className="grid grid-cols-3 gap-2 md:gap-4">
                                            <div className="text-center p-3 md:p-4 bg-green-50 rounded-xl md:rounded-2xl border border-green-100">
                                                <p className="text-[10px] md:text-xs text-green-700 font-medium mb-0.5 md:mb-1 uppercase tracking-wide">Total</p>
                                                <p className="text-base md:text-xl font-bold text-green-700 leading-tight">
                                                    {formatCurrency(selectedCustomer.totalSpent || 0).replace('R$', '').trim().split(',')[0]}
                                                </p>
                                            </div>
                                            <div className="text-center p-3 md:p-4 bg-blue-50 rounded-xl md:rounded-2xl border border-blue-100">
                                                <p className="text-[10px] md:text-xs text-blue-700 font-medium mb-0.5 md:mb-1 uppercase tracking-wide">Pedidos</p>
                                                <p className="text-base md:text-xl font-bold text-blue-700">
                                                    {selectedCustomer.totalOrders || 0}
                                                </p>
                                            </div>
                                            <div className="text-center p-3 md:p-4 bg-orange-50 rounded-xl md:rounded-2xl border border-orange-100">
                                                <p className="text-[10px] md:text-xs text-orange-700 font-medium mb-0.5 md:mb-1 uppercase tracking-wide">Ticket</p>
                                                <p className="text-base md:text-xl font-bold text-orange-700 leading-tight">
                                                    {formatCurrency(selectedCustomer.averageOrderValue || 0).replace('R$', '').trim().split(',')[0]}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Contato */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs md:text-sm font-bold text-[#4A3B32] uppercase tracking-wide">Informações de Contato</h3>
                                            <div className="space-y-2">
                                                {selectedCustomer.phone && (
                                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        <span className="text-sm text-gray-700">{selectedCustomer.phone}</span>
                                                    </div>
                                                )}
                                                {selectedCustomer.email && (
                                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        <span className="text-sm text-gray-700 truncate">{selectedCustomer.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            {selectedCustomer.phone && (
                                                <button
                                                    onClick={() => {
                                                        openWhatsApp(selectedCustomer.phone, selectedCustomer.name)
                                                        setIsDetailOpen(false)
                                                    }}
                                                    className="flex items-center justify-center gap-2 px-4 md:px-5 py-3 md:py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 text-sm md:text-base"
                                                >
                                                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                                                    <span className="hidden sm:inline">WhatsApp</span>
                                                    <span className="sm:hidden">Zap</span>
                                                </button>
                                            )}
                                            <Link
                                                to={`/admin/customers/${selectedCustomer.id}`}
                                                className="flex items-center justify-center gap-2 px-4 md:px-5 py-3 md:py-3.5 bg-gradient-to-br from-[#C75D3B] to-[#A64D31] hover:from-[#A64D31] hover:to-[#8B3D21] text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 text-sm md:text-base"
                                            >
                                                <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                                                Ver Perfil
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
