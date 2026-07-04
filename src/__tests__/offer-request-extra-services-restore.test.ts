import fs from 'node:fs';
import path from 'node:path';

const helperPath = path.resolve(process.cwd(), 'shadcn-ui/src/lib/offerRequestServices.ts');

describe('offer request extra services restore', () => {
  test('service restore helper normalizes ids and reconciles only after services are available', () => {
    const helper = fs.readFileSync(helperPath, 'utf8');

    expect(helper).toContain('export const normalizeServiceId =');
    expect(helper).toContain('values.map(normalizeServiceId)');
    expect(helper).toContain('export const normalizeRequestedCarrierServices =');
    expect(helper).toContain('export const reconcileRequestedCarrierServices =');
    expect(helper).toContain('if (!carrierGroup || availableItems.length === 0)');
    expect(helper).toContain('removedCount += services.catalogServiceIds.length - catalogServiceIds.length;');
    expect(helper).toContain('removedCount += services.customServiceIds.length - customServiceIds.length;');
  });

  test('extra services summary buttons use the shared summary handler instead of final publish disabled state', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'shadcn-ui/src/components/OfferRequestForm.tsx'),
      'utf8',
    );

    expect(source).toContain('const summaryValidation = useMemo(() => {');
    expect(source).toContain('const openSummaryStep = () => {');
    expect(source).toContain('disabled={isSummaryLoadingBlocked}');
    expect(source).toContain('onClick={openSummaryStep}');
    expect(source).toContain('reconcileRequestedCarrierServices(');
    expect(source).toContain('requestedCarrierServiceSummary');
    expect(source).toContain('Nakliyeciye özel ek hizmetler');
    expect(source).not.toContain('disabled={!canPublish}');
  });
});
