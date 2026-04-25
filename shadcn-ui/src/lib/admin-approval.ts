export type CarrierApprovalState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface ApprovalStateCarrierLike {
  approvalState?: string | null;
  verifiedByAdmin?: boolean | null;
  pendingApproval?: boolean | null;
  isActive?: boolean | null;
  reviewLockAdminId?: string | null;
  reviewLockExpiresAt?: string | Date | null;
}

export interface ApprovalQueueItemLike extends ApprovalStateCarrierLike {
  carrierId: string;
  companyName: string;
  email?: string | null;
  approvalVersion?: number | null;
  resubmissionCount?: number | null;
  requiredDocuments?: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  } | null;
}

export const APPROVAL_STATUS = {
  DRAFT: { label: 'Taslak', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  SUBMITTED: { label: 'Gönderildi', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  IN_REVIEW: { label: 'İncelemede', color: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  APPROVED: { label: 'Onaylı', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Reddedildi', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  SUSPENDED: { label: 'Askıda', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
} as const;

export function resolveApprovalState(carrier: ApprovalStateCarrierLike): CarrierApprovalState {
  const raw = String(carrier.approvalState ?? '').toUpperCase();
  if (raw in APPROVAL_STATUS) {
    return raw as CarrierApprovalState;
  }

  if (carrier.verifiedByAdmin) {
    return 'APPROVED';
  }
  if (carrier.pendingApproval) {
    return 'SUBMITTED';
  }
  if (carrier.isActive === false) {
    return 'REJECTED';
  }
  return 'DRAFT';
}

export function isApprovalLockExpired(reviewLockExpiresAt?: string | Date | null): boolean {
  if (!reviewLockExpiresAt) return false;
  const expiresAt = reviewLockExpiresAt instanceof Date ? reviewLockExpiresAt : new Date(reviewLockExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() <= Date.now();
}

export function getApprovalActions(carrier: ApprovalStateCarrierLike, adminId?: string | null) {
  const approvalState = resolveApprovalState(carrier);
  const isExpired = isApprovalLockExpired(carrier.reviewLockExpiresAt);
  const isLockedByCurrentAdmin = Boolean(adminId) && carrier.reviewLockAdminId === adminId && !isExpired;

  return {
    canClaim: approvalState === 'SUBMITTED' || (approvalState === 'IN_REVIEW' && isExpired),
    canRelease: approvalState === 'IN_REVIEW' && isLockedByCurrentAdmin,
    canApprove: approvalState === 'IN_REVIEW' && isLockedByCurrentAdmin,
    canReject: approvalState === 'IN_REVIEW' && isLockedByCurrentAdmin,
    canSuspend: approvalState === 'APPROVED',
    isLockedByCurrentAdmin,
    isExpired,
  };
}

export function formatRequiredDocumentsSummary(item: ApprovalQueueItemLike): string {
  const required = item.requiredDocuments;
  if (!required) return 'Belge özeti yok';
  return `${required.approved}/${required.total} onaylı • ${required.pending} bekliyor • ${required.rejected} red`;
}

export function buildApprovalQueueViewModel(item: ApprovalQueueItemLike, adminId?: string | null) {
  const approvalState = resolveApprovalState(item);
  const actions = getApprovalActions(item, adminId);
  const lockMessage = item.reviewLockAdminId
    ? actions.isExpired
      ? 'Lock süresi dolmuş'
      : `Lock admin: ${item.reviewLockAdminId}`
    : null;

  return {
    approvalState,
    actions,
    lockMessage,
    documentsSummary: formatRequiredDocumentsSummary(item),
    versionLabel: `v${item.approvalVersion ?? 0} • tekrar ${item.resubmissionCount ?? 0}`,
  };
}
