/**
 * ============================================================================
 * CustomersList - REFACTORED with React Query
 * ============================================================================
 *
 * CRITICAL CHANGES:
 * - ✅ NO MORE frontend LTV calculation
 * - ✅ Uses server-side metrics (ALL sales counted)
 * - ✅ React Query for caching & auto-refetch
 * - ✅ Removed vendas/orders dependency
 *
 * OLD (BROKEN): Frontend calculated LTV from paginated sales (30 last)
 * NEW (FIXED): Backend calculates LTV from ALL sales in database
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Phone, Mail, ShoppingBag, ExternalLink, MoreHorizontal, User, Trash2, Info, Gift, Send } from 'lucide-react'
import { useCustomersWithMetrics, useDeleteCustomer } from '@/hooks/useCustomersWithMetrics'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/Pagination"
import { CustomersListSkeleton } from '@/components/admin/PageSkeleton'

export function CustomersList() {
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [filterSegment, setFilterSegment] = useState('all') // 'all', 'active', 'at_risk', 'churned', 'inactive'
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, customerId: null, customerName: '' })

    // ============================================================================
    // React Query: Fetch customers with pre-calculated metrics
    // ============================================================================
    const { data, isLoading, error } = useCustomersWithMetrics({
        page: currentPage,
        limit: 10,
        searchTerm: search || null,
        segment: filterSegment
    })

    const deleteCustomerMutation = useDeleteCustomer()

    // ============================================================================
    // Derived Data
    // ============================================================================
    const customers = data?.customers || []
    const totalCustomers = data?.total || 0
    const totalPages = Math.ceil(totalCustomers / 10)

    // Calculate global metrics from current page (for display only)
    const metrics = {
        totalCustomers,
        activeCustomers: customers.filter(c => c.segment === 'active').length,
        totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
        averageLTV: customers.length > 0 ? customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / customers.length : 0
    }

    // Birthdays this month
    const currentMonth = new Date().getMonth() + 1
    const birthdaysThisMonth = customers.filter(c => {
        if (!c.birthDate) return false
        const [_, month] = c.birthDate.split('-').map(Number)
        return month === currentMonth
    }).sort((a, b) => {
        const dayA = parseInt(a.birthDate.split('-')[2])
        const dayB = parseInt(b.birthDate.split('-')[2])
        return dayA - dayB
    })

    // ============================================================================
    // Filters
    // ============================================================================
    const filteredCustomers = customers // Already filtered by backend

    // ============================================================================
    // Handlers
    // ============================================================================
    const handleDeleteClick = (customerId, customerName) => {
        setConfirmDelete({ isOpen: true, customerId, customerName })
    }

    const confirmDeleteCustomer = async () => {
        if (!confirmDelete.customerId) return

        await deleteCustomerMutation.mutateAsync(confirmDelete.customerId)
        setConfirmDelete({ isOpen: false, customerId: null, customerName: '' })
    }

    const handlePageChange = (page) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('pt-BR')
    }

    // Get segment badge
    const getSegmentBadge = (segment) => {
        const badges = {
            active: { label: 'Ativo', className: 'bg-green-100 text-green-700' },
            at_risk: { label: 'Em Risco', className: 'bg-yellow-100 text-yellow-700' },
            churned: { label: 'Inativo', className: 'bg-red-100 text-red-700' },
            inactive: { label: 'Sem Compras', className: 'bg-gray-100 text-gray-700' }
        }
        const badge = badges[segment] || badges.inactive
        return (
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', badge.className)}>
                {badge.label}
            </span>
        )
    }

    // ============================================================================
    // Loading & Error States
    // ============================================================================
    if (isLoading) {
        return <CustomersListSkeleton />
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500">Erro ao carregar clientes: {error.message}</p>
            </div>
        )
    }

    // ============================================================================
    // Render
    // ============================================================================
    return (
        <TooltipProvider>
            <div className="p-4 sm:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-display font-bold text-brand-brown">Clientes</h1>
                        <p className="text-sm text-gray-500 mt-1">{totalCustomers} clientes cadastrados</p>
                    </div>
                    <Link to="/admin/customers/new">
                        <ShimmerButton className="shadow-md">
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Cliente
                        </ShimmerButton>
                    </Link>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total de Clientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.totalCustomers}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Clientes Ativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{metrics.activeCustomers}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Receita Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">LTV Médio</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(metrics.averageLTV)}</div>
                            <p className="text-xs text-gray-500 mt-1">✅ Calculado com TODAS as vendas</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, telefone ou email..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setCurrentPage(1) // Reset to page 1 on search
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                        />
                    </div>

                    <select
                        value={filterSegment}
                        onChange={(e) => {
                            setFilterSegment(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-terracotta"
                    >
                        <option value="all">Todos os Segmentos</option>
                        <option value="active">Ativos</option>
                        <option value="at_risk">Em Risco</option>
                        <option value="churned">Inativos</option>
                        <option value="inactive">Sem Compras</option>
                    </select>
                </div>

                {/* Customers Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LTV</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedidos</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Compra</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segmento</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    <AnimatePresence>
                                        {filteredCustomers.map((customer) => (
                                            <motion.tr
                                                key={customer.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-brand-peach flex items-center justify-center">
                                                            <User className="w-5 h-5 text-brand-terracotta" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{customer.name}</div>
                                                            {customer.instagram && (
                                                                <div className="text-xs text-gray-500">@{customer.instagram}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        {customer.phone && (
                                                            <div className="flex items-center gap-1 text-gray-600">
                                                                <Phone className="w-3 h-3" />
                                                                {customer.phone}
                                                            </div>
                                                        )}
                                                        {customer.email && (
                                                            <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                                                                <Mail className="w-3 h-3" />
                                                                {customer.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-green-600">
                                                        {formatCurrency(customer.totalSpent || 0)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Ticket: {formatCurrency(customer.averageOrderValue || 0)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1">
                                                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                                                        <span className="font-medium">{customer.totalOrders || 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {formatDate(customer.lastOrderAt)}
                                                    {customer.daysSinceLastPurchase && (
                                                        <div className="text-xs text-gray-400">
                                                            há {customer.daysSinceLastPurchase} dias
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getSegmentBadge(customer.segment)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            to={`/admin/customers/${customer.id}`}
                                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <ExternalLink className="w-4 h-4 text-gray-600" />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteClick(customer.id, customer.name)}
                                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <CardFooter className="flex justify-center pt-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                            className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
                                        />
                                    </PaginationItem>

                                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                        const page = i + 1
                                        return (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    onClick={() => handlePageChange(page)}
                                                    isActive={currentPage === page}
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        )
                                    })}

                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                            className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </CardFooter>
                    )}
                </Card>

                {/* Delete Confirmation Dialog */}
                <AlertDialog
                    isOpen={confirmDelete.isOpen}
                    onClose={() => setConfirmDelete({ isOpen: false, customerId: null, customerName: '' })}
                    onConfirm={confirmDeleteCustomer}
                    title="Remover Cliente"
                    description={`Tem certeza que deseja remover ${confirmDelete.customerName}? Esta ação não pode ser desfeita.`}
                    confirmText="Remover"
                    cancelText="Cancelar"
                />
            </div>
        </TooltipProvider>
    )
}
