import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminCarriers from '@/pages/admin/AdminCarriers';
import AdminCarrierDetail from '@/pages/admin/AdminCarrierDetail';
import AdminCustomers from '@/pages/admin/AdminCustomers';
import AdminShipments from '@/pages/admin/AdminShipments';
import AdminReviews from '@/pages/admin/AdminReviews';
import AdminApprovalQueue from '@/pages/admin/AdminApprovalQueue';
import AdminAuditLog from '@/pages/admin/AdminAuditLog';
import AdminOffers from '@/pages/admin/AdminOffers';
import AdminDocuments from '@/pages/admin/AdminDocuments';
import AdminReports from '@/pages/admin/AdminReports';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminManagement from '@/pages/admin/AdminManagement';
// Payment routes
import Payment from './pages/Payment';
import Payments from './pages/Payments';
import ShipmentDetail from './pages/ShipmentDetail.tsx';
import CarrierOffers from './pages/CarrierOffers';
import CarrierRespond from './pages/CarrierRespond';
import MyOffers from './pages/MyOffers';
import Earnings from './pages/Earnings';
import Notifications from './pages/Notifications';
import Layout from './components/Layout';
import Index from './pages/Index';
import Login from './pages/Login';
import RegisterUser from './pages/RegisterUser';
import RegisterCarrier from './pages/RegisterCarrier';
import Dashboard from './pages/Dashboard';
import ShipmentList from './pages/ShipmentList';
import OfferComparison from './pages/OfferComparison';
import CarrierProfile from './pages/CarrierProfile';
import CarrierReviews from './pages/CarrierReviews';
import CarrierList from './pages/CarrierList';
import CarrierDirectory from './pages/CarrierDirectory';
import CarrierCalendar from './pages/CarrierCalendar';
import Profile from './pages/Profile';
import Debug from './pages/Debug';
import NotFound from './pages/NotFound';
import CarrierDetailPage from './pages/CarrierDetailPage';
import Messages from './pages/Messages';
import HowItWorksCustomer from './pages/HowItWorksCustomer';
import HowItWorksCarrier from './pages/HowItWorksCarrier';
import RoleHome from './pages/RoleHome';
import OfferRequest from './pages/OfferRequest';
import History from './pages/History';
import Campaigns from './pages/Campaigns';
import Support from './pages/Support';
import Loyalty from './pages/Loyalty';
import Pricing from '@/pages/info/Pricing';
import CarrierInfo from '@/pages/info/CarrierInfo';
import PrivacyPolicy from '@/pages/info/PrivacyPolicy';
import Terms from '@/pages/info/Terms';
import CookiesPolicy from '@/pages/info/CookiesPolicy';
import Help from '@/pages/info/Help';
import RegisterCarrierPage from '@/pages/RegisterCarrier';
import ProfileComplete from '@/pages/ProfileComplete';
import CarrierOnboarding from '@/pages/CarrierOnboarding';
import ForgotPassword from '@/pages/ForgotPassword';
import VerifyEmail from '@/pages/VerifyEmail';
import FavoriteCarriers from './pages/FavoriteCarriers';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* ─── Admin Routes (no Layout) ─────────────────────────── */}
          <Route path="/admin/giris" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/panel" replace />} />
            <Route path="panel" element={<AdminDashboard />} />
            <Route path="nakliyeciler" element={<AdminCarriers />} />
            <Route path="nakliyeciler/:carrierId" element={<AdminCarrierDetail />} />
            <Route path="musteriler" element={<AdminCustomers />} />
            <Route path="ilanlar" element={<AdminShipments />} />
            <Route path="yorumlar" element={<AdminReviews />} />
            <Route path="onay-kuyrugu" element={<AdminApprovalQueue />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
            <Route path="teklifler" element={<AdminOffers />} />
            <Route path="belgeler" element={<AdminDocuments />} />
            <Route path="raporlar" element={<AdminReports />} />
            <Route path="ayarlar" element={<AdminSettings />} />
            <Route path="yonetim" element={<AdminManagement />} />
          </Route>

          {/* ─── Regular Routes (inside Layout) ──────────────────── */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<RoleHome />} />
            {/* Auth */}
            <Route path="/giris" element={<Login />} />
            <Route path="/sifremi-unuttum" element={<ForgotPassword />} />
            <Route path="/eposta-dogrula" element={<VerifyEmail />} />
            <Route path="/musteri-kayit" element={<RegisterUser />} />
            <Route path="/nakliyeci-kayit" element={<RegisterCarrier />} />
            <Route path="/nakliyeci-ol" element={<RegisterCarrierPage />} />
            <Route path="/profil-tamamla" element={<ProfileComplete />} />
            <Route path="/nakliyeci-onboarding" element={
              <ProtectedRoute requiredRole="carrier">
                <CarrierOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/panel" element={<Dashboard />} />
            {/** Talep oluşturma akışı devre dışı (müşteri sadece nakliyeci arıyor) */}
            <Route
              path="/teklif-talebi"
              element={
                <ProtectedRoute requiredRole="customer">
                  <OfferRequest />
                </ProtectedRoute>
              }
            />
            <Route path="/ilanlar" element={<ShipmentList />} />
            <Route path="/ilanlarim" element={<ShipmentList />} />
            <Route path="/ilan/:id" element={<ShipmentDetail />} />
            <Route path="/gecmis" element={
              <ProtectedRoute requiredRole="customer">
                <History />
              </ProtectedRoute>
            } />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/destek" element={<Support />} />
            <Route path="/loyalty" element={<Loyalty />} />
            {/* Turkish slugs and info pages */}
            <Route
              path="/talep-olustur"
              element={
                <ProtectedRoute requiredRole="customer">
                  <OfferRequest />
                </ProtectedRoute>
              }
            />
            <Route path="/fiyatlandirma" element={<Pricing />} />
            <Route path="/gizlilik-politikasi" element={<PrivacyPolicy />} />
            <Route path="/kullanim-sartlari" element={<Terms />} />
            <Route path="/cerez-politikasi" element={<CookiesPolicy />} />
            <Route path="/yardim" element={<Help />} />
            <Route path="/nakliyeci-bilgi" element={<CarrierInfo />} />
            <Route path="/teklifler/:shipmentId" element={<OfferComparison />} />
            {/** send-offer rotası kaldırıldı */}
            {/* Yeni akış rotaları */}
            <Route
              path="/nakliyeci/yanit/:requestId"
              element={
                <ProtectedRoute requiredRole="carrier">
                  <CarrierRespond />
                </ProtectedRoute>
              }
            />
            <Route path="/tekliflerim" element={
              <ProtectedRoute requiredRole="customer">
                <MyOffers />
              </ProtectedRoute>
            } />
            <Route path="/odeme/:shipmentId" element={
              <ProtectedRoute requiredRole="customer">
                <Payment />
              </ProtectedRoute>
            } />
            <Route path="/odemeler" element={
              <ProtectedRoute requiredRole="customer">
                <Payments />
              </ProtectedRoute>
            } />
            <Route path="/kayitli-firmalarim" element={
              <ProtectedRoute requiredRole="customer">
                <FavoriteCarriers />
              </ProtectedRoute>
            } />
            <Route
              path="/nakliyeci/teklifler"
              element={
                <ProtectedRoute requiredRole="carrier">
                  <CarrierOffers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nakliyeci/kazanc"
              element={
                <ProtectedRoute requiredRole="carrier">
                  <Earnings />
                </ProtectedRoute>
              }
            />
            <Route path="/bildirimler" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            <Route path="/nakliyeciler" element={<CarrierList />} />
            <Route path="/nakliyeciler/tumu" element={<CarrierDirectory />} />
            <Route path="/nakliyeciler/:carrierId/:slug?" element={<CarrierDetailPage />} />
            <Route path="/mesajlar" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />
            <Route path="/nakliyeci/:carrierId" element={<CarrierProfile />} />
            <Route path="/nakliyeci/yorumlar" element={<CarrierReviews />} />
            <Route
              path="/takvim"
              element={
                <ProtectedRoute requiredRole="carrier">
                  <CarrierCalendar />
                </ProtectedRoute>
              }
            />
            <Route path="/profilim" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            {import.meta.env.DEV && (
              <Route path="/hata-ayiklama" element={<Debug />} />
            )}
            <Route path="/nasil-calisir-musteri" element={<HowItWorksCustomer />} />
            <Route path="/nasil-calisir-nakliyeci" element={<HowItWorksCarrier />} />
            {/* Legacy aliases */}
            <Route path="/login" element={<Navigate to="/giris" replace />} />
            <Route path="/register-user" element={<Navigate to="/musteri-kayit" replace />} />
            <Route path="/register-carrier" element={<Navigate to="/nakliyeci-kayit" replace />} />
            <Route path="/dashboard" element={<Navigate to="/panel" replace />} />
            <Route path="/shipments" element={<Navigate to="/ilanlar" replace />} />
            <Route path="/offer-request" element={<Navigate to="/teklif-talebi" replace />} />
            <Route path="/my-offers" element={<Navigate to="/tekliflerim" replace />} />
            <Route path="/carrier/offers" element={<Navigate to="/nakliyeci/teklifler" replace />} />
            <Route path="/carrier/reviews" element={<Navigate to="/nakliyeci/yorumlar" replace />} />
            <Route path="/carrier/earnings" element={<Navigate to="/nakliyeci/kazanc" replace />} />
            <Route path="/payments" element={<Navigate to="/odemeler" replace />} />
            <Route path="/notifications" element={<Navigate to="/bildirimler" replace />} />
            <Route path="/carriers" element={<Navigate to="/nakliyeciler" replace />} />
            <Route path="/profile" element={<Navigate to="/profilim" replace />} />
            <Route path="/history" element={<Navigate to="/gecmis" replace />} />
            <Route path="/calendar" element={<Navigate to="/takvim" replace />} />
            <Route path="/how-it-works-customer" element={<Navigate to="/nasil-calisir-musteri" replace />} />
            <Route path="/how-it-works-carrier" element={<Navigate to="/nasil-calisir-nakliyeci" replace />} />
            <Route path="/debug" element={<Navigate to="/hata-ayiklama" replace />} />
            <Route path="/carrier-info" element={<Navigate to="/nakliyeci-bilgi" replace />} />
            <Route path="/pricing" element={<Navigate to="/fiyatlandirma" replace />} />
            <Route path="/privacy" element={<Navigate to="/gizlilik-politikasi" replace />} />
            <Route path="/terms" element={<Navigate to="/kullanim-sartlari" replace />} />
            <Route path="/cookies" element={<Navigate to="/cerez-politikasi" replace />} />
            <Route path="/help" element={<Navigate to="/yardim" replace />} />
            <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;