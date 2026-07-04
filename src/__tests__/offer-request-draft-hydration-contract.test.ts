import fs from 'node:fs';
import path from 'node:path';

describe('offer request draft hydration contract', () => {
  const formSource = fs.readFileSync(
    path.resolve(process.cwd(), 'shadcn-ui/src/components/OfferRequestForm.tsx'),
    'utf8',
  );
  const hydrationSource = fs.readFileSync(
    path.resolve(process.cwd(), 'shadcn-ui/src/lib/offerRequestHydration.ts'),
    'utf8',
  );
  const draftSource = fs.readFileSync(
    path.resolve(process.cwd(), 'shadcn-ui/src/lib/guestOfferDraft.ts'),
    'utf8',
  );

  test('restored route fields are normalized before form state and summary are hydrated', () => {
    expect(hydrationSource).toContain('export const findLocationOption =');
    expect(hydrationSource).toContain('getDistrictsForCitySync(originCity)');
    expect(hydrationSource).toContain('getDistrictsForCitySync(destinationCity)');
    expect(hydrationSource).toContain("warnings.push('Çıkış ilçesi mevcut ilçe listesinde bulunamadı.')");
    expect(formSource).toContain('normalizeOfferRequestDraftFormData(rawRestoredFormData)');
    expect(formSource).toContain('setForm(prev => ({ ...prev, ...restoredFormData, photos: [] }))');
  });

  test('async district option reconciliation uses latest form state instead of stale restore closures', () => {
    expect(formSource).toContain('const originCity = form.originCity;');
    expect(formSource).toContain('if (prev.originCity !== originCity) return prev;');
    expect(formSource).toContain('if (!prev.originDistrict || list.includes(prev.originDistrict)) return prev;');
    expect(formSource).toContain('const destinationCity = form.destinationCity;');
    expect(formSource).toContain('if (prev.destinationCity !== destinationCity) return prev;');
    expect(formSource).toContain('if (!prev.destinationDistrict || list.includes(prev.destinationDistrict)) return prev;');
  });

  test('phone and final restore metadata survive authentication resume until successful publish', () => {
    expect(draftSource).toContain('phone?: string;');
    expect(formSource).toContain('phone: phone.trim()');
    expect(formSource).toContain("setPhone(draft.phone?.trim() ?? '')");
    expect(formSource).toContain('setPhone((prev) => prev.trim() ? prev : profilePhone)');
    expect(formSource).toContain('clearGuestOfferDraft();');
  });

  test('publish and summary buttons use central validation reasons and route users to invalid step', () => {
    expect(formSource).toContain('const routeValidation = useMemo(() => {');
    expect(formSource).toContain('const loadValidation = useMemo(() => {');
    expect(formSource).toContain('const publishValidation = useMemo(() => {');
    expect(formSource).toContain('const canPublish = publishValidation.valid;');
    expect(formSource).toContain("title: publishValidation.title || 'Talep yayınlanamadı'");
    expect(formSource).toContain('goToStepKeepingFormInView(publishValidation.targetStep)');
  });
});
