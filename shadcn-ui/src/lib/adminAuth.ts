import { toast } from '@/components/ui/sonner';
import { APP_CONFIG } from './config';

const ADMIN_TOKEN_KEY = 'adminToken';
const ADMIN_ID_KEY = 'adminId';
const ADMIN_ROLE_KEY = 'adminRole';

export function getAdminToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

export function setAdminAuth(token: string, adminId: string, role: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_ID_KEY, adminId);
  localStorage.setItem(ADMIN_ROLE_KEY, role);
}

export function clearAdminAuth(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_ID_KEY);
  localStorage.removeItem(ADMIN_ROLE_KEY);
}

export function getAdminRole(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(ADMIN_ROLE_KEY) : null;
}

export function getAdminId(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(ADMIN_ID_KEY) : null;
}

let adminRedirectInProgress = false;

export async function adminApiClient(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getAdminToken();

  const resolvedInput = input.startsWith('http') ? input : `${APP_CONFIG.apiBaseUrl}${input}`;

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(resolvedInput, { ...init, headers });

  if (response.status === 401 && !adminRedirectInProgress) {
    adminRedirectInProgress = true;
    clearAdminAuth();
    toast.error('Admin oturumunuz sona erdi');
    setTimeout(() => {
      window.location.href = '/admin/giris';
      adminRedirectInProgress = false;
    }, 100);
  }

  return response;
}

window.addEventListener('focus', () => {
  adminRedirectInProgress = false;
});
