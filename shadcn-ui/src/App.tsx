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
import CreateShipment from '@/pages/CreateShipment';
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
            {/* Auth aliases */}
            <Route path="/login" element={<Login />} />
            <Route path="/giris" element={<Login />} />
            <Route path="/register-user" element={<RegisterUser />} />
            <Route path="/register-carrier" element={<RegisterCarrier />} />
            <Route path="/nakliyeci-ol" element={<RegisterCarrierPage />} />
            <Route path="/profil-tamamla" element={<ProfileComplete />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/** Talep oluşturma akışı devre dışı (müşteri sadece nakliyeci arıyor) */}
            <Route path="/offer-request" element={<OfferRequest />} />
            <Route path="/shipments" element={<ShipmentList />} />
            <Route path="/shipment/:id" element={<ShipmentDetail />} />
            <Route path="/history" element={<History />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/support" element={<Support />} />
            <Route path="/loyalty" element={<Loyalty />} />
            {/* Turkish slugs and info pages */}
            <Route path="/talep-olustur" element={<CreateShipment />} />
            <Route path="/fiyatlandirma" element={<Pricing />} />
            <Route path="/gizlilik-politikasi" element={<PrivacyPolicy />} />
            <Route path="/kullanim-sartlari" element={<Terms />} />
            <Route path="/cerez-politikasi" element={<CookiesPolicy />} />
            <Route path="/yardim" element={<Help />} />
            <Route path="/carrier-info" element={<CarrierInfo />} />
            <Route path="/offers/:shipmentId" element={<OfferComparison />} />
            {/** send-offer rotası kaldırıldı */}
            {/* Yeni akış rotaları */}
            <Route path="/carrier/respond/:requestId" element={<CarrierRespond />} />
            <Route path="/my-offers" element={<MyOffers />} />
            <Route path="/payment/:shipmentId" element={<Payment />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/carrier/offers" element={<CarrierOffers />} />
            <Route path="/carrier/earnings" element={<Earnings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/carriers" element={<CarrierList />} />
            <Route path="/nakliyeciler" element={<CarrierList />} />
            <Route path="/nakliyeciler/tumu" element={<CarrierDirectory />} />
            <Route path="/nakliyeciler/:carrierId/:slug?" element={<CarrierDetailPage />} />
            <Route path="/mesajlar" element={<Messages />} />
            <Route path="/carrier/:carrierId" element={<CarrierProfile />} />
            <Route path="/carrier/reviews" element={<CarrierReviews />} />
            <Route path="/calendar" element={<CarrierCalendar />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/debug" element={<Debug />} />
            <Route path="/how-it-works-customer" element={<HowItWorksCustomer />} />
            <Route path="/how-it-works-carrier" element={<HowItWorksCarrier />} />
            {/* Legacy aliases */}
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