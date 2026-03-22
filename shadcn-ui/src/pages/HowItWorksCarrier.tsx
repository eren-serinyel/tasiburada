import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, ClipboardCheck, DollarSign, FileText, MessageSquare, Route, Truck, UserPlus } from 'lucide-react';
import { getSessionUser } from '@/lib/storage';

export default function HowItWorksCarrier() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
      setUser(u);
    } catch {}
  }, []);
  const steps = [
    {
      icon: UserPlus,
      title: 'Kayıt Ol / Giriş Yap',
      desc: 'Nakliyeci hesabı oluşturun veya mevcut hesabınızla giriş yapın.'
    },
    {
      icon: FileText,
      title: 'Profilinizi Tamamlayın',
      desc: 'Araç tipleri, kapasite, şehirler ve evraklarınızı ekleyin; daha çok iş görün.'
    },
    {
      icon: Route,
      title: 'Uygun İşleri Görüntüleyin',
      desc: 'Belirlediğiniz güzergâh ve kapasiteye uygun yayınlanmış işleri listeleyin.'
    },
    {
      icon: DollarSign,
      title: 'Teklif Verin',
      desc: 'Fiyat, tarih ve ek notlarınızı ekleyerek hızlıca teklif gönderin.'
    },
    {
      icon: MessageSquare,
      title: 'Müşteri ile İletişim',
      desc: 'Sorularınızı sorun, teslimat detaylarını mesajlaşma ile netleştirin.'
    },
    {
      icon: CheckCircle2,
      title: 'Onay ve Planlama',
      desc: 'Teklifiniz onaylanınca işi takviminize ekleyin ve rota planlaması yapın.'
    },
    {
      icon: Truck,
      title: 'Yükü Taşıyın',
      desc: 'Belirlenen tarih ve saatte yükü alın, güvenle teslim edin.'
    },
    {
      icon: ClipboardCheck,
      title: 'Teslimat Sonrası',
      desc: 'Teslimatı kapatın, müşteri değerlendirmesi alın ve kazancınızı görüntüleyin.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex flex-col items-center text-center gap-1 md:gap-2">
          <span className="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-md shadow-sm hover:bg-blue-100 transition-colors">Kılavuz</span>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
            Nasıl Çalışır — Nakliyeci
          </h1>
        </div>
        <p className="mt-3 text-gray-600 text-center">Taşıburada ile uygun işleri bulun, teklif verin ve takviminizi doldurun.</p>
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
            <li>Rekabetçi ama sürdürülebilir fiyat verin; detaylı notlarla güven verin.</li>
            <li>Takvim (<Calendar className="inline h-4 w-4" />) kullanılabilirliğinizi güncel tutun; uygunluk öne çıkar.</li>
            <li>Profil ve evraklarınız tam olsun; puan ve yorumlarınız daha çok iş getirir.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Nakliyeci sayfasında, giriş yapan kullanıcı müşteri ise CTA'lar gizlenir */}
      {user?.type !== 'customer' && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/ilanlar">
            <Button className="bg-sky-600 hover:bg-sky-700">Mevcut İşlere Göz At</Button>
          </Link>
          <Link to="/takvim">
            <Button variant="outline">Takvimim</Button>
          </Link>
        </div>
      )}

      <div className="mt-12">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="b1">
            <AccordionTrigger>Teklifimi geri çekebilir miyim?</AccordionTrigger>
            <AccordionContent>
              Müşteri onaylamadan önce teklifinizi düzenleyebilir veya geri çekebilirsiniz.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b2">
            <AccordionTrigger>Komisyonlar nasıl işliyor?</AccordionTrigger>
            <AccordionContent>
              Platform komisyonları ve ödeme koşulları teklif onayı öncesi şeffaf şekilde gösterilir.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b3">
            <AccordionTrigger>Ödemeyi ne zaman alırım?</AccordionTrigger>
            <AccordionContent>
              Teslimat tamamlanıp müşteri tarafından onaylandıktan sonra ödeme süreçleri başlar ve belirlenen süre içinde hesabınıza yansır.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b4">
            <AccordionTrigger>Belgelerim onaylanmadan teklif verebilir miyim?</AccordionTrigger>
            <AccordionContent>
              Bazı ilanlarda ön onay gerekebilir; belgeleriniz eksiksiz ve güncel olduğunda daha çok ilana erişirsiniz.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b5">
            <AccordionTrigger>Çifte rezervasyonları nasıl önlerim?</AccordionTrigger>
            <AccordionContent>
              Takviminizi güncel tutun ve onayladığınız işleri anında işaretleyin; sistem çakışmaları size uyarı olarak gösterir.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
