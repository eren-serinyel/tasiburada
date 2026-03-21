import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { mockDb } from '@/utils/mockDb';

export default function Notifications() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const arr = mockDb.getAllNotifications();
    setNotifs([...arr].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const markAsRead = (id: string) => {
    mockDb.markNotificationRead(id);
    const arr = mockDb.getAllNotifications();
    setNotifs([...arr].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Bildirimler</h1>
      {notifs.length === 0 ? (
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
                  <Button variant="outline" onClick={() => navigate(n.actionUrl || (n.kind === 'request' && n.relatedId ? `/carrier/respond/${n.relatedId}` : '/my-offers'))}>Aç</Button>
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
