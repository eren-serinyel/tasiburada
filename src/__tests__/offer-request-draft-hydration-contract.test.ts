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
    expect(hydrationSource).toContain('const originDistrict = matchedOriginDistrict || (originCity ? toTrimmedString(formData.originDistrict) :');
    expect(hydrationSource).toContain('const destinationDistrict = matchedDestinationDistrict || (destinationCity ? toTrimmedString(formData.destinationDistrict) :');
    expect(formSource).toContain('normalizeOfferRequestDraftFormData(rawRestoredFormData)');
    expect(formSource).toContain('const next = { ...prev, ...restoredFormData, photos: [] };');
    expect(formSource).toContain("logDraftRestore('restore:setForm'");
  });

  test('async district option reconciliation preserves restored district values while normalizing matches', () => {
    expect(formSource).toContain('const mergeDistrictOptions = (districts: string[], selectedDistrict: string) => {');
    expect(formSource).toContain('return [current, ...districts];');
    expect(formSource).toContain('const originCity = form.originCity;');
    expect(formSource).toContain('if (prev.originCity !== originCity) return prev;');
    expect(formSource).toContain('const matchedDistrict = findLocationOption(prev.originDistrict, list);');
    expect(formSource).toContain('if (!prev.originDistrict || !matchedDistrict || matchedDistrict === prev.originDistrict) return prev;');
    expect(formSource).toContain('if (prev.originCity) {');
    expect(formSource).toContain("logDraftRestore('originDistricts:skipStaleEmptyCityClear'");
    expect(formSource).toContain('const destinationCity = form.destinationCity;');
    expect(formSource).toContain('if (prev.destinationCity !== destinationCity) return prev;');
    expect(formSource).toContain('const matchedDistrict = findLocationOption(prev.destinationDistrict, list);');
    expect(formSource).toContain('if (!prev.destinationDistrict || !matchedDistrict || matchedDistrict === prev.destinationDistrict) return prev;');
    expect(formSource).toContain('if (prev.destinationCity) {');
    expect(formSource).toContain("logDraftRestore('destinationDistricts:skipStaleEmptyCityClear'");
    expect(formSource).toContain('originDistrict: prev.originCity === v ? prev.originDistrict :');
    expect(formSource).toContain('destinationDistrict: prev.destinationCity === v ? prev.destinationDistrict :');
  });

  test('phone and final restore metadata survive authentication resume until successful publish', () => {
    expect(draftSource).toContain('phone?: string;');
    expect(formSource).toContain('phone: phone.trim()');
    expect(formSource).toContain("setPhone(draft.phone?.trim() ?? '')");
    expect(formSource).toContain('setPhone((prev) => prev.trim() ? prev : profilePhone)');
    expect(formSource).toContain('contactPhone: phone.trim()');
    expect(formSource).toContain('if (!phone.trim())');
    expect(formSource).toContain('clearGuestOfferDraft();');
  });

  test('restored draft data is not overwritten by empty autosave state after auth resume', () => {
    expect(formSource).toContain('const restoredDraftFormDataRef = useRef<Record<string, unknown> | null>(null);');
    expect(formSource).toContain('const restoredFormData = restoredDraftFormDataRef.current;');
    expect(formSource).toContain('isDraftValueEmpty(currentValue) && !isDraftValueEmpty(restoredValue)');
    expect(formSource).toContain('restoredDraftFormDataRef.current = restoredFormData;');
    expect(formSource).toContain('restoredDraftFormDataRef.current = formData;');
  });

  test('successful publish clears draft without allowing autosave to recreate it', () => {
    expect(formSource).toContain('const publishSucceededRef = useRef(false);');
    expect(formSource).toContain('if (publishSucceededRef.current) return;');
    expect(formSource).toContain('publishSucceededRef.current = true;');
    expect(formSource).toContain('clearGuestOfferDraft();');
  });

  test('publish and summary buttons use central validation reasons and route users to invalid step', () => {
    expect(formSource).toContain('const routeValidation = useMemo(() => {');
    expect(formSource).toContain('const loadValidation = useMemo(() => {');
    expect(formSource).toContain('const publishValidation = useMemo(() => {');
    expect(formSource).toContain('const canPublish = publishValidation.valid;');
    expect(formSource).toContain("title: publishValidation.title || 'Talep yayınlanamadı'");
    expect(formSource).toContain('goToStepKeepingFormInView(publishValidation.targetStep)');
    expect(formSource).toContain('setShowValidationErrors(true);');
  });

  test('step 1 continue button stays clickable and shows validation reasons instead of silently locking', () => {
    expect(formSource).toContain("title: routeValidation.title || 'Rota bilgileri eksik'");
    expect(formSource).toContain('description: routeValidation.message ||');
    expect(formSource).toContain('aria-disabled={!canNextFrom1}');
    expect(formSource).not.toMatch(/\sdisabled=\{!canNextFrom1\}/);
  });
});
