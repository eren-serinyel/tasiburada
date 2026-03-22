import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, ClipboardList, Clock, Crown, Home, LogOut, MessageCircle, ShieldCheck, Tag, Truck, User as UserIcon } from 'lucide-react';
import { User } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';
import { getDashboardTitleForRole } from '@/lib/utils';

export default function CustomerHome() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    setUser(u);
  }, []);

  // Bu sayfa, kullanıcıyı platformla tanıştırır ve dashboard bölümlerine yönlendirir.

  return (
  <div className="customer-home min-h-[calc(100vh-64px)] relative overflow-visible">
      {/* HERO */}
      <section className="relative hero-bg overflow-hidden">
        <div className="relative max-w-5xl mx-auto text-center py-16 md:py-24 px-6 md:px-10 lg:px-16 animate-fadeInUp">
          <h1
            className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight drop-shadow-sm bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-700 bg-clip-text text-transparent inline-block"
            style={{ fontFamily: "Inter, Plus Jakarta Sans, Manrope, ui-sans-serif, system-ui" }}
          >
            Taşımacılığın Dijital Hali
          </h1>
          {/* Accent underline */}
          <div className="mx-auto mt-4 h-1.5 w-24 rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />

          <p className="mt-6 text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed hover-text-glow">
            Tasıburada, taşımacılığı dijitalleştirerek kullanıcı ve nakliyeciyi güvenle buluşturan modern bir platformdur. Şu anda kolayca randevu oluşturabilir, süreçlerinizi {getDashboardTitleForRole(user?.type)} üzerinden yönetebilirsiniz.
          </p>

          {/* CTA buttons */}
          <div className="flex justify-center items-center gap-3 md:gap-4 mt-10 flex-col sm:flex-row">
            <Link to="/teklif-talebi" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto rounded-xl px-8 h-12 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-indigo-500 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg hover:brightness-110 transition-all"
              >
                <span className="mr-1">🚚</span> Randevunu Oluştur
              </Button>
            </Link>
            <Link to="/nasil-calisir-musteri" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto rounded-xl px-8 h-12 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-all"
              >
                Nasıl Çalışır?
              </Button>
            </Link>
          </div>

          {/* Helper text */}
          <p className="mt-6 text-sm text-slate-500">
            Randevularını ve tekliflerini görmek için{' '}
            <Link to="/panel" className="text-blue-600 font-medium hover:underline">İşlemlerim</Link>{' '}sekmesine geçebilirsin.
          </p>
        </div>
      </section>

      {/* RANDEVU SÜRECİ */}
      <section className="px-6 md:px-10 lg:px-16 pb-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Randevu Süreci Nasıl İşliyor?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition bg-gradient-to-tr from-white to-blue-50 border border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-700">
                  <CalendarDays className="h-5 w-5" />
                  Randevunu Planla
                </CardTitle>
                <CardDescription className="text-gray-700">Taşınma tarihini ve konumlarını gir, sistem uygun nakliyecileri belirlesin.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition bg-gradient-to-tr from-white to-blue-50 border border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-700">
                  <Clock className="h-5 w-5" />
                  Durumunu Takip Et
                </CardTitle>
                <CardDescription className="text-gray-700">{getDashboardTitleForRole(user?.type)} bölümünden tüm aktif taleplerini anlık olarak görüntüleyebilirsin.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition bg-gradient-to-tr from-white to-blue-50 border border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-700">
                  <ClipboardList className="h-5 w-5" />
                  Tekliflerini Yönet
                </CardTitle>
                <CardDescription className="text-gray-700">Nakliyecilerden gelen teklifleri kabul edebilir, iptal edebilir veya geçmişini inceleyebilirsin.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* PLATFORMU TANIYIN */}
      <section className="px-6 md:px-10 lg:px-16 pb-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Platformda Neler Yapabilirsin?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 8 bilgi kutusu */}
            <Card className="group rounded-xl bg-white/80 backdrop-blur-md border border-blue-100 hover:shadow-lg transition">
              <CardContent className="p-5 flex items-start gap-3">
                <Home className="h-5 w-5 text-blue-700 group-hover:rotate-3 transition-transform" />
                <div>
                  <div className="font-medium">{getDashboardTitleForRole(user?.type)}</div>
                  <div className="text-sm text-gray-600">Aktif taşıma taleplerini burada görüntüleyebilir ve yönetebilirsin.</div>
                </div>
              </CardContent>
            </Card>
            <Card className="group rounded-xl bg-white/80 backdrop-blur-md border border-blue-100 hover:shadow-lg transition">
              <CardContent className="p-5 flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-700 group-hover:rotate-3 transition-transform" />
                <div>
                  <div className="font-medium">Talep Geçmişi</div>
                  <div className="text-sm text-gray-600">Tamamlanan, iptal edilen veya bekleyen işlemlerini kolayca takip et.</div>
                </div>
              </CardContent>
            </Card>
            <Card className="group rounded-xl bg-white/80 backdrop-blur-md border border-blue-100 hover:shadow-lg transition">
              <CardContent className="p-5 flex items-start gap-3">
                <Tag className="h-5 w-5 text-blue-700 group-hover:rotate-3 transition-transform" />
                <div>
                  <div className="font-medium">Kampanyalar</div>
                  <div className="text-sm text-gray-600">İndirim kodları ve dönemsel promosyonlara buradan ulaş.</div>
                </div>
              </CardContent>
            </Card>
            <Card className="group rounded-xl bg-white/80 backdrop-blur-md border border-blue-100 hover:shadow-lg transition">
              <CardContent className="p-5 flex items-start gap-3">
                <Crown className="h-5 w-5 text-blue-700 group-hover:rotate-3 transition-transform" />
                <div>
                  <div className="font-medium">Sadakat & Premium</div>
                  <div className="text-sm text-gray-600">Avantajlı üyeliklerle indirimli taşıma fırsatlarını keşfet.</div>
                </div>
              </CardContent>
            </Card>
            <Card className="group rounded-xl bg-white/80 backdrop-blur-md border border-blue-100 hover:shadow-lg transition">
              <CardContent className="p-5 flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-blue-700 group-hover:rotate-3 transition-transform" />
                <div>
                  <div className="font-medium">Destek Merkezi</div>
                  <div className="text-sm text-gray-600">Canlı chat veya SSS bölümünden yardım al.</div>
                </div>
              </CardContent>
            </Card>
            <Card className="group rounded-xl bg-white/80 backdrop-blur-md border border-blue-100 hover:shadow-lg transition">
              <CardContent className="p-5 flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-blue-700 group-hover:rotate-3 transition-transform" />
                <div>
                  <div className="font-medium">Profil Bilgileri</div>
                  <div className="text-sm text-gray-600">Kişisel bilgilerini, şifre ve IBAN ayarlarını güncelle.</div>
                </div>
              </CardContent>
            </Card>
            <Card className="group rounded-xl bg-white/80 backdrop-blur-md border border-blue-100 hover:shadow-lg transition">
              <CardContent className="p-5 flex items-start gap-3">
                <Truck className="h-5 w-5 text-blue-700 group-hover:rotate-3 transition-transform" />
                <div>
                  <div className="font-medium">Nakliyeciler</div>
                  <div className="text-sm text-gray-600">Nakliyeci listesine göz at, puanları ve yorumları incele.</div>
                </div>
              </CardContent>
            </Card>
            <Card className="group rounded-xl bg-white/80 backdrop-blur-md border border-blue-100 hover:shadow-lg transition">
              <CardContent className="p-5 flex items-start gap-3">
                <LogOut className="h-5 w-5 text-blue-700 group-hover:rotate-3 transition-transform" />
                <div>
                  <div className="font-medium">Çıkış Yap</div>
                  <div className="text-sm text-gray-600">Hesabını güvenle sonlandır.</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* YENİLİKLER & HABERLER */}
      <section className="px-6 md:px-10 lg:px-16 pb-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Gelişmeler ve Yakında Gelecek Özellikler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="rounded-xl bg-white/80 backdrop-blur-md border hover:border-blue-300 transition">
              <CardContent className="p-5 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-700" />
                <div>
                  <div className="font-medium">Harita Üzerinden Nakliyeci Eşleşmesi</div>
                  <div className="text-sm text-gray-600">Yakında rota bazlı eşleşme sistemi aktif olacak.</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl bg-white/80 backdrop-blur-md border hover:border-blue-300 transition">
              <CardContent className="p-5 flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-700" />
                <div>
                  <div className="font-medium">Anlık Teklif Bildirimleri</div>
                  <div className="text-sm text-gray-600">Nakliyecilerden gelen teklifleri gerçek zamanlı alabileceksin.</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl bg-white/80 backdrop-blur-md border hover:border-blue-300 transition">
              <CardContent className="p-5 flex items-start gap-3">
                <Tag className="h-5 w-5 text-blue-700" />
                <div>
                  <div className="font-medium">Mobil Uygulama</div>
                  <div className="text-sm text-gray-600">Tasıburada yakında App Store ve Google Play’de!</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ALT CTA */}
      <section className="px-6 md:px-10 lg:px-16 pb-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between bg-white/80 backdrop-blur-md border border-blue-100 rounded-2xl p-5">
            <div className="text-gray-800 text-sm md:text-base">Randevularını ve tekliflerini yönetmek için {getDashboardTitleForRole(user?.type)}’a gidebilirsin.</div>
            <Link to="/panel">
              <Button className="rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white">{getDashboardTitleForRole(user?.type)}’a Git →</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
