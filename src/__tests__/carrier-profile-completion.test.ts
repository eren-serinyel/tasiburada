import { buildCarrierProfileCompletionSummary } from '../lib/carrierProfileCompletion';

const completeCarrier = {
  companyName: 'Sile Lojistik',
  phone: '05555555555',
  activityCity: 'Istanbul',
  addressLine1: 'Merkez Mah. No: 1',
  taxNumber: '1234567890',
};

describe('carrier profile completion mapper', () => {
  test('counts only company info as 20 percent', () => {
    const summary = buildCarrierProfileCompletionSummary({ carrier: completeCarrier });

    expect(summary.percentage).toBe(20);
    expect(summary.completedCount).toBe(1);
    expect(summary.missingItems).toContain('tax_document');
    expect(summary.missingItems).toContain('admin_approval');
  });

  test('company, tax plate, and K authorization count as 60 percent', () => {
    const summary = buildCarrierProfileCompletionSummary({
      carrier: completeCarrier,
      documents: [
        { type: 'TAX_PLATE', fileUrl: '/uploads/tax.pdf' },
        { type: 'AUTHORIZATION_CERT', fileUrl: '/uploads/k.pdf' },
      ],
    });

    expect(summary.percentage).toBe(60);
    expect(summary.missingItems).toEqual(['vehicle_photos', 'admin_approval']);
  });

  test('all prerequisites without admin approval stay at 80 percent and ready for approval', () => {
    const summary = buildCarrierProfileCompletionSummary({
      carrier: completeCarrier,
      documents: [
        { type: 'TAX_PLATE', fileUrl: '/uploads/tax.pdf' },
        { type: 'AUTHORIZATION_CERT', fileUrl: '/uploads/k.pdf' },
      ],
      vehicles: [{ isActive: true, photoUrls: ['/uploads/vehicle.jpg'] }],
    });

    expect(summary.percentage).toBe(80);
    expect(summary.statusText).toBe('Onaya g\u00f6nder');
    expect(summary.steps.find((step) => step.key === 'admin_approval')?.completed).toBe(false);
  });

  test('admin approval is only completed by verifiedByAdmin', () => {
    const pendingSummary = buildCarrierProfileCompletionSummary({
      carrier: { ...completeCarrier, pendingApproval: true },
      documents: [
        { type: 'TAX_PLATE', fileUrl: '/uploads/tax.pdf' },
        { type: 'AUTHORIZATION_CERT', fileUrl: '/uploads/k.pdf' },
      ],
      vehicles: [{ isActive: true, photoUrls: ['/uploads/vehicle.jpg'] }],
    });

    expect(pendingSummary.percentage).toBe(80);
    expect(pendingSummary.statusText).toBe('Onay bekleniyor');
    expect(pendingSummary.steps.find((step) => step.key === 'admin_approval')?.completed).toBe(false);

    const approvedSummary = buildCarrierProfileCompletionSummary({
      carrier: { ...completeCarrier, pendingApproval: true, verifiedByAdmin: true },
      documents: [
        { type: 'TAX_PLATE', fileUrl: '/uploads/tax.pdf' },
        { type: 'AUTHORIZATION_CERT', fileUrl: '/uploads/k.pdf' },
      ],
      vehicles: [{ isActive: true, photoUrls: ['/uploads/vehicle.jpg'] }],
    });

    expect(approvedSummary.percentage).toBe(100);
    expect(approvedSummary.statusText).toBe('Onayland\u0131');
    expect(approvedSummary.isComplete).toBe(true);
  });
});
