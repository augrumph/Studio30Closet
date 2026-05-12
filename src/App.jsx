import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout'
import { ScrollToTop } from '@/components/ScrollToTop'
import { ToastProvider } from '@/contexts/ToastContext'
import { SiteImagesProvider } from '@/contexts/SiteImagesContext'
import { LoadingBar } from '@/components/LoadingBar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AnimatePresence } from 'framer-motion'
import { ProtectedRoute } from '@/components/admin/ProtectedRoute'
import { trackPageView } from '@/lib/api/analytics'
import { SEO } from '@/components/SEO'
import { VersionCheck } from '@/components/VersionCheck'
import { useAdminRealtime } from '@/hooks/useAdminRealtime'

function AnalyticsTracker() {
    const location = useLocation()
    useEffect(() => {
        if (!location.pathname.startsWith('/admin')) {
            trackPageView(location.pathname)
        }
    }, [location.pathname])
    return null
}

function AdminRealtimeBridge() {
    const location = useLocation()
    useAdminRealtime(location.pathname.startsWith('/admin'))
    return null
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            cacheTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})

import { Home } from '@/pages/Home'
import { lazyWithRetry } from '@/utils/lazyRetry'

const Catalog = lazyWithRetry(() => import('@/pages').then(module => ({ default: module.Catalog })))
const HowItWorks = lazyWithRetry(() => import('@/pages').then(module => ({ default: module.HowItWorks })))
const About = lazyWithRetry(() => import('@/pages').then(module => ({ default: module.About })))
const Checkout = lazyWithRetry(() => import('@/pages').then(module => ({ default: module.Checkout })))
const StoreOrderStatus = lazyWithRetry(() => import('@/pages').then(module => ({ default: module.StoreOrderStatus })))
const PrivacyPolicy = lazyWithRetry(() => import('@/pages').then(module => ({ default: module.PrivacyPolicy })))
const TermsOfService = lazyWithRetry(() => import('@/pages').then(module => ({ default: module.TermsOfService })))

const AdminLayout = lazyWithRetry(() => import('@/components/admin/layout/AdminLayout').then(module => ({ default: module.AdminLayout })))
const AdminLogin = lazyWithRetry(() => import('@/pages/admin/AdminLogin').then(module => ({ default: module.AdminLogin })))
const Dashboard = lazyWithRetry(() => import('@/pages/admin/Dashboard').then(module => ({ default: module.Dashboard })))

const ProductsList = lazyWithRetry(() => import('@/pages/admin/ProductsList').then(module => ({ default: module.ProductsList })))
const ProductsForm = lazyWithRetry(() => import('@/pages/admin/ProductsForm').then(module => ({ default: module.ProductsForm })))
const MalinhasList = lazyWithRetry(() => import('@/pages/admin/MalinhasList').then(module => ({ default: module.MalinhasList })))
const MalinhasDetail = lazyWithRetry(() => import('@/pages/admin/MalinhasDetail').then(module => ({ default: module.MalinhasDetail })))
const MalinhasForm = lazyWithRetry(() => import('@/pages/admin/MalinhasForm').then(module => ({ default: module.MalinhasForm })))
const CustomersList = lazyWithRetry(() => import('@/pages/admin/CustomersList').then(module => ({ default: module.CustomersList })))
const CustomersForm = lazyWithRetry(() => import('@/pages/admin/CustomersForm').then(module => ({ default: module.CustomersForm })))
const CustomersDetail = lazyWithRetry(() => import('@/pages/admin/CustomersDetail').then(module => ({ default: module.CustomersDetail })))
const VendasList = lazyWithRetry(() => import('@/pages/admin/VendasList').then(module => ({ default: module.VendasList })))
const VendasForm = lazyWithRetry(() => import('@/pages/admin/VendasForm').then(module => ({ default: module.VendasForm })))
const OnlineOrdersList = lazyWithRetry(() => import('@/pages').then(module => ({ default: module.OnlineOrdersList })))
const OnlineOrderDetail = lazyWithRetry(() => import('@/pages/admin/OnlineOrderDetail').then(module => ({ default: module.OnlineOrderDetail })))
const StockDashboard = lazyWithRetry(() => import('@/pages/admin/StockDashboard').then(module => ({ default: module.StockDashboard })))
const SuppliersList = lazyWithRetry(() => import('@/pages/admin/SuppliersList').then(module => ({ default: module.SuppliersList })))
const SuppliersForm = lazyWithRetry(() => import('@/pages/admin/SuppliersForm').then(module => ({ default: module.SuppliersForm })))
const PurchasesList = lazyWithRetry(() => import('@/pages/admin/PurchasesList').then(module => ({ default: module.PurchasesList })))
const PurchasesForm = lazyWithRetry(() => import('@/pages/admin/PurchasesForm').then(module => ({ default: module.PurchasesForm })))
const InstallmentsList = lazyWithRetry(() => import('@/pages/admin/InstallmentsList').then(module => ({ default: module.InstallmentsList })))
const ExpensesList = lazyWithRetry(() => import('@/pages/admin/ExpensesList').then(module => ({ default: module.ExpensesList })))
const ExpensesForm = lazyWithRetry(() => import('@/pages/admin/ExpensesForm').then(module => ({ default: module.ExpensesForm })))
const EntregasList = lazyWithRetry(() => import('@/pages/admin/EntregasList').then(module => ({ default: module.EntregasList })))
const SiteAnalytics = lazyWithRetry(() => import('@/pages/admin/SiteAnalytics').then(module => ({ default: module.SiteAnalytics })))
const LogisticsFiscal = lazyWithRetry(() => import('@/pages').then(module => ({ default: module.LogisticsFiscal })))
const CollectionDetail = lazyWithRetry(() => import('@/pages/admin/CollectionDetail').then(module => ({ default: module.CollectionDetail })))

