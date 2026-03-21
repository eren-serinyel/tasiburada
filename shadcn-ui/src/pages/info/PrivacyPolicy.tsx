import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <section className="bg-gradient-to-b from-gray-50 via-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Başlık bloğu */}
  <div className="relative text-center pt-8 sm:pt-10">
          {/* Halo arka plan */}
          <div aria-hidden className="pointer-events-none absolute inset-x-1/4 -top-6 h-24 rounded-full bg-blue-200/30 blur-3xl -z-10" />

          {/* Rozet */}
          <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-md px-3.5 py-1.5 ring-1 ring-blue-200/60 shadow-sm hover:shadow-md transition-shadow">
            <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-gradient-to-r from-blue-500 to-sky-500 text-white ring-2 ring-white/70 shadow">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-blue-700/90">Veri Güvenliği</span>
          </div>

          {/* Başlık */}
          <h1 className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-blue-800 via-blue-700 to-sky-600 bg-clip-text text-transparent">
            Gizlilik Politikası
          </h1>

          {/* Dekoratif çizgiler */}
          <div className="mt-3 flex items-center justify-center">
            <span className="h-px w-12 bg-gradient-to-r from-transparent via-blue-300 to-blue-400" />
            <span className="mx-2 h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-sky-400 shadow-[0_0_14px_rgba(59,130,246,0.45)]" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent via-blue-300 to-blue-400" />
          </div>

          {/* Açıklama */}
          <p className="text-center text-gray-600 max-w-2xl mx-auto mt-4">
            Verilerinizin güvenliği ve gizliliği en öncelikli konumuzdur. Bu sayfa, kişisel
            verilerinizin hangi amaçlarla işlendiğini ve nasıl korunduğunu açıklar.
          </p>
        </div>

        {/* Policy Card */}
        <Card className="mt-8 rounded-xl shadow-xl border border-blue-100/60 backdrop-blur-md bg-white/80">
          <CardContent className="p-6 sm:p-10">
            {/* Bölüm: KVKK */}
            <h2 className="text-xl font-semibold text-blue-700 mt-2 mb-3">Kişisel Verilerin Korunması</h2>
            <p className="text-gray-700 leading-relaxed">
              Taşıburada olarak kullanıcı verilerinin güvenliğine önem veriyoruz. Hesap ve işlem
              bilgileriniz; kimlik, iletişim ve işlem geçmişi verileriniz yalnızca hizmetin
              sunulması, platform güvenliği ve yasal yükümlülüklerin yerine getirilmesi amacıyla
              işlenir ve KVKK’ya uygundur.
            </p>

            <ul className="mt-4 space-y-2">
              <li className="flex items-start gap-2">
                <ShieldCheck className="text-blue-500 w-5 h-5 mt-0.5" />
                <span className="text-gray-700 text-sm sm:text-base">Verileriniz TLS ile şifrelenmiş bağlantı üzerinden iletilir ve güvenli ortamlarda saklanır.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="text-blue-500 w-5 h-5 mt-0.5" />
                <span className="text-gray-700 text-sm sm:text-base">Pazarlama amacıyla üçüncü taraflara satılmaz; paylaşım yalnızca açık rızanız veya yasal zorunluluk halinde yapılır.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="text-blue-500 w-5 h-5 mt-0.5" />
                <span className="text-gray-700 text-sm sm:text-base">Hesabınızı kapattığınızda makul süre içinde verileriniz silinir veya anonimleştirilir.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="text-blue-500 w-5 h-5 mt-0.5" />
                <span className="text-gray-700 text-sm sm:text-base">Çerez tercihlerinizi ve bildirim izinlerinizi dilediğiniz an yönetebilirsiniz.</span>
              </li>
            </ul>

            {/* Bölüm: Toplanan Veriler */}
            <h2 className="text-xl font-semibold text-blue-700 mt-8 mb-3">Toplanan Veriler ve Amaçlar</h2>
            <p className="text-gray-700 leading-relaxed">
              Ad, soyad, e‑posta, telefon, konum bilgisi, platform içi işlem geçmişi ve teknik günlükler;
              hesabın oluşturulması, teklif ve talep süreçlerinin yürütülmesi, dolandırıcılığın önlenmesi,
              müşteri desteği ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenebilir.
            </p>

            {/* Bölüm: Saklama Süreleri */}
            <h2 className="text-xl font-semibold text-blue-700 mt-8 mb-3">Veri Saklama Süreleri</h2>
            <p className="text-gray-700 leading-relaxed">
              Veriler, ilgili mevzuatta öngörülen veya işleme amacının gerektirdiği süre boyunca saklanır; bu
              süre sonunda silinir, anonimleştirilir veya erişime kapatılır.
            </p>

            {/* Bölüm: Haklarınız */}
            <h2 className="text-xl font-semibold text-blue-700 mt-8 mb-3">Haklarınız</h2>
            <p className="text-gray-700 leading-relaxed">
              KVKK kapsamındaki haklarınız (bilgilendirme, düzeltme, silme, itiraz, veri taşınabilirliği)
              için bizimle her zaman iletişime geçebilirsiniz. Talepleriniz en kısa sürede değerlendirilir.
            </p>

            {/* CTA */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center mt-12 shadow-sm">
              <p className="font-semibold text-gray-800">
                Kişisel verilerinizle ilgili her konuda bize ulaşabilirsiniz.
              </p>
              <div className="mt-3 space-y-1">
                <div>
                  📧
                  <a href="mailto:info@tasiburada.com" className="ml-1 text-blue-600 hover:text-blue-700 underline transition">
                    info@tasiburada.com
                  </a>
                </div>
                <div>
                  Tel: <a href="tel:+905551234567" className="text-gray-700">+90 555 123 45 67</a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer'a yumuşak geçiş için alt fade */}
        <div aria-hidden className="h-10 sm:h-14 bg-gradient-to-b from-transparent to-white mt-10" />
      </div>
    </section>
  );
}
