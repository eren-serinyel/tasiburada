import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LifeBuoy, MessageCircle, Mail, Phone, Paperclip } from 'lucide-react';

export default function Help() {
  return (
    <section className="bg-gradient-to-b from-gray-50 via-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Başlık */}
        <div className="relative text-center pt-8 sm:pt-10">
          {/* Rozet - üstte floating */}
          <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3.5 py-1.5 ring-1 ring-blue-200 shadow-sm">
            <LifeBuoy className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Yardım Merkezi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-800">Yardım Merkezi</h1>
          <div className="mt-3 flex items-center justify-center">
            <span className="h-px w-12 bg-gradient-to-r from-transparent via-blue-300 to-blue-400" />
            <span className="mx-2 h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-sky-400 shadow-[0_0_14px_rgba(59,130,246,0.45)]" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent via-blue-300 to-blue-400" />
          </div>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">Sorularınızı bize iletebilir, sık sorulanlar bölümünde aradığınızı hızlıca bulabilirsiniz.</p>
        </div>

        {/* İçerik */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-8">
          {/* İletişim kartı */}
          <Card className="md:col-span-1 bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-sky-500 text-white flex items-center justify-center shadow-md">
                <LifeBuoy className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Yardım Merkezi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full justify-start gap-2 inline-flex items-center rounded-md border bg-gray-50 hover:bg-white px-3 py-2 text-sm">
                <MessageCircle className="h-4 w-4" /> Canlı Destek / Destek Formu
              </button>
              <a href="mailto:support@tasiburada.com" className="w-full justify-start gap-2 inline-flex items-center rounded-md border bg-gray-50 hover:bg-white px-3 py-2 text-sm">
                <Mail className="h-4 w-4" /> support@tasiburada.com
              </a>
              <a href="tel:+905555555555" className="w-full justify-start gap-2 inline-flex items-center rounded-md border bg-gray-50 hover:bg-white px-3 py-2 text-sm">
                <Phone className="h-4 w-4" /> +90 555 555 55 55
              </a>
            </CardContent>
          </Card>

          {/* SSS + Destek Talebi */}
          <Card className="md:col-span-2 bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sık Sorulan Sorular</CardTitle>
              <p className="text-sm text-gray-500">En çok merak edilen konuların kısa cevapları</p>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q1">
                  <AccordionTrigger>Nasıl talep oluştururum?</AccordionTrigger>
                  <AccordionContent>
                    Ana sayfadan veya menüden "Taşıma Talebi Oluştur"a tıklayın. Giriş yaptıysanız form açılır; yapmadıysanız önce giriş sayfasına yönlendirilirsiniz.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>Ödemeler nasıl yapılır?</AccordionTrigger>
                  <AccordionContent>
                    Ödemeler platform üzerinden güvenli şekilde alınır ve taşıma tamamlandıktan sonra nakliyeciye aktarılır.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3">
                  <AccordionTrigger>Nakliyeci doğrulaması nedir?</AccordionTrigger>
                  <AccordionContent>
                    Belgeleri onaylanmış, yüksek puanlı taşıyıcıları "Doğrulanmış" rozetleriyle vurgularız. Sürüş lisansı ve işletme belgeleri kontrol edilir.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Destek Talebi Formu */}
              <div className="mt-8">
                <h3 className="text-base font-semibold text-blue-700 mb-3">Destek Talebi Oluştur</h3>
                <form className="grid grid-cols-1 gap-4">
                  <input type="text" placeholder="Konu" className="w-full rounded-md border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  <textarea placeholder="Açıklama" rows={4} className="w-full rounded-md border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <Paperclip className="h-4 w-4" /> Dosya ekle (opsiyonel)
                    <input type="file" className="hidden" />
                  </label>
                  <button type="submit" className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 transition">
                    Talep Gönder
                  </button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alt fade */}
        <div aria-hidden className="h-10 sm:h-14 bg-gradient-to-b from-transparent to-white mt-10" />
      </div>
    </section>
  );
}
