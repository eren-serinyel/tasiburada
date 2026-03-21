import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSessionUser } from '@/lib/storage';
import { Shipment, User } from '@/lib/types';

export default function History() {
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'delivered'|'cancelled'|'in-transit'|'accepted'>('all');
  const [user, setUser] = useState<User | null>(null);
  const [all, setAll] = useState<Shipment[]>([]);

  useEffect(() => {
    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    setUser(u);
    const s: Shipment[] = JSON.parse(localStorage.getItem('shipments') || '[]');
    setAll(s);
  }, []);

  const list = useMemo(() => {
    const mine = all.filter(s => s.customerId === user?.id);
    return statusFilter === 'all' ? mine : mine.filter(s => s.status === statusFilter);
  }, [all, user, statusFilter]);

  const badge = (st: string) => ({
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-blue-100 text-blue-800',
    'in-transit': 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  } as Record<string,string>)[st] || 'bg-gray-100 text-gray-800';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Talep Geçmişi</h1>
        <Select value={statusFilter} onValueChange={(v: any)=>setStatusFilter(v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="pending">Bekliyor</SelectItem>
            <SelectItem value="accepted">Kabul Edildi</SelectItem>
            <SelectItem value="in-transit">Yolda</SelectItem>
            <SelectItem value="delivered">Tamamlandı</SelectItem>
            <SelectItem value="cancelled">İptal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-600">Henüz talebin yok, hadi başlayalım 🚚</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map(s => (
            <Card key={s.id} className="border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className={badge(s.status)}>{s.status}</Badge>
                  <span>{new Date(s.requestedDate || s.date).toLocaleDateString('tr-TR')}</span>
                </CardTitle>
                <CardDescription>{s.origin.city} → {s.destination.city}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
