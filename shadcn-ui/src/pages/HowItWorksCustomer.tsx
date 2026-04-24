import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  ClipboardList,
  MapPin,
  Search,
  Send,
  Truck,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { getSessionUser } from '@/lib/storage';

export default function HowItWorksCustomer() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
      setUser(u);
    } catch {
      // Session data is optional on public info pages.
    }
  }, []);

  const steps = [
    {
      icon: UserPlus,
      title: 'Müşteri hesabınızla başlayın',
      desc: 'Üye olun veya giriş yapın. Kayıtlı adresleriniz ve profil telefonunuz varsa talep formunda otomatik kullanılabilir.'
    },
    {
      icon: MapPin,
      title: 'Rota ve tarihi seçin',
      desc: 'Çıkış-varış il ve ilçelerini, taşıma tarihini ve saat tercihini girin. Sistem şehir içi veya şehirlerarası kapsamı rotaya göre belirler.'
    },
    {
      icon: ClipboardList,
      title: 'Yük ve hizmet detaylarını ekleyin',
      desc: 'Evden eve, ofis, parça eşya veya depolama gibi taşıma tipini; kat, asansör, sigorta ve ek hizmet ihtiyaçlarını belirtin.'
    },
    {
      icon: Search,
      title: 'Uygun nakliyecileri inceleyin',
      desc: 'Tarih uygunluğu, onay durumu, puan, araç kapasitesi ve hizmet bölgelerine göre firmaları karşılaştırın. İsterseniz belirli bir firmayı talebinize davet edin.'
    },
    {
      icon: Send,
      title: 'Talebi yayınlayın',
      desc: 'Talebiniz teklif almaya açılır. Uygun nakliyeciler bilgilendirilir; doğrudan iletişim bilgileri teklif aşamasında gizli tutulur.'
    },
    {
      icon: Wallet,
      title: 'Teklifleri karşılaştırın',
      desc: 'Fiyatı; tahmini süre, firma profili, belge durumu, puan ve yorumlarla birlikte değerlendirin. Beğendiğiniz teklifleri kaydedip filtreleyebilirsiniz.'
    },
    {
      icon: CheckCircle2,
      title: 'Teklifi kabul edin',
      desc: 'Bir teklifi kabul ettiğinizde taşıma o nakliyeciyle eşleşir ve diğer bekleyen teklifler otomatik olarak kapanır.'
    },
    {
      icon: Truck,
      title: 'Taşıma ve değerlendirme',
      desc: 'Nakliyeci işi başlatıp tamamladığında bildirim alırsınız. Teslimat sonrası deneyiminizi puanlayarak firma profilini güçlendirebilirsiniz.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex flex-col items-center text-center gap-1 md:gap-2">
          <span className="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-md shadow-sm hover:bg-blue-100 transition-colors">Kılavuz</span>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
            Nasıl Çalışır - Müşteri
          </h1>
        </div>
        <p className="mt-3 text-gray-600 text-center">
          Taşıburada'da talep oluşturur, uygun nakliyecilerden teklif alır ve seçtiğiniz firmayla kontrollü şekilde eşleşirsiniz.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {steps.map((s, i) => (
          <Card key={s.title} className="border border-gray-200">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <s.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-base md:text-lg">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">{i + 1}</span>
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>İpuçları</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-600">
          <ul className="list-disc pl-5 space-y-2">
            <li>İlçe, kat, asansör ve eşya kapsamını net yazın; <MapPin className="inline h-4 w-4" /> doğru konum ve yük bilgisi teklif kalitesini artırır.</li>
            <li>Not alanına telefon, e-posta, link veya platform dışı iletişim yönlendirmesi yazmayın; güvenlik politikası bu bilgileri engeller.</li>
            <li>Açık adres ve telefon bilgileri teklif aşamasında gizlenir; sadece eşleşen taraflara, operasyonel ihtiyaç oluştuğunda sistem kurallarına göre açılır.</li>
          </ul>
        </CardContent>
      </Card>

      {user?.type !== 'carrier' && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/teklif-talebi">
            <Button className="bg-blue-600 hover:bg-blue-700">Talep Oluştur</Button>
          </Link>
          <Link to="/tekliflerim">
            <Button variant="outline">Tekliflerimi Gör</Button>
          </Link>
        </div>
      )}

      <div className="mt-12">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="a1">
            <AccordionTrigger>Talebim yayınlandıktan sonra ne olur?</AccordionTrigger>
            <AccordionContent>
              Talep teklif almaya açılır ve rota, tarih, kapsam, araç kapasitesi ve firma uygunluğuna göre nakliyecilere gösterilir. Size gelen teklifler bildirim ve Tekliflerim ekranında görünür.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a2">
            <AccordionTrigger>Belirli bir nakliyeciden teklif isteyebilir miyim?</AccordionTrigger>
            <AccordionContent>
              Evet. Nakliyeci profilinden Teklif İste ile talep oluşturduğunuzda ilgili firma davet edilir. Talep yine sistem kayıtları ve güvenlik kuralları içinde ilerler.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a3">
            <AccordionTrigger>Fiyatı nasıl karşılaştırmalıyım?</AccordionTrigger>
            <AccordionContent>
              Sadece en düşük fiyata değil; tahmini süreye, onaylı profil ve belge durumuna, puana, yorumlara ve hizmet kapsamına birlikte bakmanız önerilir.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a4">
            <AccordionTrigger>Nakliyeciyle ne zaman doğrudan iletişim kurabilirim?</AccordionTrigger>
            <AccordionContent>
              Teklif aşamasında telefon ve e-posta gizlidir. Platform içi mesajlaşma ana iletişim yoludur; telefon bilgisi yalnızca eşleşme sonrası, taşıma zamanına yaklaşıldığında veya taşıma sırasında politika kurallarına göre açılır.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a5">
            <AccordionTrigger>Ödemeyi nasıl yaparım?</AccordionTrigger>
            <AccordionContent>
              Eşleşen taşıma için ödeme ekranında kart veya havale/EFT seçenekleri kullanılabilir. Tutar, seçtiğiniz teklif üzerinden gösterilir; emanet ödeme modeli platformun sonraki fazında genişletilecektir.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a6">
            <AccordionTrigger>Onayladığım işi iptal edebilir miyim?</AccordionTrigger>
            <AccordionContent>
              İptal işlemi taşımanın durumuna göre değerlendirilir. Eşleşmeden uzun süre sonra yapılan iptallerde aynı müşteri-nakliyeci eşleşmesi için bekleme süresi uygulanabilir.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a7">
            <AccordionTrigger>Adres ve kişisel bilgilerim gizli mi?</AccordionTrigger>
            <AccordionContent>
              Bekleyen taleplerde açık adres, telefon ve kişisel bilgiler maskelenir. Atanmamış nakliyeciler yalnızca gerekli özet bilgileri görür; detaylar eşleşme ve taşıma durumuna göre açılır.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a8">
            <AccordionTrigger>Hasar veya sorun yaşarsam ne yapmalıyım?</AccordionTrigger>
            <AccordionContent>
              Taşıma öncesi ve sonrası fotoğraf, not ve mesaj kayıtlarını saklayın. Destek ekibi, taşıma ve teklif kayıtları üzerinden süreci değerlendirir.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
