import fs from 'node:fs';
import path from 'node:path';

describe('offer request login gate frontend contract', () => {
  const filePath = path.resolve(process.cwd(), 'shadcn-ui/src/components/OfferRequestForm.tsx');
  const draftHelperPath = path.resolve(process.cwd(), 'shadcn-ui/src/lib/guestOfferDraft.ts');
  const source = fs.readFileSync(filePath, 'utf8');
  const draftHelper = fs.readFileSync(draftHelperPath, 'utf8');

  test('guest draft flow allows form selection and gates only publish', () => {
    expect(draftHelper).toContain("export const GUEST_OFFER_DRAFT_KEY = 'tasiburadan:guest-offer-draft:v1';");
    expect(draftHelper).toContain('export const GUEST_OFFER_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;');
    expect(draftHelper).toContain('window.sessionStorage');
    expect(draftHelper).toContain('indexedDB.open');
    expect(draftHelper).toContain("export const LEGACY_SHIPMENT_DRAFT_KEY = 'tasiburada:shipment-draft:v1';");
    expect(source).toContain('const requireLoginForSelection = (_message?: string) => true;');
    expect(source).toContain('await saveCurrentGuestDraft({ markIntent: true });');
    expect(source).toContain("params.set('resumeGuestDraft', '1');");
    expect(source).toContain("searchParams.get('resumeGuestDraft') === '1'");
    expect(source).toContain('setShowLoginModal(true);');
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
    expect(source).not.toContain('Aradiginiz hizmet yok mu? Ozel istek ekleyin');
    expect(source).not.toContain('const toggleExtraService = (id: string)');
  });

  test('guest publish CTA stays active and explains login requirement', () => {
    expect(source).toContain('disabled={submitting}');
    expect(source).toContain('disabled={Boolean(authRedirecting)}');
    expect(source).not.toContain('disabled={submitting || !canPublish}');
  });

  test('auth pages only follow safe relative redirects', () => {
    const login = fs.readFileSync(path.resolve(process.cwd(), 'shadcn-ui/src/pages/Login.tsx'), 'utf8');
    const register = fs.readFileSync(path.resolve(process.cwd(), 'shadcn-ui/src/pages/RegisterUser.tsx'), 'utf8');

    expect(draftHelper).toContain('export const isSafeRelativePath');
    expect(login).toContain("navigate(isSafeRelativePath(redirect) ? redirect : '/home');");
    expect(register).toContain("navigate(isSafeRelativePath(redirect) ? redirect : '/');");
  });
});
