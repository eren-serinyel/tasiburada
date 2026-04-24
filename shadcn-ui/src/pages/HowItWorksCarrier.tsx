import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ClipboardCheck,
  DollarSign,
  FileText,
  MessageSquare,
  Route,
  ShieldCheck,
  Truck,
  UserPlus,
} from 'lucide-react';
import { getSessionUser } from '@/lib/storage';

export default function HowItWorksCarrier() {
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
      title: 'Nakliyeci hesabı açın',
      desc: 'Firma hesabınızı oluşturun veya mevcut hesabınızla giriş yapın. İş akışı nakliyeci rolüyle ilerler.'
    },
    {
      icon: FileText,
      title: 'Profilinizi tamamlayın',
      desc: 'Firma bilgileri, faaliyet alanı, zorunlu belgeler ve ödeme bilgileri profil tamamlanma yüzdesini oluşturur. Araç ve hizmet bilgileri eşleşme kalitesini artırır.'
    },
    {
      icon: ShieldCheck,
      title: 'Onay sürecini tamamlayın',
      desc: 'Teklif verebilmek için profilinizin en az %75 tamamlanması ve hesabınızın admin tarafından onaylanması gerekir.'
    },
    {
      icon: Route,
      title: 'Uygun talepleri görüntüleyin',
      desc: 'Sistem rota, kapsam, hizmet alanı ve kapasiteye göre eşleşen bekleyen talepleri gösterir. Müşteri adı, açık adres ve telefon teklif öncesinde maskelenir.'
    },
    {
      icon: DollarSign,
      title: 'Teklif verin',
      desc: 'Fiyat, tahmini süre ve açıklama ekleyin. Minimum teklif tutarı sistem ayarlarından gelir; aynı talebe yeniden teklif verirseniz aktif teklifiniz güncellenir.'
    },
    {
      icon: MessageSquare,
      title: 'Teklifinizi yönetin',
      desc: 'Müşteri kabul edene kadar teklifinizi güncelleyebilir veya geri çekebilirsiniz. Telefon, e-posta ve link içeren mesajlar güvenlik politikasıyla engellenir.'
    },
    {
      icon: Truck,
      title: 'Eşleşen işi taşıyın',
      desc: 'Teklifiniz kabul edildiğinde taşıma size atanır. Açık iletişim bilgileri yalnızca eşleşme sonrası, taşıma zamanına yaklaşıldığında veya taşıma sırasında açılır.'
    },
    {
      icon: ClipboardCheck,
      title: 'Tamamlayın ve kazancı görün',
      desc: 'Taşımayı başlatıp tamamladığınızda müşteri bilgilendirilir. Tamamlanan iş kazanç kayıtlarınıza ve performans istatistiklerinize yansır.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex flex-col items-center text-center gap-1 md:gap-2">
          <span className="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-md shadow-sm hover:bg-blue-100 transition-colors">Kılavuz</span>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
            Nasıl Çalışır - Nakliyeci
          </h1>
        </div>
        <p className="mt-3 text-gray-600 text-center">
          Taşıburada'da onaylı profilinizle uygun talepleri görür, kontrollü iletişimle teklif verir ve tamamlanan işlerden kazanç elde edersiniz.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {steps.map((s, i) => (
          <Card key={s.title} className="border border-gray-200">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                <s.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-base md:text-lg">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white text-xs font-semibold">{i + 1}</span>
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
          <CardTitle>İş Kazanma İpuçları</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-600">
          <ul className="list-disc pl-5 space-y-2">
            <li>Firma, faaliyet, belge ve ödeme bilgilerinizi güncel tutun; eksik profil teklif verme ve görünürlükte sorun çıkarabilir.</li>
            <li>Takvim (<Calendar className="inline h-4 w-4" />) ve araç kapasitesi bilgilerini doğru tutun; sistem uygun talepleri buna göre filtreler.</li>
            <li>Teklif notuna telefon, e-posta, link veya platform dışı iletişim çağrısı eklemeyin; bu içerikler otomatik engellenir.</li>
          </ul>
        </CardContent>
      </Card>

      {user?.type !== 'customer' && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/ilanlar">
            <Button className="bg-sky-600 hover:bg-sky-700">Uygun Taleplere Göz At</Button>
          </Link>
          <Link to="/nakliyeci/teklifler">
            <Button variant="outline">Tekliflerimi Yönet</Button>
          </Link>
        </div>
      )}

      <div className="mt-12">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="b1">
            <AccordionTrigger>Neden bazı talepleri göremiyorum?</AccordionTrigger>
            <AccordionContent>
              Bekleyen talepler hizmet alanı, rota, kapsam ve taşıma kapasitesi gibi bilgilerle eşleştirilir. Profilinizdeki araç, hizmet ve faaliyet alanı bilgileri eksikse uygun talepler azalabilir.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b2">
            <AccordionTrigger>Belgelerim onaylanmadan teklif verebilir miyim?</AccordionTrigger>
            <AccordionContent>
              Teklif verebilmek için profiliniz en az %75 tamamlanmalı ve hesabınız admin tarafından onaylanmış olmalıdır. Eksik belge veya onay bekleyen hesap teklif gönderemez.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b3">
            <AccordionTrigger>Teklifimi geri çekebilir miyim?</AccordionTrigger>
            <AccordionContent>
              Müşteri kabul etmeden önce bekleyen teklifinizi güncelleyebilir veya geri çekebilirsiniz. Kabul edilmiş tekliflerde geri çekme işlemi taşımanın durumuna göre sistem kurallarıyla değerlendirilir.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b4">
            <AccordionTrigger>Müşterinin telefonunu ve açık adresini ne zaman görürüm?</AccordionTrigger>
            <AccordionContent>
              Teklif aşamasında müşteri bilgileri maskelenir. Eşleşen nakliyeci olarak açık adres ve telefon bilgilerine yalnızca taşıma zamanına yaklaşıldığında veya taşıma sırasında, politika şartları sağlandığında erişebilirsiniz.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b5">
            <AccordionTrigger>Komisyonlar nasıl işliyor?</AccordionTrigger>
            <AccordionContent>
              Platform komisyonu ve minimum komisyon tutarı yönetim ayarlarından belirlenir. Tamamlanan taşımalarda net kazanç, kayıtlarınıza komisyon sonrası yansıtılır.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b6">
            <AccordionTrigger>Ödemeyi ne zaman alırım?</AccordionTrigger>
            <AccordionContent>
              Taşıma tamamlandığında kazanç kaydı oluşturulur ve ödeme bilgileriniz üzerinden takip edilir. Ödeme süreleri, platformun güncel ödeme ve komisyon ayarlarına göre ilerler.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b7">
            <AccordionTrigger>Çifte rezervasyonları nasıl önlerim?</AccordionTrigger>
            <AccordionContent>
              Takviminizi ve uygunluk bilgilerinizi düzenli güncelleyin. Kabul edilen işlerinizi Taşıma Detayı ve Teklif Yönetimi ekranlarından takip ederek aynı tarih aralığına yeni teklif verirken kontrol edin.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
