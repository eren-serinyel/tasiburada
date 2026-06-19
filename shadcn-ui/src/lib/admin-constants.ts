import { APPROVAL_STATUS, resolveApprovalState, type ApprovalStateCarrierLike } from './admin-approval';

export const CARRIER_STATUS = {
  verified: { label: 'Onayli', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  pending: { label: 'Bekliyor', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  rejected: { label: 'Reddedildi', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  inactive: { label: 'Pasif', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
} as const;

export { APPROVAL_STATUS };

export const SHIPMENT_STATUS = {
  pending: { label: 'Bekliyor', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  offer_received: { label: 'Teklif Alindi', color: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  matched: { label: 'Eslesti', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  in_transit: { label: 'Tasinıyor', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  completed: { label: 'Tamamlandi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'Iptal', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  expired: { label: 'Suresi Doldu', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
} as const;

export const DOCUMENT_STATUS = {
  PENDING: { label: 'Bekliyor', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  APPROVED: { label: 'Onayli', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Reddedildi', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
} as const;

export const OFFER_STATUS = {
  pending: { label: 'Bekliyor', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  accepted: { label: 'Kabul Edildi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  rejected: { label: 'Reddedildi', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  withdrawn: { label: 'Geri Cekildi', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  cancelled: { label: 'Iptal', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  expired: { label: 'Suresi Doldu', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
} as const;

export const REVIEW_STATUS = {
  published: { label: 'Yayinda', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  hidden: { label: 'Gizli', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
  flagged: { label: 'Isaretli', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
} as const;

export const PRIORITY = {
  low: { label: 'Dusuk', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Orta', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  high: { label: 'Yuksek', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  critical: { label: 'Kritik', color: 'bg-rose-50 text-rose-700 border-rose-200' },
} as const;

export const ACTIVE_STATUS = {
  active: { label: 'Aktif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  inactive: { label: 'Pasif', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
} as const;

export const AUDIT_ACTIONS: Record<string, string> = {
  CARRIER_VERIFIED: 'Nakliyeci onaylandi',
  CARRIER_REJECTED: 'Nakliyeci reddedildi',
  CUSTOMER_ACTIVATED: 'Musteri aktiflesti',
  CUSTOMER_DEACTIVATED: 'Musteri deaktiflestirildi',
  REVIEW_DELETED: 'Yorum silindi',
  DOCUMENT_APPROVED: 'Belge onaylandi',
  DOCUMENT_REJECTED: 'Belge reddedildi',
  CARRIER_APPROVAL_CLAIMED: 'Approval inceleme claim edildi',
  CARRIER_APPROVAL_RELEASED: 'Approval inceleme serbest birakildi',
  CARRIER_APPROVAL_SUBMITTED: 'Carrier approval gonderildi',
  CARRIER_APPROVED: 'Carrier onaylandi',
  CARRIER_SUSPENDED: 'Carrier askiya alindi',
};

export const DOCUMENT_TYPES: Record<string, string> = {
  AUTHORIZATION_CERT: 'Yetki Belgesi',
  SRC_CERT: 'SRC Belgesi',
  VEHICLE_LICENSE: 'Arac Ruhsati',
  TAX_PLATE: 'Vergi Levhasi',
  INSURANCE_POLICY: 'Sigorta Policesi',
};

export function resolveCarrierStatus(carrier: ApprovalStateCarrierLike): keyof typeof CARRIER_STATUS {
  const approvalState = resolveApprovalState(carrier);
  if (approvalState === 'APPROVED') return 'verified';
  if (approvalState === 'REJECTED') return 'rejected';
  if (approvalState === 'SUSPENDED') return 'inactive';
  return 'pending';
}

export type TrendDirection = 'up' | 'down' | 'flat';

export function getTrendColor(direction: TrendDirection) {
  return {
    up: 'text-emerald-600',
    down: 'text-rose-600',
    flat: 'text-slate-500',
  }[direction];
}

export function getTrendBg(direction: TrendDirection) {
  return {
    up: 'bg-emerald-50',
    down: 'bg-rose-50',
    flat: 'bg-slate-50',
  }[direction];
}
