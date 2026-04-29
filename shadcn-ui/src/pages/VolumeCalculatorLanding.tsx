import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, Calculator, CheckCircle2, MessageCircle, ShieldCheck, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  VOLUME_CALCULATOR_BENEFITS,
  VOLUME_CALCULATOR_FAQS,
  VOLUME_CALCULATOR_HERO,
  VOLUME_CALCULATOR_SEO,
  VOLUME_CALCULATOR_STEPS,
} from '@/lib/volumeCalculatorLanding';

const benefitIcons = [Truck, Boxes, Calculator, ShieldCheck];

export default function VolumeCalculatorLanding() {
  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content') || '';

    document.title = VOLUME_CALCULATOR_SEO.title;
    metaDescription?.setAttribute('content', VOLUME_CALCULATOR_SEO.description);

    return () => {
      document.title = previousTitle;
      metaDescription?.setAttribute('content', previousDescription);
    };
  }, []);

  return (
    <div className="bg-white text-slate-900">
      <section
        className="relative overflow-hidden bg-slate-950"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(15,23,42,0.88), rgba(15,23,42,0.72), rgba(15,23,42,0.2)), url('https://source.unsplash.com/ctXcNX1b4Oo/1800x1100')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mx-auto grid min-h-[620px] max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="max-w-3xl">
            <Badge className="mb-5 border-white/20 bg-white/10 text-white hover:bg-white/10">
              nakliye hacmi hesaplama
            </Badge>
            <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
              {VOLUME_CALCULATOR_HERO.h1}
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-semibold leading-8 text-white">
              {VOLUME_CALCULATOR_HERO.headline}
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
              {VOLUME_CALCULATOR_HERO.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-slate-100">
                <Link to="/teklif-talebi?calculator=1">
                  Hacmi Hesapla
                  <Calculator className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/teklif-talebi">
                  Nakliye Teklifi Al
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/90 p-5 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-500">Örnek sonuç</div>
                <div className="text-lg font-bold text-slate-950">2+1 ev taşıması</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 py-5">
              {[
                ['Tahmini hacim', '18-24 m³'],
                ['Tahmini ağırlık', '1.250 kg'],
                ['Araç önerisi', 'Kamyonet'],
                ['Ek hizmet', 'Asansör kontrolü'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">{label}</div>
                  <div className="mt-1 text-base font-bold text-slate-950">{value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              Hacim tahmini ilanınıza uygulandığında nakliyeciler daha net kapasite ve hizmet kapsamı ile teklif verebilir.
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-4">
            {VOLUME_CALCULATOR_BENEFITS.map((benefit, index) => {
              const Icon = benefitIcons[index] || CheckCircle2;
              return (
                <Card key={benefit} className="border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <Icon className="h-6 w-6 text-blue-600" />
                    <div className="mt-4 text-base font-semibold text-slate-950">{benefit}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Nakliye teklifi alırken karar vermeyi kolaylaştıran net bir operasyon sinyali sağlar.
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <Badge variant="outline" className="mb-4">Nasıl çalışır?</Badge>
            <h2 className="text-3xl font-bold text-slate-950">Eşya bilgisinden teklif almaya</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Ev taşıma hacim hesaplama, ofis taşıması ve parça eşya için hızlı bir ön hazırlık sağlar. Böylece taşınacak eşya hacmi ile araç kapasitesi daha uyumlu olur.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {VOLUME_CALCULATOR_STEPS.map((step, index) => (
              <div key={step} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-950">{step}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {index === 0 && 'Oda tipi veya eşya listesini seçerek hesaplamayı başlatın.'}
                  {index === 1 && 'Tahmini hacim, ağırlık ve nakliye aracı seçimi için öneriyi görün.'}
                  {index === 2 && 'Hesaplanan bilgileri taşıma ilanınıza aktarın.'}
                  {index === 3 && 'Nakliyecilerden daha anlaşılır ve karşılaştırılabilir teklif alın.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div>
            <Badge variant="outline" className="mb-4">Sık sorulan sorular</Badge>
            <h2 className="text-3xl font-bold text-slate-950">Nakliye hacmi ve teklif süreci</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Nakliye hacmi hesaplama kesin fiyat yerine doğru hazırlık sağlar. Platform içi iletişimle teklif kapsamı, ek hizmetler ve taşıma tarihi daha güvenli ilerler.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-blue-100 bg-white p-4 text-sm text-slate-700">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Teklif ve mesajlaşma sürecini platform üzerinden sürdürün.
            </div>
          </div>
          <Accordion type="single" collapsible className="rounded-xl border border-slate-200 bg-white px-4">
            {VOLUME_CALCULATOR_FAQS.map((faq, index) => (
              <AccordionItem key={faq.question} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-base font-semibold text-slate-950">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-slate-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Taşıma ilanını daha net bilgilerle oluştur</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hacim/ağırlık tahmini, ek hizmet ihtiyacı ve doğru araç önerisiyle nakliye teklifi al.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg">
              <Link to="/teklif-talebi?calculator=1">Hacmi Hesapla</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/teklif-talebi">Nakliye Teklifi Al</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
