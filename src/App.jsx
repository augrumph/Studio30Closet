import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { ScrollToTop } from '@/components/ScrollToTop'
import { ToastProvider } from '@/contexts/ToastContext'
import { LoadingBar } from '@/components/LoadingBar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AnimatePresence } from 'framer-motion'
import { ProtectedRoute } from '@/components/admin/ProtectedRoute'

// Eager load critical public pages
import { Home } from '@/pages'

// Lazy load everything else
const Catalog = lazy(() => import('@/pages').then(module => ({ default: module.Catalog })))
const HowItWorks = lazy(() => import('@/pages').then(module => ({ default: module.HowItWorks })))
const About = lazy(() => import('@/pages').then(module => ({ default: module.About })))
const Checkout = lazy(() => import('@/pages').then(module => ({ default: module.Checkout })))
const PrivacyPolicy = lazy(() => import('@/pages').then(module => ({ default: module.PrivacyPolicy })))
const TermsOfService = lazy(() => import('@/pages').then(module => ({ default: module.TermsOfService })))

// Admin Pages (Lazy Loaded)
const AdminLayout = lazy(() => import('@/components/admin/layout/AdminLayout').then(module => ({ default: module.AdminLayout })))
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin').then(module => ({ default: module.AdminLogin })))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard').then(module => ({ default: module.Dashboard })))

// Admin Features
const ProductsList = lazy(() => import('@/pages/admin/ProductsList').then(module => ({ default: module.ProductsList })))
const ProductsForm = lazy(() => import('@/pages/admin/ProductsForm').then(module => ({ default: module.ProductsForm })))
const MalinhasList = lazy(() => import('@/pages/admin/MalinhasList').then(module => ({ default: module.MalinhasList })))
const MalinhasDetail = lazy(() => import('@/pages/admin/MalinhasDetail').then(module => ({ default: module.MalinhasDetail })))
const MalinhasForm = lazy(() => import('@/pages/admin/MalinhasForm').then(module => ({ default: module.MalinhasForm })))
const CustomersList = lazy(() => import('@/pages/admin/CustomersList').then(module => ({ default: module.CustomersList })))
const CustomersForm = lazy(() => import('@/pages/admin/CustomersForm').then(module => ({ default: module.CustomersForm })))
const VendasList = lazy(() => import('@/pages/admin/VendasList').then(module => ({ default: module.VendasList })))
const VendasForm = lazy(() => import('@/pages/admin/VendasForm').then(module => ({ default: module.VendasForm })))
// Estoque Inteligente
const StockDashboard = lazy(() => import('@/pages/admin/StockDashboard').then(module => ({ default: module.StockDashboard })))
const SuppliersList = lazy(() => import('@/pages/admin/SuppliersList').then(module => ({ default: module.SuppliersList })))
const SuppliersForm = lazy(() => import('@/pages/admin/SuppliersForm').then(module => ({ default: module.SuppliersForm })))
const PurchasesList = lazy(() => import('@/pages/admin/PurchasesList').then(module => ({ default: module.PurchasesList })))
const PurchasesForm = lazy(() => import('@/pages/admin/PurchasesForm').then(module => ({ default: module.PurchasesForm })))
const InstallmentsList = lazy(() => import('@/pages/admin/InstallmentsList').then(module => ({ default: module.InstallmentsList })))
const ExpensesList = lazy(() => import('@/pages/admin/ExpensesList').then(module => ({ default: module.ExpensesList })))
const ExpensesForm = lazy(() => import('@/pages/admin/ExpensesForm').then(module => ({ default: module.ExpensesForm })))

// Test Components
const SupabaseTester = lazy(() => import('@/components/SupabaseTester'))
const SupabaseMigrationTester = lazy(() => import('@/components/SupabaseMigrationTester'))

// Loading Component
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
            <ToastProvider>
                <BrowserRouter>
                    <LoadingBar />
                    <ScrollToTop />
                    <AnimatePresence mode="wait">
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                {/* Rotas Públicas */}
                                <Route path="/" element={<Layout />}>
                                    <Route index element={<Home />} />
                                    <Route path="catalogo" element={<Catalog />} />
                                    <Route path="como-funciona" element={<HowItWorks />} />
                                    <Route path="sobre" element={<About />} />
                                    <Route path="malinha" element={<Checkout />} />
                                    <Route path="politica-de-privacidade" element={<PrivacyPolicy />} />
                                    <Route path="termos-de-servico" element={<TermsOfService />} />
                                    <Route path="test-supabase" element={<SupabaseTester />} />
                                    <Route path="test-migration" element={<SupabaseMigrationTester />} />
                                </Route>

                                {/* Admin Login (pública) */}
                                <Route path="/admin/login" element={<AdminLogin />} />

                                {/* Rotas Admin (protegidas) */}
                                <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                                    <Route path="dashboard" element={<Dashboard />} />

                                    {/* Produtos */}
                                    <Route path="products" element={<ProductsList />} />
                                    <Route path="products/new" element={<ProductsForm />} />
                                    <Route path="products/:id" element={<ProductsForm />} />

                                    <Route path="malinhas" element={<MalinhasList />} />
                                    <Route path="malinhas/new" element={<MalinhasForm />} />
                                    <Route path="malinhas/:id/edit" element={<MalinhasForm />} />
                                    <Route path="malinhas/:id" element={<MalinhasDetail />} />

                                    {/* Vendas */}
                                    <Route path="vendas" element={<VendasList />} />
                                    <Route path="vendas/new" element={<VendasForm />} />
                                    <Route path="vendas/:id" element={<VendasForm />} />

                                    {/* Clientes */}
                                    <Route path="customers" element={<CustomersList />} />
                                    <Route path="customers/new" element={<CustomersForm />} />
                                    <Route path="customers/:id" element={<CustomersForm />} />

                                    {/* Estoque Inteligente */}
                                    <Route path="stock" element={<StockDashboard />} />

                                    {/* Fornecedores */}
                                    <Route path="suppliers" element={<SuppliersList />} />
                                    <Route path="suppliers/new" element={<SuppliersForm />} />
                                    <Route path="suppliers/:id" element={<SuppliersForm />} />

                                    {/* Compras */}
                                    <Route path="purchases" element={<PurchasesList />} />
                                    <Route path="purchases/new" element={<PurchasesForm />} />
                                    <Route path="purchases/:id" element={<PurchasesForm />} />

                                    {/* Crediário */}
                                    <Route path="installments" element={<InstallmentsList />} />

                                    {/* Despesas Fixas */}
                                    <Route path="expenses" element={<ExpensesList />} />
                                    <Route path="expenses/new" element={<ExpensesForm />} />
                                    <Route path="expenses/:id" element={<ExpensesForm />} />
                                </Route>
                            </Routes>
                        </Suspense>
                    </AnimatePresence>
                </BrowserRouter>
            </ToastProvider>
        </ErrorBoundary>
    )
}

export default App
