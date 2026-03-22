import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Shield, Star, Users, ArrowRight, Zap, Award, Sparkles, Settings, ShieldCheck, IdCard, Brain, CheckCircle, Truck, Target, HelpCircle, LifeBuoy, Mail, Phone, MessageCircle } from 'lucide-react';
import OfferRequestForm from '@/components/OfferRequestForm';
import { Link, useLocation } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useEffect } from 'react';

export default function Index() {
  const location = useLocation();

  useEffect(() => {
    const state = location.state as any;
    if (state?.scrollTo) {
      const selector = `#${state.scrollTo}`;
      const el = document.querySelector(selector);
      if (el) {
        const top = (el as HTMLElement).getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
    if (state?.toast) {
      toast(state.toast.title, { description: state.toast.description });
    }
  }, [location.state]);

  return (
  <div className="min-h-[calc(100vh-64px)] overflow-visible flex flex-col">
      {/* Hero Section */}
  <section className="relative bg-gradient-to-br from-blue-100 via-blue-50 to-sky-100 pt-0 pb-8 sm:pb-10 md:pb-12 lg:pb-14 flex-1 flex items-start">
        {/* Background Effects */}
  <div className="absolute inset-0 overflow-visible">
          {/* Modern Notebook Grid Pattern */}
          <div className="absolute inset-0 bg-notebook-pattern" />
          {/* Subtle Blue Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 via-transparent to-sky-200/10" />
          {/* Geometric Shapes */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-white/20 to-blue-200/30 rounded-full opacity-60 animate-float backdrop-blur-sm" />
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-white/30 to-sky-200/40 rounded-full opacity-40 animate-float-delayed backdrop-blur-sm" />
          <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-gradient-to-br from-white/40 to-cyan-200/50 rounded-full opacity-50 animate-pulse backdrop-blur-sm" />
          {/* Additional floating elements for depth */}
          <div className="absolute top-1/3 right-1/3 w-12 h-12 bg-gradient-to-br from-white/25 to-blue-300/30 rounded-full opacity-30 animate-float" />
          <div className="absolute bottom-1/3 left-1/2 w-8 h-8 bg-gradient-to-br from-white/35 to-sky-300/40 rounded-full opacity-25 animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Hero heading + subtitle (geri getirildi) */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 sm:mb-4 md:mb-5 leading-tight mt-8 sm:mt-12 md:mt-16">
              <span className="block text-gray-900">Türkiye'nin En</span>
              <span className="block bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-400 bg-clip-text text-transparent">Güvenilir</span>
              <span className="block text-gray-800">Nakliye Platformu</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-4 sm:mb-6 md:mb-7 lg:mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed px-2">
              Nakliyede Yeni Nesil Deneyim.
            </p>
          </div>
          {/* Hero + Quick Form */}
            <div id="quick-form">
              <OfferRequestForm />
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pt-8 pb-16 sm:pt-10 sm:pb-20 md:pt-12 md:pb-24 lg:pt-16 lg:pb-32 bg-white relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-sky-50/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="mb-2">
              <Badge variant="outline" className="px-4 py-2 text-blue-600 border-blue-200 bg-blue-50">
                <Sparkles className="mr-2 h-3 w-3" />
                Özellikler
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Neden <span className="bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">Taşıburada</span>?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">Hem müşteriler hem de nakliyeciler için tasarlanmış özellikler</p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <Card className="group text-center hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border-blue-100 bg-white/80 backdrop-blur-sm hover:bg-white">
              <CardHeader className="pb-4">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-sky-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-r from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <MapPin className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Rota Bazlı Eşleşme</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">Çıkış ve varış noktalarınızı girin, size en uygun nakliyecileri bulalım</CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="group text-center hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border-sky-100 bg-white/80 backdrop-blur-sm hover:bg-white">
              <CardHeader className="pb-4">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Truck className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-sky-600 transition-colors">Araç & Kapasite Yönetimi</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">Kamyonet'ten tır'a kadar tüm araç tipleri ve yasal taşıma kapasiteleri</CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="group text-center hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border-cyan-100 bg-white/80 backdrop-blur-sm hover:bg-white">
              <CardHeader className="pb-4">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-cyan-600 transition-colors">Güvenli Ödeme</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">Şeffaf fiyatlandırma ve güvenli ödeme sistemi ile huzurlu taşıma</CardDescription>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="group text-center hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border-blue-100 bg-white/80 backdrop-blur-sm hover:bg-white">
              <CardHeader className="pb-4">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Star className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Puanlama & Yorum</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">İş sonrası karşılıklı değerlendirme ile güven ortamı sağlıyoruz</CardDescription>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="group text-center hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border-indigo-100 bg-white/80 backdrop-blur-sm hover:bg-white">
              <CardHeader className="pb-4">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Geniş Nakliyeci Ağı</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">Türkiye genelinde binlerce doğrulanmış nakliyeci ile çalışıyoruz</CardDescription>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="group text-center hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border-purple-100 bg-white/80 backdrop-blur-sm hover:bg-white">
              <CardHeader className="pb-4">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Hızlı Eşleşme</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">Dakikalar içinde size uygun nakliyeci bulun ve taşıma işleminizi başlatın</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="pt-8 pb-16 sm:pt-10 sm:pb-20 md:pt-12 md:pb-24 lg:pt-16 lg:pb-32 bg-gradient-to-b from-blue-50/50 to-white relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/20 to-sky-50/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="mb-2">
              <Badge variant="outline" className="px-4 py-2 text-blue-600 border-blue-200 bg-blue-50">
                <Settings className="mr-2 h-3 w-3" />
                Nasıl Çalışır
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">3 Basit Adımda</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">Taşıma işleminizi kolayca halledin</p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="relative mb-6 sm:mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-sky-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-r from-blue-500 to-sky-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Users className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                  </div>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-blue-600 transition-colors">Kayıt Olun</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">Müşteri veya nakliyeci olarak hızlıca hesap oluşturun</p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="relative mb-6 sm:mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-r from-sky-500 to-cyan-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                  </div>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-sky-600 transition-colors">Talep Oluşturun</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">Taşıma detaylarınızı girin ve teklif alın</p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="relative mb-6 sm:mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Truck className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                  </div>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-cyan-600 transition-colors">Taşıma Gerçekleştirin</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">En uygun nakliyeciyi seçin ve taşıma işlemini tamamlayın</p>
            </div>
          </div>

          {/* Bottom CTA removed as requested */}
        </div>
      </section>

      {/* CTA Section: Hemen Başlayın (geri getirildi) */}
      <section className="pt-8 pb-16 sm:pt-10 sm:pb-20 md:pt-12 md:pb-24 lg:pt-16 lg:pb-32 bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-700 relative overflow-visible">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 sm:w-48 sm:h-48 bg-white rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" />
          <div className="absolute bottom-10 right-10 w-32 h-32 sm:w-48 sm:h-48 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="mb-3 sm:mb-4">
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2">
              <Zap className="mr-2 h-3 w-3" />
              Hemen Başla
            </Badge>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">Hemen Başlayın</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed">
            Taşıma ihtiyacınız mı var? Yoksa nakliyeci olarak gelir elde etmek mi istiyorsunuz?
          </p>

          {/* CTA Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {/* Customer CTA */}
            <div className="group bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-r from-blue-400 to-sky-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Müşteri</h3>
                <p className="text-blue-100 mb-4 sm:mb-6 text-sm sm:text-base">Taşıma talebinizi oluşturun, en uygun nakliyeciyi bulun</p>
                <Link to="/musteri-kayit" className="block">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-semibold py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl">
                    Taşıma Talebi Oluştur
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Carrier CTA */}
            <div className="group bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-r from-sky-400 to-cyan-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Truck className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Nakliyeci</h3>
                <p className="text-blue-100 mb-4 sm:mb-6 text-sm sm:text-base">İş bulun, para kazanın, işletmenizi büyütün</p>
                <Link to="/nakliyeci-kayit" className="block">
                  <Button className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl">
                    Nakliyeci Olarak Katıl
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto">
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 hover:bg-white/15 transition-all duration-300">
              <Award className="h-8 w-8 sm:h-10 sm:w-10 text-cyan-300 mx-auto mb-2" />
              <div className="text-lg sm:text-xl font-bold text-white">Güvenilir</div>
              <div className="text-xs sm:text-sm text-blue-200">SSL Şifreli</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 hover:bg-white/15 transition-all duration-300">
              <Target className="h-8 w-8 sm:h-10 sm:w-10 text-blue-300 mx-auto mb-2" />
              <div className="text-lg sm:text-xl font-bold text-white">Hızlı</div>
              <div className="text-xs sm:text-sm text-blue-200">Anında Eşleşme</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 hover:bg-white/15 transition-all duration-300 sm:col-span-3 md:col-span-1">
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-sky-300 mx-auto mb-2" />
              <div className="text-lg sm:text-xl font-bold text-white">Kolay</div>
              <div className="text-xs sm:text-sm text-blue-200">Kullanıcı Dostu</div>
            </div>
          </div>
        </div>
      </section>

  {/* Help & FAQ Section (above footer) */}
  {/* Eski id için alias: yardim-sss */}
  <div id="yardim-sss" className="absolute -top-24 h-0 w-0 overflow-hidden" aria-hidden />
  <section id="yardim" className="pt-10 pb-20 md:pt-12 md:pb-24 bg-gradient-to-b from-sky-50 to-white relative">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="mb-2">
              <Badge variant="outline" className="px-4 py-2 text-blue-600 border-blue-200 bg-white">
                <HelpCircle className="mr-2 h-4 w-4" /> Yardım & SSS
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Yardım ve Sık Sorulan Sorular</h2>
            <p className="text-gray-600 mt-2 max-w-2xl mx-auto">Aradığınız cevabı bulamazsanız destek ekibimiz size yardımcı olmaktan memnuniyet duyar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Yardım Kartı */}
            <Card className="md:col-span-1 bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-sky-500 text-white flex items-center justify-center shadow-md">
                  <LifeBuoy className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">Yardım Merkezi</CardTitle>
                <CardDescription>İletişime geçin ya da destek seçeneklerini keşfedin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/support" className="block">
                  <Button variant="secondary" className="w-full justify-start gap-2">
                    <MessageCircle className="h-4 w-4" /> Canlı Destek / Destek Formu
                  </Button>
                </Link>
                <a href="mailto:support@tasiburada.com" className="block">
                  <Button variant="secondary" className="w-full justify-start gap-2">
                    <Mail className="h-4 w-4" /> support@tasiburada.com
                  </Button>
                </a>
                <a href="tel:+905555555555" className="block">
                  <Button variant="secondary" className="w-full justify-start gap-2">
                    <Phone className="h-4 w-4" /> +90 555 555 55 55
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* SSS (FAQ) */}
            <Card className="md:col-span-2 bg-white/80 backdrop-blur-sm border-blue-100">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Sık Sorulan Sorular</CardTitle>
                <CardDescription>En çok merak edilen konuların kısa cevapları</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="q1">
                    <AccordionTrigger>Nasıl teklif alırım?</AccordionTrigger>
                    <AccordionContent>
                      Ana sayfadaki formdan rota ve tercihlerinizi doldurun. Uygun nakliyeciler listelenir; giriş yaptıktan sonra “Teklif İste” diyebilirsiniz.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="q2">
                    <AccordionTrigger>Ödemeler nasıl yapılır?</AccordionTrigger>
                    <AccordionContent>
                      Şeffaf fiyatlandırma ile nakliyeci onayından sonra güvenli ödeme adımlarına yönlendirilirsiniz. Ödeme yöntemleri proje demo’sunda simüle edilir.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="q3">
                    <AccordionTrigger>Taşımayı iptal edebilir miyim?</AccordionTrigger>
                    <AccordionContent>
                      Evet. Taşıma başlamadan önce destek üzerinden iptal talebi oluşturabilirsiniz. Politikalara göre ücret iadesi değişebilir.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="q4">
                    <AccordionTrigger>Eşyalar sigortalı mı?</AccordionTrigger>
                    <AccordionContent>
                      Formdaki “Sigorta” alanından temel veya tam sigorta seçebilirsiniz. Seçiminize uygun nakliyeciler listelenir.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="q5">
                    <AccordionTrigger>Nakliyeci puanları neye göre?</AccordionTrigger>
                    <AccordionContent>
                      Gerçek kullanıcı değerlendirmeleri ve tamamlanan işler baz alınır. Rozetler ve onaylar güven puanını destekler.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}