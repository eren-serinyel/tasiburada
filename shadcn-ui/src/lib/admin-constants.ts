// ─── Admin Panel Constants ──────────────────────────────────────────────────

// Carrier status
export const CARRIER_STATUS = {
  verified: { label: 'Onaylı', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  pending: { label: 'Bekliyor', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  rejected: { label: 'Reddedildi', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  inactive: { label: 'Pasif', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
} as const;

// Shipment status
export const SHIPMENT_STATUS = {
  pending: { label: 'Bekliyor', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  offer_received: { label: 'Teklif Alındı', color: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  matched: { label: 'Eşleşti', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  in_transit: { label: 'Taşınıyor', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  completed: { label: 'Tamamlandı', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'İptal', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
} as const;

// Document status
export const DOCUMENT_STATUS = {
  PENDING: { label: 'Bekliyor', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  APPROVED: { label: 'Onaylı', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Reddedildi', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
} as const;

// Offer status
export const OFFER_STATUS = {
  pending: { label: 'Bekliyor', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  accepted: { label: 'Kabul Edildi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  rejected: { label: 'Reddedildi', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
} as const;

// Review moderation status
export const REVIEW_STATUS = {
  published: { label: 'Yayında', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  hidden: { label: 'Gizli', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
  flagged: { label: 'İşaretli', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
} as const;

// Priority levels
export const PRIORITY = {
  low: { label: 'Düşük', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Orta', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  high: { label: 'Yüksek', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  critical: { label: 'Kritik', color: 'bg-rose-50 text-rose-700 border-rose-200' },
} as const;

// Active/Inactive
export const ACTIVE_STATUS = {
  active: { label: 'Aktif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  inactive: { label: 'Pasif', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
} as const;

// Audit log action types
export const AUDIT_ACTIONS: Record<string, string> = {
  CARRIER_VERIFIED: 'Nakliyeci onaylandı',
  CARRIER_REJECTED: 'Nakliyeci reddedildi',
  CUSTOMER_ACTIVATED: 'Müşteri aktifleştirildi',
  CUSTOMER_DEACTIVATED: 'Müşteri deaktifleştirildi',
  REVIEW_DELETED: 'Yorum silindi',
  DOCUMENT_APPROVED: 'Belge onaylandı',
  DOCUMENT_REJECTED: 'Belge reddedildi',
};

// Document type labels
export const DOCUMENT_TYPES: Record<string, string> = {
  K1_CERTIFICATE: 'K1 Yetki Belgesi',
  SRC_CERTIFICATE: 'SRC Belgesi',
  VEHICLE_LICENSE: 'Araç Ruhsatı',
  TAX_PLATE: 'Vergi Levhası',
  INSURANCE: 'Sigorta Poliçesi',
};

// Helper to resolve carrier status from API response
export function resolveCarrierStatus(carrier: { verifiedByAdmin: boolean; isActive: boolean }): keyof typeof CARRIER_STATUS {
  if (carrier.verifiedByAdmin && carrier.isActive) return 'verified';
  if (!carrier.verifiedByAdmin && !carrier.isActive) return 'rejected';
  if (!carrier.isActive) return 'inactive';
  return 'pending';
}

// Trend helpers
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
