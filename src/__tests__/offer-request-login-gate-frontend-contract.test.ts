import fs from 'node:fs';
import path from 'node:path';

describe('offer request login gate frontend contract', () => {
  const filePath = path.resolve(process.cwd(), 'shadcn-ui/src/components/OfferRequestForm.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  test('guest draft flow allows form selection and gates only publish', () => {
    expect(source).toContain("const DRAFT_KEY = 'tasiburada:shipment-draft:v1';");
    expect(source).toContain('const requireLoginForSelection = (_message?: string) => true;');
    expect(source).toContain("localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data, savedAt: Date.now() }))");
    expect(source).toContain('if (!isLoggedIn) { setShowLoginModal(true); return; }');
    expect(source).toContain('reason=shipment-draft');
  });

  test('critical step 2 selectors still pass through the guest-safe helper', () => {
    const guardedPatterns = [
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('transportType', tc\.value\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('placeType', v\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('loadType', v\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('weightKg', e\.target\.value\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('floor', e\.target\.value\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('hasElevator', e\.target\.checked\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('timeWindow', v\);/,
    ];

    for (const pattern of guardedPatterns) {
      expect(source).toMatch(pattern);
    }
  });

  test('step 4 no longer renders duplicate general extra-service picker', () => {
    expect(source).not.toContain('Ek hizmet ara ve ekle');
    expect(source).not.toContain('Aradığınız hizmet yok mu? Özel istek ekleyin');
    expect(source).not.toContain('const toggleExtraService = (id: string)');
  });

  test('guest publish CTA stays active and explains login requirement', () => {
    expect(source).toContain('Giriş yap ve yayınla');
    expect(source).toContain('Talebinizi yayınlamak için giriş yapmanız gerekir.');
    expect(source).toContain('Yayınlamak için giriş gerekir. Bilgileriniz kaybolmaz.');
    expect(source).toContain('disabled={submitting}');
    expect(source).not.toContain('disabled={submitting || !canPublish}');
  });
});
