import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/apiClient';
import { Link } from 'react-router-dom';

const API_BASE_URL = '/api/v1';

type StatusFilter = 'all' | 'pending' | 'offer_received' | 'matched' | 'in_transit' | 'completed' | 'cancelled';

interface BackendShipment {
  id: string;
  origin: string;
  destination: string;
  loadDetails: string;
  status: string;
  shipmentDate: string;
  createdAt: string;
  price?: number;
}

export default function History() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [shipments, setShipments] = useState<BackendShipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/customers/shipments`);
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setShipments(json.data);
      } else {
        setShipments([]);
      }
    } catch {
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const list = useMemo(() => {
    return statusFilter === 'all' ? shipments : shipments.filter(s => s.status === statusFilter);
  }, [shipments, statusFilter]);

  const badge = (st: string) => ({
    pending: 'bg-yellow-100 text-yellow-800',
    offer_received: 'bg-orange-100 text-orange-800',
    matched: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  } as Record<string,string>)[st] || 'bg-gray-100 text-gray-800';

  const statusLabel = (st: string) => ({
    pending: 'Bekliyor',
    offer_received: 'Teklif Geldi',
    matched: 'Eşleşti',
    in_transit: 'Yolda',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
  } as Record<string,string>)[st] || st;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Talep Geçmişi</h1>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="pending">Bekliyor</SelectItem>
            <SelectItem value="offer_received">Teklif Geldi</SelectItem>
            <SelectItem value="matched">Eşleşti</SelectItem>
            <SelectItem value="in_transit">Yolda</SelectItem>
            <SelectItem value="completed">Tamamlandı</SelectItem>
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
            <Link key={s.id} to={`/ilan/${s.id}`} className="block">
              <Card className="border-blue-100 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge className={badge(s.status)}>{statusLabel(s.status)}</Badge>
                    <span>{new Date(s.shipmentDate || s.createdAt).toLocaleDateString('tr-TR')}</span>
                  </CardTitle>
                  <CardDescription>{s.origin} → {s.destination}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600">{s.loadDetails}</p>
                  {s.price ? <p className="text-sm font-medium text-green-600 mt-1">{s.price}₺</p> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
