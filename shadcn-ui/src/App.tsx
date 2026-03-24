import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Layout>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<RoleHome />} />
            {/* Auth */}
            <Route path="/giris" element={<Login />} />
            <Route path="/musteri-kayit" element={<RegisterUser />} />
            <Route path="/nakliyeci-kayit" element={<RegisterCarrier />} />
            <Route path="/nakliyeci-ol" element={<RegisterCarrierPage />} />
            <Route path="/profil-tamamla" element={<ProfileComplete />} />
            <Route path="/panel" element={<Dashboard />} />
            {/** Talep oluşturma akışı devre dışı (müşteri sadece nakliyeci arıyor) */}
            <Route path="/teklif-talebi" element={<OfferRequest />} />
            <Route path="/ilanlar" element={<ShipmentList />} />
            <Route path="/ilanlarim" element={<ShipmentList />} />
            <Route path="/ilan/:id" element={<ShipmentDetail />} />
            <Route path="/gecmis" element={<History />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/support" element={<Support />} />
            <Route path="/loyalty" element={<Loyalty />} />
            {/* Turkish slugs and info pages */}
            <Route path="/talep-olustur" element={<OfferRequest />} />
            <Route path="/fiyatlandirma" element={<Pricing />} />
            <Route path="/gizlilik-politikasi" element={<PrivacyPolicy />} />
            <Route path="/kullanim-sartlari" element={<Terms />} />
            <Route path="/cerez-politikasi" element={<CookiesPolicy />} />
            <Route path="/yardim" element={<Help />} />
            <Route path="/nakliyeci-bilgi" element={<CarrierInfo />} />
            <Route path="/teklifler/:shipmentId" element={<OfferComparison />} />
            {/** send-offer rotası kaldırıldı */}
            {/* Yeni akış rotaları */}
            <Route path="/nakliyeci/yanit/:requestId" element={<CarrierRespond />} />
            <Route path="/tekliflerim" element={<MyOffers />} />
            <Route path="/odeme/:shipmentId" element={<Payment />} />
            <Route path="/odemeler" element={<Payments />} />
            <Route path="/nakliyeci/teklifler" element={<CarrierOffers />} />
            <Route path="/nakliyeci/kazanc" element={<Earnings />} />
            <Route path="/bildirimler" element={<Notifications />} />
            <Route path="/nakliyeciler" element={<CarrierList />} />
            <Route path="/nakliyeciler/tumu" element={<CarrierDirectory />} />
            <Route path="/nakliyeciler/:carrierId/:slug?" element={<CarrierDetailPage />} />
            <Route path="/mesajlar" element={<Messages />} />
            <Route path="/nakliyeci/:carrierId" element={<CarrierProfile />} />
            <Route path="/nakliyeci/yorumlar" element={<CarrierReviews />} />
            <Route path="/takvim" element={<CarrierCalendar />} />
            <Route path="/profilim" element={<Profile />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;