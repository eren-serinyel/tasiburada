import { toast } from '@/components/ui/sonner';

let redirectInProgress = false;

export async function apiClient(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (response.status === 401 && typeof window !== 'undefined' && !redirectInProgress) {
    redirectInProgress = true;

    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('userId');

    toast.error('Oturumunuz sona erdi');

    setTimeout(() => {
      window.location.href = '/giris';
    }, 100);
  }

  return response;
}
