export type CarrierEligibilityReason = 'inactive' | 'unverified' | 'not_approved' | 'suspended' | 'rejected';

export interface CarrierEligibility {
  isEligible: boolean;
  reason?: CarrierEligibilityReason;
  label: string;
}

export interface CarrierTrustFields {
  isActive?: boolean | null;
  verifiedByAdmin?: boolean | null;
  approvalState?: string | null;
}

export interface CarrierEligibilitySource {
  carrierEligibility?: CarrierEligibility | null;
  carrier?: CarrierTrustFields | null;
}

export function resolveCarrierEligibility(source: CarrierEligibilitySource): CarrierEligibility {
  if (source.carrierEligibility) {
    return source.carrierEligibility;
  }

  const carrier = source.carrier;
  if (carrier?.approvalState === 'SUSPENDED') {
    return { isEligible: false, reason: 'suspended', label: 'Askiya alinmis' };
  }
  if (carrier?.approvalState === 'REJECTED') {
    return { isEligible: false, reason: 'rejected', label: 'Reddedilmis' };
  }
  if (carrier?.isActive === false) {
    return { isEligible: false, reason: 'inactive', label: 'Aktif degil' };
  }
  if (carrier?.verifiedByAdmin === false) {
    return { isEligible: false, reason: 'unverified', label: 'Dogrulanmamis' };
  }
  if (carrier?.approvalState && carrier.approvalState !== 'APPROVED') {
    return { isEligible: false, reason: 'not_approved', label: 'Onayli degil' };
  }

  return { isEligible: true, label: 'Uygun' };
}

export function getCarrierEligibilityWarning(source: CarrierEligibilitySource): { title: string; detail: string } | null {
  const eligibility = resolveCarrierEligibility(source);
  if (eligibility.isEligible) {
    return null;
  }

  return {
    title: 'Tasiyici artik uygun degil',
    detail: `${eligibility.label} oldugu icin bu teklif kabul edilemez.`,
  };
}

export function getCarrierEligibilityComparisonText(source: CarrierEligibilitySource): string {
  const eligibility = resolveCarrierEligibility(source);
  return eligibility.isEligible ? 'Uygun' : `Uygun degil - ${eligibility.label}`;
}

export function isOfferAcceptDisabled(source: CarrierEligibilitySource, disabled = false): boolean {
  return disabled || !resolveCarrierEligibility(source).isEligible;
}