function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm font-medium animate-pulse">Carregando...</p>
            </div>
        </div>
    )
}

function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ToastProvider>
                    <SiteImagesProvider>
                        <BrowserRouter>
                            <LoadingBar />
                            <ScrollToTop />
                            <AnalyticsTracker />
                            <AdminRealtimeBridge />
                            <VersionCheck />
                            <SEO />
                            <AnimatePresence mode="wait">
                                <Suspense fallback={<PageLoader />}>
                                    <Routes>
                                        <Route path="/" element={<Layout />}>
                                            <Route index element={<Home />} />
                                            <Route path="catalogo" element={<Catalog />} />
                                            <Route path="como-funciona" element={<HowItWorks />} />
                                            <Route path="sobre" element={<About />} />
                                            <Route path="malinha" element={<Checkout />} />
                                            <Route path="pedido/:id" element={<StoreOrderStatus />} />
                                            <Route path="politica-de-privacidade" element={<PrivacyPolicy />} />
                                            <Route path="termos-de-servico" element={<TermsOfService />} />
                                        </Route>

                                        <Route path="/admin/login" element={<AdminLogin />} />

                                        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                                            <Route index element={<Navigate to="/admin/dashboard" replace />} />
                                            <Route path="dashboard" element={<Dashboard />} />
                                            <Route path="products" element={<ProductsList />} />
                                            <Route path="products/new" element={<ProductsForm />} />
                                            <Route path="products/:id" element={<ProductsForm />} />
                                            <Route path="collections/:collectionId" element={<CollectionDetail />} />
                                            <Route path="malinhas" element={<MalinhasList />} />
                                            <Route path="malinhas/new" element={<MalinhasForm />} />
                                            <Route path="malinhas/:id/edit" element={<MalinhasForm />} />
                                            <Route path="malinhas/:id" element={<MalinhasDetail />} />
                                            <Route path="vendas" element={<VendasList />} />
                                            <Route path="vendas/new" element={<VendasForm />} />
                                            <Route path="vendas/:id" element={<VendasForm />} />
                                            <Route path="pedidos-online" element={<OnlineOrdersList />} />
                                            <Route path="pedidos-online/:id" element={<OnlineOrderDetail />} />
                                            <Route path="entregas" element={<EntregasList />} />
                                            <Route path="customers" element={<CustomersList />} />
                                            <Route path="customers/new" element={<CustomersForm />} />
                                            <Route path="customers/:id" element={<CustomersDetail />} />
                                            <Route path="customers/:id/edit" element={<CustomersForm />} />
                                            <Route path="stock" element={<StockDashboard />} />
                                            <Route path="suppliers" element={<SuppliersList />} />
                                            <Route path="suppliers/new" element={<SuppliersForm />} />
                                            <Route path="suppliers/:id" element={<SuppliersForm />} />
                                            <Route path="purchases" element={<PurchasesList />} />
                                            <Route path="purchases/new" element={<PurchasesForm />} />
                                            <Route path="purchases/:id" element={<PurchasesForm />} />
                                            <Route path="installments" element={<InstallmentsList />} />
                                            <Route path="expenses" element={<ExpensesList />} />
                                            <Route path="expenses/new" element={<ExpensesForm />} />
                                            <Route path="expenses/:id" element={<ExpensesForm />} />
                                            <Route path="site" element={<SiteAnalytics />} />
                                            <Route path="integrations" element={<LogisticsFiscal />} />
                                            <Route path="integracoes" element={<LogisticsFiscal />} />
                                            <Route path="logistica-fiscal" element={<LogisticsFiscal />} />
                                        </Route>
                                    </Routes>
                                </Suspense>
                            </AnimatePresence>
                        </BrowserRouter>
                    </SiteImagesProvider>
                </ToastProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    )
}

export default App
