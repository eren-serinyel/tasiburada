export type UserType = 'customer' | 'carrier';

type AuthPayload = {
  exp?: number;
  type?: string;
  userType?: string;
  customerId?: string;
  carrierId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
};

function decodeAuthPayload(): AuthPayload | null {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const base64 = token.split('.')[1];
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as AuthPayload;

    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      clearAuth();
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function clearAuth(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userType');
  localStorage.removeItem('userId');
}

export function getUserType(): UserType | null {
  const payload = decodeAuthPayload();
  const type = payload?.type ?? payload?.userType;
  return type === 'customer' || type === 'carrier' ? type : null;
}

export function getUserId(): string | null {
  const payload = decodeAuthPayload();
  return payload?.customerId || payload?.carrierId || null;
}

export function getUserName(): string {
  const payload = decodeAuthPayload();
  if (!payload) return '';

  if (payload.companyName) {
    return payload.companyName;
  }

  const fullName = [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim();
  return fullName;
}

export function getUserEmail(): string {
  const payload = decodeAuthPayload();
  return payload?.email ?? '';
}

export function isAuthenticated(): boolean {
  return getUserType() !== null;
}
