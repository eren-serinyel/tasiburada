import fs from 'node:fs';
import path from 'node:path';

describe('offer request price preview frontend contract', () => {
  const formPath = path.resolve(process.cwd(), 'shadcn-ui/src/components/OfferRequestForm.tsx');

  test('does not show hardcoded price estimate before real offers', () => {
    const source = fs.readFileSync(formPath, 'utf8');

    expect(source).toContain('availabilityHint');
    expect(source).toContain('Talebiniz yayına hazır');
    expect(source).not.toContain('previewEstimate');
    expect(source).not.toContain('Tahmini fiyat önizlemesi');
    expect(source).not.toMatch(/const\s+base\s*=\s*form\.scope\s*===\s*['"]sehirlerarasi['"]/);
    expect(source).not.toMatch(/transportMultiplier/);
  });

  test('carrier-specific request uses inspect and multi-select instead of immediate invite', () => {
    const source = fs.readFileSync(formPath, 'utf8');

    expect(source).toContain('selectedCarrierIds');
    expect(source).toContain('onReview={() => setReviewCarrierId(c.id)}');
    expect(source).toContain('onToggleSelect={() => toggleCarrierSelection(c.id)}');
    expect(source).toContain('İncele');
    expect(source).toContain('Seçildi');
    expect(source).not.toContain('Yayınla ve Davet Et');
    expect(source).not.toContain('/invite/${carrier.id}');
    expect(source).toContain('item.isVerified === true');
  });

  test('embedded carrier cards hide fake rating when there are no reviews', () => {
    const source = fs.readFileSync(formPath, 'utf8');

    expect(source).toContain('carrier.reviewCount > 0');
    expect(source).toContain('Yeni firma - henüz değerlendirme yok');
  });
});
