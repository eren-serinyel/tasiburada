import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import AuthModal from '@/components/AuthModal';
import { getSessionUser } from '@/lib/storage';
import { formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { ChevronLeft, Send } from 'lucide-react';

const API_BASE_URL = '/api/v1';

type MessageDto = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

const useQueryParam = (key: string): string | null => {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search).get(key), [location.search, key]);
};

const fetchMessages = async (conversationId: string, signal?: AbortSignal): Promise<MessageDto[]> => {
  const response = await apiClient(`${API_BASE_URL}/messages/${conversationId}`, {
    signal,
    headers: { accept: 'application/json' }
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false) {
    throw new Error(json?.message || 'Mesajlar alınamadı.');
  }
  return (json.data || []) as MessageDto[];
};

const sendMessage = async (conversationId: string, content: string): Promise<void> => {
  const response = await apiClient(`${API_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({ conversationId, content })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false) {
    throw new Error(json?.message || 'Mesaj gönderilemedi.');
  }
};

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const conversationId = useQueryParam('conversationId');
  const sessionUser = useMemo(() => getSessionUser(), []);
  const [authOpen, setAuthOpen] = useState(false);
  const [text, setText] = useState('');

  const isLoggedIn = Boolean(sessionUser);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ signal }) => fetchMessages(conversationId!, signal),
    enabled: Boolean(conversationId && isLoggedIn)
  });

  const mutation = useMutation({
    mutationFn: async () => sendMessage(conversationId!, text),
    onSuccess: async () => {
      setText('');
      await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    }
  });

  if (!conversationId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Alert>
          <AlertTitle>Konuşma seçilmedi</AlertTitle>
          <AlertDescription>Mesajlaşmayı açmak için bir konuşma kimliği gerekiyor.</AlertDescription>
        </Alert>
        <Button className="mt-6" variant="outline" onClick={() => navigate('/nakliyeciler')}>
          Nakliyecilere dön
        </Button>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Alert>
          <AlertTitle>Giriş gerekli</AlertTitle>
          <AlertDescription>Mesajlaşma için giriş yapmanız gerekiyor.</AlertDescription>
        </Alert>
        <Button className="mt-6" onClick={() => setAuthOpen(true)}>Giriş yap</Button>
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          title="Giriş yapmanız gerekiyor"
          description="Mesajlaşmaya devam etmek için giriş yapın."
          actions={[
            {
              label: 'Giriş yap',
              onClick: () => navigate(`/giris?redirect=${encodeURIComponent(location.pathname + location.search)}`),
              variant: 'default'
            },
            { label: 'Kapat', onClick: () => setAuthOpen(false), variant: 'outline' }
          ]}
        />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Geri
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mesajlar</CardTitle>
            <CardDescription>Platform içi güvenli iletişim</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            )}

            {isError && (
              <Alert variant="destructive">
                <AlertTitle>Mesajlar yüklenemedi</AlertTitle>
                <AlertDescription>{(error as Error)?.message || 'Bir hata oluştu.'}</AlertDescription>
              </Alert>
            )}

            {!isLoading && !isError && (
              <div className="space-y-3">
                {(data || []).length === 0 ? (
                  <div className="rounded-xl border bg-white p-6">
                    <p className="text-sm font-medium text-slate-700">Henüz mesaj yok</p>
                    <p className="text-sm text-slate-500 mt-1">İlk mesajınızı göndererek konuşmayı başlatın.</p>
                  </div>
                ) : (
                  (data || []).map(m => (
                    <div key={m.id} className="rounded-xl border bg-white p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">{m.senderId === sessionUser?.id ? 'Siz' : 'Karşı taraf'}</p>
                        <p className="text-xs text-slate-500">{formatDate(new Date(m.createdAt))}</p>
                      </div>
                      <p className="text-sm text-slate-700 mt-2">{m.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Mesaj yazın…"
              />
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !text.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
