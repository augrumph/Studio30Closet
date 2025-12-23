import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { Home, Catalog, HowItWorks, About, Checkout } from '@/pages'
import { PrivacyPolicy, TermsOfService } from '@/pages'
import { ScrollToTop } from '@/components/ScrollToTop'

// Admin imports
import { ProtectedRoute } from '@/components/admin/ProtectedRoute'
import { AdminLayout } from '@/components/admin/layout/AdminLayout'
import { AdminLogin } from '@/pages/admin/AdminLogin'
import { Dashboard } from '@/pages/admin/Dashboard'
import { ProductsList } from '@/pages/admin/ProductsList'
import { ProductsForm } from '@/pages/admin/ProductsForm'
import { MalinhasList } from '@/pages/admin/MalinhasList'
import { MalinhasDetail } from '@/pages/admin/MalinhasDetail'
import { MalinhasForm } from '@/pages/admin/MalinhasForm'
import { CustomersList } from '@/pages/admin/CustomersList'
import { CustomersForm } from '@/pages/admin/CustomersForm'
import { VendasList } from '@/pages/admin/VendasList'
import { VendasForm } from '@/pages/admin/VendasForm'
import { CouponsList } from '@/pages/admin/CouponsList'
import { CouponsForm } from '@/pages/admin/CouponsForm'
import { SuppliersList } from '@/pages/admin/SuppliersList'
import { SuppliersForm } from '@/pages/admin/SuppliersForm'
import { PurchasesList } from '@/pages/admin/PurchasesList'
import { PurchasesForm } from '@/pages/admin/PurchasesForm'
import { OperationalCosts } from '@/pages/admin/OperationalCosts'
import { PaymentFeesConfig } from '@/pages/admin/PaymentFeesConfig'

// Teste do Supabase
import SupabaseTester from '@/components/SupabaseTester'
import SupabaseMigrationTester from '@/components/SupabaseMigrationTester'

function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
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

                    {/* Malinhas */}
                    <Route path="malinhas" element={<MalinhasList />} />
                    <Route path="malinhas/new" element={<MalinhasForm />} />
                    <Route path="malinhas/:id" element={<MalinhasDetail />} />

                    {/* Vendas */}
                    <Route path="vendas" element={<VendasList />} />
                    <Route path="vendas/new" element={<VendasForm />} />
                    <Route path="vendas/:id" element={<VendasForm />} />

                    {/* Clientes */}
                    <Route path="customers" element={<CustomersList />} />
                    <Route path="customers/new" element={<CustomersForm />} />
                    <Route path="customers/:id" element={<CustomersForm />} />

                    {/* Cupons */}
                    <Route path="coupons" element={<CouponsList />} />
                    <Route path="coupons/new" element={<CouponsForm />} />
                    <Route path="coupons/:id" element={<CouponsForm />} />

                    {/* Fornecedores */}
                    <Route path="suppliers" element={<SuppliersList />} />
                    <Route path="suppliers/new" element={<SuppliersForm />} />
                    <Route path="suppliers/:id" element={<SuppliersForm />} />

                    {/* Compras */}
                    <Route path="purchases" element={<PurchasesList />} />
                    <Route path="purchases/new" element={<PurchasesForm />} />
                    <Route path="purchases/:id" element={<PurchasesForm />} />

                    {/* Custos Operacionais */}
                    <Route path="operational-costs" element={<OperationalCosts />} />

                    {/* Configuração de Taxas */}
                    <Route path="payment-fees" element={<PaymentFeesConfig />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
