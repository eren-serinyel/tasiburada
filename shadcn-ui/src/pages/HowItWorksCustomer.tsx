import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ClipboardList, Image as ImageIcon, MapPin, MessageSquare, Send, Truck, UserPlus, Wallet } from 'lucide-react';
import { getSessionUser } from '@/lib/storage';

export default function HowItWorksCustomer() {
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
      desc: 'Hızlıca üye olun ya da hesabınıza giriş yapın. Profil bilgilerinizi daha sonra da tamamlayabilirsiniz.'
    },
    {
      icon: ClipboardList,
      title: 'Yeni Taşıma Talebi Oluşturun',
      desc: 'Gönderici ve alıcı adreslerini, tarih ve zaman aralığını, yük türü ve ölçülerini girin.'
    },
    {
      icon: ImageIcon,
      title: 'Fotoğraf ve Not Ekleyin',
      desc: 'Yüke dair fotoğraflar ve nakliyeciye özel notlar ekleyerek işi netleştirin.'
    },
    {
      icon: Send,
      title: 'Talebi Yayınlayın',
      desc: 'Talebiniz yayına alınır ve uygun nakliyeciler tarafından görüntülenir.'
    },
    {
      icon: Wallet,
      title: 'Teklifleri Görün ve Karşılaştırın',
      desc: 'Fiyat, tarih, taşıyıcı puanı ve yorumlara göre teklifleri karşılaştırın.'
    },
    {
      icon: CheckCircle2,
      title: 'Nakliyeciyi Seçin ve Onaylayın',
      desc: 'Seçtiğiniz teklifi onaylayın, nakliyeciyle mesajlaşarak detayları netleştirin.'
    },
    {
      icon: Truck,
      title: 'Yükünüz Taşınsın',
      desc: 'Nakliyeci planlanan tarihte yükü adresten alır ve teslimatı gerçekleştirir.'
    },
    {
      icon: MessageSquare,
      title: 'Değerlendirme ve Geri Bildirim',
      desc: 'Deneyiminizi puanlayın ve yorum bırakın; diğer müşterilere yardımcı olun.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex flex-col items-center text-center gap-1 md:gap-2">
          <span className="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-md shadow-sm hover:bg-blue-100 transition-colors">Kılavuz</span>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
            Nasıl Çalışır — Müşteri
          </h1>
        </div>
        <p className="mt-3 text-gray-600 text-center">Bu adımları izleyerek birkaç dakika içinde taşıma talebi oluşturabilir ve teklifleri karşılaştırabilirsiniz.</p>
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
            <li>Adresleri mümkün olduğunca detaylı girin; <MapPin className="inline h-4 w-4" /> konum doğruluğu teklif kalitesini artırır.</li>
            <li>Tarih aralığını geniş tutmak daha uygun fiyatlı teklifler getirir.</li>
            <li>Fotoğraf eklemek muğlaklıkları azaltır ve sürpriz maliyetleri önler.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Müşteri sayfasında, giriş yapan kullanıcı nakliyeci ise CTA'lar gizlenir */}
      {user?.type !== 'carrier' && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/create-shipment">
            <Button className="bg-blue-600 hover:bg-blue-700">Hemen Talep Oluştur</Button>
          </Link>
          <Link to="/shipments">
            <Button variant="outline">Taleplerimi Gör</Button>
          </Link>
        </div>
      )}

      <div className="mt-12">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="a1">
            <AccordionTrigger>Talebim yayınlandıktan sonra ne olur?</AccordionTrigger>
            <AccordionContent>
              Uygun kriterlere sahip nakliyeciler talebinizi görür ve teklif gönderir. Yeni teklif geldiğinde bildirim alırsınız.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a2">
            <AccordionTrigger>Fiyatı nasıl karşılaştırmalıyım?</AccordionTrigger>
            <AccordionContent>
              Sadece fiyata değil, nakliyecinin puanı, yorumları ve tarih uygunluğuna da bakmanızı öneririz.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a3">
            <AccordionTrigger>Ödemeyi nasıl yaparım?</AccordionTrigger>
            <AccordionContent>
              Ödemeler güvenli altyapımız üzerinden gerçekleştirilir; teklif onayı öncesinde toplam tutar ve olası ek ücretler şeffaf şekilde gösterilir.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a4">
            <AccordionTrigger>Onayladığım işi iptal edebilir miyim?</AccordionTrigger>
            <AccordionContent>
              İptal koşulları, işin durumuna ve zamana göre değişebilir. Onaydan kısa süre sonra ücretsiz iptal mümkün olabilir; detaylar onay ekranında yer alır.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a5">
            <AccordionTrigger>Randevu tarihini değiştirebilir miyim?</AccordionTrigger>
            <AccordionContent>
              Nakliyeci ile mesajlaşarak yeni tarih önerisi sunabilirsiniz. Uygunluk olduğunda takvim güncellenir; fiyat değişikliği gerekebilir.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a6">
            <AccordionTrigger>Hasar olursa ne yapmalıyım?</AccordionTrigger>
            <AccordionContent>
              Teslimat öncesi ve sonrası fotoğraf çekip uygulamaya yükleyin. Destek ekibimiz ve nakliyeci ile süreç hızlıca değerlendirilir.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a7">
            <AccordionTrigger>Adres ve kişisel bilgilerim gizli mi?</AccordionTrigger>
            <AccordionContent>
              Bilgileriniz sadece ilgili ilan ve teklif sürecinde yetkili taraflarla paylaşılır; gizlilik politikamız uyarınca korunur.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
