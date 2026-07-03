export const GUEST_OFFER_DRAFT_VERSION = 1 as const;
export const GUEST_OFFER_DRAFT_KEY = 'tasiburadan:guest-offer-draft:v1';
export const GUEST_OFFER_PENDING_INTENT_KEY = 'tasiburadan:guest-offer-intent:v1';
export const LEGACY_SHIPMENT_DRAFT_KEY = 'tasiburada:shipment-draft:v1';
export const GUEST_OFFER_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type GuestOfferPendingAction = 'submit-offer-request';

export interface GuestOfferDraftV1 {
  version: typeof GUEST_OFFER_DRAFT_VERSION;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  activeStep: number;
  showSummaryModal?: boolean;
  returnPath: string;
  pendingAction: GuestOfferPendingAction;
  formData: Record<string, unknown>;
  converterData?: Record<string, unknown> | null;
  selectedCarrierIds?: string[];
  requestedServicesByCarrier?: Record<string, unknown>;
  expandedCarrierServices?: Record<string, boolean>;
  showAllCarrierServices?: Record<string, boolean>;
  inviteCarrierId?: string | null;
  inviteCarrierName?: string | null;
}

const FILE_DB_NAME = 'tasiburadan-guest-offer-draft';
const FILE_DB_VERSION = 1;
const FILE_STORE_NAME = 'files';
const PHOTOS_KEY = 'photos';

const getSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getLocalStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const isSafeRelativePath = (value: string | null | undefined): value is string => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return false;
  if (typeof window === 'undefined') return true;
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
};

const parseDateMs = (value: unknown) => {
  if (typeof value !== 'string') return NaN;
  return new Date(value).getTime();
};

const isDraftLike = (value: unknown): value is GuestOfferDraftV1 => {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<GuestOfferDraftV1>;
  return (
    draft.version === GUEST_OFFER_DRAFT_VERSION &&
    typeof draft.createdAt === 'string' &&
    typeof draft.updatedAt === 'string' &&
    typeof draft.expiresAt === 'string' &&
    typeof draft.activeStep === 'number' &&
    typeof draft.returnPath === 'string' &&
    draft.pendingAction === 'submit-offer-request' &&
    !!draft.formData &&
    typeof draft.formData === 'object'
  );
};

export const clearGuestOfferFiles = async () => {
  if (typeof indexedDB === 'undefined') return;
  const db = await openFileDb();
  await txRequest(db.transaction(FILE_STORE_NAME, 'readwrite').objectStore(FILE_STORE_NAME).delete(PHOTOS_KEY));
  db.close();
};

export const clearGuestOfferDraft = () => {
  getSessionStorage()?.removeItem(GUEST_OFFER_DRAFT_KEY);
  getSessionStorage()?.removeItem(GUEST_OFFER_PENDING_INTENT_KEY);
  getLocalStorage()?.removeItem(LEGACY_SHIPMENT_DRAFT_KEY);
  void clearGuestOfferFiles();
};

export const saveGuestOfferDraft = (
  input: Omit<GuestOfferDraftV1, 'version' | 'createdAt' | 'updatedAt' | 'expiresAt'>,
) => {
  const storage = getSessionStorage();
  if (!storage) throw new Error('sessionStorage kullanilamiyor.');

  const now = new Date();
  const existing = loadGuestOfferDraft({ clearExpired: false });
  const draft: GuestOfferDraftV1 = {
    ...input,
    version: GUEST_OFFER_DRAFT_VERSION,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + GUEST_OFFER_DRAFT_TTL_MS).toISOString(),
  };

  storage.setItem(GUEST_OFFER_DRAFT_KEY, JSON.stringify(draft));
  getLocalStorage()?.removeItem(LEGACY_SHIPMENT_DRAFT_KEY);
  return draft;
};

export const loadGuestOfferDraft = (options: { clearExpired?: boolean } = {}) => {
  const storage = getSessionStorage();
  const raw = storage?.getItem(GUEST_OFFER_DRAFT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!isDraftLike(parsed)) {
      if (options.clearExpired !== false) clearGuestOfferDraft();
      return null;
    }
    if (parseDateMs(parsed.expiresAt) <= Date.now()) {
      if (options.clearExpired !== false) clearGuestOfferDraft();
      return null;
    }
    return parsed;
  } catch {
    if (options.clearExpired !== false) clearGuestOfferDraft();
    return null;
  }
};

export const hasValidGuestOfferDraft = () => Boolean(loadGuestOfferDraft());

export const markGuestOfferPendingIntent = (pendingAction: GuestOfferPendingAction = 'submit-offer-request') => {
  const storage = getSessionStorage();
  if (!storage) throw new Error('sessionStorage kullanilamiyor.');
  const now = Date.now();
  storage.setItem(GUEST_OFFER_PENDING_INTENT_KEY, JSON.stringify({
    pendingAction,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + GUEST_OFFER_DRAFT_TTL_MS).toISOString(),
  }));
};

export const clearGuestOfferPendingIntent = () => {
  getSessionStorage()?.removeItem(GUEST_OFFER_PENDING_INTENT_KEY);
};

export const hasGuestOfferPendingIntent = () => {
  const storage = getSessionStorage();
  const raw = storage?.getItem(GUEST_OFFER_PENDING_INTENT_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.pendingAction !== 'submit-offer-request' || parseDateMs(parsed.expiresAt) <= Date.now()) {
      clearGuestOfferPendingIntent();
      return false;
    }
    return true;
  } catch {
    clearGuestOfferPendingIntent();
    return false;
  }
};

export const saveGuestOfferFiles = async (photos: File[]) => {
  if (typeof indexedDB === 'undefined') return;
  const db = await openFileDb();
  const tx = db.transaction(FILE_STORE_NAME, 'readwrite');
  const store = tx.objectStore(FILE_STORE_NAME);
  if (!photos.length) {
    await txRequest(store.delete(PHOTOS_KEY));
  } else {
    await txRequest(store.put(photos, PHOTOS_KEY));
  }
  await txDone(tx);
  db.close();
};

export const loadGuestOfferFiles = async (): Promise<File[]> => {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openFileDb();
  const value = await txRequest<File[] | undefined>(
    db.transaction(FILE_STORE_NAME, 'readonly').objectStore(FILE_STORE_NAME).get(PHOTOS_KEY),
  );
  db.close();
  return Array.isArray(value) ? value.filter((file): file is File => file instanceof File) : [];
};

const openFileDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(FILE_DB_NAME, FILE_DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(FILE_STORE_NAME)) {
      db.createObjectStore(FILE_STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDB acilamadi.'));
});

const txRequest = <T = unknown>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDB islemi basarisiz.'));
});

const txDone = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction basarisiz.'));
  tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction iptal edildi.'));
});
