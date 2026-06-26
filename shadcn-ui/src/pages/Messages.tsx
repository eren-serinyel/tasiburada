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
import { getUserType } from '@/lib/auth';
import { ChevronLeft, Send } from 'lucide-react';
import { PageContainer } from '@/components/shared/CorporateUI';

const API_BASE_URL = '/api/v1';

type MessageDto = {
  id: string;
  shipmentId: string;
  senderType: 'customer' | 'carrier';
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

const useQueryParam = (key: string): string | null => {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search).get(key), [location.search, key]);
};

const getMessagesPath = (shipmentId: string, userType: string | null) =>
  userType === 'carrier'
    ? `${API_BASE_URL}/messages/carrier/shipment/${shipmentId}`
    : `${API_BASE_URL}/messages/shipment/${shipmentId}`;

const getSendPath = (userType: string | null) =>
  userType === 'carrier'
    ? `${API_BASE_URL}/messages/carrier`
    : `${API_BASE_URL}/messages`;

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const shipmentId = useQueryParam('shipmentId');
  const sessionUser = useMemo(() => getSessionUser(), []);
  const userType = getUserType();
  const [authOpen, setAuthOpen] = useState(false);
  const [text, setText] = useState('');

  const isLoggedIn = Boolean(sessionUser);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['messages', shipmentId],
    queryFn: async ({ signal }) => {
      const response = await apiClient(getMessagesPath(shipmentId!, userType), { signal });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.success === false) {
        throw new Error(json?.message || 'Mesajlar alınamadı.');
      }
      return (json.data || []) as MessageDto[];
    },
    enabled: Boolean(shipmentId && isLoggedIn),
    refetchInterval: 15000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient(getSendPath(userType), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId, content: text }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.success === false) {
        throw new Error(json?.message || 'Mesaj gönderilemedi.');
      }
    },
    onSuccess: async () => {
      setText('');
      await queryClient.invalidateQueries({ queryKey: ['messages', shipmentId] });
    },
  });

  if (!shipmentId) {
    return (
      <PageContainer>
        <Alert>
          <AlertTitle>Taşıma seçilmedi</AlertTitle>
          <AlertDescription>Mesajlaşmayı açmak için bir taşıma seçmeniz gerekiyor.</AlertDescription>
        </Alert>
        <Button className="mt-6" variant="outline" onClick={() => navigate(-1)}>
          Geri dön
        </Button>
      </PageContainer>
    );
  }

  if (!isLoggedIn) {
    return (
      <PageContainer>
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
      </PageContainer>
    );
  }

  const currentUserId = sessionUser?.id;

  return (
    <PageContainer className="space-y-4">
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
                <div className="rounded-xl border p-6" style={{ background: 'var(--tb-canvas)', borderColor: 'var(--tb-border)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--tb-ink-700)' }}>Henüz mesaj yok</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--tb-ink-400)' }}>İlk mesajınızı göndererek konuşmayı başlatın.</p>
                </div>
              ) : (
                (data || []).map(m => {
                  const isOwn = m.senderId === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border p-4"
                      style={{
                        background: isOwn ? 'var(--tb-brand-50)' : 'var(--tb-surface)',
                        borderColor: 'var(--tb-border)',
                        marginLeft: isOwn ? '24px' : '0',
                        marginRight: isOwn ? '0' : '24px',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium" style={{ color: isOwn ? 'var(--tb-brand-700)' : 'var(--tb-ink-500)' }}>
                          {isOwn ? 'Siz' : (m.senderType === 'carrier' ? 'Nakliyeci' : 'Müşteri')}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--tb-ink-400)' }}>{formatDate(new Date(m.createdAt))}</p>
                      </div>
                      <p className="mt-2 text-sm" style={{ color: 'var(--tb-ink-700)' }}>{m.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && text.trim() && !mutation.isPending) mutation.mutate(); }}
              placeholder="Mesaj yazın…"
              maxLength={2000}
            />
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !text.trim()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
