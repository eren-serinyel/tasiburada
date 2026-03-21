import { User, Carrier, ShipmentRequest, Offer, Review } from './types';

// Local storage keys
const STORAGE_KEYS = {
  USERS: 'tasiburada_users',
  CARRIERS: 'tasiburada_carriers',
  SHIPMENTS: 'tasiburada_shipments',
  OFFERS: 'tasiburada_offers',
  REVIEWS: 'tasiburada_reviews',
  CURRENT_USER: 'tasiburada_current_user',
  LAST_EMAIL: 'tasiburada_last_email',
};

// Session keys (backward compatible with existing 'currentUser')
const SESSION_KEYS = {
  CURRENT_USER: 'currentUser',
  CURRENT_USER_EXPIRES_AT: 'currentUser_expiresAt',
};

const DEFAULT_SESSION_TTL_MS = 5 * 24 * 60 * 60 * 1000; // 5 gün

// Generic storage functions
export const saveToStorage = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getFromStorage = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// User management
export const saveUser = (user: User): void => {
  const users = getFromStorage<User>(STORAGE_KEYS.USERS);
  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  
  saveToStorage(STORAGE_KEYS.USERS, users);
};

export const getUsers = (): User[] => {
  return getFromStorage<User>(STORAGE_KEYS.USERS);
};

export const getCurrentUser = (): User | null => {
  const userData = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return userData ? JSON.parse(userData) : null;
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

// ----- Session helpers (TTL'li oturum) -----
export const setSessionUser = (user: User, ttlMs: number = DEFAULT_SESSION_TTL_MS): void => {
  localStorage.setItem(SESSION_KEYS.CURRENT_USER, JSON.stringify(user));
  localStorage.setItem(SESSION_KEYS.CURRENT_USER_EXPIRES_AT, String(Date.now() + ttlMs));
};

export const getSessionUser = (): User | null => {
  const raw = localStorage.getItem(SESSION_KEYS.CURRENT_USER);
  if (!raw) return null;

  const expRaw = localStorage.getItem(SESSION_KEYS.CURRENT_USER_EXPIRES_AT);
  if (expRaw) {
    const exp = Number(expRaw);
    if (!Number.isNaN(exp) && Date.now() > exp) {
      // Süre dolmuş, temizle
      localStorage.removeItem(SESSION_KEYS.CURRENT_USER);
      localStorage.removeItem(SESSION_KEYS.CURRENT_USER_EXPIRES_AT);
      return null;
    }
  }
  // expiresAt yoksa geriye dönük uyumluluk için kullanıcıyı döndür (sınırsız oturum)
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const clearSessionUser = (): void => {
  localStorage.removeItem(SESSION_KEYS.CURRENT_USER);
  localStorage.removeItem(SESSION_KEYS.CURRENT_USER_EXPIRES_AT);
};

// Uygulama başlangıcında çağırın: Süresi dolmuşsa oturumu temizler
export const ensureSessionValidity = (): void => {
  // getSessionUser, gerekirse otomatik temizler
  void getSessionUser();
};

// Carrier management
export const saveCarrier = (carrier: Carrier): void => {
  const carriers = getFromStorage<Carrier>(STORAGE_KEYS.CARRIERS);
  const existingIndex = carriers.findIndex(c => c.id === carrier.id);
  
  if (existingIndex >= 0) {
    carriers[existingIndex] = carrier;
  } else {
    carriers.push(carrier);
  }
  
  saveToStorage(STORAGE_KEYS.CARRIERS, carriers);
};

export const getCarriers = (): Carrier[] => {
  return getFromStorage<Carrier>(STORAGE_KEYS.CARRIERS);
};

export const getApprovedCarriers = (): Carrier[] => {
  return getCarriers().filter(carrier => carrier.isApproved);
};

// Shipment management
export const saveShipment = (shipment: ShipmentRequest): void => {
  const shipments = getFromStorage<ShipmentRequest>(STORAGE_KEYS.SHIPMENTS);
  const existingIndex = shipments.findIndex(s => s.id === shipment.id);
  
  if (existingIndex >= 0) {
    shipments[existingIndex] = shipment;
  } else {
    shipments.push(shipment);
  }
  
  saveToStorage(STORAGE_KEYS.SHIPMENTS, shipments);
};

export const getShipments = (): ShipmentRequest[] => {
  return getFromStorage<ShipmentRequest>(STORAGE_KEYS.SHIPMENTS);
};

// Offer management
export const saveOffer = (offer: Offer): void => {
  const offers = getFromStorage<Offer>(STORAGE_KEYS.OFFERS);
  const existingIndex = offers.findIndex(o => o.id === offer.id);
  
  if (existingIndex >= 0) {
    offers[existingIndex] = offer;
  } else {
    offers.push(offer);
  }
  
  saveToStorage(STORAGE_KEYS.OFFERS, offers);
};

export const getOffers = (): Offer[] => {
  return getFromStorage<Offer>(STORAGE_KEYS.OFFERS);
};

// Review management
export const saveReview = (review: Review): void => {
  const reviews = getFromStorage<Review>(STORAGE_KEYS.REVIEWS);
  reviews.push(review);
  saveToStorage(STORAGE_KEYS.REVIEWS, reviews);
};

export const getReviews = (): Review[] => {
  return getFromStorage<Review>(STORAGE_KEYS.REVIEWS);
};

export const getCarrierReviews = (carrierId: string): Review[] => {
  return getReviews().filter(review => review.revieweeId === carrierId);
};

// ---- Convenience: remember last used email on login ----
export const setLastEmail = (email: string | null): void => {
  if (email) {
    localStorage.setItem(STORAGE_KEYS.LAST_EMAIL, email);
  } else {
    localStorage.removeItem(STORAGE_KEYS.LAST_EMAIL);
  }
};

export const getLastEmail = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.LAST_EMAIL);
};