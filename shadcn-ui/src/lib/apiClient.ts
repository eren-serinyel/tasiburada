import { toast } from '@/components/ui/sonner';
import { APP_CONFIG } from './config';

let redirectInProgress = false;

export async function apiClient(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = typeof window !== 'undefined' ? localStorage.getItem(APP_CONFIG.tokenKey) : null;

  const resolvedInput = (() => {
    if (typeof input === 'string') {
      if (input.startsWith('http://') || input.startsWith('https://')) {
        return input;
      }

      if (input.startsWith(APP_CONFIG.apiBaseUrl)) {
        return input;
      }

      if (input.startsWith('/')) {
        return `${APP_CONFIG.apiBaseUrl}${input}`;
      }

      return `${APP_CONFIG.apiBaseUrl}${input}`;
    }
    return input;
  })();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(resolvedInput, {
    ...init,
    headers
  });

  if (response.status === 401 && typeof window !== 'undefined' && !redirectInProgress) {
    redirectInProgress = true;

    localStorage.removeItem(APP_CONFIG.tokenKey);
    localStorage.removeItem(APP_CONFIG.userTypeKey);
    localStorage.removeItem(APP_CONFIG.userIdKey);

    toast.error('Oturumunuz sona erdi');

    setTimeout(() => {
      window.location.href = '/giris';
    }, 100);
  }

  return response;
}

window.addEventListener('focus', () => {
  redirectInProgress = false;
});
