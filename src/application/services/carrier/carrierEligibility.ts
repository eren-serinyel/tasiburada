import { CarrierApprovalState } from '../../../domain/entities/Carrier';

export type CarrierEligibilityReason = 'inactive' | 'unverified' | 'not_approved' | 'suspended' | 'rejected';

export interface CarrierEligibility {
  isEligible: boolean;
  reason?: CarrierEligibilityReason;
  label: string;
}

export interface CarrierEligibilitySource {
  isActive?: boolean | null;
  verifiedByAdmin?: boolean | null;
  approvalState?: CarrierApprovalState | null;
}

export function getCarrierEligibility(carrier?: CarrierEligibilitySource | null): CarrierEligibility {
  if (carrier?.approvalState === CarrierApprovalState.SUSPENDED) {
    return {
      isEligible: false,
      reason: 'suspended',
      label: 'Askiya alinmis',
    };
  }

  if (carrier?.approvalState === CarrierApprovalState.REJECTED) {
    return {
      isEligible: false,
      reason: 'rejected',
      label: 'Reddedilmis',
    };
  }

  if (!carrier?.isActive) {
    return {
      isEligible: false,
      reason: 'inactive',
      label: 'Aktif degil',
    };
  }

  if (!carrier?.verifiedByAdmin) {
    return {
      isEligible: false,
      reason: 'unverified',
      label: 'Dogrulanmamis',
    };
  }

  if (carrier.approvalState !== CarrierApprovalState.APPROVED) {
    return {
      isEligible: false,
      reason: 'not_approved',
      label: 'Onayli degil',
    };
  }

  return {
    isEligible: true,
    label: 'Uygun',
  };
}