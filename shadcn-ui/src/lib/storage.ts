import { User } from './types';

// Session keys (backward compatible with existing 'currentUser')
const SESSION_KEYS = {
  CURRENT_USER: 'currentUser',
  CURRENT_USER_EXPIRES_AT: 'currentUser_expiresAt',
};

const DEFAULT_SESSION_TTL_MS = 5 * 24 * 60 * 60 * 1000; // 5 gün

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

// ---- Convenience: remember last used email on login ----
const LAST_EMAIL_KEY = 'tasiburada_last_email';

export const setLastEmail = (email: string | null): void => {
  if (email) {
    localStorage.setItem(LAST_EMAIL_KEY, email);
  } else {
    localStorage.removeItem(LAST_EMAIL_KEY);
  }
};

export const getLastEmail = (): string | null => {
  return localStorage.getItem(LAST_EMAIL_KEY);
};