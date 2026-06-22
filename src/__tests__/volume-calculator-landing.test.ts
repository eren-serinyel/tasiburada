import fs from 'node:fs';
import path from 'node:path';

const {
  VOLUME_CALCULATOR_ALIAS_ROUTE,
  VOLUME_CALCULATOR_BENEFITS,
  VOLUME_CALCULATOR_FAQS,
  VOLUME_CALCULATOR_HERO,
  VOLUME_CALCULATOR_ROUTE,
  VOLUME_CALCULATOR_SEO,
  VOLUME_CALCULATOR_STEPS,
} = require('../../shadcn-ui/src/lib/volumeCalculatorLanding');

describe('volume calculator landing contract', () => {
  test('route and SEO metadata are stable', () => {
    expect(VOLUME_CALCULATOR_ROUTE).toBe('/nakliye-hacmi-hesapla');
    expect(VOLUME_CALCULATOR_ALIAS_ROUTE).toBe('/hacim-hesaplama');
    expect(VOLUME_CALCULATOR_SEO.title).toBe('Nakliye Hacmi Hesaplama | Taşıburadan');
    expect(VOLUME_CALCULATOR_SEO.description).toBe(
      'Ev ve ofis taşıması için tahmini hacim ve ağırlık hesaplayın, doğru araç önerisiyle nakliye teklifi alın.',
    );
    expect(VOLUME_CALCULATOR_HERO.h1).toBe('Nakliye Hacmi Hesaplama');
  });

  test('landing content covers benefits steps and FAQs', () => {
    expect(VOLUME_CALCULATOR_BENEFITS.map((b: { title: string }) => b.title)).toEqual([
      'Doğru araç önerisi',
      'Ek hizmet ihtiyacı',
      'Daha net fiyat teklifi',
      'Güvenli platform içi iletişim',
    ]);
    expect(VOLUME_CALCULATOR_STEPS).toEqual([
      'Eşyalarını seç',
      'Tahmini hacim/ağırlık gör',
      'İlanına uygula',
      'Nakliyecilerden teklif al',
    ]);
    expect(VOLUME_CALCULATOR_FAQS.map((faq: { question: string }) => faq.question)).toEqual([
      'Nakliye hacmi nasıl hesaplanır?',
      'Hacim hesabı kesin fiyat verir mi?',
      'Hangi araç gerekir?',
      'Asansörlü taşıma ne zaman gerekir?',
      'Platform dışı iletişim neden önerilmez?',
    ]);
  });

  test('App and navigation expose the landing route', () => {
    const appSource = fs.readFileSync(path.resolve(process.cwd(), 'shadcn-ui/src/App.tsx'), 'utf8');
    const navbarSource = fs.readFileSync(path.resolve(process.cwd(), 'shadcn-ui/src/components/Navbar.tsx'), 'utf8');

    expect(appSource).toContain('path="/nakliye-hacmi-hesapla"');
    expect(appSource).toContain('path="/hacim-hesaplama"');
    expect(navbarSource).toContain("to: '/nakliye-hacmi-hesapla'");
    expect(navbarSource).toContain('Hacim Hesapla');
  });

  test('calculator CTA can open the existing offer form converter', () => {
    const landingSource = fs.readFileSync(path.resolve(process.cwd(), 'shadcn-ui/src/pages/VolumeCalculatorLanding.tsx'), 'utf8');
    const offerFormSource = fs.readFileSync(path.resolve(process.cwd(), 'shadcn-ui/src/components/OfferRequestForm.tsx'), 'utf8');

    expect(landingSource).toContain('/teklif-talebi?volumeEstimate=1');
    expect(landingSource).toContain('/teklif-talebi');
    expect(offerFormSource).toContain("searchParams.get('calculator') === '1'");
    expect(offerFormSource).toContain('setIsVolumeCalculatorOpen(true)');
  });
});
