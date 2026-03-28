import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';

interface ApiNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string | null;
  createdAt: string;
}

export default function Notifications() {
  const [notifs, setNotifs] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiClient('/notifications');
      const json = await res.json();
      if (res.ok && json?.success) {
        setNotifs(Array.isArray(json.data) ? json.data : []);
      } else {
        setNotifs([]);
        toast.error(json?.message || 'Bildirimler alınamadı.');
      }
    } catch {
      setNotifs([]);
      toast.error('Bildirimler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await apiClient(`/notifications/${id}/read`, { method: 'PUT' });
      if (res.ok) {
        setNotifs(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
      } else {
        toast.error('Bildirim güncellenemedi.');
      }
    } catch {
      toast.error('Bildirim güncellenirken bir hata oluştu.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Bildirimler</h1>
      {loading && (
        <Card><CardContent className="py-10 text-center text-gray-600">Yükleniyor...</CardContent></Card>
      )}
      {!loading && notifs.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-600">Bildirim yok.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {notifs.map(n => (
            <Card key={n.id} className={`${n.isRead ? 'opacity-75' : ''}`}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> {n.title}</CardTitle>
                  <CardDescription>{new Date(n.createdAt).toLocaleString('tr-TR')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${n.isRead ? 'bg-gray-50 text-gray-600' : 'bg-blue-50 text-blue-700'}`}>{n.isRead ? 'okundu' : 'yeni'}</Badge>
                  <Button variant="outline" onClick={() => navigate('/tekliflerim')}>Aç</Button>
                  {!n.isRead && (
                    <Button size="sm" onClick={() => markAsRead(n.id)}><Check className="h-4 w-4 mr-1" /> Okundu</Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700">{n.message}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
