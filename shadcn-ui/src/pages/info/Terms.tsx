import { Card, CardContent } from '@/components/ui/card';
import { Scale } from 'lucide-react';

export default function Terms() {
  return (
    <section className="bg-gradient-to-b from-gray-50 via-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Başlık bloğu */}
        <div className="relative text-center pt-8 sm:pt-10">
          {/* Halo arka plan */}
          <div aria-hidden className="pointer-events-none absolute inset-x-1/4 -top-6 h-24 rounded-full bg-blue-200/30 blur-3xl -z-10" />

          {/* Rozet */}
          <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-md px-3.5 py-1.5 ring-1 ring-blue-200/60 shadow-sm">
            <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-gradient-to-r from-blue-500 to-sky-500 text-white ring-2 ring-white/70 shadow">
              <Scale className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-blue-700/90">Sözleşme & Kurallar</span>
          </div>

          {/* Başlık */}
          <h1 className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-blue-800 via-blue-700 to-sky-600 bg-clip-text text-transparent">
            Kullanım Şartları
          </h1>
          {/* Dekoratif çizgiler */}
          <div className="mt-3 flex items-center justify-center">
            <span className="h-px w-12 bg-gradient-to-r from-transparent via-blue-300 to-blue-400" />
            <span className="mx-2 h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-sky-400 shadow-[0_0_14px_rgba(59,130,246,0.45)]" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent via-blue-300 to-blue-400" />
          </div>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mt-4">
            Platform kurallarımız, kullanıcı sorumlulukları ve sözleşme çerçevesi hakkında özet bilgiler.
          </p>
        </div>

        {/* İçerik kartı */}
        <Card className="mt-8 rounded-xl shadow-xl border border-blue-100/60 backdrop-blur-md bg-white/80">
          <CardContent className="p-6 sm:p-10">
            <h2 className="text-xl font-semibold text-blue-700 mt-2 mb-3">Platform Kuralları</h2>

            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-gray-700 text-sm sm:text-base">Platform, nakliyeci ve müşteriyi buluşturan bir pazaryeridir; taşıma sözleşmesi taraflar arasında kurulur.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-gray-700 text-sm sm:text-base">Kullanıcılar verdikleri bilgilerin doğruluğundan ve hukuka uygunluğundan sorumludur.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-gray-700 text-sm sm:text-base">Ödeme güvenliği için yalnızca platformun sunduğu yöntemler kullanılmalıdır.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-gray-700 text-sm sm:text-base">Yanıltıcı ilan/teklif, hakaret, spam ve yasadışı içerikler yasaktır.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-gray-700 text-sm sm:text-base">İptal, iade ve uyuşmazlık süreçlerinde ilan/teklif şartları ve ilgili mevzuat esas alınır.</span>
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-blue-700 mt-8 mb-3">Taraf Beyanları</h2>
            <p className="text-gray-700 leading-relaxed">
              Nakliyeciler, gerekli belge ve lisanslara sahip olduklarını beyan eder. Müşteriler; yükün niteliği,
              paketleme ve erişim (asansör, kat sayısı vb.) bilgilerini doğru paylaşmayı kabul eder.
            </p>

            {/* CTA */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center mt-12 shadow-sm">
              <p className="font-semibold text-gray-800">Şartlarla ilgili sorularınız mı var?</p>
              <div className="mt-3">
                📧
                <a href="mailto:info@tasiburada.com" className="ml-1 text-blue-600 hover:text-blue-700 underline transition">info@tasiburada.com</a>
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
