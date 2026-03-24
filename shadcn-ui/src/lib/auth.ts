export type UserType = 'customer' | 'carrier';

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function clearAuth(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userType');
  localStorage.removeItem('userId');
}

export function getUserType(): UserType | null {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      clearAuth();
      return null;
    }

    const type = payload?.type ?? payload?.userType;
    return type === 'customer' || type === 'carrier' ? type : null;
  } catch {
    return null;
  }
}

export function getUserId(): string | null {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.customerId || payload?.carrierId || null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getUserType() !== null;
}
