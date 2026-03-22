// Basit localStorage tabanlı mock DB yardımcıları (notifications ve offers için)
import { Offer } from '@/lib/types';

type NotificationRecord = {
  id: string;
  userId: string; // bildirimi görecek kullanıcı (carrier veya customer)
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string; // ISO
  actionUrl?: string;
  relatedId?: string; // shipmentId/offerId
  kind: 'request' | 'decision' | 'info';
};

const KEYS = {
  NOTIFICATIONS: 'notifications',
  OFFERS: 'offers',
  OFFER_REQUESTS: 'offerRequests',
  REVIEWS: 'reviews',
  REPORTS: 'review_reports',
} as const;

const read = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

const write = <T>(key: string, value: T[]): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const mockDb = {
  // Notifications
  getAllNotifications(): NotificationRecord[] {
    return read<NotificationRecord>(KEYS.NOTIFICATIONS);
  },
  addNotification(n: NotificationRecord): NotificationRecord {
    const list = read<NotificationRecord>(KEYS.NOTIFICATIONS);
    list.push(n);
    write(KEYS.NOTIFICATIONS, list);
    return n;
  },
  markNotificationRead(id: string) {
    const list = read<NotificationRecord>(KEYS.NOTIFICATIONS);
    const idx = list.findIndex(n => n.id === id);
    if (idx !== -1) {
      list[idx].isRead = true;
      write(KEYS.NOTIFICATIONS, list);
    }
  },

  // Offers
  getAllOffers(): Offer[] {
    return read<Offer>(KEYS.OFFERS).map(o => ({
      ...o,
      createdAt: new Date(o.createdAt),
      validUntil: o.validUntil ? new Date(o.validUntil) : undefined,
    })) as Offer[];
  },
  addOffer(offer: Offer): Offer {
    const list = read<Offer>(KEYS.OFFERS);
    list.push(offer);
    write(KEYS.OFFERS, list);
    return offer;
  },
  updateOffer(id: string, patch: Partial<Offer>): Offer | undefined {
    const list = read<Offer>(KEYS.OFFERS);
    const idx = list.findIndex(o => o.id === id);
    if (idx === -1) return undefined;
    const next = { ...list[idx], ...patch } as Offer;
    list[idx] = next;
    write(KEYS.OFFERS, list);
    return next as Offer;
  },
  // Lightweight offer-requests (müşteri tarafından oluşturuluyor)
  addOfferRequest(payload: any) {
    const list = read<any>(KEYS.OFFER_REQUESTS);
    list.push(payload);
    write(KEYS.OFFER_REQUESTS, list);
  }
};

export type { NotificationRecord };

// -------- Reviews (Trendyol tarzı) --------
export type ReviewRecord = {
  id: string;
  nakliyeciId: string; // carrierId
  kullanici: string; // full name
  userId?: string; // optional reviewer id for reliable ownership
  puanlar: {
    dakiklik: number;
    iletisim: number;
    ozen: number;
    profesyonellik: number;
  };
  yorum: string;
  helpful?: number;
  tarih: string; // YYYY-MM-DD
  status?: 'aktif' | 'askida';
};

export const reviewsApi = {
  getAll(): ReviewRecord[] {
    return read<ReviewRecord>(KEYS.REVIEWS);
  },
  getByCarrier(carrierId: string): ReviewRecord[] {
    return this.getAll().filter(r => String(r.nakliyeciId) === String(carrierId));
  },
  hasUserReviewed(carrierId: string, userFullName: string, userId?: string): boolean {
    const list = this.getByCarrier(carrierId);
    return list.some(r => (userId ? r.userId === userId : false) || r.kullanici === userFullName);
  },
  add(review: ReviewRecord): ReviewRecord {
    const list = read<ReviewRecord>(KEYS.REVIEWS);
    list.push({ ...review, status: review.status || 'aktif' });
    write(KEYS.REVIEWS, list);
    // Create notification to carrier about new review
    try {
      const notifications = read<any>(KEYS.NOTIFICATIONS);
      notifications.push({
        id: 'ntf_' + Date.now().toString(36),
        userId: review.nakliyeciId,
        type: 'rating_received',
        title: 'Yeni yorum alındı',
        message: `${review.kullanici?.split(' ')?.[0] || 'Müşteri'} tarafından yeni bir yorum yapıldı.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/nakliyeci/yorumlar?highlight=${encodeURIComponent(review.id)}`,
        relatedId: review.id,
      });
      write(KEYS.NOTIFICATIONS, notifications);
    } catch {}
    return review;
  },
  update(id: string, patch: Partial<ReviewRecord>): ReviewRecord | undefined {
    const list = read<ReviewRecord>(KEYS.REVIEWS);
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const next = { ...list[idx], ...patch } as ReviewRecord;
    list[idx] = next;
    write(KEYS.REVIEWS, list);
    return next;
  },
  remove(id: string): boolean {
    const list = read<ReviewRecord>(KEYS.REVIEWS);
    const next = list.filter(r => r.id !== id);
    const changed = next.length !== list.length;
    if (changed) write(KEYS.REVIEWS, next);
    return changed;
  },
  report(id: string, payload: { reason: string; details?: string }) {
    // status -> askida
    this.update(id, { status: 'askida' });
    const reports = read<any>(KEYS.REPORTS);
    reports.push({ id: 'rep_' + Date.now().toString(36), reviewId: id, ...payload, createdAt: new Date().toISOString() });
    write(KEYS.REPORTS, reports);
  }
};
