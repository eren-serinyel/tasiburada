import fs from 'node:fs';
import path from 'node:path';

describe('volume calculator UX frontend contract', () => {
  const root = process.cwd();
  const modalPath = path.resolve(root, 'shadcn-ui/src/components/converter/VolumeCalculatorModal.tsx');
  const formPath = path.resolve(root, 'shadcn-ui/src/components/OfferRequestForm.tsx');
  const landingPath = path.resolve(root, 'shadcn-ui/src/pages/VolumeCalculatorLanding.tsx');
  const converterApiPath = path.resolve(root, 'shadcn-ui/src/lib/converterApi.ts');
  const itemSelectorPath = path.resolve(root, 'shadcn-ui/src/components/converter/ItemSelector.tsx');

  test('confidence and apply copy are Turkish and actionable', () => {
    const source = fs.readFileSync(modalPath, 'utf8');

    expect(source).toContain("low: 'Düşük'");
    expect(source).toContain("medium: 'Orta'");
    expect(source).toContain("high: 'Yüksek'");
    expect(source).toContain("applyLabel = 'Bu bilgileri talebime ekle'");
    expect(source).not.toContain("low: 'low'");
    expect(source).not.toContain("medium: 'medium'");
    expect(source).not.toContain("high: 'high'");
    expect(source).not.toContain("applyLabel = 'Forma Uygula'");
  });

  test('vehicle and weight result copy sets clear expectations', () => {
    const source = fs.readFileSync(modalPath, 'utf8');

    expect(source).toContain('VEHICLE_HINTS');
    expect(source).toContain('~14 m³ · 2+1 ev');
    expect(source).toContain('Ağırlık kabaca tahmindir');
    expect(source).toContain('dediğinizde tahmini ağırlık, önerilen araç tercihi ve eşya özeti');
    expect(source).toContain('selectedSpecialLabels');
    expect(source).toContain('Küçük (~0,2 m³)');
  });

  test('landing stores converter result in durable localStorage and form restores it', () => {
    const landing = fs.readFileSync(landingPath, 'utf8');
    const form = fs.readFileSync(formPath, 'utf8');

    expect(landing).toContain('tasiburada:volume-calculator-estimate:v1');
    expect(landing).toContain('localStorage.setItem(VOLUME_ESTIMATE_DRAFT_KEY');
    expect(form).toContain('localStorage.getItem(VOLUME_ESTIMATE_DRAFT_KEY)');
    expect(form).toContain('localStorage.removeItem(VOLUME_ESTIMATE_DRAFT_KEY)');
  });

  test('offer form makes volume calculator part of the main request flow', () => {
    const form = fs.readFileSync(formPath, 'utf8');

    expect(form).toContain('Ev tipinizden emin değil misiniz? 30 saniyede hacim hesaplayalım');
    expect(form).toContain('Hacim Hesapla ile tahmini ağırlığı otomatik doldurun');
    expect(form).toContain('30 saniyede hacim ve yaklaşık ağırlık hesaplayalım');
    expect(form).toContain('için tahmini');
  });

  test('guest volume calculator calls do not attach stale auth tokens', () => {
    const source = fs.readFileSync(converterApiPath, 'utf8');

    expect(source).toContain("apiClient('/converter/sessions'");
    expect(source).toContain("apiClient(`/converter/sessions/${sessionId}/estimate`");
    expect(source).toContain("apiClient('/converter/items', { skipAuth: true })");
    expect((source.match(/skipAuth: true/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  test('item quantities are bounded by item type instead of a blanket 999 cap', () => {
    const source = fs.readFileSync(itemSelectorPath, 'utf8');

    expect(source).toContain('getCatalogItemQuantityLimit');
    expect(source).toContain('box: 200');
    expect(source).toContain('special: 5');
    expect(source).not.toContain('max={999}');
  });
});
