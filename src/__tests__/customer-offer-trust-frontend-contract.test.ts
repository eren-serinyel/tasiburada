import {
  getCarrierEligibilityComparisonText,
  getCarrierEligibilityWarning,
  isOfferAcceptDisabled,
  resolveCarrierEligibility,
} from '../shared/customerOfferTrust';

describe('customer offer trust frontend contract', () => {
  test('CustomerOfferCard ineligible carrier icin warning state uretilir', () => {
    const warning = getCarrierEligibilityWarning({
      carrierEligibility: { isEligible: false, reason: 'suspended', label: 'Askiya alinmis' },
    });

    expect(warning).toEqual({
      title: 'Tasiyici artik uygun degil',
      detail: 'Askiya alinmis oldugu icin bu teklif kabul edilemez.',
    });
  });

  test('ineligible carrier icin accept disabled olur', () => {
    expect(isOfferAcceptDisabled({
      carrierEligibility: { isEligible: false, reason: 'rejected', label: 'Reddedilmis' },
    })).toBe(true);
  });

  test('OfferComparison uygunluk satiri ineligible carrier durumunu yazar', () => {
    expect(getCarrierEligibilityComparisonText({
      carrierEligibility: { isEligible: false, reason: 'inactive', label: 'Aktif degil' },
    })).toBe('Uygun degil - Aktif degil');
  });

  test('ShipmentDetail fallback raw carrier state uzerinden ineligible durumu cozer', () => {
    expect(resolveCarrierEligibility({
      carrier: {
        approvalState: 'REJECTED',
        isActive: false,
        verifiedByAdmin: false,
      },
    })).toMatchObject({
      isEligible: false,
      reason: 'rejected',
      label: 'Reddedilmis',
    });
  });
});