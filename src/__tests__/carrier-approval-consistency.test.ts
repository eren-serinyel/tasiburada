import fs from 'node:fs';
import path from 'node:path';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import {
  calculateApprovalProfilePercentage,
  computeCarrierApprovalReadiness,
} from '../application/services/carrier/CarrierApprovalCriteria';

const source = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('carrier approval/profile criterion consistency', () => {
  test('missing sections are structured and the percentage uses the same six sections', () => {
    const readiness = computeCarrierApprovalReadiness({
      companyName: 'Tutarlılık Nakliyat',
      taxNumber: '1234567890',
      phone: '05555555555',
      email: 'tutarlilik@example.com',
      foundedYear: 2020,
      approvalState: CarrierApprovalState.DRAFT,
      draftRevision: 0,
      lastReviewedDraftRevision: 0,
      activity: { city: 'İstanbul', district: 'Kadıköy', serviceAreasJson: ['İstanbul'] },
      vehicleTypeLinks: [],
      serviceTypeLinks: [],
      documents: [],
      earnings: undefined,
    } as unknown as Carrier);

    expect(readiness.missingSections).toEqual(['services', 'documents', 'vehicles', 'paymentInfo']);
    expect(calculateApprovalProfilePercentage(readiness.sections)).toBe(33);
    expect(readiness.isReadyForSubmission).toBe(false);
  });

  test('checklist, single-toast handling and verified badges are wired in the frontend', () => {
    const profileComplete = source('shadcn-ui/src/pages/ProfileComplete.tsx');
    const profile = source('shadcn-ui/src/pages/Profile.tsx');
    const navbar = source('shadcn-ui/src/components/Navbar.tsx');
    const adminCarriers = source('shadcn-ui/src/pages/admin/AdminCarriers.tsx');

    expect(profileComplete).toContain("key: 'servicesCompleted', label: 'Hizmetlerim'");
    expect(profileComplete).toContain("key: 'vehiclesCompleted', label: 'Araçlarım'");
    expect(profile).toContain('suppressErrorToast: true');
    expect(profile).toContain('json?.missingSections');
    expect(navbar).toContain('aria-label="Onaylı nakliyeci"');
    expect(adminCarriers).toContain('aria-label="Onaylı nakliyeci"');
  });

  test('future seed and idempotent backfill both set the canonical approved state', () => {
    const seeder = source('src/database/seed/seeders/carrierSeeder.ts');
    const backfill = source('src/database/seed/backfills/backfillReadySeedCarrierApprovals.ts');

    expect(seeder).toContain('verifiedByAdmin: isApprovalReady');
    expect(seeder).toContain('CarrierApprovalState.APPROVED');
    expect(backfill).toContain('computeCarrierApprovalReadiness(carrier)');
    expect(backfill).toContain('approvalState: CarrierApprovalState.APPROVED');
  });
});
