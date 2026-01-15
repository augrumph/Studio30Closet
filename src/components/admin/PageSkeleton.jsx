import { motion } from 'framer-motion'

/**
 * Skeleton base component with shimmer animation
 */
function SkeletonPulse({ className }) {
    return (
        <div className={`relative overflow-hidden bg-gray-200 ${className}`}>
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                animate={{
                    x: ['-100%', '100%'],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                }}
            />
        </div>
    )
}

/**
 * Single KPI Card Skeleton
 */
export function KPISkeletonCard() {
    return (
        <div className="bg-white border rounded-2xl p-4 h-full space-y-3">
            <div className="flex justify-between items-center">
                <SkeletonPulse className="h-8 w-8 rounded-lg" />
                <SkeletonPulse className="h-4 w-16 opacity-50" />
            </div>
            <div className="space-y-2 pt-2">
                <SkeletonPulse className="h-8 w-24 rounded-lg" />
                <SkeletonPulse className="h-3 w-12 opacity-50" />
            </div>
        </div>
    )
}

/**
 * Dashboard Skeleton
 */
export function DashboardSkeleton() {
    return (
        <div className="space-y-4 max-w-[1600px] mx-auto">
            {/* Hero */}
            <SkeletonPulse className="rounded-2xl h-28" />

            {/* KPIs - 6 cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => (
                    <SkeletonPulse key={i} className="rounded-xl h-24" />
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <SkeletonPulse className="lg:col-span-8 rounded-2xl h-48" />
                <div className="lg:col-span-4 space-y-4">
                    <SkeletonPulse className="rounded-2xl h-36" />
                    <SkeletonPulse className="rounded-2xl h-28" />
                </div>
            </div>
        </div>
    )
}

/**
 * Table/List Page Skeleton
 */
export function TableSkeleton({ columns = 5, rows = 8 }) {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <SkeletonPulse className="h-8 w-48 rounded-lg" />
                <SkeletonPulse className="h-10 w-32 rounded-lg" />
            </div>

            {/* Search/Filters */}
            <div className="flex gap-3">
                <SkeletonPulse className="h-10 flex-1 max-w-md rounded-lg" />
                <SkeletonPulse className="h-10 w-28 rounded-lg" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                {/* Table Header */}
                <div className="flex items-center h-12 bg-gray-50 border-b px-4 gap-4">
                    {[...Array(columns)].map((_, i) => (
                        <SkeletonPulse key={i} className="h-4 rounded flex-1" />
                    ))}
                </div>

                {/* Table Rows */}
                {[...Array(rows)].map((_, i) => (
                    <div key={i} className="flex items-center h-16 border-b border-gray-50 px-4 gap-4">
                        <SkeletonPulse className="w-10 h-10 rounded-full flex-shrink-0" />
                        {[...Array(columns - 1)].map((_, j) => (
                            <SkeletonPulse key={j} className="h-4 rounded flex-1" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Form Page Skeleton
 */
export function FormSkeleton({ fields = 6 }) {
    return (
        <div className="space-y-6 max-w-2xl">
            {/* Title */}
            <SkeletonPulse className="h-8 w-56 rounded-lg" />

            {/* Form Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-5">
                {[...Array(fields)].map((_, i) => (
                    <div key={i} className="space-y-2">
                        <SkeletonPulse className="h-4 w-24 rounded" />
                        <SkeletonPulse className="h-11 rounded-lg" />
                    </div>
                ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
                <SkeletonPulse className="h-11 w-36 rounded-lg" />
                <SkeletonPulse className="h-11 w-28 rounded-lg" />
            </div>
        </div>
    )
}

/**
 * Products List Skeleton
 */
export function ProductsListSkeleton() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <SkeletonPulse className="h-8 w-32 rounded-lg" />
                <SkeletonPulse className="h-10 w-36 rounded-lg" />
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <SkeletonPulse className="h-10 flex-1 max-w-sm rounded-lg" />
                <SkeletonPulse className="h-10 w-32 rounded-lg" />
                <SkeletonPulse className="h-10 w-32 rounded-lg" />
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100">
                        <SkeletonPulse className="aspect-square" />
                        <div className="p-3 space-y-2">
                            <SkeletonPulse className="h-4 w-3/4 rounded" />
                            <SkeletonPulse className="h-5 w-1/2 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Customers List Skeleton
 */
export function CustomersListSkeleton() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <SkeletonPulse className="h-8 w-32 rounded-lg" />
                <SkeletonPulse className="h-10 w-36 rounded-lg" />
            </div>

            {/* Search */}
            <SkeletonPulse className="h-10 max-w-md rounded-lg" />

            {/* Customer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
                        <div className="flex items-center gap-3">
                            <SkeletonPulse className="w-12 h-12 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <SkeletonPulse className="h-4 w-3/4 rounded" />
                                <SkeletonPulse className="h-3 w-1/2 rounded" />
                            </div>
                        </div>
                        <SkeletonPulse className="h-8 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Sales (Vendas) List Skeleton
 */
export function VendasListSkeleton() {
    return <TableSkeleton columns={6} rows={10} />
}

/**
 * Malinhas List Skeleton
 */
export function MalinhasListSkeleton() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <SkeletonPulse className="h-8 w-32 rounded-lg" />
                <SkeletonPulse className="h-10 w-36 rounded-lg" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                    <SkeletonPulse key={i} className="h-10 w-24 rounded-lg" />
                ))}
            </div>

            {/* Malinha Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
                        <div className="flex justify-between">
                            <SkeletonPulse className="h-5 w-20 rounded" />
                            <SkeletonPulse className="h-6 w-24 rounded-full" />
                        </div>
                        <SkeletonPulse className="h-4 w-3/4 rounded" />
                        <div className="flex gap-2">
                            {[...Array(3)].map((_, j) => (
                                <SkeletonPulse key={j} className="w-10 h-10 rounded" />
                            ))}
                        </div>
                        <SkeletonPulse className="h-9 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Site Analytics Skeleton
 */
export function SiteAnalyticsSkeleton() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <SkeletonPulse className="h-10 w-64 rounded-lg" />
                    <SkeletonPulse className="h-4 w-48 rounded opacity-60" />
                </div>
                <SkeletonPulse className="h-12 w-12 rounded-xl" />
            </div>

            {/* Date Range Buttons */}
            <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                    <SkeletonPulse key={i} className="h-10 w-24 rounded-xl" />
                ))}
            </div>

            {/* First Row KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[...Array(4)].map((_, i) => (
                    <SkeletonPulse key={i} className="rounded-2xl h-32" />
                ))}
            </div>

            {/* Second Row KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[...Array(4)].map((_, i) => (
                    <SkeletonPulse key={i} className="rounded-2xl h-32" />
                ))}
            </div>

            {/* Two Column Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-white rounded-2xl p-6 space-y-4">
                    <SkeletonPulse className="h-6 w-48 rounded" />
                    {[...Array(5)].map((_, i) => (
                        <SkeletonPulse key={i} className="h-12 rounded-xl" />
                    ))}
                </div>
                <div className="bg-white rounded-2xl p-6 space-y-4">
                    <SkeletonPulse className="h-6 w-48 rounded" />
                    {[...Array(5)].map((_, i) => (
                        <SkeletonPulse key={i} className="h-12 rounded-xl" />
                    ))}
                </div>
            </div>

            {/* Abandoned Carts Section */}
            <div className="bg-white rounded-2xl p-6 space-y-4">
                <SkeletonPulse className="h-6 w-56 rounded" />
                {[...Array(3)].map((_, i) => (
                    <SkeletonPulse key={i} className="h-24 rounded-xl" />
                ))}
            </div>
        </div>
    )
}

/**
 * Stock Dashboard Skeleton
 */
export function StockDashboardSkeleton() {
    return (
        <div className="space-y-8 pb-20">
            {/* Header KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <SkeletonPulse key={i} className="rounded-2xl h-32" />
                ))}
            </div>

            {/* Action Cards (Restock & Dead Stock) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <SkeletonPulse className="rounded-2xl h-64" />
                <SkeletonPulse className="rounded-2xl h-64" />
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {[...Array(3)].map((_, i) => (
                    <SkeletonPulse key={i} className="rounded-2xl h-48" />
                ))}
            </div>
        </div>
    )
}

/**
 * Generic Page Skeleton (fallback)
 */
export function PageSkeleton({ variant = 'default' }) {
    const skeletons = {
        dashboard: <DashboardSkeleton />,
        stock: <StockDashboardSkeleton />,
        site: <SiteAnalyticsSkeleton />,
        products: <ProductsListSkeleton />,
        customers: <CustomersListSkeleton />,
        vendas: <VendasListSkeleton />,
        malinhas: <MalinhasListSkeleton />,
        list: <TableSkeleton />,
        form: <FormSkeleton />,
        default: <TableSkeleton columns={4} rows={6} />
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            {skeletons[variant] || skeletons.default}
        </motion.div>
    )
}
