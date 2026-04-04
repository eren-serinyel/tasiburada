import { toast } from '@/components/ui/sonner';
import { APP_CONFIG } from './config';

const ADMIN_TOKEN_KEY = 'adminToken';
const ADMIN_ID_KEY = 'adminId';
const ADMIN_ROLE_KEY = 'adminRole';

interface AdminTokenPayload {
  id?: string;
  role?: string;
  type?: string;
  exp?: number;
}

function decodeAdminToken(): AdminTokenPayload | null {
  const token = getAdminToken();
  if (!token) return null;
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export function getAdminToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
}

export function isAdminAuthenticated(): boolean {
  const payload = decodeAdminToken();
  if (!payload) return false;
  // Token süresi dolmuş mu?
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    clearAdminAuth();
    return false;
  }
  // Token admin tipine sahip olmalı
  if (payload.type !== 'admin') return false;
  // Rol tanımlı olmalı
  if (!payload.role) return false;
  return true;
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
  const payload = decodeAdminToken();
  if (!payload) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return payload.role ?? null;
}

export function getAdminId(): string | null {
  const payload = decodeAdminToken();
  if (!payload) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return payload.id ?? null;
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
