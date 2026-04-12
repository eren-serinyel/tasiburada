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

  try {
    const response = await fetch(resolvedInput, {
      ...init,
      headers
    });

    const isLoginEndpoint = resolvedInput.toString().includes('/login');

    if (!response.ok) {
      // 401 Handling (Existing)
      if (response.status === 401 && !isLoginEndpoint && typeof window !== 'undefined' && !redirectInProgress) {
        redirectInProgress = true;
        localStorage.removeItem(APP_CONFIG.tokenKey);
        localStorage.removeItem(APP_CONFIG.userTypeKey);
        localStorage.removeItem(APP_CONFIG.userIdKey);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUser_expiresAt');
        toast.error('Oturumunuz sona erdi');
        setTimeout(() => {
          window.location.href = '/giris';
        }, 100);
      }

      // Automatically show toast for other errors if message exists
      try {
        const errorData = await response.clone().json();
        if (errorData && errorData.message) {
          toast.error(errorData.message);
        }
      } catch (e) {
        // Fallback if not JSON
        if (response.status >= 500) {
          toast.error('Sunucu hatası oluştu.');
        }
      }
    }

    return response;
  } catch (error: any) {
    console.error('[API Client Error]', error);
    if (error instanceof TypeError || (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch'))) {
      toast.error('Sunucuya bağlanılamadı. Lütfen internetinizi veya sunucu durumunu kontrol edin.');
    }
    throw error;
  }
}

window.addEventListener('focus', () => {
  redirectInProgress = false;
});
